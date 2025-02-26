package database

import (
	"log"

	"social-media-app/backend/models" // Proje ismini kendi dizinine göre değiştir

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := "username:password@tcp(127.0.0.1:3306)/social_media?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Database bağlantısı başarısız:", err)
	}

	DB = db
	log.Println("Database bağlantısı başarılı!")

	// Tabloları otomatik oluştur
	db.AutoMigrate(&models.User{}, &models.Post{})
}
