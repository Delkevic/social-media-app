package services

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// NotificationType bildirim türlerini tanımlar
type NotificationType string

const (
	NotificationTypeFollow        NotificationType = "follow"
	NotificationTypeLike          NotificationType = "like"
	NotificationTypeComment       NotificationType = "comment"
	NotificationTypeMention       NotificationType = "mention"
	NotificationTypeReply         NotificationType = "reply"
	NotificationTypeFollowRequest NotificationType = "follow_request"
	NotificationTypeFollowAccept  NotificationType = "follow_accept"
	NotificationTypeMessage       NotificationType = "message"
	NotificationTypeSystem        NotificationType = "system"
)

// Notification, kullanıcılara gönderilen bildirimleri temsil eder
type Notification struct {
	ID                string           `json:"id"`
	UserID            string           `json:"userId"`
	ActorID           string           `json:"actorId"`
	ActorName         string           `json:"actorName"`
	ActorUsername     string           `json:"actorUsername"`
	ActorProfileImage string           `json:"actorProfileImage,omitempty"`
	Type              NotificationType `json:"type"`
	EntityID          string           `json:"entityId,omitempty"`
	EntityType        string           `json:"entityType,omitempty"`
	EntityURL         string           `json:"entityUrl,omitempty"`
	Content           string           `json:"content,omitempty"`
	IsRead            bool             `json:"isRead"`
	CreatedAt         time.Time        `json:"createdAt"`
}

// WebSocketMessage WebSocket üzerinden gönderilen mesajları temsil eder
type WebSocketMessage struct {
	Type         string       `json:"type"`
	Notification Notification `json:"notification,omitempty"`
}

// NotificationService, bildirim yönetimi için servisi temsil eder
type NotificationService struct {
	clients    map[string][]*websocket.Conn
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
}

// WebSocketClient, bağlı WebSocket istemcisini temsil eder
type WebSocketClient struct {
	UserID string
	Conn   *websocket.Conn
}

// NewNotificationService, yeni bir NotificationService oluşturur
func NewNotificationService() *NotificationService {
	service := &NotificationService{
		clients:    make(map[string][]*websocket.Conn),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
	}

	// Arka planda çalışan gorutine başlat
	go service.run()

	return service
}

// Run, bildirim servisinin arka plan işlemlerini yönetir
func (s *NotificationService) run() {
	for {
		select {
		case client := <-s.register:
			// Kullanıcı için bağlantı dizisini getir veya oluştur
			connections := s.clients[client.UserID]

			// Yeni bağlantıyı ekle
			s.clients[client.UserID] = append(connections, client.Conn)

			log.Printf("Yeni WebSocket istemcisi kaydedildi. Kullanıcı: %s", client.UserID)

		case client := <-s.unregister:
			// Kullanıcının bağlantıları
			connections := s.clients[client.UserID]

			// Belirli bağlantıyı bul ve kaldır
			for i, conn := range connections {
				if conn == client.Conn {
					// Son eleman değilse, son elemanı bu pozisyona taşı
					if i < len(connections)-1 {
						connections[i] = connections[len(connections)-1]
					}
					// Diziyi kısalt
					s.clients[client.UserID] = connections[:len(connections)-1]

					log.Printf("WebSocket istemcisi kaldırıldı. Kullanıcı: %s", client.UserID)
					break
				}
			}

			// Kullanıcının hiç bağlantısı kalmadıysa haritadan kaldır
			if len(s.clients[client.UserID]) == 0 {
				delete(s.clients, client.UserID)
			}
		}
	}
}

// RegisterClient, yeni bir WebSocket istemcisini kaydeder
func (s *NotificationService) RegisterClient(userID string, conn *websocket.Conn) {
	s.register <- &WebSocketClient{
		UserID: userID,
		Conn:   conn,
	}
}

// UnregisterClient, bir WebSocket istemcisini kaldırır
func (s *NotificationService) UnregisterClient(userID string, conn *websocket.Conn) {
	s.unregister <- &WebSocketClient{
		UserID: userID,
		Conn:   conn,
	}
}

// SendNotification, belirli bir kullanıcıya bildirim gönderir
func (s *NotificationService) SendNotification(ctx context.Context, notification Notification) error {
	// Bildirim ID'si yoksa oluştur
	if notification.ID == "" {
		notification.ID = uuid.New().String()
	}

	// Zaman damgası yoksa şimdiki zamanı ata
	if notification.CreatedAt.IsZero() {
		notification.CreatedAt = time.Now()
	}

	// Veritabanına bildirim kaydı (burada uygulanmadı)
	// s.dbService.SaveNotification(ctx, notification)

	// WebSocket üzerinden bildirim gönder
	s.sendWebSocketNotification(notification)

	return nil
}

// SendGroupNotification, birden fazla kullanıcıya aynı bildirimi gönderir
func (s *NotificationService) SendGroupNotification(ctx context.Context, userIDs []string, notification Notification) error {
	for _, userID := range userIDs {
		// Her kullanıcı için ayrı bildirim kopyası oluştur
		userNotification := notification
		userNotification.UserID = userID
		userNotification.ID = uuid.New().String()

		// Bildirimi gönder
		err := s.SendNotification(ctx, userNotification)
		if err != nil {
			log.Printf("Kullanıcıya bildirim gönderilemedi. Kullanıcı: %s, Hata: %v", userID, err)
		}
	}

	return nil
}

// CreateFollowNotification, takip bildirimi oluşturur
func (s *NotificationService) CreateFollowNotification(ctx context.Context, userID, followerID, followerName, followerUsername, followerImage string) error {
	notification := Notification{
		UserID:            userID,
		ActorID:           followerID,
		ActorName:         followerName,
		ActorUsername:     followerUsername,
		ActorProfileImage: followerImage,
		Type:              NotificationTypeFollow,
		IsRead:            false,
		CreatedAt:         time.Now(),
	}

	return s.SendNotification(ctx, notification)
}

// CreateLikeNotification, beğeni bildirimi oluşturur
func (s *NotificationService) CreateLikeNotification(ctx context.Context, userID, likerID, likerName, likerUsername, likerImage, postID string, isComment bool) error {
	entityType := "post"
	if isComment {
		entityType = "comment"
	}

	notification := Notification{
		UserID:            userID,
		ActorID:           likerID,
		ActorName:         likerName,
		ActorUsername:     likerUsername,
		ActorProfileImage: likerImage,
		Type:              NotificationTypeLike,
		EntityID:          postID,
		EntityType:        entityType,
		EntityURL:         "/post/" + postID,
		IsRead:            false,
		CreatedAt:         time.Now(),
	}

	return s.SendNotification(ctx, notification)
}

// CreateCommentNotification, yorum bildirimi oluşturur
func (s *NotificationService) CreateCommentNotification(ctx context.Context, userID, commenterID, commenterName, commenterUsername, commenterImage, postID string) error {
	notification := Notification{
		UserID:            userID,
		ActorID:           commenterID,
		ActorName:         commenterName,
		ActorUsername:     commenterUsername,
		ActorProfileImage: commenterImage,
		Type:              NotificationTypeComment,
		EntityID:          postID,
		EntityType:        "post",
		EntityURL:         "/post/" + postID,
		IsRead:            false,
		CreatedAt:         time.Now(),
	}

	return s.SendNotification(ctx, notification)
}

// WebSocket üzerinden bildirim gönder
func (s *NotificationService) sendWebSocketNotification(notification Notification) {
	// Alıcı kullanıcının bağlantılarını al
	connections := s.clients[notification.UserID]
	if len(connections) == 0 {
		// Kullanıcı bağlı değil, bildirim veritabanında saklanacak
		return
	}

	// WebSocket mesajı oluştur
	message := WebSocketMessage{
		Type:         "notification",
		Notification: notification,
	}

	// JSON'a dönüştür
	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Bildirim JSON dönüşüm hatası: %v", err)
		return
	}

	// Tüm bağlantılara gönder
	for _, conn := range connections {
		err := conn.WriteMessage(websocket.TextMessage, jsonData)
		if err != nil {
			log.Printf("WebSocket mesaj gönderme hatası: %v", err)
			// Hata durumunda bağlantıyı kapatmak için UnregisterClient çağrılabilir
			// Bu örnekte, bir sonraki mesaj denemesinde bağlantı hala sorunluysa kaldırılacak
		}
	}
}
