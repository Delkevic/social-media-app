package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// NotificationSettingsRequest bildirim ayarları request yapısı
type NotificationSettingsRequest struct {
	PushEnabled       *bool `json:"pushEnabled"`
	EmailEnabled      *bool `json:"emailEnabled"`
	LikesEnabled      *bool `json:"likesEnabled"`
	CommentsEnabled   *bool `json:"commentsEnabled"`
	FollowsEnabled    *bool `json:"followsEnabled"`
	MessagesEnabled   *bool `json:"messagesEnabled"`
	MentionsEnabled   *bool `json:"mentionsEnabled"`
	SystemEnabled     *bool `json:"systemEnabled"`
	NewsletterEnabled *bool `json:"newsletterEnabled"`
}

// Bildirimleri getirme
func GetNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")

	var notifications []models.Notification
	if err := database.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Bildirimler yüklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Bildirimler için kullanıcı bilgilerini yükle
	for i := range notifications {
		if notifications[i].SenderID > 0 {
			var fromUser models.User
			database.DB.Select("id, username, profile_image").First(&fromUser, notifications[i].SenderID)

			// Bildirim mesajına kullanıcı adını ekle
			notifications[i].Content = fromUser.Username + " " + notifications[i].Content
		}
	}

	// Yanıt için bildirimleri düzenle
	var responseNotifications []map[string]interface{}

	for _, notification := range notifications {
		notificationResponse := map[string]interface{}{
			"id":          notification.ID,
			"type":        notification.Type,
			"content":     notification.Content,
			"time":        formatTimeAgo(notification.CreatedAt),
			"isRead":      notification.IsRead,
			"referenceId": notification.ReferenceID,
		}

		responseNotifications = append(responseNotifications, notificationResponse)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"notifications": responseNotifications,
		},
	})
}

// Bildirimi okundu olarak işaretleme
func MarkNotificationAsRead(c *gin.Context) {
	userID, _ := c.Get("userID")
	notificationIDStr := c.Param("id")
	notificationID, _ := strconv.Atoi(notificationIDStr)

	// Bildirimi kontrol et
	var notification models.Notification
	result := database.DB.Where("id = ? AND user_id = ?", notificationID, userID).First(&notification)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Bildirim bulunamadı",
		})
		return
	}

	// Bildirimi okundu olarak işaretle
	if err := database.DB.Model(&notification).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Bildirim okundu olarak işaretlenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Bildirim okundu olarak işaretlendi",
	})
}

// GetNotificationSettings bildirim ayarlarını getirir
func GetNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.NotificationSettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Eğer ayarlar bulunamadıysa, varsayılan ayarlar oluştur
	if result.Error != nil {
		fmt.Printf("[INFO] Kullanıcı için bildirim ayarları bulunamadı (UserID: %v), varsayılan ayarlar oluşturuluyor\n", userID)
		settings = models.NotificationSettings{
			UserID:            userID.(uint),
			PushEnabled:       true,
			EmailEnabled:      true,
			LikesEnabled:      true,
			CommentsEnabled:   true,
			FollowsEnabled:    true,
			MessagesEnabled:   true,
			MentionsEnabled:   true,
			SystemEnabled:     true,
			NewsletterEnabled: false,
			CreatedAt:         time.Now(),
			UpdatedAt:         time.Now(),
		}

		// Veritabanına kaydet
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Varsayılan bildirim ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Bildirim ayarları oluşturulurken bir hata oluştu"})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    settings,
	})
}

// UpdateNotificationSettings bildirim ayarlarını günceller
func UpdateNotificationSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request NotificationSettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	var settings models.NotificationSettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur, varsa güncelle
	isNew := false
	if result.Error != nil {
		isNew = true
		settings = models.NotificationSettings{
			UserID: userID.(uint),
		}
	}

	// Request'ten gelen değerleri ayarlara ekle (nil olmayan değerler için)
	updates := make(map[string]interface{})
	if request.PushEnabled != nil {
		updates["PushEnabled"] = *request.PushEnabled
	}
	if request.EmailEnabled != nil {
		updates["EmailEnabled"] = *request.EmailEnabled
	}
	if request.LikesEnabled != nil {
		updates["LikesEnabled"] = *request.LikesEnabled
	}
	if request.CommentsEnabled != nil {
		updates["CommentsEnabled"] = *request.CommentsEnabled
	}
	if request.FollowsEnabled != nil {
		updates["FollowsEnabled"] = *request.FollowsEnabled
	}
	if request.MessagesEnabled != nil {
		updates["MessagesEnabled"] = *request.MessagesEnabled
	}
	if request.MentionsEnabled != nil {
		updates["MentionsEnabled"] = *request.MentionsEnabled
	}
	if request.SystemEnabled != nil {
		updates["SystemEnabled"] = *request.SystemEnabled
	}
	if request.NewsletterEnabled != nil {
		updates["NewsletterEnabled"] = *request.NewsletterEnabled
	}

	// Güncelleme zamanını ekle
	updates["UpdatedAt"] = time.Now()

	if isNew {
		// Tüm alanları varsayılan değerlerle doldur
		if request.PushEnabled == nil {
			settings.PushEnabled = true
		}
		if request.EmailEnabled == nil {
			settings.EmailEnabled = true
		}
		if request.LikesEnabled == nil {
			settings.LikesEnabled = true
		}
		if request.CommentsEnabled == nil {
			settings.CommentsEnabled = true
		}
		if request.FollowsEnabled == nil {
			settings.FollowsEnabled = true
		}
		if request.MessagesEnabled == nil {
			settings.MessagesEnabled = true
		}
		if request.MentionsEnabled == nil {
			settings.MentionsEnabled = true
		}
		if request.SystemEnabled == nil {
			settings.SystemEnabled = true
		}
		if request.NewsletterEnabled == nil {
			settings.NewsletterEnabled = false
		}

		// Diğer varsayılan değerleri ayarla
		settings.CreatedAt = time.Now()
		settings.UpdatedAt = time.Now()

		// Veritabanına yeni kayıt ekle
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Bildirim ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Bildirim ayarları oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Bildirim ayarları güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Bildirim ayarları güncellenirken bir hata oluştu"})
			return
		}
	}

	// Güncel ayarları tekrar al
	database.DB.Where("user_id = ?", userID).First(&settings)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Bildirim ayarları başarıyla güncellendi",
		Data:    settings,
	})
}
