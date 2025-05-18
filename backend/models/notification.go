package models

import "time"

// Notification - Kullanıcılara gönderilecek bildirimleri temsil eder
type Notification struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Type       string    `gorm:"not null" json:"type"`       // "like", "comment", "message", "follow", "mention" vb.
	FromUserID uint      `gorm:"not null" json:"fromUserId"` // Bildirimi gönderen kullanıcı
	ToUserID   uint      `gorm:"not null" json:"toUserId"`   // Bildirimin gönderildiği kullanıcı
	Message    string    `gorm:"type:text" json:"message"`   // Bildirimin içeriği/mesajı
	IsRead     bool      `gorm:"not null;default:false" json:"isRead"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"createdAt"`

	// İlişkiler
	FromUser User `gorm:"foreignKey:FromUserID" json:"-"`
	ToUser   User `gorm:"foreignKey:ToUserID" json:"-"`
}

// NotificationSettings kullanıcı bildirim ayarları
type NotificationSettings struct {
	ID                uint `gorm:"primaryKey"`
	UserID            uint `gorm:"uniqueIndex;not null"`
	User              User `gorm:"foreignKey:UserID"`
	PushEnabled       bool `gorm:"default:true"`
	EmailEnabled      bool `gorm:"default:true"`
	LikesEnabled      bool `gorm:"default:true"`
	CommentsEnabled   bool `gorm:"default:true"`
	FollowsEnabled    bool `gorm:"default:true"`
	MessagesEnabled   bool `gorm:"default:true"`
	MentionsEnabled   bool `gorm:"default:true"`
	SystemEnabled     bool `gorm:"default:true"`
	NewsletterEnabled bool `gorm:"default:false"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}
