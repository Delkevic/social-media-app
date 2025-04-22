package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// DataPrivacySettingsRequest veri gizliliği ayarları request yapısı
type DataPrivacySettingsRequest struct {
	AnalyticsCollection *bool `json:"analyticsCollection"`
	PersonalizedAds     *bool `json:"personalizedAds"`
	LocationData        *bool `json:"locationData"`
	SearchHistory       *bool `json:"searchHistory"`
	ThirdPartySharing   *bool `json:"thirdPartySharing"`
}

// GetDataPrivacySettings veri gizliliği ayarlarını getirir
func GetDataPrivacySettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.DataPrivacySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Eğer ayarlar bulunamadıysa, varsayılan ayarlar oluştur
	if result.Error != nil {
		fmt.Printf("[INFO] Kullanıcı için veri gizliliği ayarları bulunamadı (UserID: %v), varsayılan ayarlar oluşturuluyor\n", userID)
		settings = models.DataPrivacySettings{
			UserID:              userID.(uint),
			AnalyticsCollection: true,
			PersonalizedAds:     true,
			LocationData:        true,
			SearchHistory:       true,
			ThirdPartySharing:   true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		}

		// Veritabanına kaydet
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Varsayılan veri gizliliği ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri gizliliği ayarları oluşturulurken bir hata oluştu"})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    settings,
	})
}

// UpdateDataPrivacySettings veri gizliliği ayarlarını günceller
func UpdateDataPrivacySettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request DataPrivacySettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	var settings models.DataPrivacySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur, varsa güncelle
	isNew := false
	if result.Error != nil {
		isNew = true
		settings = models.DataPrivacySettings{
			UserID: userID.(uint),
		}
	}

	// Request'ten gelen değerleri ayarlara ekle (nil olmayan değerler için)
	updates := make(map[string]interface{})
	if request.AnalyticsCollection != nil {
		updates["AnalyticsCollection"] = *request.AnalyticsCollection
	}
	if request.PersonalizedAds != nil {
		updates["PersonalizedAds"] = *request.PersonalizedAds
	}
	if request.LocationData != nil {
		updates["LocationData"] = *request.LocationData
	}
	if request.SearchHistory != nil {
		updates["SearchHistory"] = *request.SearchHistory
	}
	if request.ThirdPartySharing != nil {
		updates["ThirdPartySharing"] = *request.ThirdPartySharing
	}

	// Güncelleme zamanını ekle
	updates["UpdatedAt"] = time.Now()

	if isNew {
		// Tüm alanları varsayılan değerlerle doldur
		if request.AnalyticsCollection == nil {
			settings.AnalyticsCollection = true
		}
		if request.PersonalizedAds == nil {
			settings.PersonalizedAds = true
		}
		if request.LocationData == nil {
			settings.LocationData = true
		}
		if request.SearchHistory == nil {
			settings.SearchHistory = true
		}
		if request.ThirdPartySharing == nil {
			settings.ThirdPartySharing = true
		}

		// Diğer varsayılan değerleri ayarla
		settings.CreatedAt = time.Now()
		settings.UpdatedAt = time.Now()

		// Veritabanına yeni kayıt ekle
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Veri gizliliği ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri gizliliği ayarları oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Veri gizliliği ayarları güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri gizliliği ayarları güncellenirken bir hata oluştu"})
			return
		}
	}

	// Güncel ayarları tekrar al
	database.DB.Where("user_id = ?", userID).First(&settings)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Veri gizliliği ayarları başarıyla güncellendi",
		Data:    settings,
	})
}

// RequestDataDownload kullanıcının verilerini indirme talebi
func RequestDataDownload(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.DataPrivacySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur
	if result.Error != nil {
		settings = models.DataPrivacySettings{
			UserID:                  userID.(uint),
			AnalyticsCollection:     true,
			PersonalizedAds:         true,
			LocationData:            true,
			SearchHistory:           true,
			ThirdPartySharing:       true,
			DataDownloadRequested:   true,
			DataDownloadRequestDate: func() *time.Time { now := time.Now(); return &now }(),
			CreatedAt:               time.Now(),
			UpdatedAt:               time.Now(),
		}

		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Veri indirme talebi oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri indirme talebi oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		now := time.Now()
		updates := map[string]interface{}{
			"DataDownloadRequested":   true,
			"DataDownloadRequestDate": &now,
			"UpdatedAt":               now,
		}

		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Veri indirme talebi güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri indirme talebi güncellenirken bir hata oluştu"})
			return
		}
	}

	// Burada veri toplama işlemini başlatacak bir goroutine/worker çağrılabilir
	// async olarak kullanıcının verilerini zip dosyasına çıkartıp,
	// kullanıcıya e-posta ile bildirim gönderecek bir yapı kurulabilir

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Veri indirme talebiniz alındı. Verileriniz hazırlandığında size bildirim göndereceğiz.",
	})
}

// RequestDataDeletion kullanıcının verilerini silme talebi
func RequestDataDeletion(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.DataPrivacySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur
	if result.Error != nil {
		settings = models.DataPrivacySettings{
			UserID:                  userID.(uint),
			AnalyticsCollection:     true,
			PersonalizedAds:         true,
			LocationData:            true,
			SearchHistory:           true,
			ThirdPartySharing:       true,
			DataDeletionRequested:   true,
			DataDeletionRequestDate: func() *time.Time { now := time.Now(); return &now }(),
			CreatedAt:               time.Now(),
			UpdatedAt:               time.Now(),
		}

		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Veri silme talebi oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri silme talebi oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		now := time.Now()
		updates := map[string]interface{}{
			"DataDeletionRequested":   true,
			"DataDeletionRequestDate": &now,
			"UpdatedAt":               now,
		}

		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Veri silme talebi güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Veri silme talebi güncellenirken bir hata oluştu"})
			return
		}
	}

	// Burada veri silme işlemini başlatacak bir goroutine/worker çağrılabilir
	// async olarak kullanıcının verilerini silecek bir yapı kurulabilir

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Veri silme talebiniz alındı. İşlem tamamlandığında size bildirim göndereceğiz.",
	})
}
