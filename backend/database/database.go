package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"social-media-app/backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func ConnectDatabase() {
	// .env dosyasını yükle
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Uyarı: .env dosyası yüklenemedi:", err)
	}

	// GORM logger ayarları
	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Info,
			IgnoreRecordNotFoundError: true,
			Colorful:                  true,
		},
	)

	// GORM yapılandırması
	config := &gorm.Config{
		Logger: newLogger,
		NowFunc: func() time.Time {
			return time.Now().Local()
		},
	}

	// Railway üzerinden MySQL bağlantısı için DSN (Data Source Name)
	user := getEnvWithDefault("MYSQLUSER", "root")
	password := getEnvWithDefault("MYSQLPASSWORD", "")
	host := getEnvWithDefault("MYSQLHOST", "turntable.proxy.rlwy.net")
	port := getEnvWithDefault("MYSQLPORT", "3306")
	dbname := getEnvWithDefault("MYSQLDATABASE", "railway")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbname)

	// MySQL veritabanına bağlan
	db, err := gorm.Open(mysql.Open(dsn), config)
	if err != nil {
		log.Fatalf("MySQL veritabanı bağlantısı başarısız: %v", err)
	}

	// Bağlantı havuzu ayarları
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Veritabanı bağlantı havuzu ayarlanamadı:", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println("MySQL veritabanı bağlantısı başarılı!")

	// Tabloları otomatik oluştur
	err = db.AutoMigrate(
		&models.User{},
		&models.Follow{},
		&models.FollowRequest{},
		&models.Notification{},
		&models.UserSettings{},
		&models.Post{},
		&models.Comment{},
		&models.CommentLike{},
		&models.PostImage{},
		&models.Like{},
		&models.SavedPost{},
		&models.Reels{},
		&models.ReelLike{},
		&models.SavedReel{},
		&models.LoginActivity{},
		&models.PasswordReset{},
		&models.EmailVerification{},
	)

	if err != nil {
		log.Fatal("Veritabanı migration hatası:", err)
	}

	log.Println("Veritabanı migration başarılı!")
}

// .env'den değer al, boşsa default döndür
func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
