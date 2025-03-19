package models

import (
	"time"

	"gorm.io/gorm"
)

// Comment - Yorum modeli
type Comment struct {
	ID        uint   `gorm:"primaryKey"`
	Content   string `gorm:"not null"` // Yorum içeriği
	UserID    uint   `gorm:"not null"` // Yorumu yapan kullanıcı
	User      User   `gorm:"foreignKey:UserID"`
	PostID    uint   // Yorumun yapıldığı gönderi
	ReelID    uint   // Reel yorumları için
	ParentID  *uint  // Yanıt verilen yorum ID'si (iç içe yorumlar için)
	Likes     int    `gorm:"default:0"`                // Beğeni sayısı
	LikedBy   []User `gorm:"many2many:comment_likes;"` // Beğenen kullanıcılar
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"` // Soft delete için
}

// CommentLike - Yorum beğeni ilişkisi (ara tablo)
type CommentLike struct {
	UserID    uint `gorm:"primaryKey"`
	CommentID uint `gorm:"primaryKey"`
	CreatedAt time.Time
}
