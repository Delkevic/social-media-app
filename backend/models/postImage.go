package models

import "time"

type PostImage struct {
    ID        uint      `gorm:"primaryKey"`
    PostID    uint      `gorm:"not null"`
    URL       string    `gorm:"not null"`
    CreatedAt time.Time
}