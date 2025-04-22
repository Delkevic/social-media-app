package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"social-media-app/backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
	"golang.org/x/crypto/bcrypt"
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

// Yardımcı fonksiyonlar
// 6 haneli rastgele kod oluşturur
func UserGenerateRandomCode() string {
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	return code
}

// Zaman dilimini "x gün önce" formatında döndürür
func UserFormatTimeAgo(t time.Time) string {
	now := time.Now()
	diff := now.Sub(t)

	seconds := int(diff.Seconds())
	minutes := seconds / 60
	hours := minutes / 60
	days := hours / 24
	months := days / 30
	years := months / 12

	if years > 0 {
		return fmt.Sprintf("%d yıl önce", years)
	} else if months > 0 {
		return fmt.Sprintf("%d ay önce", months)
	} else if days > 0 {
		return fmt.Sprintf("%d gün önce", days)
	} else if hours > 0 {
		return fmt.Sprintf("%d saat önce", hours)
	} else if minutes > 0 {
		return fmt.Sprintf("%d dakika önce", minutes)
	} else {
		return "az önce"
	}
}

// InitiateRegister initiates the registration process by sending a verification code
func UserInitiateRegister(c *gin.Context) {
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

	// Generate a random 6-digit code
	verificationCode := UserGenerateRandomCode()
	fmt.Printf("Generated verification code: %s for email: %s\n", verificationCode, request.Email)

	// Serialize user data
	userData, err := json.Marshal(request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Kullanıcı verileri işlenirken hata oluştu",
		})
		return
	}

	// Store the verification code in database
	expiryTime := time.Now().Add(15 * time.Minute) // Code valid for 15 minutes
	emailVerification := models.EmailVerification{
		Email:     request.Email,
		Code:      verificationCode,
		UserData:  userData,
		ExpiresAt: expiryTime,
		CreatedAt: time.Now(),
	}

	// Delete any existing verification codes for this email
	if err := database.DB.Where("email = ?", request.Email).Delete(&models.EmailVerification{}).Error; err != nil {
		fmt.Printf("Error deleting previous verification codes: %v\n", err)
		// Continue anyway, it's not critical
	}

	// Save new verification code
	if err := database.DB.Create(&emailVerification).Error; err != nil {
		fmt.Printf("Error saving verification code to database: %v\n", err)
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Doğrulama kodu oluşturulurken bir hata oluştu.",
		})
		return
	}

	// Send email with verification code
	err = sendVerificationEmail(request.Email, verificationCode)
	if err != nil {
		fmt.Printf("Email sending error: %v\n", err)
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Doğrulama e-postası gönderilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	fmt.Printf("Verification email sent successfully to: %s\n", request.Email)
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Doğrulama kodu e-posta adresinize gönderildi.",
		Data: map[string]interface{}{
			"email": request.Email,
		},
	})
}

// CompleteRegistration completes the registration process after code verification
func UserCompleteRegistration(c *gin.Context) {
	var request struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz form verileri: " + err.Error(),
		})
		return
	}

	// Find the verification code
	var verification models.EmailVerification
	result := database.DB.Where("email = ? AND code = ? AND expires_at > ?",
		request.Email, request.Code, time.Now()).First(&verification)

	if result.Error != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz veya süresi dolmuş doğrulama kodu",
		})
		return
	}

	// Deserialize user data
	var registerRequest RegisterRequest
	if err := json.Unmarshal(verification.UserData, &registerRequest); err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Kullanıcı verileri işlenirken hata oluştu",
		})
		return
	}

	// Hash the password
	hashedPassword, err := auth.HashPassword(registerRequest.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre işlenirken bir hata oluştu",
		})
		return
	}

	// Create the user
	user := models.User{
		Username:  registerRequest.Username,
		Email:     registerRequest.Email,
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

	// Delete the verification code
	database.DB.Delete(&verification)

	// Generate JWT token
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
		Message: "Kayıt başarılı. Hesabınız doğrulandı.",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"email":    user.Email,
			},
		},
		Token: token,
	})

	// Send welcome email asynchronously after sending response to client
	go func() {
		err := services.SendWelcomeEmail(user.Email, user.Username)
		if err != nil {
			fmt.Printf("Error sending welcome email: %v\n", err)
		} else {
			fmt.Printf("Welcome email sent successfully to: %s\n", user.Email)
		}
	}()
}

// Send verification email using Brevo API
func sendVerificationEmail(email, code string) error {
	client := resty.New()
	client.SetTimeout(15 * time.Second) // Set a reasonable timeout

	brevoApiKey := os.Getenv("BREVO_API_KEY")
	supportEmail := os.Getenv("SUPPORT_EMAIL_ADDRESS")
	senderEmail := os.Getenv("SUPPORT_SENDER_EMAIL")
	senderName := os.Getenv("SUPPORT_NAME")

	// Validate environment variables
	if brevoApiKey == "" {
		return fmt.Errorf("BREVO_API_KEY is missing")
	}
	if supportEmail == "" {
		return fmt.Errorf("SUPPORT_EMAIL_ADDRESS is missing")
	}
	if senderEmail == "" {
		return fmt.Errorf("SUPPORT_SENDER_EMAIL is missing")
	}
	if senderName == "" {
		return fmt.Errorf("SUPPORT_NAME is missing")
	}

	// Create email content
	htmlContent := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
				<div style="text-align: center; margin-bottom: 20px;">
					<h1 style="color: #3b82f6;">Buzzify - E-posta Doğrulama</h1>
				</div>
				<p>Merhaba,</p>
				<p>Buzzify hesabınızı oluşturmak için e-posta adresinizi doğrulamanız gerekiyor. Doğrulama kodunuz:</p>
				<div style="text-align: center; margin: 30px 0;">
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f0f4f8; padding: 15px; border-radius: 6px; color: #3b82f6;">%s</div>
				</div>
				<p>Bu kod 15 dakika süreyle geçerlidir.</p>
				<p>Eğer bu hesabı siz oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
				<p style="font-size: 12px; color: #666; text-align: center;">İyi günler,<br>Buzzify Ekibi</p>
			</div>
		</body>
		</html>
	`, code)

	payload := map[string]interface{}{
		"sender": map[string]string{
			"name":  senderName,
			"email": senderEmail,
		},
		"to": []map[string]string{
			{
				"email": email,
			},
		},
		"subject":     "Buzzify - E-posta Doğrulama Kodunuz",
		"htmlContent": htmlContent,
	}

	fmt.Printf("Sending verification email to: %s with Brevo API\n", email)

	resp, err := client.R().
		SetHeader("Accept", "application/json").
		SetHeader("Content-Type", "application/json").
		SetHeader("api-key", brevoApiKey).
		SetBody(payload).
		Post("https://api.brevo.com/v3/smtp/email")

	if err != nil {
		return fmt.Errorf("request error: %v", err)
	}

	if resp.StatusCode() != 201 {
		return fmt.Errorf("email sending failed with status: %d, body: %s", resp.StatusCode(), resp.Body())
	}

	return nil
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
func UserLogin(c *gin.Context) {
	var request LoginRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz form verileri: " + err.Error(),
		})
		return
	}

	var user models.User
	var result *gorm.DB

	// Kullanıcıyı bul - Unscoped() ile soft-deleted dahil ara
	if strings.Contains(request.Identifier, "@") {
		result = database.DB.Unscoped().Where("email = ?", request.Identifier).First(&user)
	} else {
		result = database.DB.Unscoped().Where("username = ?", request.Identifier).First(&user)
	}

	// Kullanıcı hiç bulunamadıysa
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, Response{
				Success: false,
				Message: "Kullanıcı adı/e-posta veya şifre hatalı",
			})
		} else {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Veritabanı hatası: " + result.Error.Error(),
			})
		}
		return
	}

	// Şifreyi kontrol et
	if err := auth.CheckPassword(request.Password, user.Password); err != nil {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Kullanıcı adı/e-posta veya şifre hatalı",
		})
		return
	}

	// Kullanıcı dondurulmuşsa hesabı yeniden aktive et
	if user.DeletedAt.Valid {
		if err := database.DB.Model(&user).Unscoped().Update("deleted_at", nil).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Hesap yeniden aktive edilirken bir hata oluştu: " + err.Error(),
			})
			return
		}
		fmt.Printf("Kullanıcı hesabı yeniden aktive edildi: %s\n", user.Username)
		// user nesnesini güncelleyelim ki yanıt doğru dönsün
		user.DeletedAt = gorm.DeletedAt{Time: time.Time{}, Valid: false}
	}

	// BAŞARILI GİRİŞ - Aktiviteyi Kaydet
	loginActivity := models.LoginActivity{
		UserID:    user.ID,
		Timestamp: time.Now(),
		IPAddress: c.ClientIP(),          // İstek yapanın IP adresini al
		UserAgent: c.Request.UserAgent(), // Tarayıcı bilgisini al
		Success:   true,
		// Location: // IP'den konum tahmini için ek kütüphane/servis gerekir (şimdilik boş)
	}
	if err := database.DB.Create(&loginActivity).Error; err != nil {
		// Loglama yapabiliriz ama kullanıcıya hata dönmeyelim
		fmt.Printf("Login aktivitesi kaydedilemedi (UserID: %d): %v\n", user.ID, err)
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
		Data: map[string]interface{}{ // Yanıta Phone da eklenebilir
			"user": map[string]interface{}{
				"id":       user.ID,
				"username": user.Username,
				"fullName": user.FullName,
				"email":    user.Email,
				"phone":    user.Phone, // Phone eklendi
			},
		},
		Token: token,
	})
}

// Auth Middleware
func UserAuthMiddleware() gin.HandlerFunc {
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

// GetUserProfile - Oturum açmış kullanıcının kendi profil bilgilerini getirir
func GetUserProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	// Gerekli ilişkileri preload et
	result := database.DB.
		Preload("Followers"). // Sadece saymak için değil, belki başka bilgiler de lazım olur
		Preload("Following").
		First(&user, userID)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Takipçi/Takip Edilen sayısını hesapla (preloaded veriden)
	followerCount := len(user.Followers)
	followingCount := len(user.Following)

	// Gönderi sayısını hesapla
	var postCount int64
	database.DB.Model(&models.Post{}).Where("user_id = ?", user.ID).Count(&postCount)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":                user.ID,
				"username":          user.Username,
				"fullName":          user.FullName,
				"email":             user.Email,
				"phone":             user.Phone,
				"profileImage":      user.ProfileImage,
				"bio":               user.Bio,
				"location":          user.Location,
				"website":           user.Website,
				"isPrivate":         user.IsPrivate,
				"commentPermission": user.CommentPermission, // Gizlilik ayarları
				"tagPermission":     user.TagPermission,     // Gizlilik ayarları
				"isVerified":        user.IsVerified,
				"isAdmin":           user.IsAdmin,
				"followerCount":     followerCount,  // Eklendi
				"followingCount":    followingCount, // Eklendi
				"postCount":         postCount,      // Eklendi
				"createdAt":         user.CreatedAt,
				"lastLogin":         user.LastLogin,
			},
		},
	})
}

func GetUserByUsername(c *gin.Context) {
	username := c.Param("username")
	currentUserID, currentUserExists := c.Get("userID") // İstek yapan kullanıcı (varsa)

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

	// Takip Durumu ve Gizlilik Kontrolü
	followStatus := "none" // none, following, pending, self
	canViewProfile := true // Profilin içeriğini (gönderiler, listeler) görebilir mi?

	// Mevcut kullanıcı (token ile kimlik doğrulaması yapılmış)
	if currentUserExists {
		currentID := currentUserID.(uint)

		// Kendi profili mi?
		if currentID == user.ID {
			followStatus = "self"
			canViewProfile = true
		} else {
			// Takip ediyor mu kontrol et
			var followCount int64
			database.DB.Model(&models.Follow{}).
				Where("follower_id = ? AND following_id = ?", currentID, user.ID).
				Count(&followCount)

			if followCount > 0 {
				followStatus = "following"
				canViewProfile = true
			} else {
				// Takip isteği gönderilmiş mi kontrol et
				var requestCount int64
				database.DB.Model(&models.FollowRequest{}).
					Where("follower_id = ? AND following_id = ? AND status = ?",
						currentID, user.ID, "pending").
					Count(&requestCount)

				if requestCount > 0 {
					followStatus = "pending"
					canViewProfile = false
				} else {
					followStatus = "none"
					canViewProfile = !user.IsPrivate // Hesap gizli değilse profili görebilir
				}
			}
		}
	} else {
		// Oturum açmamış kullanıcı sadece herkese açık profilleri görebilir
		canViewProfile = !user.IsPrivate
	}

	userData := map[string]interface{}{
		"id":             user.ID,
		"username":       user.Username,
		"fullName":       user.FullName,
		"profileImage":   user.ProfileImage,
		"isPrivate":      user.IsPrivate,
		"isVerified":     user.IsVerified,
		"followerCount":  followerCount,
		"followingCount": followingCount,
		"postCount":      postCount,
		"followStatus":   followStatus,   // Eklendi: none, following, pending, self
		"canViewProfile": canViewProfile, // Eklendi: Detayları görebilir mi?
		"createdAt":      user.CreatedAt,
	}

	// Eğer profili görebiliyorsa (gizli değilse veya takip ediyorsa veya kendisiyse)
	// diğer detayları ekle
	if canViewProfile {
		userData["bio"] = user.Bio
		userData["location"] = user.Location
		userData["website"] = user.Website
		// userData["commentPermission"] = user.CommentPermission // Gerekirse eklenebilir
		// userData["tagPermission"] = user.TagPermission       // Gerekirse eklenebilir
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"user": userData,
		},
	})
}

// Kullanıcı Gönderilerini Getirme (Gizlilik Kontrollü)
func GetUserPosts(c *gin.Context) {
	username := c.Param("username")
	currentUserID, currentUserExists := c.Get("userID") // İstek yapan kullanıcı (varsa)

	var user models.User
	if err := database.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı",
		})
		return
	}

	// Gizlilik Kontrolü
	canViewPosts := false
	if !user.IsPrivate {
		canViewPosts = true // Herkese açık
	} else if currentUserExists {
		currentID := currentUserID.(uint)
		if currentID == user.ID {
			canViewPosts = true // Kendi gönderileri
		} else {
			// Takip ediyor mu kontrol et
			var followCount int64
			database.DB.Model(&models.Follow{}).
				Where("follower_id = ? AND following_id = ?", currentID, user.ID).
				Count(&followCount)
			if followCount > 0 {
				canViewPosts = true // Takip ediyorsa görebilir
			}
		}
	} // Oturum açmamışsa ve hesap gizliyse canViewPosts false kalır

	// Gönderileri getirme
	var posts []models.Post
	var responsePosts []map[string]interface{}

	if canViewPosts {
		if err := database.DB.Where("user_id = ?", user.ID).
			Preload("Images").
			Preload("User", func(db *gorm.DB) *gorm.DB { // Kullanıcı bilgisini de alalım
				return db.Select("id, username, profile_image")
			}).
			Order("created_at DESC").
			Find(&posts).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Gönderiler yüklenirken bir hata oluştu: " + err.Error(),
			})
			return
		}

		// Yanıt için post dizisi oluştur
		for _, post := range posts {
			// Kullanıcının gönderiyi beğenip beğenmediğini kontrol et (eğer oturum açıksa)
			isLiked := false
			if currentUserExists {
				var likeCount int64
				database.DB.Model(&models.Like{}).
					Where("user_id = ? AND post_id = ?", currentUserID, post.ID).
					Count(&likeCount)
				isLiked = likeCount > 0
			}

			// Kullanıcının gönderiyi kaydedip kaydetmediğini kontrol et (eğer oturum açıksa)
			isSaved := false
			if currentUserExists {
				var saveCount int64
				database.DB.Model(&models.SavedPost{}).
					Where("user_id = ? AND post_id = ?", currentUserID, post.ID).
					Count(&saveCount)
				isSaved = saveCount > 0
			}

			// Görsel URL'lerini derle
			var imageURLs []string
			for _, image := range post.Images {
				// URL'yi düzelt (çift // varsa)
				correctedURL := strings.Replace(image.URL, "//", "/", -1)
				// Base URL ekle (eğer göreceli path ise) - Gerekirse ayarlanmalı
				if !strings.HasPrefix(correctedURL, "http") {
					// Örnek: correctedURL = "http://localhost:8080" + correctedURL
					// Şimdilik olduğu gibi bırakıyorum, frontend veya Nginx handle edebilir
				}
				imageURLs = append(imageURLs, correctedURL)
			}

			// Yanıt oluştur
			postResponse := map[string]interface{}{
				"id":        post.ID,
				"content":   post.Content,
				"likes":     post.LikeCount,
				"comments":  post.CommentCount,
				"createdAt": UserFormatTimeAgo(post.CreatedAt),
				"liked":     isLiked,
				"saved":     isSaved,
				"images":    imageURLs,
				"user": map[string]interface{}{ // Postun sahibinin bilgileri
					"id":           post.User.ID,
					"username":     post.User.Username,
					"profileImage": post.User.ProfileImage,
				},
			}
			responsePosts = append(responsePosts, postResponse)
		}
	}
	// Eğer canViewPosts false ise, responsePosts boş kalacak

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data: map[string]interface{}{
			"posts":          responsePosts,
			"isPrivate":      user.IsPrivate, // Frontend'in "Gizli Hesap" mesajı göstermesi için
			"canViewProfile": canViewPosts,   // Gönderileri görebilir mi? (canViewProfile ile aynı mantık)
		},
	})
}

// Profil güncelleme isteği için struct (Gizlilik alanları eklendi)
type UpdateProfileRequest struct {
	Username          string `json:"username"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	FullName          string `json:"fullName"`
	Bio               string `json:"bio"`
	Location          string `json:"location"`
	Website           string `json:"website"`
	ProfileImage      string `json:"profileImage"`
	IsPrivate         *bool  `json:"isPrivate"`         // Pointer olarak tanımlandı (nil kontrolü için)
	CommentPermission string `json:"commentPermission"` // Eklendi
	TagPermission     string `json:"tagPermission"`     // Eklendi
}

// Şifre güncelleme isteği için struct
type UpdatePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}

// UpdateProfile - Kullanıcı profil ve gizlilik bilgilerini günceller
func UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request UpdateProfileRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz form verileri: " + err.Error()})
		return
	}

	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	updates := make(map[string]interface{})

	// Username kontrolü ve güncellemesi
	if request.Username != "" && request.Username != user.Username {
		// Başka kullanıcıda var mı kontrol et
		var existingUser models.User
		if database.DB.Where("username = ? AND id != ?", request.Username, userID).First(&existingUser).Error == nil {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Bu kullanıcı adı zaten kullanımda"})
			return
		}
		updates["Username"] = request.Username
	}

	// Email kontrolü ve güncellemesi
	if request.Email != "" && request.Email != user.Email {
		// Başka kullanıcıda var mı kontrol et
		var existingUser models.User
		if database.DB.Where("email = ? AND id != ?", request.Email, userID).First(&existingUser).Error == nil {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Bu e-posta adresi zaten kullanımda"})
			return
		}
		// Basit email format kontrolü (daha kapsamlı yapılabilir)
		if !strings.Contains(request.Email, "@") {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz e-posta formatı"})
			return
		}
		updates["Email"] = request.Email
	}

	// IsPrivate güncellemesi (pointer olduğu için nil kontrolü yapılır)
	if request.IsPrivate != nil {
		updates["IsPrivate"] = *request.IsPrivate
	}

	// CommentPermission güncellemesi (geçerli değer kontrolü)
	if request.CommentPermission != "" {
		if request.CommentPermission == "all" || request.CommentPermission == "followers" || request.CommentPermission == "none" {
			updates["CommentPermission"] = request.CommentPermission
		} else {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz yorum izni değeri"})
			return
		}
	}

	// TagPermission güncellemesi (geçerli değer kontrolü)
	if request.TagPermission != "" {
		if request.TagPermission == "all" || request.TagPermission == "followers" || request.TagPermission == "none" {
			updates["TagPermission"] = request.TagPermission
		} else {
			c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz etiket izni değeri"})
			return
		}
	}

	// Diğer alanlar (boş değilse)
	if request.FullName != "" {
		updates["FullName"] = request.FullName
	}
	if request.Bio != "" {
		updates["Bio"] = request.Bio
	}
	if request.Location != "" {
		updates["Location"] = request.Location
	}
	if request.Website != "" {
		updates["Website"] = request.Website
	}
	if request.ProfileImage != "" {
		updates["ProfileImage"] = request.ProfileImage
	}
	if request.Phone != "" {
		updates["Phone"] = request.Phone
	}

	// Güncelleme işlemi
	if len(updates) > 0 {
		updates["UpdatedAt"] = time.Now()
		if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Profil güncellenirken bir hata oluştu: " + err.Error()})
			return
		}
	} else {
		c.JSON(http.StatusOK, Response{Success: true, Message: "Profilde güncellenecek bir bilgi bulunamadı"})
		return
	}

	// Güncel kullanıcı bilgilerini tekrar al
	database.DB.First(&user, userID)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Profil başarıyla güncellendi",
		Data: map[string]interface{}{ // Yanıta yeni alanlar eklendi
			"user": map[string]interface{}{
				"id":                user.ID,
				"username":          user.Username,
				"email":             user.Email,
				"phone":             user.Phone,
				"fullName":          user.FullName,
				"profileImage":      user.ProfileImage,
				"bio":               user.Bio,
				"location":          user.Location,
				"website":           user.Website,
				"isPrivate":         user.IsPrivate,
				"commentPermission": user.CommentPermission, // Eklendi
				"tagPermission":     user.TagPermission,     // Eklendi
				"isVerified":        user.IsVerified,
				"isAdmin":           user.IsAdmin,
				"createdAt":         user.CreatedAt,
				"updatedAt":         user.UpdatedAt,
			},
		},
	})
}

// UpdatePassword - Kullanıcı şifresini günceller
func UpdatePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var request UpdatePasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz form verileri: " + err.Error()})
		return
	}

	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// Mevcut şifreyi kontrol et
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(request.CurrentPassword)); err != nil {
		fmt.Printf("[DEBUG] UpdatePassword - Mevcut şifre karşılaştırma hatası (UserID: %d): %v\n", userID, err)
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Mevcut şifre hatalı"})
		return
	}

	// Yeni şifreyi hashle
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("[DEBUG] UpdatePassword - Yeni şifre hashleme hatası (UserID: %d): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Şifre güncellenirken bir hata oluştu"})
		return
	}

	// Şifreyi güncelle
	if err := database.DB.Model(&user).Update("Password", string(hashedPassword)).Error; err != nil {
		fmt.Printf("[DEBUG] UpdatePassword - Veritabanı güncelleme hatası (UserID: %d): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Şifre veritabanında güncellenirken bir hata oluştu"})
		return
	}

	fmt.Printf("[DEBUG] UpdatePassword - Şifre başarıyla güncellendi (UserID: %d)\n", userID)
	c.JSON(http.StatusOK, Response{Success: true, Message: "Şifre başarıyla güncellendi"})
}

// DeactivateAccount - Kullanıcı hesabını dondurur (soft delete)
func DeactivateAccount(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// GORM'un soft delete özelliğini kullan
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Hesap dondurulurken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, Response{Success: true, Message: "Hesap başarıyla donduruldu"})
}

// DeleteAccount - Kullanıcı hesabını kalıcı olarak siler
func DeleteAccount(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var user models.User
	if database.DB.First(&user, userID).Error != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// Gerçek kalıcı silme için Unscoped() kullan
	if err := database.DB.Unscoped().Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Hesap silinirken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, Response{Success: true, Message: "Hesap başarıyla silindi"})
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

// GetFollowing (Gizlilik Kontrollü)
func GetFollowing(c *gin.Context) {
	targetUsername := c.Param("username")
	currentUserID, currentUserExists := c.Get("userID")

	var targetUser models.User
	if err := database.DB.Where("username = ?", targetUsername).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// Gizlilik Kontrolü
	canViewList := false
	if !targetUser.IsPrivate {
		canViewList = true // Herkese açık
	} else if currentUserExists {
		currentID := currentUserID.(uint)
		if currentID == targetUser.ID {
			canViewList = true // Kendi listesi
		} else {
			// Takip ediyor mu kontrol et
			var followCount int64
			database.DB.Model(&models.Follow{}).
				Where("follower_id = ? AND following_id = ?", currentID, targetUser.ID).
				Count(&followCount)
			if followCount > 0 {
				canViewList = true // Takip ediyorsa görebilir
			}
		}
	} // Oturum açmamışsa ve hesap gizliyse canViewList false kalır

	var followingUsers []struct {
		ID           uint
		Username     string
		FullName     string
		ProfileImage string
		Bio          string
		IsFollowing  bool // İstek yapan kullanıcı bu kişiyi takip ediyor mu?
	}

	if canViewList {
		// Ham SQL sorgusu kullanarak takip edilen kullanıcıları getir
		query := `
			SELECT u.id, u.username, u.full_name, u.profile_image, u.bio,
			EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id AND deleted_at IS NULL) as is_following
			FROM users u
			INNER JOIN follows f ON u.id = f.following_id
			WHERE f.follower_id = ? AND u.deleted_at IS NULL 
		`
		// Eğer kullanıcı oturum açmışsa, kendi takip durumunu da kontrol et
		var requesterID uint = 0 // Varsayılan olarak 0 (oturum açmamış)
		if currentUserExists {
			requesterID = currentUserID.(uint)
		}

		if err := database.DB.Raw(query, requesterID, targetUser.ID).Scan(&followingUsers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Takip edilen kullanıcılar alınırken bir hata oluştu: " + err.Error(),
			})
			return
		}
	}
	// Eğer canViewList false ise, followingUsers boş kalacak

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: fmt.Sprintf("%s kullanıcısının takip ettiği kişiler", targetUsername),
		Data: map[string]interface{}{ // Data içinde ek bilgi döndür
			"users":       followingUsers, // Asıl kullanıcı listesi
			"canViewList": canViewList,    // Liste görüntülenebilir mi?
			"isPrivate":   targetUser.IsPrivate,
		},
		// Meta alanı kaldırıldı
	})
}

// GetFollowers (Gizlilik Kontrollü)
func GetFollowers(c *gin.Context) {
	targetUsername := c.Param("username")
	currentUserID, currentUserExists := c.Get("userID")

	var targetUser models.User
	if err := database.DB.Where("username = ?", targetUsername).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// Gizlilik Kontrolü (GetFollowing ile aynı)
	canViewList := false
	if !targetUser.IsPrivate {
		canViewList = true
	} else if currentUserExists {
		currentID := currentUserID.(uint)
		if currentID == targetUser.ID {
			canViewList = true
		} else {
			var followCount int64
			database.DB.Model(&models.Follow{}).
				Where("follower_id = ? AND following_id = ?", currentID, targetUser.ID).
				Count(&followCount)
			if followCount > 0 {
				canViewList = true
			}
		}
	}

	var followerUsers []struct {
		ID           uint
		Username     string
		FullName     string
		ProfileImage string
		Bio          string
		IsFollowing  bool // İstek yapan kullanıcı bu kişiyi takip ediyor mu?
	}

	if canViewList {
		// Ham SQL sorgusu kullanarak takipçi kullanıcıları getir
		query := `
			SELECT u.id, u.username, u.full_name, u.profile_image, u.bio,
			EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id AND deleted_at IS NULL) as is_following
			FROM users u
			INNER JOIN follows f ON u.id = f.follower_id
			WHERE f.following_id = ? AND u.deleted_at IS NULL
		`
		var requesterID uint = 0
		if currentUserExists {
			requesterID = currentUserID.(uint)
		}

		if err := database.DB.Raw(query, requesterID, targetUser.ID).Scan(&followerUsers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Takipçiler alınırken bir hata oluştu: " + err.Error(),
			})
			return
		}
	}
	// Eğer canViewList false ise, followerUsers boş kalacak

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: fmt.Sprintf("%s kullanıcısının takipçileri", targetUsername),
		Data: map[string]interface{}{ // Data içinde ek bilgi döndür
			"users":       followerUsers, // Asıl kullanıcı listesi
			"canViewList": canViewList,   // Liste görüntülenebilir mi?
			"isPrivate":   targetUser.IsPrivate,
		},
		// Meta alanı kaldırıldı
	})
}

// GetLoginActivities - Kullanıcının son giriş aktivitelerini getirir
func GetLoginActivities(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	var activities []models.LoginActivity
	// Son 10 aktiviteyi getir, en yeniden eskiye sıralı
	result := database.DB.Where("user_id = ? AND success = ?", userID, true).
		Order("timestamp DESC").
		Limit(10).
		Find(&activities)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Giriş aktiviteleri alınırken bir hata oluştu: " + result.Error.Error()})
		return
	}

	// Yanıtı formatla (gerekirse zamanı daha okunabilir yap)
	var responseData []map[string]interface{}
	for _, activity := range activities {
		responseData = append(responseData, map[string]interface{}{
			"id":        activity.ID,
			"timestamp": activity.Timestamp.Format(time.RFC1123), // Okunabilir format
			"ipAddress": activity.IPAddress,
			"userAgent": activity.UserAgent,
			"location":  activity.Location, // Şimdilik boş olacak
		})
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    responseData,
	})
}

// UpdatePrivacy - Kullanıcının hesap gizliliğini günceller
func UpdatePrivacy(c *gin.Context) {
	// Kullanıcı ID
	userID, exists := c.Get("userID")
	if !exists {
		fmt.Printf("[DEBUG] UpdatePrivacy - Oturum bilgisi bulunamadı! (UserID yok)\n")
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}

	// Request body
	var request struct {
		IsPrivate bool `json:"isPrivate"`
	}

	// Önce raw body'i logla
	rawBody, _ := c.GetRawData()
	fmt.Printf("[DEBUG] UpdatePrivacy - Raw body: %s\n", string(rawBody))

	// Body'i geri ayarla
	c.Request.Body = io.NopCloser(bytes.NewBuffer(rawBody))

	if err := c.ShouldBindJSON(&request); err != nil {
		fmt.Printf("[DEBUG] UpdatePrivacy - Geçersiz istek formatı: %v\n", err)
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz istek formatı: " + err.Error()})
		return
	}

	fmt.Printf("[DEBUG] UpdatePrivacy - İstek alındı (UserID: %v) - isPrivate=%v\n", userID, request.IsPrivate)

	// Önce kullanıcının mevcut durumunu kontrol et
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		fmt.Printf("[DEBUG] UpdatePrivacy - Kullanıcı bulunamadı (UserID: %v): %v\n", userID, err)
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	fmt.Printf("[DEBUG] UpdatePrivacy - Mevcut kullanıcı durumu (UserID: %v) - IsPrivate=%v\n", userID, user.IsPrivate)

	// Bir değişiklik var mı kontrol et
	if user.IsPrivate == request.IsPrivate {
		fmt.Printf("[DEBUG] UpdatePrivacy - IsPrivate değeri zaten %v (değişiklik yok)\n", request.IsPrivate)
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Hesap gizliliği değişmedi (zaten aynı değer)",
			Data: map[string]interface{}{
				"user": map[string]interface{}{
					"id":        user.ID,
					"username":  user.Username,
					"isPrivate": user.IsPrivate,
				},
			},
		})
		return
	}

	// GORM, yapı alanlarını snake_case'e çevirir, bu yüzden User.IsPrivate, veritabanında is_private olarak saklanır
	// Güncellemeyi maps kullanarak yapalım
	updates := map[string]interface{}{
		"IsPrivate": request.IsPrivate,
	}

	// Kullanıcıyı güncelle
	if err := database.DB.Model(&user).Updates(updates).Error; err != nil {
		fmt.Printf("[DEBUG] UpdatePrivacy - Güncelleme hatası (UserID: %v): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Hesap gizliliği güncellenemedi: " + err.Error()})
		return
	}

	fmt.Printf("[DEBUG] UpdatePrivacy - Güncelleme başarılı (UserID: %v) - Yeni değer: isPrivate=%v\n", userID, request.IsPrivate)

	// Güncellenmiş kullanıcı bilgilerini tekrar al
	if err := database.DB.First(&user, userID).Error; err != nil {
		fmt.Printf("[DEBUG] UpdatePrivacy - Güncellenmiş kullanıcı bilgileri alınamadı (UserID: %v): %v\n", userID, err)
	} else {
		fmt.Printf("[DEBUG] UpdatePrivacy - Güncelleme sonrası kontrol (UserID: %v) - IsPrivate=%v\n", userID, user.IsPrivate)

		// Eğer veritabanındaki değer beklediğimiz gibi değilse ek bir güncelleme dene
		if user.IsPrivate != request.IsPrivate {
			fmt.Printf("[DEBUG] UpdatePrivacy - Veritabanı değeri beklenen değerle eşleşmiyor, alternatif güncelleme deneniyor\n")

			// Direkt SQL sorgusu ile güncelleme dene
			updateSQL := "UPDATE users SET is_private = ? WHERE id = ?"
			if err := database.DB.Exec(updateSQL, request.IsPrivate, userID).Error; err != nil {
				fmt.Printf("[DEBUG] UpdatePrivacy - Alternatif güncelleme başarısız: %v\n", err)
			} else {
				fmt.Printf("[DEBUG] UpdatePrivacy - Alternatif güncelleme başarılı oldu\n")
				// Tekrar kontrol et
				database.DB.First(&user, userID)
				fmt.Printf("[DEBUG] UpdatePrivacy - Alternatif güncelleme sonrası: IsPrivate=%v\n", user.IsPrivate)
			}
		}
	}

	// Response yapısını kullanarak cevap gönder
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Hesap gizliliği başarıyla güncellendi",
		Data: map[string]interface{}{
			"user": map[string]interface{}{
				"id":        user.ID,
				"username":  user.Username,
				"isPrivate": user.IsPrivate, // Veritabanından okunan değeri kullan
			},
		},
	})
}
