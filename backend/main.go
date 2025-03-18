package main

import (
	"fmt"
	"log"
	"os"
	"social-media-app/backend/database"
	"social-media-app/backend/routes"
)

func main() {
	// Veritabanı bağlantısı
	database.ConnectDatabase()

	// API rotalarını ayarla
	router := routes.SetupRoutes()

	// Port numarasını .env dosyasından al
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080" // Varsayılan port
	}

	// Sunucuyu başlat
	log.Printf("Server running on port %s", port)
	router.Run(fmt.Sprintf(":%s", port))
}
