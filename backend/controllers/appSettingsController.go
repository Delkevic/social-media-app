package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// AppSettingsRequest uygulama ayarları request yapısı
type AppSettingsRequest struct {
	Language           *string `json:"language"`
	DarkMode           *bool   `json:"darkMode"`
	AutoplayVideos     *bool   `json:"autoplayVideos"`
	SaveDataMode       *bool   `json:"saveDataMode"`
	ReduceAnimations   *bool   `json:"reduceAnimations"`
	ShowActivityStatus *bool   `json:"showActivityStatus"`
	FontSize           *string `json:"fontSize"` // "small", "medium", "large"
}

// GetAppSettings uygulama ayarlarını getirir
func GetAppSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.AppSettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Eğer ayarlar bulunamadıysa, varsayılan ayarlar oluştur
	if result.Error != nil {
		fmt.Printf("[INFO] Kullanıcı için uygulama ayarları bulunamadı (UserID: %v), varsayılan ayarlar oluşturuluyor\n", userID)
		settings = models.AppSettings{
			UserID:             userID.(uint),
			Language:           "tr",
			DarkMode:           true,
			AutoplayVideos:     true,
			SaveDataMode:       false,
			ReduceAnimations:   false,
			ShowActivityStatus: true,
			FontSize:           "medium",
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}

		// Veritabanına kaydet
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Varsayılan uygulama ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Uygulama ayarları oluşturulurken bir hata oluştu"})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    settings,
	})
}

// UpdateAppSettings uygulama ayarlarını günceller
func UpdateAppSettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request AppSettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	var settings models.AppSettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur, varsa güncelle
	isNew := false
	if result.Error != nil {
		isNew = true
		settings = models.AppSettings{
			UserID: userID.(uint),
		}
	}

	// Request'ten gelen değerleri ayarlara ekle (nil olmayan değerler için)
	updates := make(map[string]interface{})
	if request.Language != nil {
		updates["Language"] = *request.Language
	}
	if request.DarkMode != nil {
		updates["DarkMode"] = *request.DarkMode
	}
	if request.AutoplayVideos != nil {
		updates["AutoplayVideos"] = *request.AutoplayVideos
	}
	if request.SaveDataMode != nil {
		updates["SaveDataMode"] = *request.SaveDataMode
	}
	if request.ReduceAnimations != nil {
		updates["ReduceAnimations"] = *request.ReduceAnimations
	}
	if request.ShowActivityStatus != nil {
		updates["ShowActivityStatus"] = *request.ShowActivityStatus
	}
	if request.FontSize != nil {
		// Font size değeri geçerli mi kontrol et
		if *request.FontSize == "small" || *request.FontSize == "medium" || *request.FontSize == "large" {
			updates["FontSize"] = *request.FontSize
		} else {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz font boyutu. Geçerli değerler: small, medium, large"})
			return
		}
	}

	// Güncelleme zamanını ekle
	updates["UpdatedAt"] = time.Now()

	if isNew {
		// Tüm alanları varsayılan değerlerle doldur
		if request.Language == nil {
			settings.Language = "tr"
		}
		if request.DarkMode == nil {
			settings.DarkMode = true
		}
		if request.AutoplayVideos == nil {
			settings.AutoplayVideos = true
		}
		if request.SaveDataMode == nil {
			settings.SaveDataMode = false
		}
		if request.ReduceAnimations == nil {
			settings.ReduceAnimations = false
		}
		if request.ShowActivityStatus == nil {
			settings.ShowActivityStatus = true
		}
		if request.FontSize == nil {
			settings.FontSize = "medium"
		}

		// Diğer varsayılan değerleri ayarla
		settings.CreatedAt = time.Now()
		settings.UpdatedAt = time.Now()

		// Veritabanına yeni kayıt ekle
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Uygulama ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Uygulama ayarları oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Uygulama ayarları güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Uygulama ayarları güncellenirken bir hata oluştu"})
			return
		}
	}

	// Güncel ayarları tekrar al
	database.DB.Where("user_id = ?", userID).First(&settings)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Uygulama ayarları başarıyla güncellendi",
		Data:    settings,
	})
}
