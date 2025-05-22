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

	// Beğenilen gönderinin etiketlerini al
	var postTags []models.PostTag
	if err := database.DB.Where("post_id = ?", post.ID).Find(&postTags).Error; err != nil {
		fmt.Printf("Gönderi etiketleri alınamadı: %v\n", err)
		// Etiket işlemi başarısız olsa bile beğeni işlemine devam et
	} else {
		fmt.Printf("Gönderi ID %v için %d etiket bulundu\n", post.ID, len(postTags))

		// Hiç etiket yoksa Post.TagsString'den etiketleri almanın bir yolunu deneyelim
		if len(postTags) == 0 && post.TagsString != "" {
			fmt.Printf("PostTags tablosunda etiket yok, ancak post'un tags_string değeri mevcut: %s\n", post.TagsString)

			// Eğer post.Tags dizisi varsa ve dolu ise onları kullan
			if len(post.Tags) > 0 {
				fmt.Printf("post.Tags dizisinde %d etiket bulundu\n", len(post.Tags))
				// Bu etiketleri kullan
				for i, tagName := range post.Tags {
					// İlk 4 etiketi primary, geri kalanları auxiliary olarak varsay
					tagType := "primary"
					if i >= 4 {
						tagType := "auxiliary"
						fmt.Printf("Tag %s için tip: %s\n", tagName, tagType)
					}

					// Tag tablosunda bu isimde bir etiket ara, yoksa oluştur
					var tag models.Tag
					tagResult := database.DB.Where("name = ?", tagName).First(&tag)
					if tagResult.Error != nil {
						// Etiket yoksa oluştur
						tag = models.Tag{
							Name:      tagName,
							Type:      tagType,
							CreatedAt: time.Now(),
							UpdatedAt: time.Now(),
						}
						if err := database.DB.Create(&tag).Error; err != nil {
							fmt.Printf("Tag oluşturulamadı: %v\n", err)
							continue
						}
						fmt.Printf("Yeni tag oluşturuldu: %s (ID: %d)\n", tag.Name, tag.ID)
					}

					// Kullanıcıda bu etiket var mı kontrol et
					var userTag models.UserTag
					result := database.DB.Where("user_id = ? AND tag_id = ?", userID, tag.ID).First(&userTag)

					if result.Error != nil {
						// Kullanıcı bu etikete ilk kez sahip oluyor
						userTag = models.UserTag{
							UserID:      userID.(uint),
							TagID:       tag.ID,
							TagName:     tag.Name,
							TagType:     tagType,
							Count:       1,
							LastAddedAt: time.Now(),
							CreatedAt:   time.Now(),
							UpdatedAt:   time.Now(),
						}
						if err := database.DB.Create(&userTag).Error; err != nil {
							fmt.Printf("Kullanıcı etiketi oluşturulamadı: %v\n", err)
						} else {
							fmt.Printf("Kullanıcı için yeni etiket eklendi: %s\n", tag.Name)
						}
					} else {
						// Kullanıcı bu etikete zaten sahip, sayıyı artır
						if err := database.DB.Model(&userTag).Updates(map[string]interface{}{
							"count":         userTag.Count + 1,
							"last_added_at": time.Now(),
							"updated_at":    time.Now(),
						}).Error; err != nil {
							fmt.Printf("Kullanıcı etiketi güncellenemedi: %v\n", err)
						} else {
							fmt.Printf("Kullanıcı etiketi güncellendi: %s (yeni count: %d)\n", tag.Name, userTag.Count+1)
						}
					}
				}
			}
		} else {
			// Orijinal kod: Her etiketi kullanıcıya ekle veya güncelle
			for _, postTag := range postTags {
				// ID alanı tanımsız olduğu için sadece TagID ve TagType bilgilerini logla
				fmt.Printf("İşleniyor: PostTag TagID: %d, TagType: %s\n", postTag.TagID, postTag.TagType)

				// Etiketi al (Tag bilgilerine ihtiyacımız var)
				var tag models.Tag
				if err := database.DB.First(&tag, postTag.TagID).Error; err != nil {
					fmt.Printf("Etiket bilgisi alınamadı (ID: %d): %v\n", postTag.TagID, err)
					continue
				}
				fmt.Printf("Etiket bulundu: %s (ID: %d, Type: %s)\n", tag.Name, tag.ID, tag.Type)

				// Kullanıcıda bu etiket var mı kontrol et
				var userTag models.UserTag
				result := database.DB.Where("user_id = ? AND tag_id = ?", userID, tag.ID).First(&userTag)

				if result.Error != nil {
					fmt.Printf("Kullanıcıda etiket bulunamadı, yeni oluşturuluyor...\n")
					// Kullanıcı bu etikete ilk kez sahip oluyor
					userTag = models.UserTag{
						UserID:      userID.(uint),
						TagID:       tag.ID,
						TagName:     tag.Name,
						TagType:     postTag.TagType, // Post'taki etiket tipini kullan
						Count:       1,
						LastAddedAt: time.Now(),
						CreatedAt:   time.Now(),
						UpdatedAt:   time.Now(),
					}
					if err := database.DB.Create(&userTag).Error; err != nil {
						fmt.Printf("Kullanıcı etiketi oluşturulurken hata: %v\n", err)
						// Veritabanı tablo kontrol et
						if err.Error() == "no such table: user_tags" {
							fmt.Printf("HATA: UserTag tablosu veritabanında yok! Modeli migrate ettiniz mi?\n")
						}
					} else {
						fmt.Printf("Kullanıcı için yeni etiket oluşturuldu: %s\n", tag.Name)
					}
				} else {
					fmt.Printf("Kullanıcıda etiket bulundu, güncelleniyor... (şu anki count: %d)\n", userTag.Count)
					// Kullanıcı bu etikete zaten sahip, sayıyı artır
					if err := database.DB.Model(&userTag).Updates(map[string]interface{}{
						"count":         userTag.Count + 1,
						"last_added_at": time.Now(),
						"updated_at":    time.Now(),
					}).Error; err != nil {
						fmt.Printf("Kullanıcı etiketi güncellenemedi: %v\n", err)
					} else {
						fmt.Printf("Kullanıcı etiketi güncellendi: %s (yeni count: %d)\n", tag.Name, userTag.Count+1)
					}
				}
			}
		}

		// Kullanıcının etiket istatistiklerini konsola yazdır
		PrintUserTagStats(userID.(uint))
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
			ToUserID:   post.UserID,
			FromUserID: userID.(uint),
			Type:       "like",
			Message:    fmt.Sprintf("%s gönderinizi beğendi", currentUser.FullName),
			IsRead:     false,
			CreatedAt:  time.Now(),
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

// PrintUserTagStats - Kullanıcının etiket istatistiklerini konsola yazdırır
func PrintUserTagStats(userID uint) {
	// Kullanıcının tüm etiketlerini getir
	var userTags []models.UserTag

	if err := database.DB.Where("user_id = ?", userID).Order("count DESC").Find(&userTags).Error; err != nil {
		fmt.Printf("Kullanıcı etiketleri alınamadı: %v\n", err)
		// Tablo var mı kontrol et
		if err.Error() == "no such table: user_tags" {
			fmt.Printf("HATA: UserTag tablosu veritabanında yok! Lütfen migrate edin.\n")
		}
		return
	}

	// Etiket istatistiklerini konsola yazdır
	fmt.Printf("\n*** KULLANICI ETİKET İSTATİSTİKLERİ (UserID: %d) ***\n", userID)
	fmt.Printf("Toplam etiket sayısı: %d\n", len(userTags))

	if len(userTags) == 0 {
		fmt.Println("Kullanıcıya ait etiket bulunamadı!")
		return
	}

	// Primary etiketleri yazdır
	primaryCount := 0
	fmt.Println("\nPRIMARY ETİKETLER:")
	for _, ut := range userTags {
		if ut.TagType == "primary" {
			fmt.Printf("- %s: %d kez\n", ut.TagName, ut.Count)
			primaryCount++
		}
	}
	if primaryCount == 0 {
		fmt.Println("Primary etiket bulunamadı.")
	}

	// Auxiliary etiketleri yazdır
	auxiliaryCount := 0
	fmt.Println("\nAUXILIARY ETİKETLER:")
	for _, ut := range userTags {
		if ut.TagType == "auxiliary" {
			fmt.Printf("- %s: %d kez\n", ut.TagName, ut.Count)
			auxiliaryCount++
		}
	}
	if auxiliaryCount == 0 {
		fmt.Println("Auxiliary etiket bulunamadı.")
	}

	fmt.Println("\n***************************************************\n")
}
