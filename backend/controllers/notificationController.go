package controllers

import (
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

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
