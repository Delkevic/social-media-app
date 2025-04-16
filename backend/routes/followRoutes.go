package routes

import (
	"social-media-app/backend/controllers"
	// "social-media-app/backend/middlewares" // AuthMiddleware controllers içinde varsayılıyor

	"github.com/gin-gonic/gin"
)

// SetupFollowRoutes - Takip ve takip isteği ile ilgili route'ları ayarlar
func SetupFollowRoutes(router *gin.RouterGroup) {
	// --- Takip Etme / Takipten Çıkma ---
	// Kimlik doğrulaması gerektiren /users/:username altındaki route'lar
	followUserGroup := router.Group("/users/:username")
	followUserGroup.Use(controllers.AuthMiddleware())
	{
		// POST /api/v1/users/:username/follow - Takip et / İstek gönder
		followUserGroup.POST("/follow", controllers.HandleFollowUser)

		// DELETE /api/v1/users/:username/follow - Takipten çık
		followUserGroup.DELETE("/follow", controllers.HandleUnfollowUser)

		// DELETE /api/v1/users/:username/follow-request - Gönderilen takip isteğini iptal et
		followUserGroup.DELETE("/follow-request", controllers.CancelFollowRequest)
	}

	// --- Takip İstekleri Yönetimi ---
	// Kimlik doğrulaması gerektiren /follow-requests altındaki route'lar
	followRequestGroup := router.Group("/follow-requests")
	followRequestGroup.Use(controllers.AuthMiddleware())
	{
		// GET /api/v1/follow-requests/pending - Bekleyen takip isteklerini listele
		followRequestGroup.GET("/pending", controllers.GetPendingFollowRequests)

		// POST /api/v1/follow-requests/:requestID/accept - Takip isteğini kabul et
		followRequestGroup.POST("/:requestID/accept", controllers.AcceptFollowRequest)

		// POST /api/v1/follow-requests/:requestID/reject - Takip isteğini reddet
		followRequestGroup.POST("/:requestID/reject", controllers.RejectFollowRequest)
	}
}
