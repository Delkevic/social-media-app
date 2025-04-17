package database

import (
	"log"
	"os"
	"time"

	"social-media-app/backend/models" // Proje ismini kendi dizinine göre değiştir

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite" // SQLite sürücüsünü kullanacağız
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

	// SQLite veritabanına bağlan
	dbName := "social_media_app.db"
	db, err := gorm.Open(sqlite.Open(dbName), config)
	if err != nil {
		log.Fatal("SQLite veritabanı bağlantısı başarısız:", err)
	}

	// Bağlantı havuzu ayarları
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Veritabanı bağlantı havuzu ayarlanamadı:", err)
	}

	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool.
	sqlDB.SetMaxIdleConns(10)

	// SetMaxOpenConns sets the maximum number of open connections to the database.
	sqlDB.SetMaxOpenConns(100)

	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused.
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println("SQLite veritabanı bağlantısı başarılı!")

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
		&models.Reels{},             // Reels modelini ekle
		&models.ReelLike{},          // ReelLike modelini ekle
		&models.SavedReel{},         // SavedReel modelini ekle
		&models.LoginActivity{},     // LoginActivity modeli eklendi
		&models.PasswordReset{},     // PasswordReset modeli eklendi
		&models.EmailVerification{}, // EmailVerification modeli eklendi
	)

	if err != nil {
		log.Fatal("Veritabanı migration hatası:", err)
	}

	log.Println("Veritabanı migration başarılı!")
}

// getEnvWithDefault - Çevre değişkenini varsayılan değerle al
func getEnvWithDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
