package services

import (
	"fmt"
	"os"
	"time"

	"github.com/go-resty/resty/v2"
)

// SendWelcomeEmail sends a welcome email to a newly registered user
func SendWelcomeEmail(email, username string) error {
	client := resty.New()
	client.SetTimeout(15 * time.Second)

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

	// Create visually appealing welcome email content
	htmlContent := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #0f172a;">
			<div style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, #0f172a, #1e293b); border-radius: 16px; overflow: hidden; border: 1px solid rgba(59, 130, 246, 0.2); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
				<!-- Header with sparkle-like effect -->
				<div style="position: relative; text-align: center; padding: 40px 20px; background-color: #141824; overflow: hidden;">
					<!-- Simulated sparkles using CSS -->
					<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20%% 20%%, rgba(255, 255, 255, 0.1) 1px, transparent 1px), radial-gradient(circle at 40%% 60%%, rgba(255, 255, 255, 0.1) 1px, transparent 1px), radial-gradient(circle at 60%% 30%%, rgba(255, 255, 255, 0.1) 1px, transparent 1px), radial-gradient(circle at 80%% 70%%, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 50px 50px;"></div>
					
					<h1 style="font-size: 36px; font-weight: 700; margin: 0; color: white; letter-spacing: 3px; position: relative; z-index: 1;">BUZZIFY</h1>
					<div style="margin: 10px auto; height: 1px; width: 120px; background: linear-gradient(to right, transparent, #3b82f6, transparent);"></div>
					<p style="color: rgba(219, 234, 254, 0.8); margin-top: 15px; font-size: 18px;">Sosyal Medya Deneyimine Hoş Geldiniz!</p>
				</div>
				
				<!-- Content -->
				<div style="padding: 30px; background-color: rgba(30, 41, 59, 0.7); color: #e2e8f0;">
					<p style="font-size: 16px; line-height: 1.6;">Merhaba <strong style="color: #60a5fa;">%s</strong>,</p>
					<p style="font-size: 16px; line-height: 1.6;">Buzzify'a kaydolduğunuz için teşekkür ederiz! Hesabınız başarıyla oluşturuldu ve şimdi sosyal medya deneyiminizi tam anlamıyla yaşamaya hazırsınız.</p>
					
					<div style="margin: 30px 0; text-align: center;">
						<div style="display: inline-block; background: linear-gradient(to right, #2563eb, #3b82f6); padding: 14px 28px; border-radius: 8px; text-decoration: none;">
							<a href="https://buzzify.app/explore" style="color: white; font-weight: bold; text-decoration: none;">Keşfetmeye Başla</a>
						</div>
					</div>
					
					<p style="font-size: 16px; line-height: 1.6;">Buzzify'da yapabileceğiniz birkaç şey:</p>
					<ul style="padding-left: 20px; line-height: 1.8;">
						<li>Profilinizi kişiselleştirin ve düzenleyin</li>
						<li>Arkadaşlarınızı ve ailenizi takip edin</li>
						<li>İlgi alanlarınıza göre içerikleri keşfedin</li>
						<li>Günlük hayatınızdan anları paylaşın</li>
						<li>Diğer kullanıcılarla iletişim kurun ve bağlantı oluşturun</li>
					</ul>
					
					<p style="font-size: 16px; line-height: 1.6; margin-top: 25px;">Herhangi bir sorunuz veya öneriniz varsa, lütfen bizimle iletişime geçmekten çekinmeyin. Size yardımcı olmaktan memnuniyet duyarız!</p>
				</div>
				
				<!-- Footer -->
				<div style="padding: 20px; text-align: center; background-color: rgba(15, 23, 42, 0.9); border-top: 1px solid rgba(59, 130, 246, 0.2); color: #94a3b8;">
					<p style="margin: 0 0 10px 0;">Bizimle iletişimde kalın</p>
					
					<!-- Social media icons -->
					<div style="margin: 15px 0;">
						<!-- Twitter/X icon -->
						<a href="#" style="display: inline-block; margin: 0 10px;">
							<div style="width: 32px; height: 32px; border-radius: 50%; background-color: #1e293b; display: inline-flex; align-items: center; justify-content: center;">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="20px" height="20px" fill="#60a5fa">
									<path d="M 11 4 C 7.134 4 4 7.134 4 11 L 4 39 C 4 42.866 7.134 46 11 46 L 39 46 C 42.866 46 46 42.866 46 39 L 46 11 C 46 7.134 42.866 4 39 4 L 11 4 z M 13.085938 13 L 21.023438 13 L 26.660156 21.009766 L 33.5 13 L 36 13 L 27.789062 22.613281 L 37.914062 37 L 29.978516 37 L 23.4375 27.707031 L 15.5 37 L 13 37 L 22.308594 26.103516 L 13.085938 13 z M 16.914062 15 L 31.021484 35 L 34.085938 35 L 19.978516 15 L 16.914062 15 z"/>
								</svg>
							</div>
						</a>
						
						<!-- Instagram icon -->
						<a href="#" style="display: inline-block; margin: 0 10px;">
							<div style="width: 32px; height: 32px; border-radius: 50%; background-color: #1e293b; display: inline-flex; align-items: center; justify-content: center;">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="20px" height="20px" fill="#60a5fa">
									<path d="M 16 3 C 8.83 3 3 8.83 3 16 L 3 34 C 3 41.17 8.83 47 16 47 L 34 47 C 41.17 47 47 41.17 47 34 L 47 16 C 47 8.83 41.17 3 34 3 L 16 3 z M 37 11 C 38.1 11 39 11.9 39 13 C 39 14.1 38.1 15 37 15 C 35.9 15 35 14.1 35 13 C 35 11.9 35.9 11 37 11 z M 25 14 C 31.07 14 36 18.93 36 25 C 36 31.07 31.07 36 25 36 C 18.93 36 14 31.07 14 25 C 14 18.93 18.93 14 25 14 z M 25 16 C 20.04 16 16 20.04 16 25 C 16 29.96 20.04 34 25 34 C 29.96 34 34 29.96 34 25 C 34 20.04 29.96 16 25 16 z"/>
								</svg>
							</div>
						</a>
						
						<!-- Facebook icon -->
						<a href="#" style="display: inline-block; margin: 0 10px;">
							<div style="width: 32px; height: 32px; border-radius: 50%; background-color: #1e293b; display: inline-flex; align-items: center; justify-content: center;">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="20px" height="20px" fill="#60a5fa">
									<path d="M25,3C12.85,3,3,12.85,3,25c0,11.03,8.125,20.137,18.712,21.728V30.831h-5.443v-5.783h5.443v-3.848 c0-6.371,3.104-9.168,8.399-9.168c2.536,0,3.877,0.188,4.512,0.274v5.048h-3.612c-2.248,0-3.033,2.131-3.033,4.533v3.161h6.588 l-0.894,5.783h-5.694v15.944C38.716,45.318,47,36.137,47,25C47,12.85,37.15,3,25,3z"/>
								</svg>
							</div>
						</a>
					</div>
					
					<p style="margin: 15px 0 5px 0; font-size: 12px;">© 2023 Buzzify. Tüm hakları saklıdır.</p>
					<p style="margin: 5px 0; font-size: 12px;">Bu e-posta, hesap kaydınız sebebiyle gönderilmiştir.</p>
				</div>
				
				<!-- Bottom gradient design -->
				<div style="height: 10px; background: linear-gradient(to right, transparent, #3b82f6, transparent);"></div>
			</div>
		</body>
		</html>
	`, username)

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
		"subject":     "Buzzify'a Hoş Geldiniz!",
		"htmlContent": htmlContent,
	}

	fmt.Printf("Sending welcome email to: %s\n", email)

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
