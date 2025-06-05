package models

import (
	"time"
)

// TwoFactorAuth geçici 2FA kodlarını saklar
type TwoFactorAuth struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"not null;index"` // Hangi kullanıcı için
	Code      string    `gorm:"not null"`       // 6 haneli kod
	ExpiresAt time.Time `gorm:"not null"`       // Kodun geçerlilik süresi
	CreatedAt time.Time
}

// PasswordReset represents a password reset request
type PasswordReset struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null" json:"user_id"`
	Email     string    `gorm:"not null" json:"email"`
	Code      string    `gorm:"not null" json:"code"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// LoginActivity - Giriş aktivitesi kaydı modeli
type LoginActivity struct {
	ID        uint      `gorm:"primaryKey"`
	UserID    uint      `gorm:"index"` // Hangi kullanıcı giriş yaptı
	Timestamp time.Time `gorm:"index"` // Giriş zamanı
	IPAddress string    // Giriş yapılan IP adresi
	UserAgent string    // Kullanılan tarayıcı/cihaz bilgisi
	Location  string    // IP adresinden tahmin edilen konum (opsiyonel)
	Success   bool      // Giriş başarılı mıydı? (Şimdilik sadece başarılıları kaydedeceğiz)
	User      User      `gorm:"foreignKey:UserID"`
}
