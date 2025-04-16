package models

import (
	"time"

	"gorm.io/gorm"
)

// User - Kullanıcı modeli
type User struct {
	ID           uint   `gorm:"primaryKey"`
	Username     string `gorm:"unique;not null"`
	Email        string `gorm:"unique;not null"`
	Password     string `gorm:"not null"`
	FullName     string
	Phone        string // Telefon numarası alanı eklendi
	ProfileImage string // Profil fotoğrafı URL'i
	Bio          string // Kullanıcı biyografisi
	Location     string // Konum bilgisi
	Website      string // Kişisel website
	IsPrivate    bool   `gorm:"default:false"` // Hesap gizliliği
	IsVerified   bool   `gorm:"default:false"` // Onaylanmış hesap
	IsAdmin      bool   `gorm:"default:false"` // Admin yetkisi
	// Gizlilik Ayarları Eklendi
	CommentPermission string `gorm:"default:'all'"` // 'all', 'followers', 'none'
	TagPermission     string `gorm:"default:'all'"` // 'all', 'followers', 'none'
	// HideFollowersList bool `gorm:"default:false"` // IsPrivate ile birlikte değerlendirilebilir

	// Takip ilişkileriyle ilgili alanlar
	Followers []Follow `gorm:"foreignKey:FollowingID"` // Beni takip edenler
	Following []Follow `gorm:"foreignKey:FollowerID"`  // Benim takip ettiklerim

	Posts         []Post         `gorm:"foreignKey:UserID"`
	LikedPosts    []Post         `gorm:"many2many:likes;"`
	SavedPosts    []Post         `gorm:"many2many:saved_posts;"`
	Comments      []Comment      `gorm:"foreignKey:UserID"`
	Notifications []Notification `gorm:"foreignKey:UserID"` // Bildirimler
	CreatedAt     time.Time
	UpdatedAt     time.Time
	LastLogin     time.Time
	DeletedAt     gorm.DeletedAt `gorm:"index"` // Soft delete için
}

// Follow - Gelişmiş takip ilişkisi modeli
type Follow struct {
	ID            uint   `gorm:"primaryKey"`
	FollowerID    uint   `gorm:"index:idx_follower_following,unique:true"` // Takip eden kişi
	FollowingID   uint   `gorm:"index:idx_follower_following,unique:true"` // Takip edilen kişi
	Follower      User   `gorm:"foreignKey:FollowerID"`
	Following     User   `gorm:"foreignKey:FollowingID"`
	Status        string `gorm:"default:'active'"` // active, muted
	Notifications bool   `gorm:"default:true"`     // Bildirim ayarı
	IsCloseFriend bool   `gorm:"default:false"`    // Yakın arkadaş mı?
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// FollowRequest - Takip isteği modeli
type FollowRequest struct {
	ID          uint `gorm:"primaryKey"`
	FollowerID  uint
	FollowingID uint
	Status      string `gorm:"default:'pending'"` // pending, accepted, rejected
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// UserSettings - Kullanıcı ayarları
type UserSettings struct {
	UserID               uint   `gorm:"primaryKey"`
	NotificationsEnabled bool   `gorm:"default:true"`
	DarkMode             bool   `gorm:"default:false"`
	Language             string `gorm:"default:'tr'"`
}

// FollowerCount - Kullanıcının takipçi sayısını döndürür
func (u *User) FollowerCount(db *gorm.DB) int64 {
	var count int64
	db.Model(&Follow{}).Where("following_id = ?", u.ID).Count(&count)
	return count
}

// FollowingCount - Kullanıcının takip ettiği kişi sayısını döndürür
func (u *User) FollowingCount(db *gorm.DB) int64 {
	var count int64
	db.Model(&Follow{}).Where("follower_id = ?", u.ID).Count(&count)
	return count
}

// PostCount - Kullanıcının gönderi sayısını döndürür
func (u *User) PostCount(db *gorm.DB) int64 {
	var count int64
	db.Model(&Post{}).Where("user_id = ?", u.ID).Count(&count)
	return count
}

// IsFollowing - Kullanıcının belirtilen kullanıcıyı takip edip etmediğini kontrol eder
func (u *User) IsFollowing(db *gorm.DB, userID uint) bool {
	var count int64
	db.Model(&Follow{}).Where("follower_id = ? AND following_id = ?", u.ID, userID).Count(&count)
	return count > 0
}

// HasFollowRequest - Kullanıcının belirtilen kullanıcıya takip isteği gönderip göndermediğini kontrol eder
func (u *User) HasFollowRequest(db *gorm.DB, userID uint) bool {
	var count int64
	db.Model(&FollowRequest{}).Where("follower_id = ? AND following_id = ? AND status = ?",
		u.ID, userID, "pending").Count(&count)
	return count > 0
}
