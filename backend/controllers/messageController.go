// controllers/messageController.go
package controllers

import (
	"fmt"
	"log"
	"net/http"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// Message yapısı istemcilerden gelen mesaj formatı
type Message struct {
	SenderID   uint   `json:"senderId"`
	ReceiverID uint   `json:"receiverId"`
	Content    string `json:"content"`
	MediaURL   string `json:"mediaUrl"`
	MediaType  string `json:"mediaType"`
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

// Notification servisi
var notifService *services.NotificationService

// SetNotificationService - Notification servisini controller seviyesinde ayarlar
func SetNotificationService(service *services.NotificationService) {
	notifService = service
	log.Println("MessageController: Notification servisi ayarlandı")
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

// SendMessage mesaj gönderir (HTTP REST API üzerinden)
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
		ToUserID:   message.ReceiverID,
		FromUserID: message.SenderID,
		Type:       "message",
		Message:    message.Content,
		IsRead:     false,
		CreatedAt:  time.Now(),
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

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    response,
	})
}

// SendTypingStatus yazma durumunu karşı tarafa bildirir
func SendTypingStatus(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Hedef kullanıcı ID'sini al
	targetIDStr := c.Param("userId")
	_, err := strconv.ParseUint(targetIDStr, 10, 32)
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

	// WebSocket üzerinden gönderim olmadığından başarılı yanıt ver
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Yazma durumu kaydedildi",
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

// GetUnreadMessageCount okunmamış mesaj sayısını döndürür
func GetUnreadMessageCount(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Okunmamış mesaj sayısını getir
	var unreadCount int64
	if err := database.DB.Model(&models.Message{}).Where("receiver_id = ? AND is_read = ?", userID, false).Count(&unreadCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Okunmamış mesaj sayısı alınırken hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"unreadCount": unreadCount,
		},
	})
}

// MarkAllMessagesAsRead belirli bir gönderenden gelen tüm mesajları okundu olarak işaretler
func MarkAllMessagesAsRead(c *gin.Context) {
	// Kullanıcı kimliğini doğrula
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum açık değil",
		})
		return
	}

	// Gönderen kullanıcı ID'sini al
	senderIDStr := c.Param("userId")
	senderID, err := strconv.ParseUint(senderIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Bu gönderenden gelen tüm okunmamış mesajları okundu olarak işaretle
	result := database.DB.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", senderID, userID, false).
		Update("is_read", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Mesajlar okundu olarak işaretlenirken hata oluştu: " + result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: fmt.Sprintf("%d mesaj okundu olarak işaretlendi", result.RowsAffected),
		Data: map[string]int64{
			"updatedCount": result.RowsAffected,
		},
	})
}
