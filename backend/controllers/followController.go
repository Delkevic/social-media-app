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

// HandleFollowUser - Bir kullanıcıyı takip etme veya takip isteği gönderme
func HandleFollowUser(c *gin.Context) {
	followerID, exists := c.Get("userID") // İstek yapan (takip eden) kullanıcı
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	// Takip edilecek kullanıcının username'i URL'den alınır
	followingUsername := c.Param("username")
	if followingUsername == "" {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Takip edilecek kullanıcı adı belirtilmedi"})
		return
	}

	// Takip edilecek kullanıcıyı bul
	var followingUser models.User
	if err := database.DB.Where("username = ?", followingUsername).First(&followingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, Response{Success: false, Message: "Takip edilecek kullanıcı bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Kullanıcı aranırken veritabanı hatası: " + err.Error()})
		}
		return
	}

	// Kendini takip etme kontrolü
	if followerID.(uint) == followingUser.ID {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Kendinizi takip edemezsiniz"})
		return
	}

	// Zaten takip ediyor mu kontrolü
	var existingFollow models.Follow
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingUser.ID).First(&existingFollow)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Bu kullanıcıyı zaten takip ediyorsunuz"})
		return
	}

	// Bekleyen takip isteği var mı kontrolü
	var existingRequest models.FollowRequest
	result = database.DB.Where("follower_id = ? AND following_id = ? AND status = ?", followerID, followingUser.ID, "pending").First(&existingRequest)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Bu kullanıcıya zaten takip isteği gönderilmiş"})
		return
	}

	// Takip eden kullanıcı bilgilerini al
	var follower models.User
	if err := database.DB.Select("id, username, full_name, profile_image").First(&follower, followerID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip eden kullanıcı bilgileri alınamadı: " + err.Error()})
		return
	}

	// Takip edilecek kullanıcı gizli mi?
	if followingUser.IsPrivate {
		// Gizli hesap ise takip isteği oluştur
		followRequest := models.FollowRequest{
			FollowerID:  followerID.(uint),
			FollowingID: followingUser.ID,
			Status:      "pending",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := database.DB.Create(&followRequest).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip isteği oluşturulurken hata: " + err.Error()})
			return
		}

		// Takip isteği bildirimi gönder
		if notifService != nil {
			err := notifService.CreateFollowRequestNotification(
				c.Request.Context(),
				fmt.Sprintf("%d", followingUser.ID),
				fmt.Sprintf("%d", follower.ID),
				follower.FullName,
				follower.Username,
				follower.ProfileImage,
			)
			if err != nil {
				fmt.Printf("Takip isteği bildirimi gönderilemedi: %v\n", err)
			} else {
				fmt.Printf("Takip isteği bildirimi başarıyla gönderildi. Kullanıcı %d -> %d\n", followerID, followingUser.ID)
			}
		}

		c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği gönderildi", Data: gin.H{"status": "pending"}})

	} else {
		// Herkese açık hesap ise doğrudan takip oluştur
		follow := models.Follow{
			FollowerID:  followerID.(uint),
			FollowingID: followingUser.ID,
			Status:      "active", // Varsayılan durum
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}
		if err := database.DB.Create(&follow).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip oluşturulurken hata: " + err.Error()})
			return
		}

		// Bildirim oluştur - Takip edilen kullanıcıya bildirim gönder
		notification := models.Notification{
			ToUserID:   followingUser.ID,  // Takip edilen kullanıcıya bildirim gönder
			FromUserID: followerID.(uint), // Takip eden kullanıcı
			Type:       "follow",
			Message:    fmt.Sprintf("%s seni takip etmeye başladı", follower.FullName),
			IsRead:     false,
			CreatedAt:  time.Now(),
		}

		if err := database.DB.Create(&notification).Error; err != nil {
			fmt.Printf("Takip bildirimi oluşturulurken veritabanı hatası: %v\n", err)
			// Bildirimin oluşturulamaması takip işlemini engellememelidir
		} else {
			fmt.Printf("Takip bildirimi veritabanına kaydedildi. Kullanıcı %d -> %d\n", followerID, followingUser.ID)
		}

		// WebSocket üzerinden bildirim gönder
		if notifService != nil {
			err := notifService.CreateFollowNotification(
				c.Request.Context(),
				fmt.Sprintf("%d", followingUser.ID),
				fmt.Sprintf("%d", follower.ID),
				follower.FullName,
				follower.Username,
				follower.ProfileImage,
			)
			if err != nil {
				fmt.Printf("WebSocket takip bildirimi gönderilemedi: %v\n", err)
			} else {
				fmt.Printf("WebSocket takip bildirimi başarıyla gönderildi. Kullanıcı %d -> %d\n", followerID, followingUser.ID)
			}
		}

		// İsteği gönderen kullanıcının Takip Edilen sayısını ve
		// takip edilen kullanıcının Takipçi sayısını artırmak için bir mekanizma eklenebilir (örn. trigger, ayrı bir güncelleme vs.)
		c.JSON(http.StatusOK, Response{Success: true, Message: "Kullanıcı takip edildi", Data: gin.H{"status": "following"}})
	}
}

// HandleUnfollowUser - Bir kullanıcıyı takipten çıkma
func HandleUnfollowUser(c *gin.Context) {
	followerID, exists := c.Get("userID") // İstek yapan (takibi bırakan) kullanıcı
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	// Takibi bırakılacak kullanıcının username'i URL'den alınır
	followingUsername := c.Param("username")
	if followingUsername == "" {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Takibi bırakılacak kullanıcı adı belirtilmedi"})
		return
	}

	// Takibi bırakılacak kullanıcıyı bul (ID'sini almak için)
	var followingUser models.User
	if err := database.DB.Where("username = ?", followingUsername).Select("id").First(&followingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, Response{Success: false, Message: "Takibi bırakılacak kullanıcı bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Kullanıcı aranırken veritabanı hatası: " + err.Error()})
		}
		return
	}

	// Takip kaydını bul ve sil
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingUser.ID).Delete(&models.Follow{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip silinirken hata: " + result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Bu kullanıcıyı zaten takip etmiyorsunuz"})
		return
	}

	// Takipçi/Takip edilen sayılarını azaltmak için mekanizma eklenebilir
	c.JSON(http.StatusOK, Response{Success: true, Message: "Kullanıcı takipten çıkarıldı", Data: gin.H{"status": "none"}})
}

// PendingRequestResponse - Bekleyen istek yanıtı için struct
type PendingRequestResponse struct {
	RequestID    uint      `json:"requestId"`
	CreatedAt    time.Time `json:"createdAt"`
	FollowerID   uint      `json:"-"` // JSON'da görünmesin
	FollowerInfo struct {  // Gömülü struct
		ID           uint   `json:"id"`
		Username     string `json:"username"`
		FullName     string `json:"fullName"`
		ProfileImage string `json:"profileImage"`
	} `json:"follower" gorm:"embedded;embeddedPrefix:follower_"` // gorm etiketleri eklendi
}

// GetPendingFollowRequests - Mevcut kullanıcıya gelen bekleyen takip isteklerini listeler
func GetPendingFollowRequests(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var results []PendingRequestResponse // Özel yanıt struct'ını kullan

	// İstekleri ve istek yapan kullanıcı bilgilerini seçerek getir
	dbResult := database.DB.Table("follow_requests as fr"). // Tabloya alias ver
								Joins("inner join users as u on u.id = fr.follower_id"). // users tablosunu join et
								Where("fr.following_id = ? AND fr.status = ?", userID, "pending").
								Select(`fr.id as request_id,
		        fr.created_at,
		        fr.follower_id,
		        u.id as follower_id, 
		        u.username as follower_username,
		        u.full_name as follower_full_name,
		        u.profile_image as follower_profile_image`). // Alanları alias ile seç
		Scan(&results) // Sonuçları struct'a scan et

	if dbResult.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip istekleri alınırken hata: " + dbResult.Error.Error()})
		return
	}

	// GORM'un `embeddedPrefix` ile dolduramadığı ID'yi manuel ata
	for i := range results {
		results[i].FollowerInfo.ID = results[i].FollowerID
	}

	c.JSON(http.StatusOK, Response{Success: true, Data: results})
}

// AcceptFollowRequest - Bir takip isteğini kabul eder
func AcceptFollowRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	requestIDStr := c.Param("requestID")
	requestID, err := strconv.ParseUint(requestIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek ID"})
		return
	}

	var request models.FollowRequest
	// İsteği bul ve kimin için olduğunu kontrol et
	if err := database.DB.Where("id = ? AND following_id = ? AND status = ?", requestID, userID, "pending").First(&request).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, Response{Success: false, Message: "Bekleyen takip isteği bulunamadı veya size ait değil"})
		} else {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "İstek aranırken hata: " + err.Error()})
		}
		return
	}

	// Takip ilişkisini oluştur ve isteği güncelle (Transaction içinde yapmak daha güvenli)
	tx := database.DB.Begin()

	// 1. Takip ilişkisi oluştur
	follow := models.Follow{
		FollowerID:  request.FollowerID,
		FollowingID: request.FollowingID,
		Status:      "active",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := tx.Create(&follow).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip ilişkisi oluşturulurken hata: " + err.Error()})
		return
	}

	// 2. İstek durumunu güncelle
	if err := tx.Model(&request).Update("status", "accepted").Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip isteği güncellenirken hata: " + err.Error()})
		return
	}

	// Kabul eden kullanıcının (takip edilen) bilgilerini al
	var acceptor models.User
	if err := tx.Select("id, username, full_name, profile_image").First(&acceptor, request.FollowingID).Error; err != nil {
		tx.Commit() // Takip işlemi başarılı olduğu için transaction'ı commit et
		c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği kabul edildi fakat bildirim için kullanıcı bilgileri alınamadı"})
		return
	}

	// Takip isteği gönderen kullanıcının (takipçi) bilgilerini al
	var follower models.User
	if err := tx.Select("id, username, full_name").First(&follower, request.FollowerID).Error; err != nil {
		tx.Commit() // Takip işlemi başarılı olduğu için transaction'ı commit et
		c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği kabul edildi fakat bildirim için takipçi bilgileri alınamadı"})
		return
	}

	// Veritabanı bildirimi oluştur
	notification := models.Notification{
		ToUserID:   request.FollowerID,
		FromUserID: request.FollowingID,
		Type:       "follow_accept",
		Message:    fmt.Sprintf("%s takip isteğinizi kabul etti", acceptor.FullName),
		IsRead:     false,
		CreatedAt:  time.Now(),
	}

	if err := tx.Create(&notification).Error; err != nil {
		tx.Commit() // Takip işlemi başarılı olduğu için transaction'ı commit et
		c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği kabul edildi fakat bildirim oluşturulamadı"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "İşlem tamamlanırken hata: " + err.Error()})
		return
	}

	// WebSocket üzerinden takip kabul bildirimi gönder
	if notifService != nil {
		err := notifService.CreateFollowAcceptNotification(
			c.Request.Context(),
			fmt.Sprintf("%d", follower.ID), // Takipçiye bildirim gönder
			fmt.Sprintf("%d", acceptor.ID), // Kabul eden kullanıcı ID
			acceptor.FullName,              // Kabul eden kullanıcı adı
			acceptor.Username,              // Kabul eden kullanıcı adı
			acceptor.ProfileImage,          // Kabul eden kullanıcı profil resmi
		)
		if err != nil {
			fmt.Printf("WebSocket takip kabul bildirimi gönderilemedi: %v\n", err)
		} else {
			fmt.Printf("WebSocket takip kabul bildirimi başarıyla gönderildi. Kullanıcı %d -> %d\n", acceptor.ID, follower.ID)
		}
	}

	c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği kabul edildi"})
}

// RejectFollowRequest - Bir takip isteğini reddeder
func RejectFollowRequest(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	requestIDStr := c.Param("requestID")
	requestID, err := strconv.ParseUint(requestIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek ID"})
		return
	}

	// İsteği bul, kimin için olduğunu ve durumunu kontrol et
	result := database.DB.Model(&models.FollowRequest{}).
		Where("id = ? AND following_id = ? AND status = ?", requestID, userID, "pending").
		Update("status", "rejected")

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "İstek reddedilirken hata: " + result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Bekleyen takip isteği bulunamadı veya size ait değil"})
		return
	}

	// TODO: Bildirim gönderilebilir (isteğe bağlı)

	c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği reddedildi"})
}

// CancelFollowRequest - Gönderilen bir takip isteğini iptal eder
func CancelFollowRequest(c *gin.Context) {
	followerID, exists := c.Get("userID") // İstek yapan (iptal eden) kullanıcı
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	// İsteği iptal edilecek kullanıcının username'i URL'den alınır
	followingUsername := c.Param("username")
	if followingUsername == "" {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "İsteği iptal edilecek kullanıcı adı belirtilmedi"})
		return
	}

	// İsteği iptal edilecek kullanıcıyı bul (ID'sini almak için)
	var followingUser models.User
	if err := database.DB.Where("username = ?", followingUsername).Select("id").First(&followingUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, Response{Success: false, Message: "İsteği iptal edilecek kullanıcı bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Kullanıcı aranırken veritabanı hatası: " + err.Error()})
		}
		return
	}

	// Takip isteğini bul ve sil (sadece 'pending' durumundakileri)
	result := database.DB.Where("follower_id = ? AND following_id = ? AND status = ?", followerID, followingUser.ID, "pending").Delete(&models.FollowRequest{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Takip isteği silinirken hata: " + result.Error.Error()})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Bu kullanıcıya gönderilmiş bekleyen bir takip isteği bulunamadı"})
		return
	}

	c.JSON(http.StatusOK, Response{Success: true, Message: "Takip isteği iptal edildi", Data: gin.H{"status": "none"}}) // Profildeki durumu 'none' yap
}
