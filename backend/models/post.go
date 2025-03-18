package models

import (
	"time"

	"gorm.io/gorm"
)

// Post - Gönderi modeli
type Post struct {
	ID           uint `gorm:"primaryKey"`
	UserID       uint `gorm:"not null"`
	User         User `gorm:"foreignKey:UserID"`
	Content      string
	LikeCount    int         `gorm:"default:0"`
	CommentCount int         `gorm:"default:0"`
	Images       []PostImage `gorm:"foreignKey:PostID"`
	LikedBy      []User      `gorm:"many2many:likes;"`
	SavedBy      []User      `gorm:"many2many:saved_posts;"`
	Comments     []Comment   `gorm:"foreignKey:PostID"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

// Reels - Table
type Reels struct {
	ID           uint `gorm:"primaryKey"`
	UserID       uint `gorm:"not null"`
	User         User `gorm:"foreignKey:UserID"`
	Caption      string
	VideoURL     string `gorm:"not null"`
	Music        string
	Duration     int       `gorm:"default:15"` // Saniye cinsinden süre
	LikeCount    int       `gorm:"default:0"`
	CommentCount int       `gorm:"default:0"`
	ShareCount   int       `gorm:"default:0"`
	ViewCount    int       `gorm:"default:0"`
	LikedBy      []User    `gorm:"many2many:reel_likes;"`
	SavedBy      []User    `gorm:"many2many:saved_reels;"`
	Comments     []Comment `gorm:"foreignKey:ReelID"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    gorm.DeletedAt `gorm:"index"`
}

// Like - Beğeni ilişkisi (ara tablo)
type Like struct {
	UserID    uint `gorm:"primaryKey"`
	PostID    uint `gorm:"primaryKey"`
	CreatedAt time.Time
}

// SavedPost - Kaydedilen gönderi ilişkisi (ara tablo)
type SavedPost struct {
	UserID    uint `gorm:"primaryKey"`
	PostID    uint `gorm:"primaryKey"`
	CreatedAt time.Time
}

// ReelLike - Reel beğeni ilişkisi (ara tablo)
type ReelLike struct {
	UserID    uint `gorm:"primaryKey"`
	ReelID    uint `gorm:"primaryKey"`
	CreatedAt time.Time
}

// SavedReel - Kaydedilen reel ilişkisi (ara tablo)
type SavedReel struct {
	UserID    uint `gorm:"primaryKey"`
	ReelID    uint `gorm:"primaryKey"`
	CreatedAt time.Time
}
