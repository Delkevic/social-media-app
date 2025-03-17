package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment - Yorum modeli
type Comment struct {
	gorm.Model
	Content   string        `json:"content"`
	PostID    uint          `json:"postId,omitempty"`
	ReelID    uint          `json:"reelId,omitempty"`
	UserID    uint          `json:"userId"`
	ParentID  *uint         `json:"parentId,omitempty"`
	Post      Post          `json:"-" gorm:"foreignKey:PostID"`
	Reel      Reels         `json:"-" gorm:"foreignKey:ReelID"`
	User      User          `json:"user"`
	Replies   []Comment     `json:"replies,omitempty" gorm:"foreignKey:ParentID"`
	Likes     []CommentLike `json:"-" gorm:"foreignKey:CommentID"`
	LikeCount int           `json:"likeCount" gorm:"-"`
	IsLiked   bool          `json:"isLiked" gorm:"-"`
	CreatedAt time.Time     `json:"createdAt"`
}

// CommentResponse - API yanıtı için yorum yapısı
type CommentResponse struct {
	ID        uint      `json:"id"`
	Content   string    `json:"content"`
	UserID    uint      `json:"userId"`
	PostID    uint      `json:"postId,omitempty"`
	ReelID    uint      `json:"reelId,omitempty"`
	ParentID  *uint     `json:"parentId,omitempty"`
	User      User      `json:"user"`
	Replies   []Comment `json:"replies,omitempty"`
	LikeCount int       `json:"likeCount"`
	IsLiked   bool      `json:"isLiked"`
	CreatedAt time.Time `json:"createdAt"`
}

// CommentLike yorum beğenilerini temsil eder
type CommentLike struct {
	gorm.Model
	CommentID uint    `json:"commentId" gorm:"uniqueIndex:idx_comment_user"`
	UserID    uint    `json:"userId" gorm:"uniqueIndex:idx_comment_user"`
	Comment   Comment `json:"-" gorm:"foreignKey:CommentID"`
	User      User    `json:"-" gorm:"foreignKey:UserID"`
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
