package controllers

import (
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

// FollowUser kullanıcı takip etme işlemi
func FollowUser(c *gin.Context) {
	followerID, _ := c.Get("userID")
	followingIDStr := c.Param("id")

	// followingID'yi doğrula
	followingID, err := strconv.ParseUint(followingIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Kendini takip edemezsin
	if followerID.(uint) == uint(followingID) {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Kendinizi takip edemezsiniz",
		})
		return
	}

	// Kullanıcının varlığını kontrol et
	var user models.User
	if err := database.DB.First(&user, followingID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Zaten takip ediliyor mu kontrol et
	var follow models.Follow
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingID).First(&follow)

	if result.Error == nil {
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Bu kullanıcıyı zaten takip ediyorsunuz",
		})
		return
	}

	// Yeni takip kaydı oluştur
	newFollow := models.Follow{
		FollowerID:  followerID.(uint),
		FollowingID: uint(followingID),
	}

	if err := database.DB.Create(&newFollow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Takip işlemi başarısız oldu: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kullanıcı başarıyla takip edildi",
	})
}

// UnfollowUser kullanıcı takibi bırakma işlemi
func UnfollowUser(c *gin.Context) {
	followerID, _ := c.Get("userID")
	followingIDStr := c.Param("id")

	// followingID'yi doğrula
	followingID, err := strconv.ParseUint(followingIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz kullanıcı ID",
		})
		return
	}

	// Takip kaydını sil
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, followingID).Delete(&models.Follow{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Takip ilişkisi bulunamadı",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kullanıcı takibi bırakıldı",
	})
}
