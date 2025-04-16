package models

import (
	"time"
)

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
