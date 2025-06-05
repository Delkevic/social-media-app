package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"log"
	"social-media-app/backend/database"
	"social-media-app/backend/models"
)

// GetComments bir gönderinin yorumlarını getirir
func GetComments(c *gin.Context) {
	// Gönderi ID'sini al
	postID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz gönderi ID'si"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Yorumlar alınırken bir hata oluştu"})
		return
	}

	// Her bir yorum için beğeni durumunu kontrol et
	for i := range comments {
		// Ana yorumun beğeni durumunu kontrol et
		var count int64
		database.DB.Model(&models.CommentLike{}).
			Where("comment_id = ? AND user_id = ?", comments[i].ID, userID).
			Count(&count)
		comments[i].IsLiked = count > 0

		// Alt yorumların beğeni durumunu kontrol et
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

// AddComment adds a comment to a post
func AddComment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kullanıcı oturumu bulunamadı"})
		return
	}

	postIDStr := c.Param("id")
	postID, err := strconv.Atoi(postIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz gönderi ID'si formatı"})
		return
	}

	var post models.Post
	if err := database.DB.First(&post, postID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gönderi bulunamadı"})
		return
	}

	var input struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "İçerik gerekli"})
		return
	}

	// Yorumu oluştur
	postIDPtr := uint(postID)
	comment := models.Comment{
		PostID:  &postIDPtr,
		UserID:  userID.(uint),
		Content: input.Content,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Yorum eklenirken hata oluştu"})
		return
	}

	// Post'un yorum sayısını güncelle
	database.DB.Model(&post).Update("comment_count", post.CommentCount+1)

	// Yorum yapan kullanıcının bilgilerini al
	var user models.User
	database.DB.Select("id, username, profile_image").First(&user, userID)

	// Post sahibine bildirim oluştur (kendi postuna yorum yapıyorsa bildirim oluşturma)
	if post.UserID != userID.(uint) {
		notification := models.Notification{
			ToUserID:   post.UserID,
			FromUserID: userID.(uint),
			Type:       "comment",
			Message:    user.Username + " gönderinize yorum yaptı",
			IsRead:     false,
		}

		if err := database.DB.Create(&notification).Error; err != nil {
			// Bildirim oluşturulamazsa sadece log kaydı tut, ana işlemi etkileme
			log.Printf("Bildirim oluşturma hatası: %v", err)
		}
	}

	// Oluşturulan yorumu kullanıcı bilgileriyle birlikte döndür
	responseComment := struct {
		ID        uint      `json:"id"`
		PostID    *uint     `json:"postID"`
		Content   string    `json:"content"`
		LikeCount int       `json:"likeCount"`
		CreatedAt time.Time `json:"createdAt"`
		User      struct {
			ID           uint   `json:"id"`
			Username     string `json:"username"`
			ProfileImage string `json:"profileImage,omitempty"`
		} `json:"user"`
	}{
		ID:        comment.ID,
		PostID:    comment.PostID,
		Content:   comment.Content,
		LikeCount: comment.LikeCount,
		CreatedAt: comment.CreatedAt,
		User: struct {
			ID           uint   `json:"id"`
			Username     string `json:"username"`
			ProfileImage string `json:"profileImage,omitempty"`
		}{
			ID:           user.ID,
			Username:     user.Username,
			ProfileImage: user.ProfileImage,
		},
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Yorum başarıyla eklendi",
		"comment": responseComment,
	})
}

// ToggleCommentLike handles liking/unliking a comment
func ToggleCommentLike(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "Kullanıcı oturumu bulunamadı"})
		return
	}

	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Geçersiz yorum ID'si"})
		return
	}

	var comment models.Comment
	if err := database.DB.First(&comment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Yorum bulunamadı"})
		return
	}

	// Mevcut like durumunu kontrol et
	var existingLike models.CommentLike
	likeExists := database.DB.Where("comment_id = ? AND user_id = ?", commentID, userID).First(&existingLike).Error == nil

	if likeExists {
		// Like varsa kaldır
		if err := database.DB.Delete(&existingLike).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Beğeni kaldırılırken hata oluştu"})
			return
		}

		// Yorum beğeni sayısını güncelle
		database.DB.Model(&comment).Update("like_count", comment.LikeCount-1)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Yorum beğenisi kaldırıldı",
			"liked":   false,
		})
	} else {
		// Like yoksa ekle
		like := models.CommentLike{
			CommentID: uint(commentID),
			UserID:    userID.(uint),
		}

		if err := database.DB.Create(&like).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Beğeni eklenirken hata oluştu"})
			return
		}

		// Yorum beğeni sayısını güncelle
		database.DB.Model(&comment).Update("like_count", comment.LikeCount+1)

		// Beğeni yapan kullanıcının bilgilerini getir
		var user models.User
		database.DB.Select("id, username, profile_image").First(&user, userID)

		// Yorum sahibine bildirim oluştur (kendi yorumunu beğeniyorsa bildirim oluşturma)
		if comment.UserID != userID.(uint) {
			notification := models.Notification{
				ToUserID:   comment.UserID,
				FromUserID: userID.(uint),
				Type:       "comment_like",
				Message:    user.Username + " yorumunuzu beğendi",
				IsRead:     false,
			}

			if err := database.DB.Create(&notification).Error; err != nil {
				// Bildirim oluşturulamazsa sadece log kaydı tut, ana işlemi etkileme
				log.Printf("Bildirim oluşturma hatası: %v", err)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Yorum beğenildi",
			"liked":   true,
		})
	}
}

// DeleteComment bir yorumu siler
func DeleteComment(c *gin.Context) {
	// Yorum ID'sini al
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
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
			"message": "Yorum silinirken bir hata oluştu",
		})
		return
	}

	// Gönderi yorum sayısını azalt
	var post models.Post
	if comment.PostID != nil {
		if err := database.DB.First(&post, *comment.PostID).Error; err == nil && post.CommentCount > 0 {
			database.DB.Model(&post).Update("comment_count", post.CommentCount-1)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yorum başarıyla silindi",
	})
}

// ReportComment yorumu şikayet etme
func ReportComment(c *gin.Context) {
	commentIDStr := c.Param("id")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz yorum ID'si",
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

	// Kullanıcı kendi yorumunu şikayet edemez
	if comment.UserID == userID {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Kendi yorumunuzu şikayet edemezsiniz",
		})
		return
	}

	// Şikayet zaten var mı kontrol et
	var existingReport models.CommentReport
	result := database.DB.Where("comment_id = ? AND user_id = ?", commentID, userID).First(&existingReport)

	if result.RowsAffected > 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Bu yorumu zaten şikayet ettiniz",
		})
		return
	}

	// Yeni şikayet oluştur
	newReport := models.CommentReport{
		CommentID: uint(commentID),
		UserID:    userID,
	}

	if err := database.DB.Create(&newReport).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Şikayet kaydedilirken bir hata oluştu",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Yorum başarıyla şikayet edildi",
	})
}

// ReplyToComment yanıt vermek için kullanılır
func ReplyToComment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Kullanıcı oturumu bulunamadı"})
		return
	}

	commentIDStr := c.Param("commentID")
	commentID, err := strconv.Atoi(commentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Geçersiz yorum ID'si"})
		return
	}

	var parentComment models.Comment
	if err := database.DB.First(&parentComment, commentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Yanıt verilecek yorum bulunamadı"})
		return
	}

	var input struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "İçerik gerekli"})
		return
	}

	// Yanıt yorumu oluştur
	reply := models.Comment{
		PostID:   parentComment.PostID,
		UserID:   userID.(uint),
		ParentID: &parentComment.ID,
		Content:  input.Content,
	}

	if err := database.DB.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Yanıt eklenirken hata oluştu"})
		return
	}

	// Yanıt veren kullanıcının bilgilerini al
	var user models.User
	database.DB.Select("id, username, profile_image").First(&user, userID)

	// Ana yorum sahibine bildirim oluştur (kendi yorumuna yanıt veriyorsa bildirim oluşturma)
	if parentComment.UserID != userID.(uint) {
		notification := models.Notification{
			ToUserID:   parentComment.UserID,
			FromUserID: userID.(uint),
			Type:       "reply",
			Message:    user.Username + " yorumunuza yanıt verdi",
			IsRead:     false,
		}

		if err := database.DB.Create(&notification).Error; err != nil {
			// Bildirim oluşturulamazsa sadece log kaydı tut, ana işlemi etkileme
			log.Printf("Bildirim oluşturma hatası: %v", err)
		}
	}

	// Yanıt veren kullanıcının bilgileriyle yanıtı döndür
	responseReply := struct {
		ID        uint      `json:"id"`
		PostID    *uint     `json:"postID"`
		ParentID  uint      `json:"parentID"`
		Content   string    `json:"content"`
		LikeCount int       `json:"likeCount"`
		CreatedAt time.Time `json:"createdAt"`
		User      struct {
			ID           uint   `json:"id"`
			Username     string `json:"username"`
			ProfileImage string `json:"profileImage,omitempty"`
		} `json:"user"`
	}{
		ID:        reply.ID,
		PostID:    reply.PostID,
		ParentID:  *reply.ParentID,
		Content:   reply.Content,
		LikeCount: reply.LikeCount,
		CreatedAt: reply.CreatedAt,
		User: struct {
			ID           uint   `json:"id"`
			Username     string `json:"username"`
			ProfileImage string `json:"profileImage,omitempty"`
		}{
			ID:           user.ID,
			Username:     user.Username,
			ProfileImage: user.ProfileImage,
		},
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Yanıt başarıyla eklendi",
		"reply":   responseReply,
	})
}
