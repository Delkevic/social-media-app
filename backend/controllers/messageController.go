// controllers/messageController.go
package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Geliştirme aşamasında tüm originleri kabul et
		return true
	},
}

// Bağlantı havuzu - kullanıcı ID'si ile WebSocket bağlantılarını eşleştir
var connections = make(map[uint]*websocket.Conn)

// Mesaj yapısı
type Message struct {
	SenderID   uint      `json:"senderId"`
	ReceiverID uint      `json:"receiverId"`
	Content    string    `json:"content"`
	MediaURL   string    `json:"mediaUrl,omitempty"`
	MediaType  string    `json:"mediaType,omitempty"`
	SentAt     time.Time `json:"sentAt"`
	IsRead     bool      `json:"isRead"`
}

// Mesaj yanıtı
type MessageResponse struct {
	ID         uint      `json:"id"`
	SenderID   uint      `json:"senderId"`
	ReceiverID uint      `json:"receiverId"`
	Content    string    `json:"content"`
	MediaURL   string    `json:"mediaUrl,omitempty"`
	MediaType  string    `json:"mediaType,omitempty"`
	SentAt     time.Time `json:"sentAt"`
	IsRead     bool      `json:"isRead"`
	SenderInfo UserInfo  `json:"senderInfo"`
}

// Kısa kullanıcı bilgisi
type UserInfo struct {
	ID           uint   `json:"id"`
	Username     string `json:"username"`
	FullName     string `json:"fullName"`
	ProfileImage string `json:"profileImage"`
}

// WebSocketHandler gerçek zamanlı mesajlaşma için WebSocket bağlantıları yönetir
func WebSocketHandler(c *gin.Context) {
	fmt.Println("WebSocket bağlantı isteği alındı")

	// WebSocket bağlantısını yükselt
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		fmt.Println("WebSocket yükseltme hatası:", err)
		return
	}

	// Bağlantıyı kapatma işlemi (defer)
	defer func() {
		conn.Close()
		fmt.Println("WebSocket bağlantısı kapatıldı")
	}()

	// İlk mesajı bekle (token doğrulama için)
	_, p, err := conn.ReadMessage()
	if err != nil {
		fmt.Println("İlk mesaj okuma hatası:", err)
		return
	}

	// Auth mesajını parse et
	var authMessage struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}

	if err := json.Unmarshal(p, &authMessage); err != nil {
		fmt.Println("Auth mesajı ayrıştırma hatası:", err)
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Geçersiz auth mesajı formatı"}`))
		return
	}

	if authMessage.Type != "auth" || authMessage.Token == "" {
		fmt.Println("Geçersiz auth mesajı:", authMessage)
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Geçersiz token veya auth tipi"}`))
		return
	}

	// Token'ı doğrula
	userID, err := auth.VerifyToken(authMessage.Token)
	if err != nil {
		fmt.Println("Token doğrulama hatası:", err)
		conn.WriteMessage(websocket.TextMessage, []byte(`{"error": "Geçersiz token"}`))
		return
	}

	// Kullanıcının önceden açık bir bağlantısı varsa kapat
	if existingConn, ok := connections[userID]; ok {
		existingConn.Close()
	}

	// Yeni bağlantıyı havuza ekle
	connections[userID] = conn
	fmt.Printf("Kullanıcı %d WebSocket bağlantısı kurdu\n", userID)

	// Bağlantı sonlandığında temizle
	defer func() {
		delete(connections, userID)
		fmt.Printf("Kullanıcı %d WebSocket bağlantısı sonlandı\n", userID)
	}()

	// Bağlantı başarılı mesajı gönder
	conn.WriteMessage(websocket.TextMessage, []byte(`{"success": true, "message": "WebSocket bağlantısı kuruldu"}`))

	// Mesajları dinle
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				fmt.Printf("WebSocket okuma hatası: %v\n", err)
			}
			break
		}

		// Gelen mesajı işle
		var message Message
		if err := json.Unmarshal(p, &message); err != nil {
			fmt.Printf("Mesaj ayrıştırma hatası: %v\n", err)
			continue
		}

		// Gönderen ID'sini doğrula
		if message.SenderID != userID {
			fmt.Printf("Kimlik doğrulama hatası: Gönderen ID'si (%d) oturum ID'si (%d) ile eşleşmiyor\n", message.SenderID, userID)
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
			fmt.Printf("Mesaj kaydetme hatası: %v\n", result.Error)
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
			fmt.Printf("JSON dönüştürme hatası: %v\n", err)
			continue
		}

		// Mesajı gönderene ilet
		if err := conn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
			fmt.Printf("Gönderene ileti hatası: %v\n", err)
		}

		// Alıcı çevrimiçiyse mesajı ona da ilet
		if receiverConn, ok := connections[message.ReceiverID]; ok {
			if err := receiverConn.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
				fmt.Printf("Alıcıya ileti hatası: %v\n", err)
			} else {
				// Mesaj başarıyla gönderildi, okundu olarak işaretle
				// Not: Burada gerçekten "okundu" değil, "teslim edildi" işaretliyoruz
				database.DB.Model(&models.Message{}).Where("id = ?", newMessage.ID).Update("is_delivered", true)
			}
		}

		// Bildirim oluştur
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
	}
}

// GetConversations kullanıcının konuşmalarını listeler
func GetConversations(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Oturum açık değil"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Konuşmalar alınırken bir hata oluştu: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    conversations,
	})
}

// GetConversation belirli bir kullanıcıyla olan konuşmayı getirir
func GetConversation(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Oturum açık değil"})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz kullanıcı ID"})
		return
	}

	// Mesajları getir
	var messages []models.Message
	result := database.DB.Where(
		"(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		userID, targetID, targetID, userID,
	).Order("sent_at ASC").Find(&messages)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Mesajlar alınırken bir hata oluştu: " + result.Error.Error()})
		return
	}

	// Hedef kullanıcının bilgilerini al
	var targetUser models.User
	if err := database.DB.Select("id, username, full_name, profile_image").First(&targetUser, targetID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Kullanıcı bulunamadı"})
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"messages": formattedMessages,
			"user": gin.H{
				"id":           targetUser.ID,
				"username":     targetUser.Username,
				"fullName":     targetUser.FullName,
				"profileImage": targetUser.ProfileImage,
			},
		},
	})
}

// SendMessage mesaj gönderir (WebSocket için yedek olarak REST API)
func SendMessage(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Oturum açık değil"})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz kullanıcı ID"})
		return
	}

	// Giriş verilerini al
	var input struct {
		Content   string `json:"content" binding:"required"`
		MediaURL  string `json:"mediaUrl"`
		MediaType string `json:"mediaType"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz mesaj verisi: " + err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Mesaj kaydedilirken bir hata oluştu: " + err.Error()})
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// SendTypingStatus yazma durumunu karşı tarafa bildirir
func SendTypingStatus(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Oturum açık değil"})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	targetID, err := strconv.ParseUint(targetIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz kullanıcı ID"})
		return
	}

	// Giriş verilerini al
	var input struct {
		IsTyping bool `json:"isTyping" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz veri: " + err.Error()})
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yazma durumu gönderildi",
	})
}
