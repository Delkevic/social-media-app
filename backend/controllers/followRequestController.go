package controllers

import (
	"net/http"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// SendFollowRequest - Gizli bir hesaba takip isteği gönderir
func SendFollowRequestToUser(c *gin.Context) {
	// Takip edilecek kişinin kullanıcı adını alım (URL'den)
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kullanıcı adı"})
		return
	}

	// İsteği gönderen kullanıcı ID (JWT token'dan)
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// Hedef kullanıcıyı kullanıcı adıyla bul
	var targetUser models.User
	if err := database.DB.Where("username = ?", username).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}

	// Kendi kendini takip etmeyi engelle
	if targetUser.ID == followerID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kendinizi takip edemezsiniz"})
		return
	}

	// Zaten takip ediliyor mu kontrol et
	var existingFollow models.Follow
	result := database.DB.Where("follower_id = ? AND following_id = ?", followerID, targetUser.ID).First(&existingFollow)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bu kullanıcıyı zaten takip ediyorsunuz"})
		return
	}

	// Zaten bekleyen bir istek var mı kontrol et
	var existingRequest models.FollowRequest
	result = database.DB.Where("follower_id = ? AND following_id = ? AND status = ?",
		followerID, targetUser.ID, "pending").First(&existingRequest)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bu kullanıcıya zaten takip isteği gönderilmiş"})
		return
	}

	// Hesap gizli değilse direkt takip et
	if !targetUser.IsPrivate {
		newFollow := models.Follow{
			FollowerID:  followerID.(uint),
			FollowingID: targetUser.ID,
		}

		if err := database.DB.Create(&newFollow).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Takip işlemi başarısız oldu"})
			return
		}

		// İsteği gönderen kullanıcı bilgilerini al
		var currentUser models.User
		database.DB.First(&currentUser, followerID)

		// Bildirimi oluştur
		go func() {
			ctx := c.Request.Context()
			notificationService := services.NewNotificationService()
			notificationService.CreateFollowNotification(
				ctx,
				strconv.Itoa(int(targetUser.ID)),
				strconv.Itoa(int(currentUser.ID)),
				currentUser.FullName,
				currentUser.Username,
				currentUser.ProfileImage,
			)
		}()

		c.JSON(http.StatusOK, gin.H{"message": "Kullanıcı takip edildi"})
		return
	}

	// Hesap gizliyse takip isteği oluştur
	followRequest := models.FollowRequest{
		FollowerID:  followerID.(uint),
		FollowingID: targetUser.ID,
		Status:      "pending",
	}

	if err := database.DB.Create(&followRequest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Takip isteği gönderilemedi"})
		return
	}

	// İsteği gönderen kullanıcı bilgilerini al
	var follower models.User
	database.DB.First(&follower, followerID)

	// Takip isteği bildirimi oluştur
	go func() {
		ctx := c.Request.Context()
		notificationService := services.NewNotificationService()
		notificationService.CreateFollowNotification(
			ctx,
			strconv.Itoa(int(targetUser.ID)),
			strconv.Itoa(int(follower.ID)),
			follower.FullName,
			follower.Username,
			follower.ProfileImage,
		)
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Takip isteği gönderildi"})
}

// GetPendingFollowRequests - Kullanıcıya gelen takip isteklerini listeler
func GetPendingFollowRequestsList(c *gin.Context) {
	// Kullanıcı ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// Bekleyen takip istekleri
	var requests []models.FollowRequest
	if err := database.DB.Preload("Follower").
		Where("following_id = ? AND status = ?", userID, "pending").
		Order("created_at DESC").
		Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Takip istekleri getirilemedi"})
		return
	}

	// Yanıtı formatla
	type FollowRequestResponse struct {
		ID       uint `json:"id"`
		Follower struct {
			ID           uint   `json:"id"`
			Username     string `json:"username"`
			FullName     string `json:"fullName"`
			ProfileImage string `json:"profileImage"`
		} `json:"follower"`
		CreatedAt time.Time `json:"createdAt"`
	}

	response := make([]FollowRequestResponse, 0, len(requests))
	for _, req := range requests {
		respItem := FollowRequestResponse{
			ID:        req.ID,
			CreatedAt: req.CreatedAt,
		}
		respItem.Follower.ID = req.Follower.ID
		respItem.Follower.Username = req.Follower.Username
		respItem.Follower.FullName = req.Follower.FullName
		respItem.Follower.ProfileImage = req.Follower.ProfileImage

		response = append(response, respItem)
	}

	c.JSON(http.StatusOK, gin.H{"requests": response})
}

// AcceptFollowRequest - Takip isteğini kabul eder
func AcceptFollowRequestById(c *gin.Context) {
	// İstek ID
	requestID := c.Param("request_id")
	requestIDUint, err := strconv.ParseUint(requestID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek ID'si"})
		return
	}

	// Kullanıcı ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// İsteği bul
	var request models.FollowRequest
	if err := database.DB.Preload("Follower").First(&request, requestIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Takip isteği bulunamadı"})
		return
	}

	// İsteğin bu kullanıcıya ait olduğunu doğrula
	if request.FollowingID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu isteği işleme yetkisine sahip değilsiniz"})
		return
	}

	// İstek durumunu güncelle
	request.Status = "accepted"
	if err := database.DB.Save(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "İstek güncellenemedi"})
		return
	}

	// Takip ilişkisini oluştur
	newFollow := models.Follow{
		FollowerID:  request.FollowerID,
		FollowingID: request.FollowingID,
	}

	if err := database.DB.Create(&newFollow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Takip ilişkisi oluşturulamadı"})
		return
	}

	// Takipçiye kabul bildirimini gönder
	go func() {
		ctx := c.Request.Context()
		var currentUser models.User
		database.DB.First(&currentUser, userID)

		notificationService := services.NewNotificationService()
		// Kabul bildirimi
		notificationService.CreateFollowNotification(
			ctx,
			strconv.Itoa(int(request.FollowerID)),
			strconv.Itoa(int(currentUser.ID)),
			currentUser.FullName,
			currentUser.Username,
			currentUser.ProfileImage,
		)
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Takip isteği kabul edildi"})
}

// RejectFollowRequest - Takip isteğini reddeder
func RejectFollowRequestById(c *gin.Context) {
	// İstek ID
	requestID := c.Param("request_id")
	requestIDUint, err := strconv.ParseUint(requestID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek ID'si"})
		return
	}

	// Kullanıcı ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// İsteği bul
	var request models.FollowRequest
	if err := database.DB.First(&request, requestIDUint).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Takip isteği bulunamadı"})
		return
	}

	// İsteğin bu kullanıcıya ait olduğunu doğrula
	if request.FollowingID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu isteği işleme yetkisine sahip değilsiniz"})
		return
	}

	// İstek durumunu güncelle
	request.Status = "rejected"
	if err := database.DB.Save(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "İstek güncellenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Takip isteği reddedildi"})
}

// CancelFollowRequest - Gönderilen takip isteğini iptal eder
func CancelFollowRequestByUsername(c *gin.Context) {
	// Takip isteği gönderilen kullanıcının kullanıcı adı
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kullanıcı adı"})
		return
	}

	// İsteği gönderen kullanıcı ID (JWT token'dan)
	followerID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kimlik doğrulama hatası"})
		return
	}

	// Hedef kullanıcıyı kullanıcı adıyla bul
	var targetUser models.User
	if err := database.DB.Where("username = ?", username).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}

	// İsteği bul ve sil
	result := database.DB.Where("follower_id = ? AND following_id = ? AND status = ?",
		followerID, targetUser.ID, "pending").Delete(&models.FollowRequest{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Aktif takip isteği bulunamadı"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Takip isteği iptal edildi"})
}
