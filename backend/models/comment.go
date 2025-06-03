package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment - Yorum modeli
type Comment struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null" json:"userId"`
	User      User           `gorm:"foreignKey:UserID" json:"user"`
	PostID    *uint          `json:"postId,omitempty"` // Post için yorum (nullable)
	ReelID    *uint          `json:"reelId,omitempty"` // Reels için yorum (nullable)
	Content   string         `json:"content"`
	LikeCount int            `gorm:"default:0" json:"likeCount"`
	Likes     []User         `gorm:"many2many:comment_likes;" json:"-"`
	ParentID  *uint          `json:"parentId,omitempty"`                           // Üst yorumun ID'si (yanıt yorumlar için)
	Replies   []Comment      `gorm:"foreignKey:ParentID" json:"replies,omitempty"` // Alt yorumlar
	IsLiked   bool           `gorm:"-" json:"isLiked"`                             // Geçici alan, veritabanında saklanmaz
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// CommentResponse - API yanıtı için yorum yapısı
type CommentResponse struct {
	ID        uint      `json:"id"`
	Content   string    `json:"content"`
	UserID    uint      `json:"userId"`
	PostID    *uint     `json:"postId,omitempty"`
	ReelID    *uint     `json:"reelId,omitempty"`
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
