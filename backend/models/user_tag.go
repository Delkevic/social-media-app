package models

import "time"

// UserTag - Kullanıcı etiket ilişkisi, beğenilen gönderilerden toplanan etiketleri tutar
type UserTag struct {
	ID          uint   `gorm:"primaryKey"`
	UserID      uint   `gorm:"index:idx_user_tag,unique:true"` // Kullanıcı ID
	TagID       uint   `gorm:"index:idx_user_tag,unique:true"` // Etiket ID
	TagName     string // Etiketin adı (hızlı erişim için)
	TagType     string `gorm:"type:varchar(20)"` // "primary" veya "auxiliary"
	Count       int    `gorm:"default:1"`        // Kullanıcının kaç gönderi beğenisiyle bu etiketi aldığı
	LastAddedAt time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
