package models

import (
	"time"

	"gorm.io/gorm"
)

// Tag model tanımı
type Tag struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Type      string         `gorm:"default:'primary'" json:"type"` // "primary" veya "auxiliary"
	PostCount int            `gorm:"default:0" json:"postCount"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Posts     []*Post        `gorm:"many2many:post_tags;" json:"-"`
}

// PostTag ara tablo modeli
type PostTag struct {
	PostID    uint      `gorm:"primaryKey" json:"postId"`
	TagID     uint      `gorm:"primaryKey" json:"tagId"`
	TagType   string    `gorm:"default:'primary'" json:"tagType"` // "primary" veya "auxiliary"
	CreatedAt time.Time `json:"createdAt"`
}
