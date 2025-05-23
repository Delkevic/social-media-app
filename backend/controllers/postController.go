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
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// getUserTagPreferences kullanıcının etiket tercihlerini analiz eder
func getUserTagPreferences(userID uint) (map[string]int, map[string]int) {
	var userTags []models.UserTag
	database.DB.Where("user_id = ?", userID).Find(&userTags)

	primaryTags := make(map[string]int)
	auxiliaryTags := make(map[string]int)

	for _, userTag := range userTags {
		if userTag.TagType == "primary" {
			primaryTags[userTag.TagName] = userTag.Count
		} else if userTag.TagType == "auxiliary" {
			auxiliaryTags[userTag.TagName] = userTag.Count
		}
	}

	return primaryTags, auxiliaryTags
}

// calculatePostRelevanceScore gönderi ile kullanıcı tercihleri arasında uyumluluk skoru hesaplar
func calculatePostRelevanceScore(post models.Post, primaryTags map[string]int, auxiliaryTags map[string]int) int {
	score := 0

	// Gönderinin etiketlerini al
	var postTags []string
	if post.TagsString != "" {
		postTags = strings.Split(post.TagsString, ",")
		for i, tag := range postTags {
			postTags[i] = strings.TrimSpace(tag)
		}
	}

	// Primary etiketler için skor hesaplama (ağırlık: 3x)
	for i, tag := range postTags {
		if tag == "" {
			continue
		}

		// İlk 4 etiket primary kabul ediliyor
		if i < 4 {
			if count, exists := primaryTags[tag]; exists {
				score += count * 3 // Primary etiketler 3x ağırlık
			}
		} else {
			// 5. ve 6. etiketler auxiliary
			if count, exists := auxiliaryTags[tag]; exists {
				score += count * 1 // Auxiliary etiketler 1x ağırlık
			}
		}
	}

	return score
}

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
		// Tüm gönderiler - kullanıcı tercihleri varsa akıllı sıralama yapılacak
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

	// General feed için kullanıcı etiket tercihlerine göre sıralama
	if feed == "general" && userID != nil {
		primaryTags, auxiliaryTags := getUserTagPreferences(userID.(uint))

		// Eğer kullanıcının etiket tercihleri varsa, akıllı sıralama yap
		if len(primaryTags) > 0 || len(auxiliaryTags) > 0 {
			// Gönderilere relevance score hesapla
			type PostWithScore struct {
				Post  models.Post
				Score int
			}

			var postsWithScores []PostWithScore
			for _, post := range posts {
				score := calculatePostRelevanceScore(post, primaryTags, auxiliaryTags)
				postsWithScores = append(postsWithScores, PostWithScore{
					Post:  post,
					Score: score,
				})
			}

			// Skora göre sırala (yüksek skor önce)
			sort.Slice(postsWithScores, func(i, j int) bool {
				if postsWithScores[i].Score == postsWithScores[j].Score {
					// Skor eşitse, tarih sıralaması (yeni önce)
					return postsWithScores[i].Post.CreatedAt.After(postsWithScores[j].Post.CreatedAt)
				}
				return postsWithScores[i].Score > postsWithScores[j].Score
			})

			// Sıralanmış gönderileri geri al
			posts = make([]models.Post, len(postsWithScores))
			for i, pws := range postsWithScores {
				posts[i] = pws.Post
			}
		}
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
		Content        string   `json:"content"`
		Caption        string   `json:"caption"` // Başlık alanı
		Tags           string   `json:"tags"`    // Virgülle ayrılmış etiketler
		Images         []string `json:"images"`
		ImageUrl       string   `json:"imageUrl"`       // Cloudinary'den gelen tek URL için
		GeminiResponse string   `json:"geminiResponse"` // Gemini'den gelen etiketler
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

	// Gemini yanıtını işle ve etiketleri ekle
	if request.GeminiResponse != "" {
		// Virgülle ayrılmış etiketleri parçala
		geminiTags := strings.Split(request.GeminiResponse, ",")

		// Etiket sayısını kontrol et ve maksimum 6 etiket kullan
		tagCount := len(geminiTags)
		if tagCount > 6 {
			tagCount = 6
		}

		// Ana ve yardımcı etiket sayıları
		primaryTagCount := 4
		if tagCount < 4 {
			primaryTagCount = tagCount
		}

		for i := 0; i < tagCount; i++ {
			tagName := strings.TrimSpace(geminiTags[i])
			if tagName == "" {
				continue // Boş etiketleri atla
			}

			// Etiket türünü belirle
			tagType := "primary"
			if i >= primaryTagCount {
				tagType = "auxiliary"
			}

			// Etiket var mı kontrol et, yoksa oluştur (findOrCreate mantığı)
			var tag models.Tag
			if err := tx.Where("name = ?", tagName).FirstOrCreate(&tag, models.Tag{
				Name:      tagName,
				Type:      tagType, // Etiket türünü kaydet
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}).Error; err != nil {
				fmt.Printf("Etiket oluşturulurken hata: %v\n", err)
				continue // Hata olsa bile diğer etiketlerle devam et
			}

			// Post ve tag arasında ilişki oluştur
			postTag := models.PostTag{
				PostID:    post.ID,
				TagID:     tag.ID,
				TagType:   tagType, // İlişkide de etiket türünü kaydet
				CreatedAt: time.Now(),
			}

			if err := tx.Create(&postTag).Error; err != nil {
				fmt.Printf("Post-Tag ilişkisi oluşturulurken hata: %v\n", err)
				// Hata olsa bile diğer etiketlerle devam et
			}
		}

		// Gemini etiketlerini TagsString'e ekle (eğer daha önce kullanıcı eklemediyse)
		if post.TagsString == "" {
			post.TagsString = request.GeminiResponse
			if err := tx.Model(&post).Update("tags_string", post.TagsString).Error; err != nil {
				fmt.Printf("TagsString güncellenirken hata: %v\n", err)
			}
		}
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
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Kullanıcı oturumu bulunamadı"})
		return
	}

	// Post ID'yi al
	postIDStr := c.Param("id")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz gönderi ID'si"})
		return
	}

	// Postu kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Gönderi bulunamadı"})
		return
	}

	// Beğeni durumunu kontrol et
	var like models.Like
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&like)
	liked := true

	// Eğer beğeni varsa kaldır, yoksa ekle
	if result.Error == nil {
		// Beğeni var, kaldır
		fmt.Printf("===== BEĞENİ KALDIRILIYOR - UserID: %d, PostID: %d =====\n", userID.(uint), postID)

		// Transaction başlat - tüm işlemlerin ya tamamen başarılı olmasını ya da hiç yapılmamasını sağlar
		tx := database.DB.Begin()

		// Beğeni silme işlemi
		if err := tx.Delete(&like).Error; err != nil {
			tx.Rollback()
			fmt.Printf("HATA: Beğeni silinirken hata oluştu: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Beğeni silinirken hata oluştu"})
			return
		}

		// Gönderi like count güncelleme
		if err := tx.Model(&post).Update("like_count", post.LikeCount-1).Error; err != nil {
			tx.Rollback()
			fmt.Printf("HATA: Like count güncellenirken hata oluştu: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Like count güncellenirken hata oluştu"})
			return
		}

		liked = false

		// Beğeni kaldırıldığında kullanıcının etiketlerini güncelle
		fmt.Printf("Kullanıcı etiketleri beğeni kaldırma sonrası güncelleniyor...\n")

		// İşlem öncesi kullanıcının mevcut etiketlerini göster
		var existingTags []models.UserTag
		if err := tx.Where("user_id = ?", userID).Find(&existingTags).Error; err != nil {
			fmt.Printf("Mevcut etiketler alınamadı: %v\n", err)
		} else {
			fmt.Printf("İşlem öncesi kullanıcının %d etiketi bulunuyor\n", len(existingTags))
		}

		var postTags []models.PostTag
		if err := tx.Where("post_id = ?", post.ID).Find(&postTags).Error; err != nil {
			fmt.Printf("Gönderi etiketleri alınamadı: %v\n", err)
			// Etiket güncelleme işlemi başarısız olsa bile beğeni işlemine devam et
		} else {
			fmt.Printf("Gönderi ID %v için %d etiket bulundu - Beğeni kaldırma\n", post.ID, len(postTags))

			// Hiç etiket yoksa Post.TagsString'den etiketleri almayı dene
			if len(postTags) == 0 && post.TagsString != "" {
				fmt.Printf("PostTags tablosunda etiket yok, ancak post'un tags_string değeri mevcut: %s\n", post.TagsString)

				// Eğer post.Tags dizisi varsa ve dolu ise onları kullan
				if post.TagsString != "" {
					// TagsString'i split et ve tags dizisine aktar
					tags := strings.Split(post.TagsString, ",")
					// Boşlukları temizle
					for i, tag := range tags {
						tags[i] = strings.TrimSpace(tag)
					}
					fmt.Printf("TagsString'den %d etiket çıkarıldı\n", len(tags))

					// Bu etiketleri kullan
					for _, tagName := range tags {
						if tagName == "" {
							continue
						}

						fmt.Printf("Etiket işleniyor: %s\n", tagName)
						var tag models.Tag
						tagResult := tx.Where("name = ?", tagName).First(&tag)
						if tagResult.Error == nil {
							fmt.Printf("Etiket bulundu: %s (ID: %d)\n", tag.Name, tag.ID)

							// Kullanıcı bu etikete sahip mi?
							var userTag models.UserTag
							result := tx.Where("user_id = ? AND tag_id = ?", userID, tag.ID).First(&userTag)
							if result.Error == nil {
								fmt.Printf("Kullanıcı etiketi bulundu: %s (Count: %d)\n", tag.Name, userTag.Count)

								// Etiketi güncelle veya sil
								if userTag.Count > 1 {
									// Count değerini azalt
									newCount := userTag.Count - 1
									if err := tx.Model(&userTag).Updates(map[string]interface{}{
										"count":      newCount,
										"updated_at": time.Now(),
									}).Error; err != nil {
										fmt.Printf("Kullanıcı etiketi güncellenemedi: %v\n", err)
									} else {
										fmt.Printf("Kullanıcı etiketi güncellendi: %s (yeni count: %d)\n", tag.Name, newCount)
									}
								} else {
									// Count 1 veya daha az ise etiketi sil
									if err := tx.Unscoped().Delete(&userTag).Error; err != nil {
										fmt.Printf("Kullanıcı etiketi silinemedi: %v\n", err)
									} else {
										fmt.Printf("Kullanıcı etiketi BAŞARIYLA silindi: %s\n", tag.Name)
									}
								}
							} else {
								fmt.Printf("Kullanıcıda bu etiket bulunamadı: %s\n", tag.Name)
							}
						} else {
							fmt.Printf("Etiket bulunamadı: %s\n", tagName)
						}
					}
				}
			} else {
				// PostTag tablosundaki her etiket için
				fmt.Printf("PostTags tablosundan etiket güncelleme kullanılıyor\n")
				for _, postTag := range postTags {
					var tag models.Tag
					if err := tx.First(&tag, postTag.TagID).Error; err != nil {
						fmt.Printf("Etiket bilgisi alınamadı (ID: %d): %v\n", postTag.TagID, err)
						continue
					}
					fmt.Printf("Etiket işleniyor: %s (ID: %d)\n", tag.Name, tag.ID)

					// Kullanıcı bu etikete sahip mi?
					var userTag models.UserTag
					result := tx.Where("user_id = ? AND tag_id = ?", userID, tag.ID).First(&userTag)
					if result.Error == nil {
						fmt.Printf("Kullanıcı etiketi bulundu: %s (Count: %d)\n", tag.Name, userTag.Count)

						// Etiketi güncelle veya sil
						if userTag.Count > 1 {
							// Count değerini azalt
							newCount := userTag.Count - 1
							if err := tx.Model(&userTag).Updates(map[string]interface{}{
								"count":      newCount,
								"updated_at": time.Now(),
							}).Error; err != nil {
								fmt.Printf("Kullanıcı etiketi güncellenemedi: %v\n", err)
							} else {
								fmt.Printf("Kullanıcı etiketi güncellendi: %s (yeni count: %d)\n", tag.Name, newCount)
							}
						} else {
							// Count 1 veya daha az ise etiketi sil
							if err := tx.Unscoped().Delete(&userTag).Error; err != nil {
								fmt.Printf("Kullanıcı etiketi silinemedi: %v\n", err)
							} else {
								fmt.Printf("Kullanıcı etiketi BAŞARIYLA silindi: %s\n", tag.Name)
							}
						}
					} else {
						fmt.Printf("Kullanıcıda bu etiket bulunamadı: %s\n", tag.Name)
					}
				}
			}

			// Transaction'ı commit et
			if err := tx.Commit().Error; err != nil {
				fmt.Printf("Transaction commit edilirken hata: %v\n", err)
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "İşlem tamamlanamadı"})
				return
			}

			fmt.Printf("Etiket güncelleme işlemi transaction ile commit edildi!\n")

			// İşlem sonrası kullanıcının etiketlerini kontrol et
			var updatedTags []models.UserTag
			if err := database.DB.Where("user_id = ?", userID).Find(&updatedTags).Error; err != nil {
				fmt.Printf("Güncellenmiş etiketler alınamadı: %v\n", err)
			} else {
				fmt.Printf("İşlem sonrası kullanıcının %d etiketi bulunuyor\n", len(updatedTags))
			}

			// Kullanıcının etiket istatistiklerini konsola yazdır
			PrintUserTagStats(userID.(uint))

			fmt.Printf("===== BEĞENİ KALDIRMA İŞLEMİ TAMAMLANDI =====\n")
		}
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

// SavePost gönderiyi kaydeder
func SavePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Kaydı kontrol et (zaten kaydedilmiş mi?)
	var existingSave models.SavedPost
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&existingSave)
	if result.RowsAffected > 0 {
		// Zaten kaydedilmiş durumunu başarısız değil, özel bir durum olarak döndür
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu gönderi zaten kaydedilmiş",
			Data: map[string]interface{}{
				"saved":        true,
				"alreadySaved": true,
			},
		})
		return
	}

	// Kayıt oluştur - created_at sütunu olmadığı için field list'ten çıkarıyoruz
	savedPost := models.SavedPost{
		UserID: userID.(uint),
		PostID: uint(postID),
	}

	// Kaydı ekle
	if err := database.DB.Omit("created_at").Create(&savedPost).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Gönderi kaydedilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Gönderi başarıyla kaydedildi",
		Data: map[string]interface{}{
			"saved": true,
		},
	})
}

// Gönderi kaydını kaldırma
func UnsavePost(c *gin.Context) {
	userID, _ := c.Get("userID")
	postIDStr := c.Param("id")
	postID, _ := strconv.Atoi(postIDStr)

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Gönderi bulunamadı",
		})
		return
	}

	// Kaydı sil
	result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Delete(&models.SavedPost{})
	if result.RowsAffected == 0 {
		// Kaydedilmemiş gönderi durumunu başarısız değil, özel bir durum olarak döndür
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu gönderi kaydedilmemiş",
			Data: map[string]interface{}{
				"saved":    false,
				"notSaved": true,
			},
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Gönderi kaydı başarıyla kaldırıldı",
		Data: map[string]interface{}{
			"saved": false,
		},
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
