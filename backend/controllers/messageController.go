// controllers/messageController.go
package controllers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/services"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Message yapısı istemcilerden gelen mesaj formatı
type Message struct {
	SenderID   uint   `json:"senderId"`
	ReceiverID uint   `json:"receiverId"`
	Content    string `json:"content"`
	MediaURL   string `json:"mediaUrl"`
	MediaType  string `json:"mediaType"`
	Type       string `json:"type,omitempty"`     // Mesaj tipi: "message", "typing" vb.
	IsTyping   bool   `json:"isTyping,omitempty"` // Yazma durumu için
}

// MessageResponse yapısı istemcilere gönderilen mesaj formatı
type MessageResponse struct {
	ID         uint      `json:"id"`
	SenderID   uint      `json:"senderId"`
	ReceiverID uint      `json:"receiverId"`
	Content    string    `json:"content"`
	MediaURL   string    `json:"mediaUrl"`
	MediaType  string    `json:"mediaType"`
	SentAt     time.Time `json:"sentAt"`
	IsRead     bool      `json:"isRead"`
	SenderInfo UserInfo  `json:"senderInfo"`
}

// UserInfo mesaj yanıtında kullanıcı bilgisi
type UserInfo struct {
	ID           uint   `json:"id"`
	Username     string `json:"username"`
	FullName     string `json:"fullName"`
	ProfileImage string `json:"profileImage"`
}

// WebSocket bağlantılarını saklamak için global değişkenler
var (
	connections = make(map[uint]*websocket.Conn) // userID -> WebSocket conn
	connMutex   = &sync.Mutex{}                  // connections map için thread-safe erişim
	upgrader    = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	// Notification servisi
	notifService *services.NotificationService
)

// SetNotificationService - Notification servisini controller seviyesinde ayarlar
func SetNotificationService(service *services.NotificationService) {
	notifService = service
	log.Println("MessageController: Notification servisi ayarlandı")
}

// WebSocketHandler gerçek zamanlı mesajlaşma için WebSocket bağlantıları yönetir
func WebSocketHandler(c *gin.Context) {
	fmt.Println("WebSocket bağlantı isteği alındı")
	fmt.Printf("Bağlantı detayları: URL:%s, Headers:%v\n", c.Request.URL.String(), c.Request.Header)

	// WebSocket bağlantısını yükselt
	upgrader.CheckOrigin = func(r *http.Request) bool { return true } // CORS kontrolünü devre dışı bırak
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("WebSocket yükseltme hatası:", err)
		return // Yükseltme başarısız olursa fonksiyondan çık
	}
	fmt.Println("WebSocket bağlantısı başarıyla yükseltildi.")

	// Bağlantıyı kapatma işlemi (defer)
	defer func() {
		fmt.Println("WebSocket defer kapatma fonksiyonu çağrıldı.")
		conn.Close()
		fmt.Println("WebSocket bağlantısı defer ile kapatıldı.")
	}()

	// Auth mesajı için zamanaşımı ayarla (10 saniye)
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	// İlk mesajı bekle (token doğrulama için)
	fmt.Println("İlk auth mesajı bekleniyor...")
	messageType, p, err := conn.ReadMessage()
	if err != nil {
		// Hatanın nedenini logla
		fmt.Printf("İlk mesaj okuma hatası (ReadMessage): %v\n", err)
		// Hata durumunda istemciye de bilgi gönderelim (eğer bağlantı hala açıksa)
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "İlk mesaj okunamadı veya bağlantı kapandı"}`))
		return // Hata varsa fonksiyondan çık
	}

	// Timeout'u kaldır
	conn.SetReadDeadline(time.Time{})

	fmt.Printf("İlk mesaj alındı. Tip: %d, İçerik: %s\n", messageType, string(p))

	// Auth mesajını parse et
	var authMessage struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}

	// JSON'ı ayrıştır
	if err := json.Unmarshal(p, &authMessage); err != nil {
		fmt.Printf("Auth mesajı ayrıştırma hatası: %v, Alınan mesaj: %s\n", err, string(p))
		conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"error","error":"Auth mesajı geçersiz format"}`))
		return
	}

	fmt.Printf("Auth mesajı alındı. Tip: %s, Token uzunluğu: %d\n", authMessage.Type, len(authMessage.Token))

	// Gerekli alanları kontrol et
	if authMessage.Type != "auth" || authMessage.Token == "" {
		fmt.Println("Geçersiz auth mesajı: Tip veya token eksik")
		// Geçersiz mesaj durumunda istemciye hata gönder
		conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"Geçersiz auth mesajı formatı"}`))
		return // Hata varsa fonksiyondan çık
	}
	fmt.Println("Auth mesajı tipi ve token varlığı doğrulandı.")

	// Tokeni doğrula ve kullanıcı ID'yi al
	userID, tokenErr := auth.VerifyToken(authMessage.Token)

	// Token süresi dolmuş olsa bile JWT içinden kullanıcı ID'yi çıkarmaya çalış
	if tokenErr != nil {
		// Token ayrıştırma hatası varsa, JWT'nin yapısını manuel olarak parse etmeyi deneyelim
		isTokenExpired := strings.Contains(tokenErr.Error(), "expired")

		// Eğer token süresi dolmuşsa client'a özel hata gönderelim,
		// böylece frontend yenileme mekanizmasını çalıştırabilir
		if isTokenExpired {
			fmt.Println("Token doğrulama hatası:", tokenErr)

			// Token'dan kullanıcı ID'yi çıkarmak için manuel parsing
			var extractedUserID uint
			jwtParts := strings.Split(authMessage.Token, ".")
			if len(jwtParts) != 3 {
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"token is expired and format invalid"}`))
				return
			}

			// Base64 decoding yaparak claims kısmını çıkar
			claimBytes, err := base64.RawURLEncoding.DecodeString(jwtParts[1])
			if err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"token is expired and cannot be decoded"}`))
				return
			}

			// JSON parse et
			var claims map[string]interface{}
			if err := json.Unmarshal(claimBytes, &claims); err != nil {
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"token is expired and cannot be parsed"}`))
				return
			}

			// user_id field'ını bul
			userIDFloat, ok := claims["user_id"].(float64)
			if !ok {
				conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"token is expired and user_id not found"}`))
				return
			}

			extractedUserID = uint(userIDFloat)

			// Token süresi dolduğunu bildiren hata mesajı gönder
			conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"token is expired", "userId": `+fmt.Sprintf("%d", extractedUserID)+`}`))
			return
		}

		// Diğer token hatalarında normal hata mesajı gönder
		fmt.Println("Token doğrulama hatası:", tokenErr)
		conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"auth_error","error":"`+tokenErr.Error()+`"}`))
		return
	}

	fmt.Printf("Token başarıyla doğrulandı. Kullanıcı ID: %d\n", userID)

	// Kullanıcının önceden açık bir bağlantısı varsa kapat
	if existingConn, ok := connections[userID]; ok {
		fmt.Printf("Kullanıcı %d için mevcut bağlantı bulundu, kapatılıyor...\n", userID)
		existingConn.Close()
		delete(connections, userID) // Eski bağlantıyı haritadan sil
		fmt.Printf("Kullanıcı %d için eski bağlantı kapatıldı ve silindi.\n", userID)
	}

	// Mutex kilitle - connections haritasına yazma sırasında
	connMutex.Lock()
	// Yeni bağlantıyı havuza ekle
	connections[userID] = conn
	connMutex.Unlock()

	fmt.Printf("Kullanıcı %d yeni WebSocket bağlantısı havuza eklendi\n", userID)

	// Bildirim sistemine de aynı bağlantıyı ekle
	if notifService != nil {
		// userID'yi string'e çevir (notification service string ID kullanıyor)
		userIDStr := fmt.Sprintf("%d", userID)
		notifService.RegisterClient(userIDStr, conn)

		// Bağlantı kapandığında bildirim servisi kayıtlarını da temizle
		defer func() {
			notifService.UnregisterClient(userIDStr, conn)
			fmt.Printf("Kullanıcı %s bildirim servisi WebSocket bağlantısı temizlendi.\n", userIDStr)
		}()

		fmt.Printf("Kullanıcı %s bildirim servisi WebSocket bağlantısı kaydedildi.\n", userIDStr)

		// Test amaçlı bildirim gönder
		go func() {
			time.Sleep(5 * time.Second)

			// Basit bir bildirim oluştur
			notification := services.Notification{
				ID:                fmt.Sprintf("test-%d", time.Now().Unix()),
				UserID:            userIDStr,
				ActorID:           "system",
				ActorName:         "Sistem",
				ActorUsername:     "sistem",
				ActorProfileImage: "",
				Type:              "system",
				Content:           "Bu bir test bildirimidir.",
				IsRead:            false,
				CreatedAt:         time.Now(),
			}

			// Bildirimi gönder
			err := notifService.SendNotification(context.Background(), notification)
			if err != nil {
				fmt.Printf("Test bildirimi gönderme hatası: %v\n", err)
			} else {
				fmt.Printf("Test bildirimi gönderildi: Kullanıcı: %s\n", userIDStr)
			}
		}()
	} else {
		fmt.Println("UYARI: Bildirim servisi bulunamadı, bildirimler için WebSocket kaydı yapılamadı.")
	}

	// Bağlantı sonlandığında temizle
	defer func() {
		fmt.Printf("Kullanıcı %d için defer bağlantı temizleme fonksiyonu çağrıldı.\n", userID)
		connMutex.Lock()
		if currentConn, ok := connections[userID]; ok && currentConn == conn {
			delete(connections, userID)
			fmt.Printf("Kullanıcı %d WebSocket bağlantısı havuzdan temizlendi.\n", userID)
		} else {
			fmt.Printf("Kullanıcı %d için temizlenecek bağlantı bulunamadı veya farklı bir bağlantı mevcut.\n", userID)
		}
		connMutex.Unlock()
	}()

	// Ping-Pong ile bağlantıyı canlı tut
	conn.SetPingHandler(func(data string) error {
		fmt.Printf("Ping mesajı alındı, pong gönderiliyor... (Kullanıcı: %d)\n", userID)
		err := conn.WriteControl(websocket.PongMessage, []byte(data), time.Now().Add(time.Second))
		if err != nil {
			fmt.Printf("Pong gönderme hatası: %v (Kullanıcı: %d)\n", err, userID)
		}
		return nil
	})

	// Pong mesajlarını işlemek için yeni handler
	conn.SetPongHandler(func(data string) error {
		fmt.Printf("Pong mesajı alındı (Kullanıcı: %d)\n", userID)
		// Pong alındığında read deadline'ı güncelle
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	// Bağlantı başarılı mesajı gönder
	if err := conn.WriteMessage(websocket.TextMessage, []byte(`{"success": true, "message": "WebSocket bağlantısı kuruldu"}`)); err != nil {
		fmt.Printf("Başarı mesajı gönderme hatası: %v\n", err)
		return // Başarı mesajı gönderilemezse devam etmenin anlamı yok
	}
	fmt.Printf("Kullanıcı %d için başarı mesajı gönderildi.\n", userID)

	// Kullanıcıya bekleyen mesajlar varsa bildirim gönder
	go sendPendingNotifications(userID, conn)

	// Periyodik ping gönderme (her 30 saniyede bir)
	stopPing := make(chan struct{})
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				// Ping mesajı gönder
				err := conn.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
				if err != nil {
					fmt.Printf("Ping gönderme hatası: %v (Kullanıcı: %d)\n", err, userID)
					// Hata durumunda döngüden çık
					return
				}

				// Ayrıca keep-alive mesajı da gönderelim
				if err := conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"ping"}`)); err != nil {
					fmt.Printf("Keep-alive mesajı gönderme hatası: %v (Kullanıcı: %d)\n", err, userID)
					return
				}
			case <-stopPing:
				return
			}
		}
	}()

	// Mesajları dinle
	fmt.Printf("Kullanıcı %d için mesaj döngüsü başlatılıyor...\n", userID)

	// Bu fonksiyon sonlandığında ping döngüsünü de sonlandır
	defer func() {
		close(stopPing)
	}()

	// Her mesaj için max okuma süresi belirle (30 dakika)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))

	for {
		messageType, p, err := conn.ReadMessage()

		// Her mesaj alımından sonra deadline'ı güncelle
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))

		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				fmt.Printf("WebSocket okuma hatası (döngü içi): %v\n", err)
			} else {
				// Beklenen kapanma durumları (örneğin, tarayıcı sekmesi kapatıldı)
				fmt.Printf("WebSocket bağlantısı normal şekilde kapandı (döngü içi): %v\n", err)
			}
			break // Döngüden çık
		}
		fmt.Printf("Kullanıcı %d tarafından mesaj alındı. Tip: %d\n", userID, messageType)

		// Gelen mesajı işle (ping/pong veya metin)
		if messageType == websocket.TextMessage {
			// Önce ping/pong işlemi olabilir mi kontrol et
			var pingMessage struct {
				Type string `json:"type"`
			}

			if err := json.Unmarshal(p, &pingMessage); err == nil && pingMessage.Type == "ping" {
				// Ping mesajına pong ile yanıt ver
				if err := conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"pong"}`)); err != nil {
					fmt.Printf("Pong yanıtı gönderme hatası: %v\n", err)
				}
				continue // Sonraki mesaja geç
			}

			// Ping/pong değilse normal mesaj olarak işle
			var message Message
			if err := json.Unmarshal(p, &message); err != nil {
				fmt.Printf("Mesaj ayrıştırma hatası (döngü içi): %v\n", err)
				// Hatalı mesajı istemciye bildirebiliriz
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"error": "Alınan mesaj ayrıştırılamadı: %v"}`, err)))
				continue // Sonraki mesajı bekle
			}

			// Eğer typing mesajı ise
			if message.Type == "typing" {
				// Yazma durumunu alıcıya ilet
				if receiverConn, ok := connections[message.ReceiverID]; ok {
					typingMsg := map[string]interface{}{
						"type":     "typing",
						"senderId": message.SenderID,
						"isTyping": message.IsTyping,
					}
					typingJSON, _ := json.Marshal(typingMsg)
					receiverConn.WriteMessage(websocket.TextMessage, typingJSON)
				}
				continue // Sonraki mesajı bekle
			}

			// Gönderen ID'sini doğrula
			if message.SenderID != userID {
				fmt.Printf("Kimlik doğrulama hatası (döngü içi): Gönderen ID'si (%d) oturum ID'si (%d) ile eşleşmiyor\n", message.SenderID, userID)
				conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Mesajdaki gönderen ID token ile eşleşmiyor"}`))
				continue
			}

			// Mesajı veritabanına kaydet
			newMessage := models.Message{
				SenderID:   message.SenderID,
				ReceiverID: message.ReceiverID,
				Content:    message.Content,
				MediaURL:   message.MediaURL,
				MediaType:  message.MediaType,
				SentAt:     time.Now(),
				IsRead:     false,
			}

			result := database.DB.Create(&newMessage)
			if result.Error != nil {
				fmt.Printf("Mesaj kaydetme hatası (döngü içi): %v\n", result.Error)
				// İstemciye hata bildirimi
				conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"error": "Mesaj veritabanına kaydedilemedi: %v"}`, result.Error)))
				continue
			}

			// Mesajı yanıt olarak formatla
			var sender models.User
			database.DB.Select("id, username, full_name, profile_image").First(&sender, message.SenderID)

			messageResponse := MessageResponse{
				ID:         newMessage.ID,
				SenderID:   newMessage.SenderID,
				ReceiverID: newMessage.ReceiverID,
				Content:    newMessage.Content,
				MediaURL:   newMessage.MediaURL,
				MediaType:  newMessage.MediaType,
				SentAt:     newMessage.SentAt,
				IsRead:     newMessage.IsRead,
				SenderInfo: UserInfo{
					ID:           sender.ID,
					Username:     sender.Username,
					FullName:     sender.FullName,
					ProfileImage: sender.ProfileImage,
				},
			}

			// Yanıtı JSON'a dönüştür
			responseJSON, err := json.Marshal(messageResponse)
			if err != nil {
				fmt.Printf("JSON dönüştürme hatası (döngü içi): %v\n", err)
				continue
			}

			// Mesajı gönderene ilet (kendi gönderdiği mesajın onayını alır)
			if err := conn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
				fmt.Printf("Gönderene ileti hatası (döngü içi): %v\n", err)
				// Bağlantı kopmuş olabilir, döngüden çıkmayı düşünebiliriz
				// break
			}

			// Alıcı çevrimiçiyse mesajı ona da ilet
			connMutex.Lock()
			if receiverConn, ok := connections[message.ReceiverID]; ok {
				fmt.Printf("Mesaj kullanıcı %d tarafından kullanıcı %d'ye iletiliyor...\n", userID, message.ReceiverID)
				if err := receiverConn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
					fmt.Printf("Alıcıya ileti hatası (döngü içi): %v\n", err)
					// Alıcının bağlantısı kopmuş olabilir
				} else {
					// Mesaj başarıyla teslim edildi
					database.DB.Model(&models.Message{}).Where("id = ?", newMessage.ID).Update("is_delivered", true)
					fmt.Printf("Mesaj kullanıcı %d'ye başarıyla teslim edildi ve is_delivered olarak işaretlendi.\n", message.ReceiverID)
				}
			} else {
				fmt.Printf("Alıcı %d çevrimdışı, mesaj iletilemedi.\n", message.ReceiverID)
			}
			connMutex.Unlock()

			// Bildirim oluştur (Bu zaten REST API üzerinden de yapılıyor olabilir, kontrol et)
			notification := models.Notification{
				UserID:      message.ReceiverID,
				SenderID:    message.SenderID,
				Type:        "message",
				Content:     message.Content,
				IsRead:      false,
				ReferenceID: newMessage.ID,
				CreatedAt:   time.Now(),
			}
			database.DB.Create(&notification)

		} else if messageType == websocket.BinaryMessage {
			fmt.Printf("Binary mesaj alındı, desteklenmiyor: %d\n", messageType)
			conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Binary mesajlar desteklenmiyor"}`))
		} else {
			fmt.Printf("Alınan mesaj tipi metin değil: %d\n", messageType)
		}
	}
	fmt.Printf("Kullanıcı %d için mesaj döngüsü sonlandı.\n", userID)
}

// Yeni eklenen yardımcı fonksiyon - kullanıcıya bekleyen mesajlarınını bildirir
func sendPendingNotifications(userID uint, conn *websocket.Conn) {
	// Okunmamış mesajların sayısını getir
	var unreadCount int64
	if err := database.DB.Model(&models.Message{}).Where("receiver_id = ? AND is_read = ?", userID, false).Count(&unreadCount).Error; err != nil {
		fmt.Printf("Okunmamış mesaj sayısı getirilirken hata: %v\n", err)
		return
	}

	// Okunmamış bildirim sayısını getir
	var unreadNotificationCount int64
	if err := database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&unreadNotificationCount).Error; err != nil {
		fmt.Printf("Okunmamış bildirim sayısı getirilirken hata: %v\n", err)
		return
	}

	// Bildirim gönder
	notificationMsg := map[string]interface{}{
		"type":                    "notification_count",
		"unreadMessageCount":      unreadCount,
		"unreadNotificationCount": unreadNotificationCount,
	}

	notificationJSON, _ := json.Marshal(notificationMsg)
	if err := conn.WriteMessage(websocket.TextMessage, notificationJSON); err != nil {
		fmt.Printf("Bildirim mesajı gönderme hatası: %v\n", err)
	}
}

// GetConversations kullanıcının konuşmalarını listeler
func GetConversations(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Kullanıcının konuşmalarını bul
	var conversations []struct {
		UserID        uint      `json:"userId"`
		Username      string    `json:"username"`
		FullName      string    `json:"fullName"`
		ProfileImage  string    `json:"profileImage"`
		LastMessageID uint      `json:"lastMessageId"`
		LastContent   string    `json:"lastContent"`
		LastTimestamp time.Time `json:"lastTimestamp"`
		UnreadCount   int       `json:"unreadCount"`
	}

	// İlk olarak kullanıcının mesajlaştığı kişileri bul
	query := `
	SELECT 
		CASE 
			WHEN m.sender_id = ? THEN m.receiver_id 
			ELSE m.sender_id 
		END as user_id,
		u.username,
		u.full_name,
		u.profile_image,
		MAX(m.id) as last_message_id,
		m2.content as last_content,
		m2.sent_at as last_timestamp,
		SUM(CASE WHEN m.is_read = false AND m.receiver_id = ? THEN 1 ELSE 0 END) as unread_count
	FROM messages m
	JOIN messages m2 ON m2.id = (
		SELECT MAX(id) FROM messages 
		WHERE (sender_id = ? AND receiver_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) 
		OR (sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AND receiver_id = ?)
	)
	JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
	WHERE m.sender_id = ? OR m.receiver_id = ?
	GROUP BY user_id
	ORDER BY last_timestamp DESC
	`

	if err := database.DB.Raw(query, userID, userID, userID, userID, userID, userID, userID, userID, userID).Scan(&conversations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Konuşmalar alınırken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    conversations,
	})
}

// GetConversation belirli bir kullanıcıyla olan konuşmayı getirir
func GetConversation(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Mesajları getir
	var messages []models.Message
	result := database.DB.Where(
		"(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		userID, targetID, targetID, userID,
	).Order("sent_at ASC").Find(&messages)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Mesajlar alınırken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Hedef kullanıcının bilgilerini al
	var targetUser models.User
	if err := database.DB.Select("id, username, full_name, profile_image").First(&targetUser, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Okunmamış mesajları okundu olarak işaretle
	database.DB.Model(&models.Message{}).Where("sender_id = ? AND receiver_id = ? AND is_read = ?", targetID, userID, false).Update("is_read", true)

	// Kullanıcı bilgilerini ekle
	var formattedMessages []MessageResponse
	var senderUser models.User

	for _, message := range messages {
		// Gönderen bilgilerini al
		sender := targetUser // Varsayılan olarak hedef kullanıcı
		if message.SenderID == userID.(uint) {
			// Gönderen hesap sahibiyse, veritabanından bir kez al
			if senderUser.ID == 0 {
				database.DB.Select("id, username, full_name, profile_image").First(&senderUser, userID)
			}
			sender = senderUser
		}

		formattedMessage := MessageResponse{
			ID:         message.ID,
			SenderID:   message.SenderID,
			ReceiverID: message.ReceiverID,
			Content:    message.Content,
			MediaURL:   message.MediaURL,
			MediaType:  message.MediaType,
			SentAt:     message.SentAt,
			IsRead:     message.IsRead,
			SenderInfo: UserInfo{
				ID:           sender.ID,
				Username:     sender.Username,
				FullName:     sender.FullName,
				ProfileImage: sender.ProfileImage,
			},
		}

		formattedMessages = append(formattedMessages, formattedMessage)
	}

	responseData := map[string]interface{}{
		"messages": formattedMessages,
		"user": map[string]interface{}{
			"id":           targetUser.ID,
			"username":     targetUser.Username,
			"fullName":     targetUser.FullName,
			"profileImage": targetUser.ProfileImage,
		},
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    responseData,
	})
}

// SendMessage mesaj gönderir (WebSocket için yedek olarak REST API)
func SendMessage(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Giriş verilerini al
	var input struct {
		Content   string `json:"content" binding:"required"`
		MediaURL  string `json:"mediaUrl"`
		MediaType string `json:"mediaType"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz mesaj verisi: " + err.Error(),
		})
		return
	}

	// Yeni mesaj oluştur
	message := models.Message{
		SenderID:   userID.(uint),
		ReceiverID: uint(targetID),
		Content:    input.Content,
		MediaURL:   input.MediaURL,
		MediaType:  input.MediaType,
		SentAt:     time.Now(),
		IsRead:     false,
	}

	// Mesajı kaydet
	if err := database.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Mesaj kaydedilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Bildirim oluştur
	notification := models.Notification{
		UserID:      uint(targetID),
		SenderID:    userID.(uint),
		Type:        "message",
		Content:     input.Content,
		IsRead:      false,
		ReferenceID: message.ID,
		CreatedAt:   time.Now(),
	}
	database.DB.Create(&notification)

	// Kullanıcı bilgilerini getir
	var sender models.User
	database.DB.Select("id, username, full_name, profile_image").First(&sender, userID)

	// Yanıt oluştur
	response := MessageResponse{
		ID:         message.ID,
		SenderID:   message.SenderID,
		ReceiverID: message.ReceiverID,
		Content:    message.Content,
		MediaURL:   message.MediaURL,
		MediaType:  message.MediaType,
		SentAt:     message.SentAt,
		IsRead:     message.IsRead,
		SenderInfo: UserInfo{
			ID:           sender.ID,
			Username:     sender.Username,
			FullName:     sender.FullName,
			ProfileImage: sender.ProfileImage,
		},
	}

	// WebSocket üzerinden mesajı hedef kullanıcıya ilet
	if receiverConn, ok := connections[uint(targetID)]; ok {
		responseJSON, _ := json.Marshal(response)
		if err := receiverConn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
			fmt.Printf("WebSocket mesaj gönderme hatası: %v\n", err)
		} else {
			// Mesaj başarıyla gönderildi, database'de teslim edildi olarak işaretle
			database.DB.Model(&models.Message{}).Where("id = ?", message.ID).Update("is_delivered", true)
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    response,
	})
}

// SendTypingStatus yazma durumunu karşı tarafa bildirir
func SendTypingStatus(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Giriş verilerini al
	var input struct {
		IsTyping bool `json:"isTyping" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz veri: " + err.Error(),
		})
		return
	}

	// WebSocket üzerinden yazma durumunu hedef kullanıcıya ilet
	if receiverConn, ok := connections[uint(targetID)]; ok {
		typingStatus := map[string]interface{}{
			"type":     "typing",
			"senderId": userID,
			"isTyping": input.IsTyping,
		}
		responseJSON, _ := json.Marshal(typingStatus)
		if err := receiverConn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
			fmt.Printf("WebSocket yazma durumu gönderme hatası: %v\n", err)
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Yazma durumu gönderildi",
	})
}

// MarkMessageAsRead bir mesajı okundu olarak işaretler
func MarkMessageAsRead(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Mesaj ID'sini al
	messageIDStr := c.Param("id")
	messageID, err := strconv.ParseUint(messageIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz mesaj ID",
		})
		return
	}

	// Mesajı kontrol et - alıcı olduğumuzdan emin ol
	var message models.Message
	result := database.DB.Where("id = ? AND receiver_id = ?", messageID, userID).First(&message)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Mesaj bulunamadı veya bu mesajı işaretleme yetkiniz yok",
		})
		return
	}

	// Mesajı okundu olarak işaretle
	if err := database.DB.Model(&message).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Mesaj okundu olarak işaretlenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Mesaj okundu olarak işaretlendi",
	})
}

// GetPreviousChats kullanıcının daha önce mesajlaştığı tüm kullanıcıları döndürür
func GetPreviousChats(c *gin.Context) {
	// Token'dan kullanıcı ID'sini al
	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Yetkilendirme başlığı eksik"})
		return
	}

	// Token'ı temizle (Bearer kısmını kaldır)
	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	// Token'ı doğrula ve kullanıcı ID'sini al
	userID, err := auth.VerifyToken(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz token", "details": err.Error()})
		return
	}

	// Veritabanı bağlantısını al
	db := database.DB

	// Kullanıcının daha önce mesajlaştığı kişileri bul
	// SQL sorgusu: Son mesajlaşma zamanına göre sıralanmış, benzersiz kullanıcı ID'leri
	type Result struct {
		UserID uint `gorm:"column:user_id"`
	}
	var results []Result

	query := `
		SELECT 
			CASE 
				WHEN sender_id = ? THEN receiver_id 
				ELSE sender_id 
			END as user_id,
			MAX(sent_at) as last_message
		FROM messages
		WHERE sender_id = ? OR receiver_id = ?
		GROUP BY user_id
		ORDER BY last_message DESC
	`

	if err := db.Raw(query, userID, userID, userID).Scan(&results).Error; err != nil {
		fmt.Println("Sorgu hatası:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Mesajlaşma geçmişi alınamadı", "details": err.Error()})
		return
	}

	// ID listesini çıkar
	var userIDs []uint
	for _, r := range results {
		userIDs = append(userIDs, r.UserID)
	}

	// Kullanıcı bilgilerini getir
	type UserInfo struct {
		ID           uint   `json:"id"`
		Username     string `json:"username"`
		FullName     string `json:"fullName" gorm:"column:full_name"`
		ProfileImage string `json:"profileImage" gorm:"column:profile_image"`
	}
	var users []UserInfo

	if len(userIDs) > 0 {
		if err := db.Table("users").
			Select("id, username, full_name, profile_image").
			Where("id IN ?", userIDs).
			Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı bilgileri alınamadı", "details": err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}
