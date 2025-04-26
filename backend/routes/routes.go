package routes

import (
	"fmt"
	"social-media-app/backend/controllers"

	"github.com/gin-gonic/gin"
)

// Video yükleme için özel middleware
func logRequestInfo(c *gin.Context) {
	fmt.Println("---------- API İSTEK DETAYI ----------")
	fmt.Printf("İstek Path: %s\n", c.Request.URL.Path)
	fmt.Printf("Tam URL: %s\n", c.Request.URL.String())
	fmt.Printf("HTTP Method: %s\n", c.Request.Method)
	fmt.Printf("Content-Type: %s\n", c.Request.Header.Get("Content-Type"))

	c.Next()
}

func SetupRoutes() *gin.Engine {
	router := gin.Default()

	// Dosya boyutu sınırlamasını artır (100MB)
	router.MaxMultipartMemory = 100 << 20
	fmt.Println("Router yükleniyor, max multipart memory:", router.MaxMultipartMemory, "bytes")

	// CORS ayarları - tüm isteklere izin ver
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

	// Debug middleware - tüm istekleri loglamak için
	router.Use(func(c *gin.Context) {
		fmt.Printf("Gelen istek: %s %s\n", c.Request.Method, c.Request.URL.Path)
		c.Next()
	})

	// Ana API rotaları
	api := router.Group("/api")
	{
		// Auth routes - public
		api.POST("/initiate-register", controllers.UserInitiateRegister)
		api.POST("/complete-registration", controllers.UserCompleteRegistration)
		api.POST("/login", controllers.UserLogin)

		// İki faktörlü doğrulama rotaları - public
		api.POST("/verify-2fa", controllers.VerifyTwoFactorCode)
		api.POST("/resend-2fa-code", controllers.Resend2FACode)

		// Password reset routes - public
		api.POST("/forgot-password", controllers.RequestPasswordReset)
		api.POST("/verify-reset-code", controllers.VerifyResetCode)
		api.POST("/reset-password", controllers.SetNewPassword)

		// Görsel ve video servis etme yolları - public
		api.GET("/images/:name", controllers.ServeUploadedImage)
		api.GET("/thumbnails/:name", controllers.ServeUploadedThumbnail)
		api.GET("/videos/:name", controllers.ServeUploadedVideo)

		// Static dosya sunucusu - yüklenen dosyalara erişim için
		router.Static("/uploads", "./uploads")

		// Bu endpointi özellikle izole edelim ve her seferinde log çıktısı alalım
		video := api.Group("/upload")
		video.Use(logRequestInfo)
		video.Use(controllers.UserAuthMiddleware())
		video.POST("/video", controllers.UploadVideo)

		// Standart korumalı endpointler
		auth := api.Group("/")
		auth.Use(controllers.UserAuthMiddleware())
		{
			// Image upload endpointi
			auth.POST("/upload/image", controllers.UploadImage)

			// Kullanıcı profili ve ayarları
			auth.GET("/user", controllers.GetUserProfile)
			auth.PUT("/user/profile", controllers.UpdateProfile)
			auth.PUT("/user/privacy", controllers.UpdatePrivacy)
			auth.PUT("/user/password", controllers.UpdatePassword)
			auth.DELETE("/user", controllers.DeleteAccount)
			auth.GET("/user/login-activity", controllers.GetLoginActivities)

			// Kullanıcı takip etme/çıkarma (Kullanıcı adına göre güncellendi)
			auth.POST("/user/follow/:username", controllers.SendFollowRequestToUser)
			auth.DELETE("/user/follow/:username", controllers.UnfollowUser)
			auth.DELETE("/user/follow-request/:username", controllers.CancelFollowRequestByUsername)

			// Takip İstekleri Yönetimi
			auth.GET("/follow-requests/pending", controllers.GetPendingFollowRequestsList)
			auth.POST("/follow-requests/:request_id/accept", controllers.AcceptFollowRequestById)
			auth.POST("/follow-requests/:request_id/reject", controllers.RejectFollowRequestById)

			// Kullanıcı following/followers - kullanıcı adına göre
			auth.GET("/profile/:username/following", controllers.GetFollowing)
			auth.GET("/profile/:username/followers", controllers.GetFollowers)

			// Gönderi rotaları
			auth.GET("/posts", controllers.GetPosts)
			auth.POST("/posts", controllers.CreatePost)
			auth.GET("/posts/:id", controllers.GetPostById)
			auth.DELETE("/posts/:id", controllers.DeletePost)
			auth.POST("/posts/:id/like", controllers.LikePost)
			auth.DELETE("/posts/:id/like", controllers.UnlikePost)
			auth.POST("/posts/:id/save", controllers.SavePost)
			auth.DELETE("/posts/:id/save", controllers.UnsavePost)

			// Profil rotaları (Diğer kullanıcılar için)
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
			auth.POST("/notifications/read-all", controllers.MarkAllNotificationsAsRead)

			// Mesaj rotaları
			auth.GET("/messages", controllers.GetConversations)
			auth.GET("/messages/:userId", controllers.GetConversation)
			auth.POST("/messages/:userId", controllers.SendMessage)
			auth.POST("/messages/:userId/typing", controllers.SendTypingStatus)
			auth.POST("/messages/read/:id", controllers.MarkMessageAsRead)
			auth.GET("/messages/previous-chats", controllers.GetPreviousChats) // Daha önce mesajlaşılan kullanıcıları getirir

			// Reels rotaları
			auth.GET("/reels", controllers.GetReels)
			auth.POST("/reels", controllers.CreateReel)
			auth.POST("/reels/:id/like", controllers.LikeReel)
			auth.DELETE("/reels/:id/like", controllers.UnlikeReel)
			auth.POST("/reels/:id/share", controllers.ShareReel)
			auth.DELETE("/reels/:id", controllers.DeleteReel)
			auth.GET("/profile/:username/reels", controllers.GetUserReels)
			auth.GET("/reels/explore", controllers.GetExploreReels)
			auth.POST("/reels/:id/save", controllers.SaveReel)
			auth.DELETE("/reels/:id/save", controllers.UnsaveReel)

			// Geri Bildirim Rotası (Yeni Eklendi)
			auth.POST("/feedback", controllers.SubmitFeedback)

			// Bildirim Ayarları
			auth.GET("/notifications/settings", controllers.GetNotificationSettings)
			auth.PUT("/notifications/settings", controllers.UpdateNotificationSettings)

			// Uygulama Ayarları
			auth.GET("/app/settings", controllers.GetAppSettings)
			auth.PUT("/app/settings", controllers.UpdateAppSettings)

			// Yapay Zeka Ayarları
			auth.GET("/ai/settings", controllers.GetAISettings)
			auth.PUT("/ai/settings", controllers.UpdateAISettings)

			// Güvenlik Ayarları
			auth.GET("/security/settings", controllers.GetSecuritySettings)
			auth.PUT("/security/settings", controllers.UpdateSecuritySettings)

			// Veri Gizliliği Ayarları
			auth.GET("/data-privacy/settings", controllers.GetDataPrivacySettings)
			auth.PUT("/data-privacy/settings", controllers.UpdateDataPrivacySettings)
			auth.POST("/data-privacy/download-request", controllers.RequestDataDownload)
			auth.POST("/data-privacy/deletion-request", controllers.RequestDataDeletion)

			// Destek ve Geri Bildirim
			auth.POST("/support/tickets", controllers.CreateSupportTicket)
			auth.GET("/support/tickets", controllers.GetUserTickets)
			auth.GET("/support/tickets/:id", controllers.GetTicketDetails)
			auth.POST("/support/tickets/:id/messages", controllers.AddTicketMessage)
			auth.PUT("/support/tickets/:id/close", controllers.CloseTicket)
			auth.PUT("/support/tickets/:id/reopen", controllers.ReopenTicket)
		}

		// Kullanıcı arama rotası (auth dışında)
		api.GET("/users/search", controllers.SearchUsers)

		// WebSocket bağlantı noktası - auth dışında
		api.GET("/ws", controllers.WebSocketHandler)
	}

	fmt.Println("=====================================")
	fmt.Println("Tüm API routeları yüklendi")
	fmt.Println("/api/upload/video endpoint'i ÖZEL OLARAK yapılandırıldı")
	fmt.Println("Upload endpoint'i detaylı log çıktısı verecek")
	fmt.Println("=====================================")

	return router
}
