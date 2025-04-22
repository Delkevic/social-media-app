package models

import (
	"time"
)

// FollowRequest represents a request from one user to follow another (private) user.
type FollowRequest struct {
	ID          uint      `gorm:"primarykey"`
	FollowerID  uint      `gorm:"index;not null"`                  // İstek gönderen kullanıcı ID'si
	FollowingID uint      `gorm:"index;not null"`                  // İstek alan (gizli hesap) kullanıcı ID'si
	Status      string    `gorm:"size:20;default:'pending';index"` // pending, accepted, rejected
	CreatedAt   time.Time `gorm:"index"`
	UpdatedAt   time.Time

	// İlişkiler (Opsiyonel, ancak sorgularda yardımcı olabilir)
	Follower  User `gorm:"foreignKey:FollowerID"`
	Following User `gorm:"foreignKey:FollowingID"`

	// Note: Added a unique index manually in migration or ensure your GORM version handles composite indexes correctly.
}
