package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"social-media-app/backend/database"
	"social-media-app/backend/models"
)

// LikePost - Bir gönderiyi beğenir
func LikePost(c *gin.Context) {
	// Beğenilecek gönderi ID'sini al
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz gönderi ID"})
		return
	}

	// Kullanıcı ID (JWT token'dan)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gönderi bulunamadı"})
		return
	}

	// Kullanıcının gönderiye erişim izni var mı kontrol et
	if !CanViewPost(userID.(uint), post) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu gönderiye erişim izniniz yok"})
		return
	}

	// Zaten beğenildi mi kontrol et
	var existingLike models.Like
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&existingLike)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bu gönderiyi zaten beğendiniz"})
		return
	}

	// Yeni beğeni oluştur
	like := models.Like{
		UserID: userID.(uint),
		PostID: post.ID,
	}

	// Veritabanına kaydet
	if err := database.DB.Create(&like).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Beğeni kaydedilirken hata oluştu"})
		return
	}

	// Kullanıcı bilgilerini al (bildirim için)
	var currentUser models.User
	if err := database.DB.Select("id, username, full_name, profile_image").First(&currentUser, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı bilgileri alınamadı"})
		return
	}

	// Kendi gönderisini beğenmedi ise bildirim oluştur
	if post.UserID != userID.(uint) {
		notification := models.Notification{
			UserID:      post.UserID,
			SenderID:    userID.(uint),
			Type:        "like",
			Content:     fmt.Sprintf("%s gönderinizi beğendi", currentUser.FullName),
			ReferenceID: post.ID,
			IsRead:      false,
			CreatedAt:   time.Now(),
		}

		if err := database.DB.Create(&notification).Error; err != nil {
			// Bildirim oluşturulamazsa yine de beğeni işlemi başarılı sayılır
			c.JSON(http.StatusOK, gin.H{
				"message": "Gönderi beğenildi fakat bildirim oluşturulamadı",
				"like":    like,
			})
			return
		}
	}

	// Beğeni sayısını güncelle
	database.DB.Model(&post).Update("likes_count", gorm.Expr("likes_count + ?", 1))

	c.JSON(http.StatusOK, gin.H{"message": "Gönderi beğenildi", "like": like})
}
