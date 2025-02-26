package models

import (
	"time"
)

type Post struct {
	ID        uint `gorm:"primaryKey"`
	UserID    uint
	Content   string
	CreatedAt time.Time
}
