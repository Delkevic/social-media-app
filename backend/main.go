package main

import (
	"log"
	"os"
	"social-media-app/backend/database"
	"social-media-app/backend/routes"

	"github.com/joho/godotenv"
)

func main() {
	// .env dosyasını yükle
	err := godotenv.Load()
	if err != nil {
		log.Println("Uyarı: .env dosyası yüklenemedi, varsayılan değerler kullanılacak")
	}

	// Veritabanı bağlantısı kur
	database.ConnectDatabase()

	// API rotalarını ayarla
	router := routes.SetupRoutes()

	// Sunucuyu başlat
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080" // fallback port
	}
	log.Println("Server running on port", port)
	router.Run(":" + port)
}
