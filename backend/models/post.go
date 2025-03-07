package models

import (
	"time"
	"gorm.io/gorm"
)

// Post - Gönderi modeli
type Post struct {
	ID           uint           `gorm:"primaryKey"`
	UserID       uint           `gorm:"not null"`
	Content      string
	LikeCount    int            `gorm:"default:0"`
	CommentCount int            `gorm:"default:0"`
	LikedBy      []User         `gorm:"many2many:likes;"`
	SavedBy      []User         `gorm:"many2many:saved_posts;"`
	Comments     []Comment      `gorm:"foreignKey:PostID"` // Comment modeliyle ilişki
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"` // Soft delete için
}

// Like - Beğeni ilişkisi (ara tablo)
type Like struct {
	UserID    uint      `gorm:"primaryKey"`
	PostID    uint      `gorm:"primaryKey"`
	CreatedAt time.Time
}

// SavedPost - Kaydedilen gönderi ilişkisi (ara tablo)
type SavedPost struct {
	UserID    uint      `gorm:"primaryKey"`
	PostID    uint      `gorm:"primaryKey"`
	CreatedAt time.Time
}