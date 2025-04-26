package controllers

import (
	"log"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/utils"

	"github.com/gin-gonic/gin"
)

// SecuritySettingsRequest, güvenlik ayarları güncellemesi için gelen istekleri temsil eder
type SecuritySettingsRequest struct {
	TwoFactorEnabled     *bool   `json:"twoFactorEnabled"`
	TwoFactorMethod      *string `json:"twoFactorMethod"`
	LoginAlerts          *bool   `json:"loginAlerts"`
	SuspiciousLoginBlock *bool   `json:"suspiciousLoginBlock"`
	SessionTimeout       *int    `json:"sessionTimeout"`
	RememberMe           *bool   `json:"rememberMe"`
}

// GetSecuritySettings, kullanıcının güvenlik ayarlarını getirir
func GetSecuritySettings(c *gin.Context) {
	userID, exists := utils.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı kimliği doğrulanamadı"})
		return
	}

	log.Printf("DEBUG: GetSecuritySettings çağrıldı - userID: %v", userID)

	var settings models.SecuritySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	if result.Error != nil || result.RowsAffected == 0 {
		log.Printf("DEBUG: Ayarlar bulunamadı, varsayılan değerler oluşturuluyor - userID: %v, error: %v", userID, result.Error)

		// Ayarlar bulunamadıysa varsayılan değerlerle yeni bir ayar oluştur
		defaultSettings := models.SecuritySettings{
			UserID:               userID,
			TwoFactorEnabled:     false,
			TwoFactorMethod:      "sms",
			LoginAlerts:          true,
			SuspiciousLoginBlock: true,
			SessionTimeout:       7200,
			RememberMe:           true,
		}

		// Varsayılan ayarları veritabanına kaydet
		if err := database.DB.Create(&defaultSettings).Error; err != nil {
			log.Printf("ERROR: Varsayılan ayarlar oluşturulamadı - userID: %v, error: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Güvenlik ayarları oluşturulamadı", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"twoFactorEnabled":     defaultSettings.TwoFactorEnabled,
			"twoFactorMethod":      defaultSettings.TwoFactorMethod,
			"loginAlerts":          defaultSettings.LoginAlerts,
			"suspiciousLoginBlock": defaultSettings.SuspiciousLoginBlock,
			"sessionTimeout":       defaultSettings.SessionTimeout,
			"rememberMe":           defaultSettings.RememberMe,
		})
		return
	}

	log.Printf("DEBUG: Mevcut ayarlar bulundu - userID: %v, twoFactorEnabled: %v, loginAlerts: %v",
		userID, settings.TwoFactorEnabled, settings.LoginAlerts)

	c.JSON(http.StatusOK, gin.H{
		"twoFactorEnabled":     settings.TwoFactorEnabled,
		"twoFactorMethod":      settings.TwoFactorMethod,
		"loginAlerts":          settings.LoginAlerts,
		"suspiciousLoginBlock": settings.SuspiciousLoginBlock,
		"sessionTimeout":       settings.SessionTimeout,
		"rememberMe":           settings.RememberMe,
	})
}

// UpdateSecuritySettings, kullanıcının güvenlik ayarlarını günceller
func UpdateSecuritySettings(c *gin.Context) {
	userID, exists := utils.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı kimliği doğrulanamadı"})
		return
	}

	var request SecuritySettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek formatı", "details": err.Error()})
		return
	}

	log.Printf("DEBUG: UpdateSecuritySettings çağrıldı - userID: %v, request: %+v", userID, request)

	// Mevcut ayarları kontrol et
	var settings models.SecuritySettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Güncellenecek alanları yönetmek için map oluştur
	updates := make(map[string]interface{})

	// Gelen istekte değerlerin var olup olmadığını kontrol et ve map'e ekle
	if request.TwoFactorEnabled != nil {
		updates["two_factor_enabled"] = *request.TwoFactorEnabled
		log.Printf("DEBUG: two_factor_enabled güncellenecek: %v", *request.TwoFactorEnabled)
	}
	if request.TwoFactorMethod != nil {
		updates["two_factor_method"] = *request.TwoFactorMethod
	}
	if request.LoginAlerts != nil {
		updates["login_alerts"] = *request.LoginAlerts
		log.Printf("DEBUG: login_alerts güncellenecek: %v", *request.LoginAlerts)
	}
	if request.SuspiciousLoginBlock != nil {
		updates["suspicious_login_block"] = *request.SuspiciousLoginBlock
	}
	if request.SessionTimeout != nil {
		updates["session_timeout"] = *request.SessionTimeout
	}
	if request.RememberMe != nil {
		updates["remember_me"] = *request.RememberMe
	}

	// Eğer mevcut ayarlar bulunamadıysa yeni oluştur
	if result.Error != nil || result.RowsAffected == 0 {
		log.Printf("DEBUG: Güvenlik ayarları bulunamadı, yeni oluşturuluyor - userID: %v", userID)

		// Varsayılan değerler
		newSettings := models.SecuritySettings{
			UserID:               userID,
			TwoFactorEnabled:     false,
			TwoFactorMethod:      "sms",
			LoginAlerts:          true,
			SuspiciousLoginBlock: true,
			SessionTimeout:       7200,
			RememberMe:           true,
		}

		// İstekteki değerler varsa güncelle
		if request.TwoFactorEnabled != nil {
			newSettings.TwoFactorEnabled = *request.TwoFactorEnabled
		}
		if request.TwoFactorMethod != nil {
			newSettings.TwoFactorMethod = *request.TwoFactorMethod
		}
		if request.LoginAlerts != nil {
			newSettings.LoginAlerts = *request.LoginAlerts
		}
		if request.SuspiciousLoginBlock != nil {
			newSettings.SuspiciousLoginBlock = *request.SuspiciousLoginBlock
		}
		if request.SessionTimeout != nil {
			newSettings.SessionTimeout = *request.SessionTimeout
		}
		if request.RememberMe != nil {
			newSettings.RememberMe = *request.RememberMe
		}

		// Yeni ayarları veritabanına kaydet
		if err := database.DB.Create(&newSettings).Error; err != nil {
			log.Printf("ERROR: Yeni güvenlik ayarları oluşturulamadı - userID: %v, error: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Güvenlik ayarları oluşturulamadı", "details": err.Error()})
			return
		}

		log.Printf("DEBUG: Yeni güvenlik ayarları başarıyla oluşturuldu - userID: %v", userID)
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Güvenlik ayarları başarıyla güncellendi"})
		return
	}

	// Eğer güncelleme yapılacak alan yoksa hata dön
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Güncellenecek ayar belirtilmedi"})
		return
	}

	// Ayarları güncelle
	if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
		log.Printf("ERROR: Güvenlik ayarları güncellenemedi - userID: %v, error: %v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Güvenlik ayarları güncellenemedi", "details": err.Error()})
		return
	}

	log.Printf("DEBUG: Güvenlik ayarları başarıyla güncellendi - userID: %v, updates: %+v", userID, updates)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Güvenlik ayarları başarıyla güncellendi"})
}
