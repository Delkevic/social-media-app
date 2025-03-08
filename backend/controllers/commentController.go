package controllers

import (
    "net/http"
    "social-media-app/backend/database"
    "social-media-app/backend/models"
    "time"
    "strconv"
    "github.com/gin-gonic/gin"
)

// Yorumları getirme
func GetComments(c *gin.Context) {
    postIDStr := c.Param("id")
    postID, _ := strconv.Atoi(postIDStr)
    
    // Gönderiyi kontrol et
    var post models.Post
    if err := database.DB.First(&post, postID).Error; err != nil {
        c.JSON(http.StatusNotFound, Response{
            Success: false,
            Message: "Gönderi bulunamadı",
        })
        return
    }
    
    // Yorumları getir
    var comments []models.Comment
    if err := database.DB.Where("post_id = ?", postID).
        Preload("User").
        Order("created_at DESC").
        Find(&comments).Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Yorumlar yüklenirken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Yanıt için yorumları düzenle
    var responseComments []map[string]interface{}
    
    for _, comment := range comments {
        commentResponse := map[string]interface{}{
            "id":        comment.ID,
            "content":   comment.Content,
            "createdAt": formatTimeAgo(comment.CreatedAt),
            "likes":     comment.Likes,
            "user": map[string]interface{}{
                "id":           comment.User.ID,
                "username":     comment.User.Username,
                "profileImage": comment.User.ProfileImage,
            },
        }
        
        responseComments = append(responseComments, commentResponse)
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "comments": responseComments,
        },
    })
}

// Yorum ekleme
func AddComment(c *gin.Context) {
    userID, _ := c.Get("userID")
    postIDStr := c.Param("id")
    postID, _ := strconv.Atoi(postIDStr)
    
    var request struct {
        Content string `json:"content" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Geçersiz yorum verisi: " + err.Error(),
        })
        return
    }
    
    // Gönderiyi kontrol et
    var post models.Post
    if err := database.DB.First(&post, postID).Error; err != nil {
        c.JSON(http.StatusNotFound, Response{
            Success: false,
            Message: "Gönderi bulunamadı",
        })
        return
    }
    
    // Yorum oluştur
    comment := models.Comment{
        UserID:    userID.(uint),
        PostID:    uint(postID),
        Content:   request.Content,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    
    if err := database.DB.Create(&comment).Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Yorum eklenirken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Gönderi yorum sayısını artır
    database.DB.Model(&post).Update("comment_count", post.CommentCount+1)
    
    // Kullanıcı bilgisini al
    var user models.User
    database.DB.First(&user, userID)
    
    c.JSON(http.StatusCreated, Response{
        Success: true,
        Message: "Yorum başarıyla eklendi",
        Data: map[string]interface{}{
            "comment": map[string]interface{}{
                "id":        comment.ID,
                "content":   comment.Content,
                "createdAt": "Şimdi",
                "likes":     0,
                "user": map[string]interface{}{
                    "id":           user.ID,
                    "username":     user.Username,
                    "profileImage": user.ProfileImage,
                },
            },
        },
    })
}