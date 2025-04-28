package routes

import (
	"social-media-app/backend/controllers"

	"github.com/gin-gonic/gin"
)

// SetupCommentRoutes yorum rotalarını ayarlar
func SetupCommentRoutes(router *gin.Engine) {
	// Yorumlar için ana rota grubu
	commentRoutes := router.Group("/api/v1/comments")
	commentRoutes.Use(controllers.UserAuthMiddleware())

	// Yorum ekleme (post id'si üzerinden)
	commentRoutes.POST("/posts/:postID", controllers.AddComment)

	// Yorum beğenme/beğenmiyi kaldırma
	commentRoutes.POST("/:commentID/like", controllers.ToggleCommentLike)

	// Yorum silme
	commentRoutes.DELETE("/:commentID", controllers.DeleteComment)

	// Yoruma yanıt ekleme
	commentRoutes.POST("/:commentID/reply", controllers.ReplyToComment)

	// Yoruma şikayet etme
	commentRoutes.POST("/:commentID/report", controllers.ReportComment)

	// Post ID'sine göre yorumları getirme - herkese açık erişim
	postCommentRoutes := router.Group("/api/v1/posts/:postID/comments")
	postCommentRoutes.GET("", controllers.GetComments)
}
 