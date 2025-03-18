package database

import (
	"fmt"
	"log"
	"os"
	"strings"

	"social-media-app/backend/models" // Proje ismini kendi dizinine göre değiştir

	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// .env dosyasını yükle
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("Uyarı: .env dosyası yüklenemedi:", err)
		// Varsayılan değerleri kullanacağız
	}

	// Veritabanı bağlantı bilgilerini .env dosyasından al
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root" // Varsayılan kullanıcı
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	// Şifre boş olabilir

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost" // Varsayılan host
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306" // Varsayılan port
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "social_media_app" // Varsayılan veritabanı adı
	}

	// DSN (Data Source Name) oluştur
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	// Veritabanına bağlan
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		// Veritabanı yoksa oluşturmayı dene
		if strings.Contains(err.Error(), "Unknown database") {
			log.Printf("Veritabanı '%s' bulunamadı, oluşturulmaya çalışılacak...", dbName)

			// Veritabanı olmadan DSN oluştur
			rootDsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/", dbUser, dbPassword, dbHost, dbPort)
			rootDb, rootErr := gorm.Open(mysql.Open(rootDsn), &gorm.Config{})

			if rootErr != nil {
				log.Fatal("Ana veritabanına bağlantı başarısız:", rootErr)
			}

			// Veritabanını oluştur
			createDbSQL := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", dbName)
			if err := rootDb.Exec(createDbSQL).Error; err != nil {
				log.Fatal("Veritabanı oluşturma hatası:", err)
			}

			log.Printf("Veritabanı '%s' başarıyla oluşturuldu!", dbName)

			// Yeni oluşturulan veritabanına bağlan
			db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
			if err != nil {
				log.Fatal("Yeni oluşturulan veritabanına bağlantı başarısız:", err)
			}
		} else {
			log.Fatal("Database bağlantısı başarısız:", err)
		}
	}

	DB = db
	log.Println("Database bağlantısı başarılı!")

	// Tabloları otomatik oluştur
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
		&models.Reels{},     // Reels modelini ekle
		&models.ReelLike{},  // ReelLike modelini ekle
		&models.SavedReel{}, // SavedReel modelini ekle
	)

	if err != nil {
		log.Fatal("Database migration hatası:", err)
	}

	log.Println("Database migration başarılı!")
}
