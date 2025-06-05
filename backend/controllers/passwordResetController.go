package controllers

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"social-media-app/backend/auth"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

// ResetPasswordRequest represents the request for initiating a password reset
type ResetPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// VerifyCodeRequest represents the request for verifying a reset code
type VerifyCodeRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

// SetNewPasswordRequest represents the request for setting a new password
type SetNewPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Code        string `json:"code" binding:"required,len=6"`
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

// RequestPasswordReset handles the password reset request
func RequestPasswordReset(c *gin.Context) {
	var request ResetPasswordRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz e-posta adresi: " + err.Error(),
		})
		return
	}

	// Check if user with this email exists
	var user models.User
	result := database.DB.Where("email = ?", request.Email).First(&user)
	if result.Error != nil {
		// Don't expose whether email exists for security reasons
		c.JSON(http.StatusOK, Response{
			Success: true,
			Message: "Şifre sıfırlama kodu gönderildi. Lütfen e-postanızı kontrol edin.",
		})
		return
	}

	// Generate a random 6-digit code
	resetCode := generateRandomCode()
	fmt.Printf("Generated reset code: %s for user: %d\n", resetCode, user.ID)

	// Store the reset code in database
	expiryTime := time.Now().Add(15 * time.Minute) // Code valid for 15 minutes
	passwordReset := models.PasswordReset{
		UserID:    user.ID,
		Email:     request.Email,
		Code:      resetCode,
		ExpiresAt: expiryTime,
	}

	// Delete any existing reset codes for this user
	if err := database.DB.Where("user_id = ?", user.ID).Delete(&models.PasswordReset{}).Error; err != nil {
		fmt.Printf("Error deleting previous reset codes: %v\n", err)
		// Continue anyway, it's not critical
	}

	// Save new reset code
	if err := database.DB.Create(&passwordReset).Error; err != nil {
		fmt.Printf("Error saving reset code to database: %v\n", err)
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre sıfırlama kodu oluşturulurken bir hata oluştu.",
		})
		return
	}

	// Print environment variables (without API key for security)
	fmt.Printf("Using email config - supportEmail: %s, senderEmail: %s, senderName: %s\n",
		os.Getenv("SUPPORT_EMAIL_ADDRESS"),
		os.Getenv("SUPPORT_SENDER_EMAIL"),
		os.Getenv("SUPPORT_NAME"))

	// Send email with reset code
	err := sendResetCodeEmail(request.Email, resetCode)
	if err != nil {
		fmt.Printf("Email sending error: %v\n", err)
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre sıfırlama e-postası gönderilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	fmt.Printf("Password reset email sent successfully to: %s\n", request.Email)
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Şifre sıfırlama kodu gönderildi. Lütfen e-postanızı kontrol edin.",
	})
}

// VerifyResetCode verifies the reset code
func VerifyResetCode(c *gin.Context) {
	var request VerifyCodeRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz istek: " + err.Error(),
		})
		return
	}

	// Verify code
	var passwordReset models.PasswordReset
	result := database.DB.Where("email = ? AND code = ? AND expires_at > ?",
		request.Email, request.Code, time.Now()).First(&passwordReset)

	if result.Error != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz veya süresi dolmuş kod.",
		})
		return
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Kod doğrulandı. Yeni şifrenizi belirleyebilirsiniz.",
	})
}

// SetNewPassword sets a new password after verification
func SetNewPassword(c *gin.Context) {
	var request SetNewPasswordRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz istek: " + err.Error(),
		})
		return
	}

	// Verify code again
	var passwordReset models.PasswordReset
	result := database.DB.Where("email = ? AND code = ? AND expires_at > ?",
		request.Email, request.Code, time.Now()).First(&passwordReset)

	if result.Error != nil {
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz veya süresi dolmuş kod.",
		})
		return
	}

	// Get the user
	var user models.User
	if database.DB.First(&user, passwordReset.UserID).Error != nil {
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Kullanıcı bulunamadı.",
		})
		return
	}

	// Hash the new password
	hashedPassword, err := auth.HashPassword(request.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre işlenirken bir hata oluştu.",
		})
		return
	}

	// Update the password
	if err := database.DB.Model(&user).Update("Password", hashedPassword).Error; err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Şifre güncellenirken bir hata oluştu.",
		})
		return
	}

	// Delete the used reset code
	database.DB.Delete(&passwordReset)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Şifreniz başarıyla güncellendi. Yeni şifreniz ile giriş yapabilirsiniz.",
	})
}

// Helper functions

// Generate a random 6-digit code
func generateRandomCode() string {
	// Using crypto/rand for better randomness
	max := big.NewInt(900000) // 900000 = 999999 - 100000 + 1
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		// Fall back to a simple method if crypto/rand fails
		fmt.Printf("Warning: Using less secure random method: %v\n", err)
		now := time.Now().UnixNano()
		code := (now % 900000) + 100000 // Ensures 6 digits
		return fmt.Sprintf("%06d", code)
	}

	// Add 100000 to ensure it's 6 digits
	code := n.Int64() + 100000
	return fmt.Sprintf("%06d", code)
}

// Send reset code email using Brevo API
func sendResetCodeEmail(email, code string) error {
	client := resty.New()
	client.SetTimeout(15 * time.Second) // Set a reasonable timeout

	brevoApiKey := os.Getenv("BREVO_API_KEY")
	supportEmail := os.Getenv("SUPPORT_EMAIL_ADDRESS")
	senderEmail := os.Getenv("SUPPORT_SENDER_EMAIL")
	senderName := os.Getenv("SUPPORT_NAME")

	// Detailed validation of environment variables
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

	// Create more visually appealing email content
	htmlContent := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
			<div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
				<div style="text-align: center; margin-bottom: 20px;">
					<h1 style="color: #3b82f6;">Nexora - Şifre Sıfırlama</h1>
				</div>
				<p>Merhaba,</p>
				<p>Nexora hesabınız için şifre sıfırlama talebinde bulundunuz. Şifre sıfırlama kodunuz:</p>
				<div style="text-align: center; margin: 30px 0;">
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f0f4f8; padding: 15px; border-radius: 6px; color: #3b82f6;">%s</div>
				</div>
				<p>Bu kod 15 dakika süreyle geçerlidir.</p>
				<p>Eğer bu talebi siz yapmadıysanız, lütfen bu e-postayı dikkate almayın.</p>
				<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
				<p style="font-size: 12px; color: #666; text-align: center;">İyi günler,<br>Nexora Ekibi</p>
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
		"subject":     "Nexora - Şifre Sıfırlama Kodunuz",
		"htmlContent": htmlContent,
	}

	// Log the request (without API key)
	fmt.Printf("Sending email to: %s with Brevo API\n", email)

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
