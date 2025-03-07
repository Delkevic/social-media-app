package main

import (
	"log"
	"social-media-app/backend/database"
	"social-media-app/backend/routes"
)

func main() {
	// Veritabanı bağlantısı
	database.ConnectDatabase()
	
	// API rotalarını ayarla
	router := routes.SetupRoutes()
	
	// Sunucuyu başlat
	log.Println("Server running on port 8080")
	router.Run(":8080")
}