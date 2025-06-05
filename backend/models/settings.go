package models

import (
	"time"
)

// AppSettings uygulama ayarları modeli
type AppSettings struct {
	ID                 uint   `gorm:"primaryKey"`
	UserID             uint   `gorm:"uniqueIndex;not null"`
	User               User   `gorm:"foreignKey:UserID"`
	Language           string `gorm:"default:'tr'"`
	DarkMode           bool   `gorm:"default:true"`
	AutoplayVideos     bool   `gorm:"default:true"`
	SaveDataMode       bool   `gorm:"default:false"`
	ReduceAnimations   bool   `gorm:"default:false"`
	ShowActivityStatus bool   `gorm:"default:true"`
	FontSize           string `gorm:"default:'medium'"` // small, medium, large
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// AISettings yapay zeka ayarları modeli
type AISettings struct {
	ID                  uint `gorm:"primaryKey"`
	UserID              uint `gorm:"uniqueIndex;not null"`
	User                User `gorm:"foreignKey:UserID"`
	PersonalizedContent bool `gorm:"default:true"`
	ContentFiltering    bool `gorm:"default:true"`
	SuggestedUsers      bool `gorm:"default:true"`
	SuggestedContent    bool `gorm:"default:true"`
	AIGeneration        bool `gorm:"default:true"`
	DataCollection      bool `gorm:"default:true"`
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// SecuritySettings güvenlik ayarları modeli
type SecuritySettings struct {
	ID                   uint   `gorm:"primaryKey"`
	UserID               uint   `gorm:"uniqueIndex;not null"`
	User                 User   `gorm:"foreignKey:UserID"`
	TwoFactorEnabled     bool   `gorm:"default:false"`
	TwoFactorMethod      string `gorm:"default:'sms'"` // sms, email, app
	LoginAlerts          bool   `gorm:"default:true"`
	SuspiciousLoginBlock bool   `gorm:"default:true"`
	SessionTimeout       int    `gorm:"default:7200"` // in seconds (default 2 hours)
	RememberMe           bool   `gorm:"default:true"`
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

// SupportTicket destek bileti modeli
type SupportTicket struct {
	ID          uint   `gorm:"primaryKey"`
	UserID      uint   `gorm:"index;not null"`
	User        User   `gorm:"foreignKey:UserID"`
	Subject     string `gorm:"not null"`
	Description string `gorm:"not null;type:text"`
	Status      string `gorm:"default:'open'"`       // open, in-progress, closed
	Priority    string `gorm:"default:'normal'"`     // low, normal, high
	Category    string `gorm:"not null"`             // account, technical, billing, content, other
	Reference   string `gorm:"uniqueIndex;not null"` // unique ticket reference
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// SupportMessage destek mesajı modeli
type SupportMessage struct {
	ID         uint          `gorm:"primaryKey"`
	TicketID   uint          `gorm:"index;not null"`
	Ticket     SupportTicket `gorm:"foreignKey:TicketID"`
	SenderID   uint          `gorm:"index;not null"` // can be user or admin
	SenderType string        `gorm:"default:'user'"` // user or admin
	Message    string        `gorm:"not null;type:text"`
	Attachment string        // file path or URL
	CreatedAt  time.Time
}

// DataPrivacySettings veri gizliliği ayarları modeli
type DataPrivacySettings struct {
	ID                      uint `gorm:"primaryKey"`
	UserID                  uint `gorm:"uniqueIndex;not null"`
	User                    User `gorm:"foreignKey:UserID"`
	AnalyticsCollection     bool `gorm:"default:true"`
	PersonalizedAds         bool `gorm:"default:true"`
	LocationData            bool `gorm:"default:true"`
	SearchHistory           bool `gorm:"default:true"`
	ThirdPartySharing       bool `gorm:"default:true"`
	DataDownloadRequested   bool `gorm:"default:false"`
	DataDownloadRequestDate *time.Time
	DataDeletionRequested   bool `gorm:"default:false"`
	DataDeletionRequestDate *time.Time
	CreatedAt               time.Time
	UpdatedAt               time.Time
}
