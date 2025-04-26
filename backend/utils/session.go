package utils

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Session, kullanıcı oturum bilgilerini temsil eden struct
type Session struct {
	UserID   uint
	Username string
	Email    string
	IsAdmin  bool
}

// GetSession, gin context'ten kullanıcı session bilgisini alır
func GetSession(c *gin.Context) *Session {
	userID, exists := c.Get("userID")
	if !exists {
		return nil
	}

	username, _ := c.Get("username")
	email, _ := c.Get("email")
	isAdmin, _ := c.Get("isAdmin")

	// Tip dönüşümleri
	var isAdminBool bool
	if isAdminValue, ok := isAdmin.(bool); ok {
		isAdminBool = isAdminValue
	}

	fmt.Printf("[DEBUG] GetSession çağrıldı: UserID=%v, Username=%v\n", userID, username)

	return &Session{
		UserID:   userID.(uint),
		Username: username.(string),
		Email:    email.(string),
		IsAdmin:  isAdminBool,
	}
}

// GetUserIDFromContext, gin context'ten kullanıcı ID'sini alır ve uint değerine dönüştürür
func GetUserIDFromContext(c *gin.Context) (uint, bool) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		return 0, false
	}

	// Type assertion ile uint'e dönüştür
	userID, ok := userIDValue.(uint)
	if !ok {
		return 0, false
	}

	return userID, true
}

// RequireAuth, yetkilendirme gerektiren rotalar için middleware
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := GetSession(c)
		if session == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Erişim yetkisi yok"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdmin, admin yetkileri gerektiren rotalar için middleware
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := GetSession(c)
		if session == nil || !session.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin yetkisi gerekiyor"})
			c.Abort()
			return
		}
		c.Next()
	}
}
