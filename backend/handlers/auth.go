package handlers

import (
	"net/http"
	Database "social-media-app/backend/database" // Import directly without alias
	"social-media-app/backend/models"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// JWT secret key - in production, use environment variables
var jwtKey = []byte("my_secret_key")

// LoginRequest structure for login data
type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse structure for login response
type LoginResponse struct {
	Token    string `json:"token"`
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	UserID   uint   `json:"userId"`
}

// Claims structure for JWT
type Claims struct {
	UserID uint   `json:"userId"`
	Email  string `json:"email"`
	jwt.StandardClaims
}

// Login handles user authentication
func Login(c *gin.Context) {
	var loginRequest LoginRequest
	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Find user by email
	var user models.User
	if err := Database.DB.Where("email = ?", loginRequest.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginRequest.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	// Return token and user info
	c.JSON(http.StatusOK, LoginResponse{
		Token:    tokenString,
		FullName: user.FullName,
		Email:    user.Email,
		UserID:   user.ID,
	})
}
