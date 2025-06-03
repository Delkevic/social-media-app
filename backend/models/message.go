package models

import (
	"time"
)

// Message modeli - Kullanıcılar arası mesajlaşma
type Message struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SenderID   uint      `gorm:"not null" json:"senderId"`
	ReceiverID uint      `gorm:"not null" json:"receiverId"`
	Content    string    `gorm:"type:text" json:"content"`
	MediaURL   string    `json:"mediaUrl"`
	MediaType  string    `json:"mediaType"`
	SentAt     time.Time `gorm:"not null" json:"sentAt"`
	IsRead     bool      `gorm:"default:false" json:"isRead"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`

	// İlişkiler
	Sender   User `gorm:"foreignKey:SenderID" json:"-"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"-"`
}
