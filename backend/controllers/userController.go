package controllers

import (
	"fmt"
	"net/http"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Kayıt isteği için struct - Sadece gerekli alanları içerecek şekilde düzenlendi
type RegisterRequest struct {
	Username        string `json:"username" binding:"required,min=3,max=30"`
	Email           string `json:"email" binding:"required,email"`
	Password        string `json:"password" binding:"required,min=6"`
	ConfirmPassword string `json:"confirmPassword" binding:"required,eqfield=Password"`
}

// Giriş isteği için struct
type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"` // Email veya kullanıcı adı
	Password   string `json:"password" binding:"required"`
}

// Cevap yapısı
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Token   string      `json:"token,omitempty"`
}

// Register handler - FullName alanı artık zorunlu değil
func Register(c *gin.Context) {
	var request RegisterRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz form verileri: " + err.Error(),
		})
		return
	}

	// Email kontrolü
	var existingUser models.User
	result := database.DB.Where("email = ?", request.Email).First(&existingUser)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Bu e-posta adresi zaten kullanılıyor",
		})
		return
	}

	// Kullanıcı adı kontrolü
	result = database.DB.Where("username = ?", request.Username).First(&existingUser)
	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Bu kullanıcı adı zaten kullanılıyor",
		})
		return
	}

	// Şifreyi hashle
	hashedPassword, err := auth.HashPassword(request.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre işlenirken bir hata oluştu",
		})
		return
	}

	// Kullanıcıyı oluştur - sadece gerekli alanlarla
	user := models.User{
		Username:  request.Username,
		Email:     request.Email,
		Password:  hashedPassword,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		LastLogin: time.Now(),
	}

	result = database.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Kullanıcı oluşturulurken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// JWT token oluştur
	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Token oluşturulurken bir hata oluştu",
		})
		return
	}

	c.JSON(http.StatusCreated, Response{
		Success: true,
		Message: "Kayıt başarılı",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
			},
		},
		Token: token,
	})
}

// Login handler
func Login(c *gin.Context) {
	var request LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz form verileri: " + err.Error(),
		})
		return
	}

	// Kullanıcıyı bul - email veya kullanıcı adına göre
	var user models.User
	var result *gorm.DB

	// identifier'da @ işareti varsa email olarak, yoksa kullanıcı adı olarak kabul et
	if strings.Contains(request.Identifier, "@") {
		result = database.DB.Where("email = ?", request.Identifier).First(&user)
	} else {
		result = database.DB.Where("username = ?", request.Identifier).First(&user)
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Kullanıcı adı/e-posta veya şifre hatalı",
		})
		return
	}

	// Şifreyi kontrol et
	err := auth.CheckPassword(request.Password, user.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Kullanıcı adı/e-posta veya şifre hatalı",
		})
		return
	}

	// Son giriş zamanını güncelle
	database.DB.Model(&user).Update("last_login", time.Now())

	// JWT token oluştur
	token, err := auth.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Token oluşturulurken bir hata oluştu",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Giriş başarılı",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"fullName": user.FullName,
				"email":    user.Email,
			},
		},
		Token: token,
	})
}

// Auth Middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, Response{
				Success: false,
				Message: "Yetkilendirme başlığı bulunamadı",
			})
			c.Abort()
			return
		}

		// "Bearer " prefixini kaldır
		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, Response{
				Success: false,
				Message: "Geçersiz veya süresi dolmuş token",
			})
			c.Abort()
			return
		}

		// Kullanıcı ID'sini context'e ekle
		c.Set("userID", claims.UserID)
		c.Next()
	}
}

// GetUserProfile - Kullanıcı profil bilgilerini getirir
func GetUserProfile(c *gin.Context) {
	// Middleware'den gelen kullanıcı ID'sini al
	userID, _ := c.Get("userID")

	var user models.User
	result := database.DB.First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":           user.ID,
				"username":     user.Username,
				"fullName":     user.FullName,
				"email":        user.Email,
				"profileImage": user.ProfileImage,
				"bio":          user.Bio,
				"location":     user.Location,
				"website":      user.Website,
				"isPrivate":    user.IsPrivate,
				"isVerified":   user.IsVerified,
				"isAdmin":      user.IsAdmin,
				"createdAt":    user.CreatedAt,
				"lastLogin":    user.LastLogin,
			},
		},
	})
}

func GetUserByUsername(c *gin.Context) {
	username := c.Param("username")
	currentUserID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Takipçi ve takip edilenlerin sayısını al
	var followerCount int64
	database.DB.Model(&models.Follow{}).Where("following_id = ?", user.ID).Count(&followerCount)

	var followingCount int64
	database.DB.Model(&models.Follow{}).Where("follower_id = ?", user.ID).Count(&followingCount)

	// Gönderi sayısını al
	var postCount int64
	database.DB.Model(&models.Post{}).Where("user_id = ?", user.ID).Count(&postCount)

	// Mevcut kullanıcının bu kullanıcıyı takip edip etmediğini kontrol et
	var isFollowing bool
	if currentUserID != nil {
		var followCount int64
		database.DB.Model(&models.Follow{}).
			Where("follower_id = ? AND following_id = ?", currentUserID, user.ID).
			Count(&followCount)
		isFollowing = followCount > 0
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":             user.ID,
				"username":       user.Username,
				"fullName":       user.FullName,
				"profileImage":   user.ProfileImage,
				"bio":            user.Bio,
				"location":       user.Location,
				"website":        user.Website,
				"isPrivate":      user.IsPrivate,
				"isVerified":     user.IsVerified,
				"followerCount":  followerCount,
				"followingCount": followingCount,
				"postCount":      postCount,
				"isFollowing":    isFollowing,
				"createdAt":      user.CreatedAt,
			},
		},
	})
}

// Kullanıcı Gönderilerini Getirme
func GetUserPosts(c *gin.Context) {
	username := c.Param("username")
	currentUserID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	var posts []models.Post
	if err := database.DB.Where("user_id = ?", user.ID).
		Preload("Images"). // Burada Images ilişkisini preload ediyoruz
		Order("created_at DESC").
		Find(&posts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Gönderiler yüklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Yanıt için post dizisi oluştur
	var responsePosts []map[string]interface{}

	for _, post := range posts {
		// Kullanıcının gönderiyi beğenip beğenmediğini kontrol et
		var likeCount int64
		database.DB.Model(&models.Like{}).
			Where("user_id = ? AND post_id = ?", currentUserID, post.ID).
			Count(&likeCount)

		// Kullanıcının gönderiyi kaydedip kaydetmediğini kontrol et
		var saveCount int64
		database.DB.Model(&models.SavedPost{}).
			Where("user_id = ? AND post_id = ?", currentUserID, post.ID).
			Count(&saveCount)

		// Görsel URL'lerini derle
		var imageURLs []string
		for _, image := range post.Images {
			imageURLs = append(imageURLs, image.URL)
		}

		// Yanıt oluştur
		postResponse := map[string]interface{}{
			"id":        post.ID,
			"content":   post.Content,
			"likes":     post.LikeCount,
			"comments":  post.CommentCount,
			"createdAt": formatTimeAgo(post.CreatedAt),
			"liked":     likeCount > 0,
			"saved":     saveCount > 0,
			"images":    imageURLs, // Resim URL'lerini ekle
			"user": map[string]interface{}{
				"id":           user.ID,
				"username":     user.Username,
				"profileImage": user.ProfileImage,
			},
		}

		responsePosts = append(responsePosts, postResponse)
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"posts": responsePosts,
		},
	})
}

// Profil güncelleme isteği için struct
type UpdateProfileRequest struct {
	FullName     string `json:"fullName"`
	Bio          string `json:"bio"`
	Location     string `json:"location"`
	Website      string `json:"website"`
	ProfileImage string `json:"profileImage"`
}

// UpdateProfile - Kullanıcı profil bilgilerini günceller
func UpdateProfile(c *gin.Context) {
	// Middleware'den gelen kullanıcı ID'sini al
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Oturum bilgisi bulunamadı",
		})
		return
	}

	var request UpdateProfileRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz form verileri: " + err.Error(),
		})
		return
	}

	// Kullanıcıyı bul
	var user models.User
	result := database.DB.First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Kullanıcı bilgilerini güncelle
	updates := map[string]interface{}{
		"FullName":     request.FullName,
		"Bio":          request.Bio,
		"Location":     request.Location,
		"Website":      request.Website,
		"ProfileImage": request.ProfileImage,
		"UpdatedAt":    time.Now(),
	}

	// Boş değerleri güncelleme işlemine dahil etme
	for key, value := range updates {
		if value == "" {
			delete(updates, key)
		}
	}

	// Güncelleme işlemi
	result = database.DB.Model(&user).Updates(updates)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Profil güncellenirken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Güncel kullanıcı bilgilerini al
	database.DB.First(&user, userID)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Profil başarıyla güncellendi",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":           user.ID,
				"username":     user.Username,
				"fullName":     user.FullName,
				"email":        user.Email,
				"profileImage": user.ProfileImage,
				"bio":          user.Bio,
				"location":     user.Location,
				"website":      user.Website,
				"isPrivate":    user.IsPrivate,
				"isVerified":   user.IsVerified,
				"isAdmin":      user.IsAdmin,
				"createdAt":    user.CreatedAt,
				"updatedAt":    user.UpdatedAt,
			},
		},
	})
}

// SearchUsers kullanıcı adı veya tam adına göre kullanıcıları arar
func SearchUsers(c *gin.Context) {
	// Sorgu parametresini al
	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Arama sorgusu boş olamaz",
		})
		return
	}

	// URL parametresinden gelen kullanıcı ID'sini al
	currentUserIdParam := c.Query("currentUserId")
	var currentUserID uint
	if currentUserIdParam != "" {
		id, err := strconv.ParseUint(currentUserIdParam, 10, 32)
		if err == nil {
			currentUserID = uint(id)
			fmt.Printf("Filtrelenecek kullanıcı ID: %d\n", currentUserID)
		}
	}

	// Debug için logla
	fmt.Printf("Kullanıcı araması yapılıyor. Sorgu: %s, Filtreleme ID: %d\n", query, currentUserID)

	// Arama sorgusunu hazırla
	searchQuery := "%" + query + "%"
	var users []models.User

	// Kullanıcı adı veya tam ada göre arama yap
	result := database.DB.
		Where("username LIKE ? OR full_name LIKE ?", searchQuery, searchQuery).
		Select("id, username, full_name, profile_image, bio").
		Limit(20).
		Find(&users)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Kullanıcılar aranırken bir hata oluştu: " + result.Error.Error(),
		})
		return
	}

	// Sonuçları hazırla
	var userResults []map[string]interface{}
	for _, user := range users {
		// Kullanıcı kendisiyse, sonuçlara ekleme
		if currentUserID > 0 && user.ID == currentUserID {
			fmt.Printf("Kullanıcı kendisi filtreleniyor: %d\n", user.ID)
			continue
		}

		userResults = append(userResults, map[string]interface{}{
			"id":           user.ID,
			"username":     user.Username,
			"fullName":     user.FullName,
			"profileImage": user.ProfileImage,
			"bio":          user.Bio,
		})
	}

	// Yanıt döndür
	fmt.Printf("Arama tamamlandı. %d sonuç bulundu.\n", len(userResults))
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kullanıcılar başarıyla arandı",
		Data:    userResults,
	})
}
