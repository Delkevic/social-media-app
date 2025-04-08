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

// Keşfet için reelsleri getirme
func GetExploreReels(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Sorgu limiti
	limit := 10
	if limitParam := c.DefaultQuery("limit", "10"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Popüler reelsleri getir (beğeni ve görüntüleme sayısına göre)
	var reels []models.Reels
	query := database.DB.
		Order("like_count DESC, view_count DESC, created_at DESC").
		Limit(limit)

	// Reels verilerini yükle - User ilişkisini preload et
	result := query.Preload("User").Find(&reels)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Keşfet reelsleri yüklenirken bir hata oluştu: " + result.Error.Error(),
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

		// Yanıt için reel bilgilerini hazırla
		reelsResponse = append(reelsResponse, gin.H{
			"id":           reel.ID,
			"caption":      reel.Caption,
			"videoURL":     reel.VideoURL,
			"thumbnail":    "",            // Modelde alan yoksa boş string ekliyoruz
			"media_url":    reel.VideoURL, // Frontend ile uyum için
			"music":        reel.Music,
			"duration":     reel.Duration,
			"user":         reel.User,
			"likes":        reel.LikeCount, // Frontend ile uyum için
			"likeCount":    reel.LikeCount,
			"commentCount": reel.CommentCount,
			"shareCount":   reel.ShareCount,
			"viewCount":    reel.ViewCount,
			"isLiked":      isLiked,
			"isSaved":      isSaved,
			"createdAt":    reel.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Keşfet reelsleri başarıyla getirildi",
		Data:    reelsResponse,
	})
}

// Reels listesini getirme
func GetReels(c *gin.Context) {
	userID, _ := c.Get("userID")
	feed := c.DefaultQuery("feed", "explore")

	var reels []models.Reels
	var query *gorm.DB

	// Feed tipine göre sorguyu yapılandır
	switch feed {
	case "following":
		// Takip ettigği kullanıcıların reelleri
		query = database.DB.Joins("JOIN follows ON follows.following_id = reels.user_id").
			Where("follows.follower_id = ?", userID).
			Order("reels.created_at DESC")
	case "trending":
		// En çok begeni alan reeller
		query = database.DB.Order("like_count DESC, view_count DESC, created_at DESC")
	default: // "explore"
		// Tüm reeller
		query = database.DB.Order("created_at DESC")
	}

	// Reels verilerini yükle - User ilisşkisini preload et
	result := query.Preload("User").Find(&reels)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reels yüklenirken bir hata olusştu: " + result.Error.Error(),
		})
		return
	}

	// Her bir reel için kullanıcı begeni durumunu kontrol et
	reelsResponse := make([]gin.H, 0)
	for _, reel := range reels {
		// Kullanıcının begeni durumunu kontrol et
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

		// Her bir reel için görüntülenme sayısını artır
		database.DB.Model(&models.Reels{}).Where("id = ?", reel.ID).
			Update("view_count", gorm.Expr("view_count + ?", 1))

		// Yanıt için reel bilgilerini hazırla
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

// Yeni Reel olusşturma
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
			Message: "Gecersiz istek: " + err.Error(),
		})
		return
	}

	// Videoyu dogrula
	if input.VideoURL == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Video URL'si gereklidir",
		})
		return
	}

	// Yeni Reel olusştur
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
			Message: "Reel kaydedilirken bir hata olusştu: " + result.Error.Error(),
		})
		return
	}

	// Kullanıcı bilgisini yükle
	database.DB.Preload("User").First(&newReel, newReel.ID)

	c.JSON(http.StatusCreated, Response{
		Success: true,
		Message: "Reel başarıyla olusşturuldu",
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

// Reel begeni
func LikeReel(c *gin.Context) {
	userID, _ := c.Get("userID")
	reelID := c.Param("id")

	// ReelID'yi dogrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Gecersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadıgını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Kullanıcının daha önce begeni begeniymişini kontrol et
	var existingLike models.ReelLike
	likeCheck := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).First(&existingLike)

	// Eğer daha önce begeniymişse, begeni ekle
	if likeCheck.RowsAffected == 0 {
		newLike := models.ReelLike{
			UserID:    userID.(uint),
			ReelID:    uint(reelIDUint),
			CreatedAt: time.Now(),
		}

		if err := database.DB.Create(&newLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Begeni eklenirken bir hata olusştu: " + err.Error(),
			})
			return
		}

		// Begeni sayısını artır
		database.DB.Model(&reel).Update("like_count", gorm.Expr("like_count + ?", 1))

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel başarıyla begendi",
		})
	} else {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu reeli zaten begendiniz",
		})
	}
}

// Reel begeniği geri alma
func UnlikeReel(c *gin.Context) {
	userID, _ := c.Get("userID")
	reelID := c.Param("id")

	// ReelID'yi dogrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Gecersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadıgını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Kullanıcının begeniğini bul ve sil
	result := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).Delete(&models.ReelLike{})

	if result.RowsAffected > 0 {
		// Begeni sayısını azalt
		database.DB.Model(&reel).Update("like_count", gorm.Expr("like_count - ?", 1))

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel begeniği başarıyla kaldırıldı",
		})
	} else {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu reeli zaten begenmediniz",
		})
	}
}

// Reel paylasım sayısını artırma
func ShareReel(c *gin.Context) {
	reelID := c.Param("id")

	// ReelID'yi dogrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Gecersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadıgını kontrol et
	var reel models.Reels
	if err := database.DB.First(&reel, reelIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı",
		})
		return
	}

	// Paylasım sayısını artır
	result := database.DB.Model(&reel).Update("share_count", gorm.Expr("share_count + ?", 1))
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Paylasım sayısı güncellenirken hata olusştu: " + result.Error.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Reel paylasım sayısı güncellenmiştir",
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
			Message: "Reeller getirilirken bir hata olusştu: " + err.Error(),
		})
		return
	}

	// Her bir reel için kullanıcı begeni durumunu kontrol et
	reelsResponse := make([]gin.H, 0)
	for _, reel := range reels {
		// Kullanıcının begeni durumunu kontrol et
		var isLiked bool
		likeCheck := database.DB.Table("reel_likes").
			Where("user_id = ? AND reel_id = ?", currentUserID, reel.ID).
			First(&models.ReelLike{})
		isLiked = likeCheck.RowsAffected > 0

		// Yanıt için reel bilgilerini hazırla
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

	// ReelID'yi dogrula
	reelIDUint, err := strconv.ParseUint(reelID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Gecersiz reel ID",
		})
		return
	}

	// Reelin var olup olmadıgını ve kullanıcıya ait olup olmadıgını kontrol et
	var reel models.Reels
	if err := database.DB.Where("id = ? AND user_id = ?", reelIDUint, userID).First(&reel).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Reel bulunamadı veya bu reeli silme yetkiniz yok",
		})
		return
	}

	// Ilisşkili begeniğileri sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.ReelLike{})

	// Ilisşkili kaydetmeleri sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.SavedReel{})

	// Ilisşkili yorumları sil
	database.DB.Where("reel_id = ?", reelIDUint).Delete(&models.Comment{})

	// Reeli sil
	if err := database.DB.Delete(&reel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Reel silinirken bir hata olusştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Reel başarıyla silindi",
	})
}

// SaveReel - Kullanıcının bir reeli kaydetmesi
func SaveReel(c *gin.Context) {
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

	// Kullanıcının zaten kaydetmiş olup olmadığını kontrol et
	var savedReel models.SavedReel
	result := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).First(&savedReel)

	// Eğer daha önce kaydedilmemişse, kaydet
	if result.RowsAffected == 0 {
		newSavedReel := models.SavedReel{
			UserID: userID.(uint),
			ReelID: uint(reelIDUint),
		}

		if err := database.DB.Create(&newSavedReel).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Reel kaydedilirken bir hata oluştu: " + err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel başarıyla kaydedildi",
		})
	} else {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu reel zaten kaydedilmiş",
		})
	}
}

// UnsaveReel - Kullanıcının kaydettiği bir reeli kaldırması
func UnsaveReel(c *gin.Context) {
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

	// Kaydı sil
	result := database.DB.Where("user_id = ? AND reel_id = ?", userID, reelIDUint).Delete(&models.SavedReel{})

	if result.RowsAffected > 0 {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Reel kayıtlardan kaldırıldı",
		})
	} else {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kaydedilmiş reel bulunamadı",
		})
	}
}
