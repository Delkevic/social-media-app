package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// FollowUser kullanıcı takip etme işlemi
func FollowUser(c *gin.Context) {
	followerID, _ := c.Get("userID")
	username := c.Param("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Kullanıcı adı belirtilmedi",
		})
		return
	}

	// Kullanıcı adına göre takip edilecek kullanıcıyı bul
	var followingUser models.User
	if err := database.DB.Where("username = ?", username).First(&followingUser).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Takip edilecek kullanıcı bulunamadı",
		})
		return
	}

	// Kendini takip edemezsin
	if followerID.(uint) == followingUser.ID {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Kendinizi takip edemezsiniz",
		})
		return
	}

	// Zaten takip ediliyor mu kontrol et
	var follow models.Follow
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingUser.ID).First(&follow)

	if result.Error == nil {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu kullanıcıyı zaten takip ediyorsunuz",
			Data: gin.H{
				"status": "following",
			},
		})
		return
	}

	// Kullanıcı hesabı gizli mi kontrol et
	if followingUser.IsPrivate {
		// Zaten bekleyen bir takip isteği var mı kontrol et
		var request models.FollowRequest
		if err := database.DB.Where("follower_id = ? AND following_id = ? AND status = ?",
			followerID, followingUser.ID, "pending").First(&request).Error; err == nil {
			c.JSON(http.StatusOK, Response{
				Success: true,
				Message: "Bu kullanıcıya zaten takip isteği gönderilmiş",
				Data: gin.H{
					"status": "pending",
				},
			})
			return
		}

		// Yeni takip isteği oluştur
		newRequest := models.FollowRequest{
			FollowerID:  followerID.(uint),
			FollowingID: followingUser.ID,
			Status:      "pending",
		}

		if err := database.DB.Create(&newRequest).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Takip isteği gönderilemedi: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Takip isteği gönderildi",
			Data: gin.H{
				"status": "pending",
			},
		})
		return
	}

	// Hesap herkese açık, direkt takip et
	newFollow := models.Follow{
		FollowerID:  followerID.(uint),
		FollowingID: followingUser.ID,
	}

	if err := database.DB.Create(&newFollow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Takip işlemi başarısız oldu: " + err.Error(),
		})
		return
	}

	// Takip eden kullanıcının bilgilerini al
	var follower models.User
	if err := database.DB.Select("id, username, full_name, profile_image").First(&follower, followerID).Error; err != nil {
		// Kullanıcı bilgileri alınamazsa, bildirim olmadan devam et
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Kullanıcı başarıyla takip edildi fakat bildirim gönderilemedi",
			Data: gin.H{
				"status": "following",
			},
		})
		return
	}

	// Takip bildirimi oluştur
	notification := models.Notification{
		UserID:      followingUser.ID,
		SenderID:    followerID.(uint),
		Type:        "follow",
		Content:     fmt.Sprintf("%s sizi takip etmeye başladı", follower.FullName),
		ReferenceID: newFollow.ID,
		IsRead:      false,
		CreatedAt:   time.Now(),
	}

	// Bildirimi veritabanına kaydet
	if err := database.DB.Create(&notification).Error; err != nil {
		// Bildirim kaydedilemezse kullanıcıya hata döndürmeden devam et
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Kullanıcı başarıyla takip edildi fakat bildirim gönderilemedi",
			Data: gin.H{
				"status": "following",
			},
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kullanıcı başarıyla takip edildi",
		Data: gin.H{
			"status": "following",
		},
	})
}

// UnfollowUser kullanıcı takibi bırakma işlemi
func UnfollowUser(c *gin.Context) {
	followerID, _ := c.Get("userID")
	username := c.Param("username")

	if username == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Kullanıcı adı belirtilmedi",
		})
		return
	}

	// Kullanıcı adına göre takip edilecek kullanıcıyı bul
	var followingUser models.User
	if err := database.DB.Where("username = ?", username).First(&followingUser).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Takipten çıkarılacak kullanıcı bulunamadı",
		})
		return
	}

	// Takip kaydını sil
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingUser.ID).Delete(&models.Follow{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Takip ilişkisi bulunamadı. Bu kullanıcıyı takip etmiyorsunuz.",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kullanıcı takibi bırakıldı",
		Data: gin.H{
			"status": "none",
		},
	})
}
