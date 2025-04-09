package models

import "time"

// Message - Kullanıcılar arasındaki mesajları temsil eder
type Message struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SenderID    uint      `gorm:"not null" json:"senderId"`
	ReceiverID  uint      `gorm:"not null" json:"receiverId"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	MediaURL    string    `gorm:"type:varchar(255)" json:"mediaUrl,omitempty"`
	MediaType   string    `gorm:"type:varchar(50)" json:"mediaType,omitempty"`
	SentAt      time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"sentAt"`
	IsRead      bool      `gorm:"not null;default:false" json:"isRead"`
	IsDelivered bool      `gorm:"not null;default:false" json:"isDelivered"`

	// İlişkiler
	Sender   User `gorm:"foreignKey:SenderID" json:"-"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"-"`
}
