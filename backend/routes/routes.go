package routes

import (
    "social-media-app/backend/controllers"
    "github.com/gin-gonic/gin"
)

func SetupRoutes() *gin.Engine {
    router := gin.Default()

    router.Static("/uploads", "./uploads")

    // CORS ayarları
    router.Use(func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*") // Tüm kaynaklara izin ver
        c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
        c.Writer.Header().Set("Access-Control-Max-Age", "86400") // 24 saat
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    })

    // Public routes
    public := router.Group("/api")
    {
        // Görsel servis etme için public endpoint
        public.GET("/uploads/images/:name", controllers.ServeImage)
        
        // Auth routes
        public.POST("/register", controllers.Register)
        public.POST("/login", controllers.Login)
    }

    // Protected routes
    protected := router.Group("/api")
    protected.Use(controllers.AuthMiddleware())
    {
        // Görsel yükleme için endpoint
        protected.POST("/upload/image", controllers.UploadImage)
        
        // Kullanıcı profili
        protected.GET("/user", controllers.GetUserProfile)
        protected.PUT("/user/profile", controllers.UpdateProfile)
        
        // Gönderi rotaları
        protected.GET("/posts", controllers.GetPosts) // ?feed=following/general/trending
        protected.POST("/posts", controllers.CreatePost)
        protected.GET("/posts/:id", controllers.GetPostById)
        protected.POST("/posts/:id/like", controllers.LikePost)
        protected.DELETE("/posts/:id/like", controllers.UnlikePost)
        protected.POST("/posts/:id/save", controllers.SavePost)
        protected.DELETE("/posts/:id/save", controllers.UnsavePost)
        
        // Profil rotaları
        protected.GET("/profile/:username", controllers.GetUserByUsername)
        protected.GET("/profile/:username/posts", controllers.GetUserPosts)
        
        // Yorum rotaları
        protected.GET("/posts/:id/comments", controllers.GetComments)
        protected.POST("/posts/:id/comments", controllers.AddComment)
        
        // Bildirim rotaları
        protected.GET("/notifications", controllers.GetNotifications)
        protected.POST("/notifications/:id/read", controllers.MarkNotificationAsRead)
        
        // Mesaj rotaları
        protected.GET("/messages", controllers.GetConversations)
        protected.GET("/messages/:userId", controllers.GetConversation)
        protected.POST("/messages/:userId", controllers.SendMessage)
    }

    return router
}