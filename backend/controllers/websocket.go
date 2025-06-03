package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"social-media-app/backend/auth"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// WebSocket bağlantı yükseltme yapılandırması
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// CORS kontrolünü devre dışı bırak - tüm kaynaklardan gelen bağlantılara izin ver
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Bağlantı yönetici yapısı
type ConnectionManager struct {
	// Tüm aktif bağlantıları tutan harita (userId -> connection)
	connections map[string]*websocket.Conn
	// Harita erişimi için mutex
	mutex sync.RWMutex
}

// Global bağlantı yöneticisi
var connectionManager = ConnectionManager{
	connections: make(map[string]*websocket.Conn),
}

// Bağlantı ekleme
func (cm *ConnectionManager) AddConnection(userId string, conn *websocket.Conn) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	// Önceki bağlantıyı kapat (eğer varsa)
	if oldConn, exists := cm.connections[userId]; exists {
		oldConn.Close()
	}

	cm.connections[userId] = conn
	log.Printf("Kullanıcı %s için yeni WebSocket bağlantısı eklendi", userId)
}

// Bağlantı kaldırma
func (cm *ConnectionManager) RemoveConnection(userId string) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	delete(cm.connections, userId)
	log.Printf("Kullanıcı %s için WebSocket bağlantısı kaldırıldı", userId)
}

// Kullanıcıya mesaj gönderme
func (cm *ConnectionManager) SendToUser(userId string, message interface{}) error {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	// Kullanıcı bağlantısını kontrol et
	conn, exists := cm.connections[userId]
	if !exists {
		return fmt.Errorf("kullanıcı %s için aktif bağlantı bulunamadı", userId)
	}

	// Mesajı JSON'a çevir
	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("mesaj JSON'a çevrilemedi: %v", err)
	}

	// Mesajı gönder
	if err := conn.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
		return fmt.Errorf("mesaj gönderilemedi: %v", err)
	}

	return nil
}

// WebSocketHandler - WebSocket bağlantısını yönetir
func WebSocketHandler(c *gin.Context) {
	// HTTP bağlantısını WebSocket'e yükselt
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket yükseltme hatası: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "WebSocket bağlantısı kurulamadı",
		})
		return
	}

	// İlk başta bağlantıyı userId olmadan oluştur
	// Kimlik doğrulama message ile sonradan yapılacak
	log.Println("Yeni WebSocket bağlantısı kuruldu, kimlik doğrulama bekleniyor...")

	// Zaman aşımı için timer oluştur
	authTimer := time.NewTimer(10 * time.Second)
	authenticated := false
	var userId string

	// Bağlantı kapatıldığında temizleme işlemi
	defer func() {
		authTimer.Stop()
		conn.Close()
		if authenticated && userId != "" {
			connectionManager.RemoveConnection(userId)
		}
	}()

	// Authentication bekleme goroutine'i
	go func() {
		<-authTimer.C
		if !authenticated {
			log.Println("WebSocket kimlik doğrulama zaman aşımı")
			conn.WriteJSON(gin.H{
				"type":  "auth_error",
				"error": "Kimlik doğrulama zaman aşımı",
			})
			conn.Close()
		}
	}()

	// Mesaj işleme döngüsü
	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket okuma hatası: %v", err)
			}
			break
		}

		// Sadece text mesajlarını işle
		if messageType != websocket.TextMessage {
			continue
		}

		// Mesajı ayrıştır
		var data map[string]interface{}
		if err := json.Unmarshal(message, &data); err != nil {
			log.Printf("Mesaj ayrıştırma hatası: %v", err)
			continue
		}

		// Mesaj tipine göre işlem yap
		msgType, ok := data["type"].(string)
		if !ok {
			log.Println("Mesaj tipi belirtilmemiş")
			continue
		}

		// Kimlik doğrulaması yapılmadıysa, sadece authentication mesajlarını kabul et
		if !authenticated {
			if msgType == "authentication" {
				// Token doğrulama
				tokenStr, ok := data["token"].(string)
				if !ok || tokenStr == "" {
					log.Println("Geçersiz token formatı")
					conn.WriteJSON(gin.H{
						"type":  "auth_error",
						"error": "Kimlik doğrulama gerekli",
					})
					continue
				}

				// Token'ı doğrula
				userIDUint, err := auth.VerifyToken(tokenStr)
				if err != nil || userIDUint == 0 {
					log.Printf("Token doğrulama hatası: %v", err)
					conn.WriteJSON(gin.H{
						"type":  "auth_error",
						"error": "Geçersiz veya süresi dolmuş token",
					})
					continue
				}

				// Doğrulama başarılı
				userId = fmt.Sprintf("%d", userIDUint)
				authenticated = true
				authTimer.Stop()

				// Bağlantıyı yöneticiye ekle
				connectionManager.AddConnection(userId, conn)

				// Kimlik doğrulama başarılı mesajı gönder
				conn.WriteJSON(gin.H{
					"type":      "auth_success",
					"userId":    userId,
					"timestamp": time.Now(),
				})

				log.Printf("Kullanıcı %s için WebSocket kimlik doğrulama başarılı", userId)
			} else {
				// Kimlik doğrulaması olmadan diğer mesajları reddet
				conn.WriteJSON(gin.H{
					"type":  "auth_error",
					"error": "Kimlik doğrulama gerekli",
				})
			}
			continue
		}

		// Kimlik doğrulaması yapıldıysa, diğer mesajları işle
		switch msgType {
		case "message":
			handleChatMessage(data, userId)
		case "typing":
			handleTypingStatus(data, userId)
		case "mark_read":
			handleMarkRead(data, userId)
		default:
			log.Printf("Bilinmeyen mesaj tipi: %s", msgType)
		}
	}
}

// Mesaj gönderme işlemi
func handleChatMessage(data map[string]interface{}, senderId string) {
	// Alıcı ID'si
	receiverId, ok := data["receiverId"].(string)
	if !ok || receiverId == "" {
		log.Println("Alıcı ID'si belirtilmemiş")
		return
	}

	// Mesaj içeriği
	content, _ := data["content"].(string)

	// Diğer mesaj bilgileri
	mediaUrl, _ := data["mediaUrl"].(string)
	mediaType, _ := data["mediaType"].(string)

	// Gerçek mesaj ID'si oluştur
	messageId := fmt.Sprintf("ws-%d", time.Now().UnixNano())

	// Mesaj nesnesini oluştur
	message := map[string]interface{}{
		"type":       "message",
		"id":         messageId,
		"senderId":   senderId,
		"receiverId": receiverId,
		"content":    content,
		"timestamp":  time.Now(),
		"mediaUrl":   mediaUrl,
		"mediaType":  mediaType,
	}

	// Mesajı alıcıya gönder
	if err := connectionManager.SendToUser(receiverId, message); err != nil {
		log.Printf("Alıcıya mesaj gönderme hatası: %v", err)
	}
}

// Yazıyor durumu işleme
func handleTypingStatus(data map[string]interface{}, senderId string) {
	// Alıcı ID'si
	receiverId, ok := data["receiverId"].(string)
	if !ok || receiverId == "" {
		log.Println("Alıcı ID'si belirtilmemiş")
		return
	}

	// Yazıyor durumu
	isTyping, _ := data["isTyping"].(bool)

	// Yazıyor mesajı oluştur
	typingMessage := map[string]interface{}{
		"type":      "typing",
		"senderId":  senderId,
		"isTyping":  isTyping,
		"timestamp": time.Now(),
	}

	// Mesajı alıcıya gönder
	if err := connectionManager.SendToUser(receiverId, typingMessage); err != nil {
		log.Printf("Yazıyor durumu gönderme hatası: %v", err)
	}
}

// Mesajları okundu olarak işaretleme
func handleMarkRead(data map[string]interface{}, senderId string) {
	// Konuşma ID'si
	conversationId, ok := data["conversationId"].(string)
	if !ok || conversationId == "" {
		log.Println("Konuşma ID'si belirtilmemiş")
		return
	}

	// Konuşma ID'sinden kullanıcı ID'lerini çıkar
	userIds := parseConversationId(conversationId)
	if len(userIds) != 2 {
		log.Println("Geçersiz konuşma ID'si:", conversationId)
		return
	}

	// Hangi kullanıcıya bildirim gönderileceğini belirle
	var receiverId string
	if userIds[0] == senderId {
		receiverId = userIds[1]
	} else {
		receiverId = userIds[0]
	}

	// Okundu mesajı oluştur
	readMessage := map[string]interface{}{
		"type":           "read_receipt",
		"senderId":       senderId,
		"conversationId": conversationId,
		"timestamp":      time.Now(),
	}

	// Mesajı diğer kullanıcıya gönder
	if err := connectionManager.SendToUser(receiverId, readMessage); err != nil {
		log.Printf("Okundu bildirimi gönderme hatası: %v", err)
	}
}

// Konuşma ID'sinden kullanıcı ID'lerini çıkar
func parseConversationId(conversationId string) []string {
	// Format: userId1_userId2 şeklinde olmalı
	parts := strings.Split(conversationId, "_")
	if len(parts) != 2 {
		return []string{}
	}

	return parts
}
