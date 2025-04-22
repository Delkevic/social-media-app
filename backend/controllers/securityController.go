package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// SecuritySettingsRequest güvenlik ayarları request yapısı
type SecuritySettingsRequest struct {
	TwoFactorEnabled     *bool   `json:"twoFactorEnabled"`
	TwoFactorMethod      *string `json:"twoFactorMethod"` // sms, email, app
	LoginAlerts          *bool   `json:"loginAlerts"`
	SuspiciousLoginBlock *bool   `json:"suspiciousLoginBlock"`
	SessionTimeout       *int    `json:"sessionTimeout"` // in seconds
	RememberMe           *bool   `json:"rememberMe"`
}

// GetSecuritySettings güvenlik ayarlarını getirir
func GetSecuritySettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.SecuritySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Eğer ayarlar bulunamadıysa, varsayılan ayarlar oluştur
	if result.Error != nil {
		fmt.Printf("[INFO] Kullanıcı için güvenlik ayarları bulunamadı (UserID: %v), varsayılan ayarlar oluşturuluyor\n", userID)
		settings = models.SecuritySettings{
			UserID:               userID.(uint),
			TwoFactorEnabled:     false,
			TwoFactorMethod:      "sms",
			LoginAlerts:          true,
			SuspiciousLoginBlock: true,
			SessionTimeout:       7200, // 2 saat
			RememberMe:           true,
			CreatedAt:            time.Now(),
			UpdatedAt:            time.Now(),
		}

		// Veritabanına kaydet
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Varsayılan güvenlik ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Güvenlik ayarları oluşturulurken bir hata oluştu"})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    settings,
	})
}

// UpdateSecuritySettings güvenlik ayarlarını günceller
func UpdateSecuritySettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request SecuritySettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	var settings models.SecuritySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur, varsa güncelle
	isNew := false
	if result.Error != nil {
		isNew = true
		settings = models.SecuritySettings{
			UserID: userID.(uint),
		}
	}

	// Request'ten gelen değerleri ayarlara ekle (nil olmayan değerler için)
	updates := make(map[string]interface{})
	if request.TwoFactorEnabled != nil {
		updates["TwoFactorEnabled"] = *request.TwoFactorEnabled
	}
	if request.TwoFactorMethod != nil {
		// Geçerli bir değer mi kontrol et
		if *request.TwoFactorMethod == "sms" || *request.TwoFactorMethod == "email" || *request.TwoFactorMethod == "app" {
			updates["TwoFactorMethod"] = *request.TwoFactorMethod
		} else {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz iki faktörlü doğrulama yöntemi. Geçerli değerler: sms, email, app"})
			return
		}
	}
	if request.LoginAlerts != nil {
		updates["LoginAlerts"] = *request.LoginAlerts
	}
	if request.SuspiciousLoginBlock != nil {
		updates["SuspiciousLoginBlock"] = *request.SuspiciousLoginBlock
	}
	if request.SessionTimeout != nil {
		// Session timeout değeri makul bir aralıkta mı kontrol et (min 15 dakika, max 1 hafta)
		if *request.SessionTimeout >= 900 && *request.SessionTimeout <= 604800 {
			updates["SessionTimeout"] = *request.SessionTimeout
		} else {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz oturum zaman aşımı değeri. 900 (15 dakika) ile 604800 (1 hafta) arasında olmalıdır."})
			return
		}
	}
	if request.RememberMe != nil {
		updates["RememberMe"] = *request.RememberMe
	}

	// Güncelleme zamanını ekle
	updates["UpdatedAt"] = time.Now()

	if isNew {
		// Tüm alanları varsayılan değerlerle doldur
		if request.TwoFactorEnabled == nil {
			settings.TwoFactorEnabled = false
		}
		if request.TwoFactorMethod == nil {
			settings.TwoFactorMethod = "sms"
		}
		if request.LoginAlerts == nil {
			settings.LoginAlerts = true
		}
		if request.SuspiciousLoginBlock == nil {
			settings.SuspiciousLoginBlock = true
		}
		if request.SessionTimeout == nil {
			settings.SessionTimeout = 7200 // 2 saat
		}
		if request.RememberMe == nil {
			settings.RememberMe = true
		}

		// Diğer varsayılan değerleri ayarla
		settings.CreatedAt = time.Now()
		settings.UpdatedAt = time.Now()

		// Veritabanına yeni kayıt ekle
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Güvenlik ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Güvenlik ayarları oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Güvenlik ayarları güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Güvenlik ayarları güncellenirken bir hata oluştu"})
			return
		}
	}

	// Güncel ayarları tekrar al
	database.DB.Where("user_id = ?", userID).First(&settings)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Güvenlik ayarları başarıyla güncellendi",
		Data:    settings,
	})
}
