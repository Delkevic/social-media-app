package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"social-media-app/backend/database"
	"social-media-app/backend/models"
)

// GetComments bir gönderinin yorumlarını getirir
func GetComments(c *gin.Context) {
	// Gönderi ID'sini al
	postID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz gönderi ID'si"})
		return
	}

	// Mevcut kullanıcı ID'sini al
	userID := c.GetUint("userID")

	var comments []models.Comment
	result := database.DB.
		Preload("User").
		Preload("Replies").
		Preload("Replies.User").
		Where("post_id = ? AND parent_id IS NULL", postID).
		Order("created_at desc").
		Find(&comments)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Yorumlar alınırken bir hata oluştu"})
		return
	}

	// Her bir yorum için beğeni durumunu kontrol et
	for i := range comments {
		// Ana yorumun beğeni durumunu kontrol et
		var count int64
		database.DB.Model(&models.CommentLike{}).
			Where("comment_id = ? AND user_id = ?", comments[i].ID, userID).
			Count(&count)
		comments[i].IsLiked = count > 0

		// Alt yorumların beğeni durumunu kontrol et
		for j := range comments[i].Replies {
			var replyCount int64
			database.DB.Model(&models.CommentLike{}).
				Where("comment_id = ? AND user_id = ?", comments[i].Replies[j].ID, userID).
				Count(&replyCount)
			comments[i].Replies[j].IsLiked = replyCount > 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"comments": comments,
		},
	})
}

// AddComment yeni bir yorum ekler
func AddComment(c *gin.Context) {
	// Gönderi ID'sini al
	postID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz gönderi ID'si"})
		return
	}

	// Kullanıcı ID'sini al
	userID := c.GetUint("userID")

	// İstek gövdesini parse et
	var request struct {
		Content  string `json:"content" binding:"required"`
		ParentID *uint  `json:"parentId"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz yorum verisi"})
		return
	}

	// Gönderiyi kontrol et
	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Gönderi bulunamadı"})
		return
	}

	// Eğer bir üst yorum ID'si varsa, varlığını kontrol et
	if request.ParentID != nil {
		var parentComment models.Comment
		if err := database.DB.First(&parentComment, request.ParentID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Üst yorum bulunamadı"})
			return
		}
	}

	// Yeni yorumu oluştur
	comment := models.Comment{
		Content:  request.Content,
		UserID:   userID,
		PostID:   uint(postID),
		ParentID: request.ParentID,
	}

	// Yorumu veritabanına kaydet
	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Yorum kaydedilirken bir hata oluştu"})
		return
	}

	// Kullanıcı bilgilerini yükle
	database.DB.Preload("User").First(&comment, comment.ID)

	// Gönderi yorum sayısını güncelle
	database.DB.Model(&post).UpdateColumn("comment_count", post.CommentCount+1)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": gin.H{
			"comment": comment,
		},
	})
}

// ToggleCommentLike yorum beğenme/beğeni kaldırma işlemini yapar
func ToggleCommentLike(c *gin.Context) {
	// Yorum ID'sini al
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
		})
		return
	}

	// Kullanıcı ID'sini al
	userID := c.GetUint("userID")

	// Yorumu kontrol et
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Yorum bulunamadı",
		})
		return
	}

	// Beğeniyi kontrol et (zaten beğenilmiş mi?)
	var existingLike models.CommentLike
	result := database.DB.Unscoped().Where("comment_id = ? AND user_id = ? AND deleted_at IS NULL", commentID, userID).First(&existingLike)
	if result.RowsAffected > 0 {
		// Beğeniyi kaldır
		if err := database.DB.Delete(&existingLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Beğeni kaldırılırken bir hata oluştu: " + err.Error(),
			})
			return
		}

		// Yorum beğeni sayısını azalt
		if comment.LikeCount > 0 {
			database.DB.Model(&comment).Update("like_count", comment.LikeCount-1)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Yorum beğenisi başarıyla kaldırıldı",
			"data": gin.H{
				"isLiked":   false,
				"likeCount": comment.LikeCount - 1,
			},
		})
		return
	}

	// Önce silinmiş (soft-deleted) beğenileri kontrol et
	var deletedLike models.CommentLike
	delResult := database.DB.Unscoped().Where("comment_id = ? AND user_id = ? AND deleted_at IS NOT NULL", commentID, userID).First(&deletedLike)
	
	if delResult.RowsAffected > 0 {
		// Silinmiş kaydı tamamen sil (hard delete)
		database.DB.Unscoped().Delete(&deletedLike)
	}

	// Beğeni oluştur
	like := models.CommentLike{
		CommentID: uint(commentID),
		UserID:    userID,
	}

	// Beğeniyi ekle
	if err := database.DB.Create(&like).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Beğeni eklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	// Yorum beğeni sayısını artır
	database.DB.Model(&comment).Update("like_count", comment.LikeCount+1)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yorum başarıyla beğenildi",
		"data": gin.H{
			"isLiked":   true,
			"likeCount": comment.LikeCount + 1,
		},
	})
}

// DeleteComment bir yorumu siler
func DeleteComment(c *gin.Context) {
	// Yorum ID'sini al
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
		})
		return
	}

	// Kullanıcı ID'sini al
	userID := c.GetUint("userID")

	// Yorumu kontrol et
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Yorum bulunamadı",
		})
		return
	}

	// Kullanıcının yorumu silme yetkisi var mı kontrol et
	if comment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Bu yorumu silme yetkiniz yok",
		})
		return
	}

	// Yorumu sil
	if err := database.DB.Delete(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Yorum silinirken bir hata oluştu",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yorum başarıyla silindi",
	})
}

// ReportComment yorumu şikayet etme
func ReportComment(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
		})
		return
	}

	userID := c.GetUint("userID")

	// Yorumu kontrol et
	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Yorum bulunamadı",
		})
		return
	}

	// Kullanıcı kendi yorumunu şikayet edemez
	if comment.UserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Kendi yorumunuzu şikayet edemezsiniz",
		})
		return
	}

	// Şikayet zaten var mı kontrol et
	var existingReport models.CommentReport
	result := database.DB.Where("comment_id = ? AND user_id = ?", commentID, userID).First(&existingReport)

	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Bu yorumu zaten şikayet ettiniz",
		})
		return
	}

	// Yeni şikayet oluştur
	newReport := models.CommentReport{
		CommentID: uint(commentID),
		UserID:    userID,
	}

	if err := database.DB.Create(&newReport).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Şikayet kaydedilirken bir hata oluştu",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yorum başarıyla şikayet edildi",
	})
}
