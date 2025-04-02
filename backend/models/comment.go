package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment - Yorum modeli
type Comment struct {
	ID        uint `gorm:"primaryKey"`
	UserID    uint `gorm:"not null"`
	User      User `gorm:"foreignKey:UserID"`
	PostID    uint
	ReelID    uint // Reels için yorum desteği
	Content   string
	LikeCount int       `gorm:"default:0"`
	Likes     []User    `gorm:"many2many:comment_likes;"`
	ParentID  *uint     // Üst yorumun ID'si (yanıt yorumlar için)
	Replies   []Comment `gorm:"foreignKey:ParentID"` // Alt yorumlar
	IsLiked   bool      `gorm:"-"`                   // Geçici alan, veritabanında saklanmaz
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// CommentResponse - API yanıtı için yorum yapısı
type CommentResponse struct {
	ID        uint      `json:"id"`
	Content   string    `json:"content"`
	UserID    uint      `json:"userId"`
	PostID    uint      `json:"postId"`
	ParentID  *uint     `json:"parentId,omitempty"`
	User      User      `json:"user"`
	Replies   []Comment `json:"replies,omitempty"`
	LikeCount int       `json:"likeCount"`
	IsLiked   bool      `json:"isLiked"`
	CreatedAt time.Time `json:"createdAt"`
}

// CommentLike - Yorum beğeni ilişkisi
type CommentLike struct {
	UserID    uint `gorm:"primaryKey"`
	CommentID uint `gorm:"primaryKey"`
	CreatedAt time.Time
}

// CommentReport yorum şikayetleri için model
type CommentReport struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CommentID uint      `json:"comment_id"`
	UserID    uint      `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
