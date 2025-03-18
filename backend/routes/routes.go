package routes

import (
	"fmt"
	"social-media-app/backend/controllers"

	"github.com/gin-gonic/gin"
)

// Video yükleme için özel middleware
func logRequestInfo(c *gin.Context) {
	fmt.Println("---------- API İSTEK DETAYI ----------")
	fmt.Printf("İstek Path: %s\n", c.Request.URL.Path)
	fmt.Printf("Tam URL: %s\n", c.Request.URL.String())
	fmt.Printf("HTTP Method: %s\n", c.Request.Method)
	fmt.Printf("Content-Type: %s\n", c.Request.Header.Get("Content-Type"))

	c.Next()
}

func SetupRoutes() *gin.Engine {
	router := gin.Default()

	// Dosya boyutu sınırlamasını artır (100MB)
	router.MaxMultipartMemory = 100 << 20
	fmt.Println("Router yükleniyor, max multipart memory:", router.MaxMultipartMemory, "bytes")

	// CORS ayarları - tüm isteklere izin ver
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 saat

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Debug middleware - tüm istekleri loglamak için
	router.Use(func(c *gin.Context) {
		fmt.Printf("Gelen istek: %s %s\n", c.Request.Method, c.Request.URL.Path)
		c.Next()
	})

	// Ana API rotaları
	api := router.Group("/api")
	{
		// Auth routes - public
		api.POST("/register", controllers.Register)
		api.POST("/login", controllers.Login)

		// Görsel ve video servis etme yolları - public
		api.GET("/images/:name", controllers.ServeUploadedImage)
		api.GET("/videos/:name", controllers.ServeUploadedVideo)

		// Static dosya sunucusu - yüklenen dosyalara erişim için
		router.Static("/uploads", "./uploads")

		// Bu endpointi özellikle izole edelim ve her seferinde log çıktısı alalım
		video := api.Group("/upload")
		video.Use(logRequestInfo)
		video.Use(controllers.AuthMiddleware())
		video.POST("/video", controllers.UploadVideo)

		// Standart korumalı endpointler
		auth := api.Group("/")
		auth.Use(controllers.AuthMiddleware())
		{
			// Image upload endpointi
			auth.POST("/upload/image", controllers.UploadImage)

			// Kullanıcı profili
			auth.GET("/user", controllers.GetUserProfile)
			auth.PUT("/user/profile", controllers.UpdateProfile)

			// Gönderi rotaları
			auth.GET("/posts", controllers.GetPosts)
			auth.POST("/posts", controllers.CreatePost)
			auth.GET("/posts/:id", controllers.GetPostById)
			auth.DELETE("/posts/:id", controllers.DeletePost)
			auth.POST("/posts/:id/like", controllers.LikePost)
			auth.DELETE("/posts/:id/like", controllers.UnlikePost)
			auth.POST("/posts/:id/save", controllers.SavePost)
			auth.DELETE("/posts/:id/save", controllers.UnsavePost)

			// Profil rotaları
			auth.GET("/profile/:username", controllers.GetUserByUsername)
			auth.GET("/profile/:username/posts", controllers.GetUserPosts)

			// Yorum rotaları
			auth.GET("/posts/:id/comments", controllers.GetComments)
			auth.POST("/posts/:id/comments", controllers.AddComment)
			auth.POST("/comments/:id/like", controllers.ToggleCommentLike)
			auth.DELETE("/comments/:id", controllers.DeleteComment)
			auth.POST("/comments/:id/report", controllers.ReportComment)

			// Bildirim rotaları
			auth.GET("/notifications", controllers.GetNotifications)
			auth.POST("/notifications/:id/read", controllers.MarkNotificationAsRead)

			// Mesaj rotaları
			auth.GET("/messages", controllers.GetConversations)
			auth.GET("/messages/:userId", controllers.GetConversation)
			auth.POST("/messages/:userId", controllers.SendMessage)

			// Reels rotaları
			auth.GET("/reels", controllers.GetReels)
			auth.POST("/reels", controllers.CreateReel)
			auth.POST("/reels/:id/like", controllers.LikeReel)
			auth.DELETE("/reels/:id/like", controllers.UnlikeReel)
			auth.POST("/reels/:id/share", controllers.ShareReel)
			auth.DELETE("/reels/:id", controllers.DeleteReel)
			auth.GET("/profile/:username/reels", controllers.GetUserReels)
		}
	}

	fmt.Println("=====================================")
	fmt.Println("Tüm API routeları yüklendi")
	fmt.Println("/api/upload/video endpoint'i ÖZEL OLARAK yapılandırıldı")
	fmt.Println("Upload endpoint'i detaylı log çıktısı verecek")
	fmt.Println("=====================================")

	return router
}
