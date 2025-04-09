package models

import "time"

// Notification - Kullanıcılara gönderilecek bildirimleri temsil eder
type Notification struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null" json:"userId"`
	SenderID    uint      `gorm:"not null" json:"senderId"`    // Bildirimi gönderen kullanıcı
	Type        string    `gorm:"not null" json:"type"`        // "like", "comment", "message", "follow", "mention" vb.
	Content     string    `gorm:"type:text" json:"content"`    // Bildirimin içeriği
	ReferenceID uint      `gorm:"not null" json:"referenceId"` // Bildirimin referans verdiği öğenin ID'si (post, yorum vb.)
	IsRead      bool      `gorm:"not null;default:false" json:"isRead"`
	CreatedAt   time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"createdAt"`

	// İlişkiler
	User   User `gorm:"foreignKey:UserID" json:"-"`
	Sender User `gorm:"foreignKey:SenderID" json:"-"`
}
