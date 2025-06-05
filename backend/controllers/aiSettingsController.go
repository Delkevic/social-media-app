package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

// AISettingsRequest yapay zeka ayarları request yapısı
type AISettingsRequest struct {
	PersonalizedContent *bool `json:"personalizedContent"`
	ContentFiltering    *bool `json:"contentFiltering"`
	SuggestedUsers      *bool `json:"suggestedUsers"`
	SuggestedContent    *bool `json:"suggestedContent"`
	AIGeneration        *bool `json:"aiGeneration"`
	DataCollection      *bool `json:"dataCollection"`
}

// GetAISettings yapay zeka ayarlarını getirir
func GetAISettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var settings models.AISettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Eğer ayarlar bulunamadıysa, varsayılan ayarlar oluştur
	if result.Error != nil {
		fmt.Printf("[INFO] Kullanıcı için yapay zeka ayarları bulunamadı (UserID: %v), varsayılan ayarlar oluşturuluyor\n", userID)
		settings = models.AISettings{
			UserID:              userID.(uint),
			PersonalizedContent: true,
			ContentFiltering:    true,
			SuggestedUsers:      true,
			SuggestedContent:    true,
			AIGeneration:        true,
			DataCollection:      true,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		}

		// Veritabanına kaydet
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Varsayılan yapay zeka ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Yapay zeka ayarları oluşturulurken bir hata oluştu"})
			return
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    settings,
	})
}

// UpdateAISettings yapay zeka ayarlarını günceller
func UpdateAISettings(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request AISettingsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	var settings models.AISettings
	result := database.DB.Where("user_id = ?", userID).First(&settings)

	// Ayarlar yoksa oluştur, varsa güncelle
	isNew := false
	if result.Error != nil {
		isNew = true
		settings = models.AISettings{
			UserID: userID.(uint),
		}
	}

	// Request'ten gelen değerleri ayarlara ekle (nil olmayan değerler için)
	updates := make(map[string]interface{})
	if request.PersonalizedContent != nil {
		updates["PersonalizedContent"] = *request.PersonalizedContent
	}
	if request.ContentFiltering != nil {
		updates["ContentFiltering"] = *request.ContentFiltering
	}
	if request.SuggestedUsers != nil {
		updates["SuggestedUsers"] = *request.SuggestedUsers
	}
	if request.SuggestedContent != nil {
		updates["SuggestedContent"] = *request.SuggestedContent
	}
	if request.AIGeneration != nil {
		updates["AIGeneration"] = *request.AIGeneration
	}
	if request.DataCollection != nil {
		updates["DataCollection"] = *request.DataCollection
	}

	// Güncelleme zamanını ekle
	updates["UpdatedAt"] = time.Now()

	if isNew {
		// Tüm alanları varsayılan değerlerle doldur
		if request.PersonalizedContent == nil {
			settings.PersonalizedContent = true
		}
		if request.ContentFiltering == nil {
			settings.ContentFiltering = true
		}
		if request.SuggestedUsers == nil {
			settings.SuggestedUsers = true
		}
		if request.SuggestedContent == nil {
			settings.SuggestedContent = true
		}
		if request.AIGeneration == nil {
			settings.AIGeneration = true
		}
		if request.DataCollection == nil {
			settings.DataCollection = true
		}

		// Diğer varsayılan değerleri ayarla
		settings.CreatedAt = time.Now()
		settings.UpdatedAt = time.Now()

		// Veritabanına yeni kayıt ekle
		if err := database.DB.Create(&settings).Error; err != nil {
			fmt.Printf("[ERROR] Yapay zeka ayarları oluşturulurken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Yapay zeka ayarları oluşturulurken bir hata oluştu"})
			return
		}
	} else {
		// Mevcut kaydı güncelle
		if err := database.DB.Model(&settings).Updates(updates).Error; err != nil {
			fmt.Printf("[ERROR] Yapay zeka ayarları güncellenirken hata (UserID: %v): %v\n", userID, err)
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Yapay zeka ayarları güncellenirken bir hata oluştu"})
			return
		}
	}

	// Güncel ayarları tekrar al
	database.DB.Where("user_id = ?", userID).First(&settings)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Yapay zeka ayarları başarıyla güncellendi",
		Data:    settings,
	})
}
