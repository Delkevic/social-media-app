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
