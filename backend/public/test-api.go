package public

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// TestCommentLike - Test yorum beğenme API
func TestCommentLike(c *gin.Context) {
	// Parametreleri al
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
		})
		return
	}

	fmt.Printf("Test API: Yorum beğenme isteği, ID: %d\n", commentID)

	// Her zaman başarılı yanıt döndür
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test işlemi başarılı",
		"data": gin.H{
			"isLiked":   true,
			"likeCount": 10,
		},
	})
}
