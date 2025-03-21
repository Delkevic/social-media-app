package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment - Yorum modeli
type Comment struct {
	gorm.Model
	Content   string        `json:"content"`
	PostID    uint          `json:"postId"`
	UserID    uint          `json:"userId"`
	ParentID  *uint         `json:"parentId,omitempty"`
	Post      Post          `json:"-" gorm:"foreignKey:PostID"`
	User      User          `json:"user"`
	Replies   []Comment     `json:"replies,omitempty" gorm:"foreignKey:ParentID"`
	Likes     []CommentLike `json:"-" gorm:"foreignKey:CommentID"`
	LikeCount int           `json:"likeCount" gorm:"-"`
	IsLiked   bool          `json:"isLiked" gorm:"-"`
	CreatedAt time.Time     `json:"createdAt"`
}

// CommentResponse - API yanıtı için yorum yapısı
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

// CommentLike yorum beğenilerini temsil eder
type CommentLike struct {
	CommentID uint           `json:"commentId" gorm:"primaryKey;autoIncrement:false"`
	UserID    uint           `json:"userId" gorm:"primaryKey;autoIncrement:false"`
	Comment   Comment        `json:"-" gorm:"foreignKey:CommentID"`
	User      User           `json:"-" gorm:"foreignKey:UserID"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// CommentReport yorum şikayetleri için model
type CommentReport struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CommentID uint      `json:"comment_id"`
	UserID    uint      `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt time.Time `json:"deleted_at,omitempty" gorm:"index"`
}
