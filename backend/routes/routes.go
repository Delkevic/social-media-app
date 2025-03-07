package routes

import (
	"social-media-app/backend/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRoutes() *gin.Engine {
	router := gin.Default()

	// CORS ayarları
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Public routes
	public := router.Group("/api")
	{
		// Auth routes
		public.POST("/register", controllers.Register)
		public.POST("/login", controllers.Login)
	}

	// Protected routes
	protected := router.Group("/api")
	protected.Use(controllers.AuthMiddleware())
	{
		// Kullanıcı profili
		protected.GET("/user", controllers.GetUserProfile)

		// Profil güncelleme
		protected.PUT("/user/profile", controllers.UpdateProfile)
		
		// buraya ekleniyo eren devamı,yerim seni 
	}

	return router
}