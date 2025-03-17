package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Reels listesini getirme
func GetReels(c *gin.Context) {
	userID, _ := c.Get("userID")
	feed := c.DefaultQuery("feed", "explore")

	var reels []models.Reels
	var query *gorm.DB

	// Feed tipine göre sorguyu yapılandır
	switch feed {
	case "following":
		// Takip ettiği kullanıcıların reelleri
		query = database.DB.Joins("JOIN follows ON follows.following_id = reels.user_id").
			Where("follows.follower_id = ?", userID).
			Order("reels.created_at DESC")
	case "trending":
		// En çok beğeni alan reeller
		query = database.DB.Order("like_count DESC, view_count DESC, created_at DESC")
	default: // "explore"
		// Tüm reeller
		query = database.DB.Order("created_at DESC")
	}

	// Reels verilerini yükle - User ilişkisini preload et
	result := query.Preload("User").Find(&reels)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reels yüklenirken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Her bir reel için kullanıcı beğeni durumunu kontrol et
	reelsResponse := make([]gin.H, 0)
	for _, reel := range reels {
		// Kullanıcının beğeni durumunu kontrol et
		var isLiked bool
		likeCheck := database.DB.Table("reel_likes").
			Where("user_id = ? AND reel_id = ?", userID, reel.ID).
			First(&models.ReelLike{})
		isLiked = likeCheck.RowsAffected > 0

		// Kullanıcının kaydetme durumunu kontrol et
		var isSaved bool
		saveCheck := database.DB.Table("saved_reels").
			Where("user_id = ? AND reel_id = ?", userID, reel.ID).
			First(&models.SavedReel{})
		isSaved = saveCheck.RowsAffected > 0

		// Her bir reel için görüntülenme sayısını artır
		database.DB.Model(&models.Reels{}).Where("id = ?", reel.ID).
			Update("view_count", gorm.Expr("view_count + ?", 1))

		// Yanıt için reel bilgilerini hazırla
		reelsResponse = append(reelsResponse, gin.H{
			"id":           reel.ID,
			"caption":      reel.Caption,
			"videoURL":     reel.VideoURL,
			"music":        reel.Music,
			"duration":     reel.Duration,
			"user":         reel.User,
			"likeCount":    reel.LikeCount,
			"commentCount": reel.CommentCount,
			"shareCount":   reel.ShareCount,
			"viewCount":    reel.ViewCount + 1, // Görüntülenme sayısını artır
			"isLiked":      isLiked,
			"isSaved":      isSaved,
			"createdAt":    reel.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Reels başarıyla getirildi",
		Data:    reelsResponse,
	})
}

// Yeni Reel oluşturma
func CreateReel(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Reel bilgilerini al
	var input struct {
		Caption  string `json:"caption"`
		VideoURL string `json:"videoURL" binding:"required"`
		Music    string `json:"music"`
		Duration int    `json:"duration"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz istek: " + err.Error(),
		})
		return
	}

	// Videoyu doğrula
	if input.VideoURL == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Video URL'si gereklidir",
		})
		return
	}

	// Yeni Reel oluştur
	newReel := models.Reels{
		UserID:   userID.(uint),
		Caption:  input.Caption,
		VideoURL: input.VideoURL,
		Music:    input.Music,
		Duration: input.Duration,
	}

	// Veritabanına kaydet
	result := database.DB.Create(&newReel)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reel kaydedilirken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Kullanıcı bilgisini yükle
	database.DB.Preload("User").First(&newReel, newReel.ID)

	c.JSON(http.StatusCreated, Response{
		Success: true,
		Message: "Reel başarıyla oluşturuldu",
		Data: gin.H{
			"id":           newReel.ID,
			"caption":      newReel.Caption,
			"videoURL":     newReel.VideoURL,
			"music":        newReel.Music,
			"duration":     newReel.Duration,
			"user":         newReel.User,
			"likeCount":    newReel.LikeCount,
			"commentCount": newReel.CommentCount,
			"shareCount":   newReel.ShareCount,
			"viewCount":    newReel.ViewCount,
			"createdAt":    newReel.CreatedAt,
		},
	})
}

// Reel beğenme
func LikeReel(c *gin.Context) {
	userID, _ := c.Get("userID")
	reelID := c.Param("id")

	// ReelID'yi doğrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadığını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Kullanıcının daha önce beğenip beğenmediğini kontrol et
	var existingLike models.ReelLike
	likeCheck := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).First(&existingLike)

	// Eğer daha önce beğenmemişse, beğeni ekle
	if likeCheck.RowsAffected == 0 {
		newLike := models.ReelLike{
			UserID:    userID.(uint),
			ReelID:    uint(reelIDUint),
			CreatedAt: time.Now(),
		}

		if err := database.DB.Create(&newLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Beğeni eklenirken bir hata oluştu: " + err.Error(),
			})
			return
		}

		// Beğeni sayısını artır
		database.DB.Model(&reel).Update("like_count", gorm.Expr("like_count + ?", 1))

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel başarıyla beğenildi",
		})
	} else {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu reeli zaten beğendiniz",
		})
	}
}

// Reel beğenmeyi geri alma
func UnlikeReel(c *gin.Context) {
	userID, _ := c.Get("userID")
	reelID := c.Param("id")

	// ReelID'yi doğrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadığını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Kullanıcının beğenisini bul ve sil
	result := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).Delete(&models.ReelLike{})

	if result.RowsAffected > 0 {
		// Beğeni sayısını azalt
		database.DB.Model(&reel).Update("like_count", gorm.Expr("like_count - ?", 1))

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel beğenisi başarıyla kaldırıldı",
		})
	} else {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu reeli zaten beğenmediniz",
		})
	}
}

// Reel paylaşım sayısını artırma
func ShareReel(c *gin.Context) {
	reelID := c.Param("id")

	// ReelID'yi doğrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadığını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Paylaşım sayısını artır
	result := database.DB.Model(&reel).Update("share_count", gorm.Expr("share_count + ?", 1))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Paylaşım sayısı güncellenirken hata oluştu: " + result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Reel paylaşım sayısı güncellenmiştir",
		Data: gin.H{
			"shareCount": reel.ShareCount + 1,
		},
	})
}

// Kullanıcı Reellerini getirme
func GetUserReels(c *gin.Context) {
	username := c.Param("username")
	currentUserID, _ := c.Get("userID")

	// Kullanıcıyı bul
	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Kullanıcının reellerini getir
	var reels []models.Reels
	if err := database.DB.Where("user_id = ?", user.ID).Order("created_at DESC").Find(&reels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reeller getirilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Her bir reel için kullanıcı beğeni durumunu kontrol et
	reelsResponse := make([]gin.H, 0)
	for _, reel := range reels {
		// Kullanıcının beğeni durumunu kontrol et
		var isLiked bool
		likeCheck := database.DB.Table("reel_likes").
			Where("user_id = ? AND reel_id = ?", currentUserID, reel.ID).
			First(&models.ReelLike{})
		isLiked = likeCheck.RowsAffected > 0

		// Yanıt için reel bilgilerini hazırla
		reelsResponse = append(reelsResponse, gin.H{
			"id":           reel.ID,
			"caption":      reel.Caption,
			"videoURL":     reel.VideoURL,
			"music":        reel.Music,
			"duration":     reel.Duration,
			"likeCount":    reel.LikeCount,
			"commentCount": reel.CommentCount,
			"shareCount":   reel.ShareCount,
			"viewCount":    reel.ViewCount,
			"isLiked":      isLiked,
			"createdAt":    reel.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: fmt.Sprintf("%s kullanıcısının reelleri başarıyla getirildi", username),
		Data:    reelsResponse,
	})
}

// Reel silme
func DeleteReel(c *gin.Context) {
	userID, _ := c.Get("userID")
	reelID := c.Param("id")

	// ReelID'yi doğrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadığını ve kullanıcıya ait olup olmadığını kontrol et
	var reel models.Reels
	if err := database.DB.Where("id = ? AND user_id = ?", reelIDUint, userID).First(&reel).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı veya bu reeli silme yetkiniz yok",
		})
		return
	}

	// İlişkili beğenileri sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.ReelLike{})

	// İlişkili kaydetmeleri sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.SavedReel{})

	// İlişkili yorumları sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.Comment{})

	// Reeli sil
	if err := database.DB.Delete(&reel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reel silinirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Reel başarıyla silindi",
	})
}
