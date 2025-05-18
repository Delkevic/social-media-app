package controllers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Gönderi listesini getirme
func GetPosts(c *gin.Context) {
	userID, _ := c.Get("userID")
	feed := c.DefaultQuery("feed", "general")

	var posts []models.Post
	var query *gorm.DB

	// Feed tipine göre sorguyu yapılandır
	switch feed {
	case "following":
		// Takip ettiği kullanıcıların gönderileri
		query = database.DB.Joins("JOIN follows ON follows.following_id = posts.user_id").
			Where("follows.follower_id = ?", userID).
			Order("posts.created_at DESC")
	case "trending":
		// En çok beğeni alan gönderiler - "likes_count" yerine "like_count" kullanıyoruz
		query = database.DB.Order("like_count DESC, created_at DESC")
	default: // "general"
		// Tüm gönderiler
		query = database.DB.Order("created_at DESC")
	}

	// Gönderi verilerini yükle - Images ve User ilişkilerini de preload et
	result := query.Preload("User").Preload("Images").Find(&posts)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Gönderiler yüklenirken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Yanıtı hazırla
	responsePosts := make([]map[string]interface{}, 0)

	for _, post := range posts {
		// Kullanıcının bu gönderiyi beğenip beğenmediğini kontrol et
		var likedCount int64
		database.DB.Model(&models.Like{}).
			Where("user_id = ? AND post_id = ?", userID, post.ID).
			Count(&likedCount)

		// Kullanıcının bu gönderiyi kaydedip kaydetmediğini kontrol et
		var savedCount int64
		database.DB.Model(&models.SavedPost{}).
			Where("user_id = ? AND post_id = ?", userID, post.ID).
			Count(&savedCount)

		// Görsel URL'lerini derle
		var imageURLs []string
		for _, image := range post.Images {
			imageURLs = append(imageURLs, image.URL)
		}

		// Gönderi yanıtını oluştur
		responsePost := map[string]interface{}{
			"id":        post.ID,
			"content":   post.Content,
			"caption":   post.Caption,
			"tags":      strings.Split(post.TagsString, ","),
			"likes":     post.LikeCount,
			"comments":  post.CommentCount,
			"createdAt": formatTimeAgo(post.CreatedAt),
			"liked":     likedCount > 0,
			"saved":     savedCount > 0,
			"images":    imageURLs,
			"user": map[string]interface{}{
				"id":           post.User.ID,
				"username":     post.User.Username,
				"profileImage": post.User.ProfileImage,
			},
		}

		// Eğer TagsString boşsa boş dizi döndür
		if post.TagsString == "" {
			responsePost["tags"] = []string{}
		}

		responsePosts = append(responsePosts, responsePost)
	}

	// Ekstra kontrol: Eğer posts boşsa, responsePosts'un yine de boş slice olduğundan emin olalım
	// (Normalde make ile bu zaten garanti ama ekstra güvence için)
	if len(posts) == 0 {
		responsePosts = make([]map[string]interface{}, 0)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"posts": responsePosts,
		},
	})
}

// Gönderi oluşturma
func CreatePost(c *gin.Context) {
	userID, _ := c.Get("userID")

	var request struct {
		Content  string   `json:"content"`
		Caption  string   `json:"caption"` // Başlık alanı
		Tags     string   `json:"tags"`    // Virgülle ayrılmış etiketler
		Images   []string `json:"images"`
		ImageUrl string   `json:"imageUrl"` // Cloudinary'den gelen tek URL için
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz gönderi verisi: " + err.Error(),
		})
		return
	}

	// En az bir içerik veya görsel olmalı
	if request.Content == "" && len(request.Images) == 0 && request.ImageUrl == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Gönderi içeriği veya en az bir görsel gereklidir",
		})
		return
	}

	// Yeni gönderi oluştur
	post := models.Post{
		UserID:     userID.(uint),
		Content:    request.Content,
		Caption:    request.Caption,
		TagsString: request.Tags, // Veritabanında string olarak saklıyoruz
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Tags alanını doldur - view'da kullanmak için
	if request.Tags != "" {
		post.Tags = strings.Split(request.Tags, ",")
		// Boşlukları temizle
		for i, tag := range post.Tags {
			post.Tags[i] = strings.TrimSpace(tag)
		}
	}

	// İşlem için transaction başlat
	tx := database.DB.Begin()

	// Veritabanına kaydet
	if err := tx.Create(&post).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Gönderi oluşturulurken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Görselleri işle
	var imageURLs []string

	// Tek ImageUrl varsa, Images dizisine ekle
	if request.ImageUrl != "" {
		// Cloudinary URL'ini işle
		postImage := models.PostImage{
			PostID:    post.ID,
			URL:       request.ImageUrl,
			CreatedAt: time.Now(),
		}

		if err := tx.Create(&postImage).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Cloudinary görseli kaydedilirken bir hata oluştu: " + err.Error(),
			})
			return
		}

		imageURLs = append(imageURLs, request.ImageUrl)
	}

	// Images dizisindeki URL'leri işle (eğer varsa)
	for _, imageURL := range request.Images {
		// Boş URL'leri atla
		if imageURL == "" {
			continue
		}

		postImage := models.PostImage{
			PostID:    post.ID,
			URL:       imageURL,
			CreatedAt: time.Now(),
		}

		if err := tx.Create(&postImage).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Görsel kaydedilirken bir hata oluştu: " + err.Error(),
			})
			return
		}

		imageURLs = append(imageURLs, imageURL)
	}

	// Transaction'ı commit et
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "İşlem tamamlanırken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Kullanıcı bilgisini al
	var user models.User
	database.DB.First(&user, userID)

	// Gönderi oluşturulduğunda takipçilere bildirim gönder
	type Follower struct {
		ID uint
	}
	var followers []Follower

	// Kullanıcının takipçilerini bul
	if err := database.DB.Table("follows").
		Select("follower_id as id").
		Where("following_id = ? AND status = ?", userID, "active").
		Find(&followers).Error; err != nil {
		fmt.Printf("Takipçiler aranırken hata: %v\n", err)
		// Hata olsa bile gönderi oluşturma işlemi tamamlanmalı
	} else {
		// Bildirimleri oluştur
		for _, follower := range followers {
			notification := models.Notification{
				ToUserID:   follower.ID,   // Takipçiye bildirim gönder
				FromUserID: userID.(uint), // Gönderiyi oluşturan kullanıcı
				Type:       "post",
				Message:    fmt.Sprintf("%s yeni bir gönderi paylaştı", user.FullName),
				IsRead:     false,
				CreatedAt:  time.Now(),
			}

			if err := database.DB.Create(&notification).Error; err != nil {
				fmt.Printf("Gönderi bildirimi oluşturulurken hata: %v\n", err)
				// Bildirimin oluşturulamaması gönderi işlemini engellememelidir
			} else {
				fmt.Printf("Gönderi bildirimi oluşturuldu. Gönderi %d -> Kullanıcı %d\n", post.ID, follower.ID)
				// WebSocket üzerinden bildirim gönder (opsiyonel)
				if notifService != nil {
					wsNotification := services.Notification{
						ID:            fmt.Sprintf("%d", notification.ID),
						UserID:        fmt.Sprintf("%d", notification.ToUserID),
						ActorID:       fmt.Sprintf("%d", notification.FromUserID),
						ActorName:     user.FullName,
						ActorUsername: user.Username,
						Type:          services.NotificationTypePost,
						Content:       notification.Message,
						EntityID:      fmt.Sprintf("%d", post.ID),
						EntityType:    "post",
						IsRead:        notification.IsRead,
						CreatedAt:     notification.CreatedAt,
					}

					if err := notifService.SendNotification(c.Request.Context(), wsNotification); err != nil {
						fmt.Printf("WebSocket bildirimi gönderilemedi: %v\n", err)
					}
				}
			}
		}
	}

	// Yanıt oluştur
	c.JSON(http.StatusCreated, Response{
		Success: true,
		Message: "Gönderi başarıyla oluşturuldu",
		Data: map[string]interface{}{
			"post": map[string]interface{}{
				"id":        post.ID,
				"content":   post.Content,
				"caption":   post.Caption,
				"tags":      post.Tags, // Burada Tags dizisini doğrudan kullanabiliriz
				"likes":     0,
				"comments":  0,
				"createdAt": "Şimdi",
				"liked":     false,
				"saved":     false,
				"images":    imageURLs,
				"user": map[string]interface{}{
					"id":           user.ID,
					"username":     user.Username,
					"profileImage": user.ProfileImage,
				},
			},
		},
	})
}

// Belirli bir gönderiyi getirme
func GetPostById(c *gin.Context) {
	userID, _ := c.Get("userID")
	postID := c.Param("id")

	var post models.Post
	if err := database.DB.Preload("User").Preload("Images").First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Kullanıcının gönderiyi beğenip beğenmediğini kontrol et
	var likeCount int64
	database.DB.Model(&models.Like{}).
		Where("user_id = ? AND post_id = ?", userID, post.ID).
		Count(&likeCount)

	// Kullanıcının gönderiyi kaydedip kaydetmediğini kontrol et
	var saveCount int64
	database.DB.Model(&models.SavedPost{}).
		Where("user_id = ? AND post_id = ?", userID, post.ID).
		Count(&saveCount)

	// Görsel URL'lerini derle
	var imageURLs []string
	for _, image := range post.Images {
		imageURLs = append(imageURLs, image.URL)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"post": map[string]interface{}{
				"id":        post.ID,
				"content":   post.Content,
				"caption":   post.Caption,
				"tags":      strings.Split(post.TagsString, ","),
				"likes":     post.LikeCount,
				"comments":  post.CommentCount,
				"createdAt": formatTimeAgo(post.CreatedAt),
				"liked":     likeCount > 0,
				"saved":     saveCount > 0,
				"images":    imageURLs,
				"user": map[string]interface{}{
					"id":           post.User.ID,
					"username":     post.User.Username,
					"profileImage": post.User.ProfileImage,
				},
			},
		},
	})
}

// ToggleLike beğeni durumunu değiştirir
func ToggleLike(c *gin.Context) {
	// Kullanıcı kimliğini al
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı oturumu bulunamadı"})
		return
	}

	// Post ID'yi al
	postIDStr := c.Param("id")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz gönderi ID'si"})
		return
	}

	// Postu kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gönderi bulunamadı"})
		return
	}

	// Beğeni durumunu kontrol et
	var like models.Like
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&like)
	liked := true

	// Eğer beğeni varsa kaldır, yoksa ekle
	if result.Error == nil {
		// Beğeni var, kaldır
		database.DB.Delete(&like)
		database.DB.Model(&post).Update("like_count", post.LikeCount-1)
		liked = false
	} else {
		// Beğeni yok, ekle
		newLike := models.Like{
			UserID: userID.(uint),
			PostID: uint(postID),
		}
		database.DB.Create(&newLike)
		database.DB.Model(&post).Update("like_count", post.LikeCount+1)

		// Kullanıcı kendi postunu beğenmiyorsa bildirim oluştur
		if post.UserID != userID.(uint) {
			// Beğeniyi yapan kullanıcı bilgilerini al
			var user models.User
			database.DB.Select("id, username").First(&user, userID)

			// Bildirim oluştur
			notification := models.Notification{
				ToUserID:   post.UserID,
				FromUserID: userID.(uint),
				Type:       "like",
				Message:    user.Username + " gönderinizi beğendi",
				IsRead:     false,
			}

			if err := database.DB.Create(&notification).Error; err != nil {
				// Bildirim oluşturulamazsa sadece log kaydı tut, ana işlemi etkileme
				log.Printf("Bildirim oluşturma hatası: %v", err)
			}
		}
	}

	var message string
	if liked {
		message = "Gönderi beğenildi"
	} else {
		message = "Gönderi beğenisi kaldırıldı"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": message,
		"liked":   liked,
	})
}

// Gönderi beğenisini kaldırma
func UnlikePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Beğeniyi sil
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Delete(&models.Like{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Bu gönderi beğenilmemiş",
		})
		return
	}

	// Gönderi beğeni sayısını azalt
	if post.LikeCount > 0 {
		database.DB.Model(&post).Update("like_count", post.LikeCount-1)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Gönderi beğenisi başarıyla kaldırıldı",
	})
}

// Gönderiyi kaydetme
func SavePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Kaydı kontrol et (zaten kaydedilmiş mi?)
	var existingSave models.SavedPost
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&existingSave)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Bu gönderi zaten kaydedilmiş",
		})
		return
	}

	// Kayıt oluştur - created_at sütunu olmadığı için field list'ten çıkarıyoruz
	savedPost := models.SavedPost{
		UserID: userID.(uint),
		PostID: uint(postID),
	}

	// Kaydı ekle
	if err := database.DB.Omit("created_at").Create(&savedPost).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Gönderi kaydedilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Gönderi başarıyla kaydedildi",
	})
}

// Gönderi kaydını kaldırma
func UnsavePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Kaydı sil
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Delete(&models.SavedPost{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Bu gönderi kaydedilmemiş",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Gönderi kaydı başarıyla kaldırıldı",
	})
}

// Kullanıcının kaydettiği gönderileri getirme
func GetSavedPosts(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Kaydedilen gönderileri al
	var savedPostIDs []uint
	database.DB.Model(&models.SavedPost{}).
		Where("user_id = ?", userID).
		Pluck("post_id", &savedPostIDs)

	if len(savedPostIDs) == 0 {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Data: map[string]interface{}{
				"posts": []interface{}{},
			},
		})
		return
	}

	// Gönderileri getir
	var posts []models.Post
	if err := database.DB.Preload("User").Preload("Images").
		Where("id IN ?", savedPostIDs).
		Order("created_at DESC").
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Kaydedilen gönderiler yüklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Yanıtı hazırla
	var responsePosts []map[string]interface{}
	for _, post := range posts {
		// Kullanıcının bu gönderiyi beğenip beğenmediğini kontrol et
		var likedCount int64
		database.DB.Model(&models.Like{}).
			Where("user_id = ? AND post_id = ?", userID, post.ID).
			Count(&likedCount)

		// Görsel URL'lerini derle
		var imageURLs []string
		for _, image := range post.Images {
			imageURLs = append(imageURLs, image.URL)
		}

		// Gönderi yanıtını oluştur
		responsePost := map[string]interface{}{
			"id":        post.ID,
			"content":   post.Content,
			"caption":   post.Caption,
			"tags":      strings.Split(post.TagsString, ","),
			"likes":     post.LikeCount,
			"comments":  post.CommentCount,
			"createdAt": formatTimeAgo(post.CreatedAt),
			"liked":     likedCount > 0,
			"saved":     true, // Zaten kaydedilmiş olduğunu biliyoruz
			"images":    imageURLs,
			"user": map[string]interface{}{
				"id":           post.User.ID,
				"username":     post.User.Username,
				"profileImage": post.User.ProfileImage,
			},
		}

		// Eğer TagsString boşsa boş dizi döndür
		if post.TagsString == "" {
			responsePost["tags"] = []string{}
		}

		responsePosts = append(responsePosts, responsePost)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"posts": responsePosts,
		},
	})
}

// Gönderiyi silme
func DeletePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postID := c.Param("id")

	// Gönderiyi bul
	var post models.Post
	if err := database.DB.Preload("User").Preload("Images").First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Gönderi bulunamadı",
		})
		return
	}

	// Gönderi sahibi kontrolü
	if post.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Bu gönderiyi silme yetkiniz yok",
		})
		return
	}

	// Transaction başlat
	tx := database.DB.Begin()

	// Görselleri fiziksel olarak sil
	workDir, err := os.Getwd()
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Sistem hatası: Çalışma dizini alınamadı",
		})
		return
	}

	for _, image := range post.Images {
		imagePath := filepath.Join(workDir, "uploads", "images", filepath.Base(image.URL))
		if err := os.Remove(imagePath); err != nil {
			// Dosya silme hatası olsa bile devam et, sadece loglama yap
			fmt.Printf("Görsel silinirken hata: %s - %s\n", imagePath, err.Error())
		}
	}

	// Gönderi görsellerini veritabanından sil
	if err := tx.Where("post_id = ?", post.ID).Delete(&models.PostImage{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gönderi görselleri silinirken bir hata oluştu",
		})
		return
	}

	// Gönderi beğenilerini sil
	if err := tx.Where("post_id = ?", post.ID).Delete(&models.Like{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gönderi beğenileri silinirken bir hata oluştu",
		})
		return
	}

	// Gönderi kayıtlarını sil
	if err := tx.Where("post_id = ?", post.ID).Delete(&models.SavedPost{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gönderi kayıtları silinirken bir hata oluştu",
		})
		return
	}

	// Gönderi yorumlarını sil
	if err := tx.Where("post_id = ?", post.ID).Delete(&models.Comment{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gönderi yorumları silinirken bir hata oluştu",
		})
		return
	}

	// Gönderiyi sil
	if err := tx.Delete(&post).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Gönderi silinirken bir hata oluştu",
		})
		return
	}

	// Transaction'ı tamamla
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Gönderi ve ilişkili tüm veriler başarıyla silindi",
	})
}
