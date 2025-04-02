package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

// JWT claims struct
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

// Şifre hashleme
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// Şifre doğrulama
func CheckPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// JWT token oluşturma
func GenerateToken(userID uint) (string, error) {
	// .env'den süresi al veya varsayılan olarak 24 saat kullan
	tokenExpiry := os.Getenv("TOKEN_EXPIRY")
	var expirationTime time.Time

	if tokenExpiry == "" {
		expirationTime = time.Now().Add(24 * time.Hour)
	} else {
		duration, err := time.ParseDuration(tokenExpiry)
		if err != nil {
			duration = 24 * time.Hour // Varsayılan süre
		}
		expirationTime = time.Now().Add(duration)
	}

	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// JWT anahtarını .env'den al veya varsayılan kullan
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "gizli_anahtar" // Varsayılan anahtar
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Token doğrulama
func ValidateToken(tokenString string) (*Claims, error) {
	claims := &Claims{}

	// JWT anahtarını .env'den al veya varsayılan kullan
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "gizli_anahtar" // Varsayılan anahtar
	}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("geçersiz token")
	}

	return claims, nil
}

// Rastgele token oluşturma (email doğrulama vs. için)
func GenerateRandomToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
