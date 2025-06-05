package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"social-media-app/backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
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

	// SQLite veritabanı dosyası
	dbPath := getEnvWithDefault("SQLITE_DB_PATH", "development.db")

	// SQLite veritabanına bağlan
	db, err := gorm.Open(sqlite.Open(dbPath), config)
	if err != nil {
		log.Fatalf("SQLite veritabanı bağlantısı başarısız: %v", err)
	}

	DB = db
	log.Println("SQLite veritabanı bağlantısı başarılı!")

	// SQLite için bazı pragmaları ayarla (performans iyileştirmeleri)
	db.Exec("PRAGMA journal_mode = WAL;")
	db.Exec("PRAGMA synchronous = NORMAL;")
	db.Exec("PRAGMA cache_size = 1000;")
	db.Exec("PRAGMA foreign_keys = ON;")

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
		&models.Comment{},
		&models.Like{},
		&models.SavedPost{},
		&models.Reels{},
		&models.ReelLike{},
		&models.SavedReel{},
		&models.LoginActivity{},
		&models.PasswordReset{},
		&models.EmailVerification{},
		&models.AppSettings{},
		&models.AISettings{},
		&models.SecuritySettings{},
		&models.DataPrivacySettings{},
		&models.NotificationSettings{},
		&models.SupportTicket{},
		&models.SupportMessage{},
		&models.TwoFactorAuth{},
		&models.Message{},

		&models.Follow{},
		&models.Notification{},
		&models.FollowRequest{},
		// Yeni modelleri ekle
		&models.Tag{},
		&models.PostTag{},
		&models.UserTag{},
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

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// DB connection initialization
func InitDB() {
	// Bağlantı başarılı olduktan sonra tablolar migrate edilir
	if DB != nil {
		fmt.Println("Veritabanı tablolarını migrate ediliyor...")
		// UserTag modelini ekleyerek migration listesini güncelle
		err := DB.AutoMigrate(&models.User{}, &models.Post{}, &models.UserTag{})
		if err != nil {
			fmt.Printf("Migration hatası: %v\n", err)
		} else {
			fmt.Println("Tablolar başarıyla migrate edildi")
		}
	} else {
		fmt.Println("UYARI: DB bağlantısı nil olduğu için migration yapılamadı")
	}
}

// İnit fonksiyonu sorunlu olabileceğinden, main.go'dan açıkça çağrılması gerekiyor
func init() {
	// InitDB fonksiyonunu doğrudan çağırmak yerine, ana uygulamada çağırılması için yönlendirme yapılabilir
	fmt.Println("Database modülü başlatılıyor. InitDB() fonksiyonunu main'den çağırdığınızdan emin olun.")
}
