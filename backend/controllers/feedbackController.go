package controllers

import (
	"context"
	"fmt"
	"io" // Import the io package
	"net/http"
	"os"
	"social-media-app/backend/database"
	"social-media-app/backend/models"

	"github.com/gin-gonic/gin"
	brevo "github.com/sendinblue/APIv3-go-library/v2/lib" // Brevo library
)

// FeedbackRequest struct for parsing the request body
type FeedbackRequest struct {
	Type string `json:"type" binding:"required"` // 'issue' or 'suggestion'
	Text string `json:"text" binding:"required"`
}

// SubmitFeedback handles the feedback submission
func SubmitFeedback(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{Success: false, Message: "Oturum bilgisi bulunamadı"})
		return
	}
	currentUserID := userID.(uint)

	var request FeedbackRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, Response{Success: false, Message: "Geçersiz form verileri: " + err.Error()})
		return
	}

	// Get user information from database
	var user models.User
	if err := database.DB.Select("id, username, email").First(&user, currentUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, Response{Success: false, Message: "Kullanıcı bulunamadı"})
		return
	}

	// Get Brevo API Key and Support Email from environment variables
	brevoAPIKey := os.Getenv("BREVO_API_KEY")
	supportEmail := os.Getenv("SUPPORT_EMAIL_ADDRESS")

	if brevoAPIKey == "" || supportEmail == "" {
		fmt.Println("Hata: BREVO_API_KEY veya SUPPORT_EMAIL_ADDRESS ortam değişkenleri ayarlanmamış.")
		// Optionally, save feedback to DB even if email fails
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "E-posta gönderimi için sunucu yapılandırması eksik."})
		return
	}

	// Configure Brevo client
	cfg := brevo.NewConfiguration()
	cfg.AddDefaultHeader("api-key", brevoAPIKey)
	// Optional: Add partner key if needed
	// cfg.AddDefaultHeader("partner-key", "YOUR_PARTNER_KEY")
	brevoClient := brevo.NewAPIClient(cfg)

	// Prepare email content
	subject := fmt.Sprintf("Yeni Geri Bildirim: %s (%s)", request.Type, user.Username)
	htmlContent := fmt.Sprintf(`
		<h2>Yeni Geri Bildirim Alındı</h2>
		<p><strong>Kullanıcı:</strong> %s (ID: %d)</p>
		<p><strong>E-posta:</strong> %s</p>
		<p><strong>Tür:</strong> %s</p>
		<hr>
		<p><strong>Mesaj:</strong></p>
		<p>%s</p>
	`, user.Username, user.ID, user.Email, request.Type, request.Text)

	// Create email
	sendSmtpEmail := brevo.SendSmtpEmail{
		Sender: &brevo.SendSmtpEmailSender{
			Name:  "Nexora Destek Sistemi", // Or your app name
			Email: "erenkcr2004@gmail.com", // <<< GÖNDEREN E-POSTA (Sabit kodlanmış)
		},
		To: []brevo.SendSmtpEmailTo{
			{Email: supportEmail}, // <<< ALICI E-POSTA (Ortam değişkeninden)
		},
		Subject:     subject,
		HtmlContent: htmlContent,
		ReplyTo: &brevo.SendSmtpEmailReplyTo{ // <<< YANIT ADRESİ (Kullanıcının e-postası)
			Email: user.Email,
			Name:  user.Username,
		},
	}

	// Send email via Brevo API
	_, resp, err := brevoClient.TransactionalEmailsApi.SendTransacEmail(context.Background(), sendSmtpEmail)

	if err != nil {
		fmt.Printf("Brevo e-posta gönderme hatası: %v\n", err)
		// Log the response body if available
		if resp != nil && resp.Body != nil {
			defer resp.Body.Close()                     // Ensure body is closed
			bodyBytes, readErr := io.ReadAll(resp.Body) // Read the body
			if readErr == nil {
				fmt.Printf("Brevo API Yanıtı (Hata Durumu): %s\n", string(bodyBytes)) // Convert bytes to string
			} else {
				fmt.Printf("Brevo API yanıt gövdesi okunamadı: %v\n", readErr)
			}
		}
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: "Geri bildirim e-postası gönderilemedi."})
		return
	}

	// Ensure body is closed even for non-error cases if needed later,
	// but Brevo library might handle this. For safety, we close it.
	if resp != nil && resp.Body != nil {
		defer resp.Body.Close()
	}

	// Check Brevo response status code
	if resp.StatusCode >= 300 {
		fmt.Printf("Brevo API Hata Yanıt Kodu: %d\n", resp.StatusCode)
		if resp.Body != nil {
			// Body should have been closed by defer, but read it here if needed
			bodyBytes, readErr := io.ReadAll(resp.Body) // Read the body
			if readErr == nil {
				fmt.Printf("Brevo API Yanıtı (Hata Kodu >= 300): %s\n", string(bodyBytes)) // Convert bytes to string
			} else {
				fmt.Printf("Brevo API yanıt gövdesi okunamadı: %v\n", readErr)
			}
		}
		c.JSON(http.StatusInternalServerError, Response{Success: false, Message: fmt.Sprintf("E-posta gönderilemedi (API Hata Kodu: %d)", resp.StatusCode)})
		return
	}

	fmt.Printf("Geri bildirim e-postası başarıyla gönderildi: %s\n", supportEmail)
	c.JSON(http.StatusOK, Response{Success: true, Message: "Geri bildirim başarıyla gönderildi."})
}
