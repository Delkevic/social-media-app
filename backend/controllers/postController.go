package controllers

import (
    "net/http"
    "social-media-app/backend/database"
    "social-media-app/backend/models"
    "time"
    "strconv"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm" 
)

// Gönderi listesini getirme
func GetPosts(c *gin.Context) {
    userID, _ := c.Get("userID")
    feed := c.DefaultQuery("feed", "general")
    
    var posts []models.Post
    var query *gorm.DB
    
    // Feed tipine göre sorguyu yapılandır
    switch feed {
    case "following":
        // Takip ettiği kullanıcıların gönderileri
        query = database.DB.Joins("JOIN follows ON follows.following_id = posts.user_id").
            Where("follows.follower_id = ?", userID).
            Order("posts.created_at DESC")
    case "trending":
        // En çok beğeni alan gönderiler - "likes_count" yerine "like_count" kullanıyoruz
        query = database.DB.Order("like_count DESC, created_at DESC")
    default: // "general"
        // Tüm gönderiler
        query = database.DB.Order("created_at DESC")
    }
    
    // Gönderi verilerini yükle - Images ve User ilişkilerini de preload et
    result := query.Preload("User").Preload("Images").Find(&posts)
    if result.Error != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Gönderiler yüklenirken bir hata oluştu: " + result.Error.Error(),
        })
        return
    }
    
    // Yanıtı hazırla
    var responsePosts []map[string]interface{}
    for _, post := range posts {
        // Kullanıcının bu gönderiyi beğenip beğenmediğini kontrol et
        var likedCount int64
        database.DB.Model(&models.Like{}).
            Where("user_id = ? AND post_id = ?", userID, post.ID).
            Count(&likedCount)
        
        // Kullanıcının bu gönderiyi kaydedip kaydetmediğini kontrol et
        var savedCount int64
        database.DB.Model(&models.SavedPost{}).
            Where("user_id = ? AND post_id = ?", userID, post.ID).
            Count(&savedCount)
        
        // Görsel URL'lerini derle
        var imageURLs []string
        for _, image := range post.Images {
            imageURLs = append(imageURLs, image.URL)
        }
        
        // Gönderi yanıtını oluştur
        responsePost := map[string]interface{}{
            "id":        post.ID,
            "content":   post.Content,
            "likes":     post.LikeCount,
            "comments":  post.CommentCount,
            "createdAt": formatTimeAgo(post.CreatedAt),
            "liked":     likedCount > 0,
            "saved":     savedCount > 0,
            "images":    imageURLs,
            "user": map[string]interface{}{
                "id":           post.User.ID,
                "username":     post.User.Username,
                "profileImage": post.User.ProfileImage,
            },
        }
        
        responsePosts = append(responsePosts, responsePost)
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "posts": responsePosts,
        },
    })
}



// Gönderi oluşturma
func CreatePost(c *gin.Context) {
    userID, _ := c.Get("userID")
    
    var request struct {
        Content string   `json:"content" binding:"required"`
        Images  []string `json:"images"`
    }
    
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Geçersiz gönderi verisi: " + err.Error(),
        })
        return
    }
    
    // Yeni gönderi oluştur
    post := models.Post{
        UserID:    userID.(uint),
        Content:   request.Content,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
    
    // İşlem için transaction başlat
    tx := database.DB.Begin()
    
    // Veritabanına kaydet
    if err := tx.Create(&post).Error; err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Gönderi oluşturulurken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Görselleri işle (eğer varsa)
    var imageURLs []string
    for _, imageURL := range request.Images {
        postImage := models.PostImage{
            PostID:    post.ID,
            URL:       imageURL,
            CreatedAt: time.Now(),
        }
        
        if err := tx.Create(&postImage).Error; err != nil {
            tx.Rollback()
            c.JSON(http.StatusInternalServerError, Response{
                Success: false,
                Message: "Görsel kaydedilirken bir hata oluştu: " + err.Error(),
            })
            return
        }
        
        imageURLs = append(imageURLs, imageURL)
    }
    
    // Transaction'ı commit et
    if err := tx.Commit().Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "İşlem tamamlanırken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Kullanıcı bilgisini al
    var user models.User
    database.DB.First(&user, userID)
    
    // Yanıt oluştur
    c.JSON(http.StatusCreated, Response{
        Success: true,
        Message: "Gönderi başarıyla oluşturuldu",
        Data: map[string]interface{}{
            "post": map[string]interface{}{
                "id":        post.ID,
                "content":   post.Content,
                "likes":     0,
                "comments":  0,
                "createdAt": "Şimdi",
                "liked":     false,
                "saved":     false,
                "images":    imageURLs,
                "user": map[string]interface{}{
                    "id":           user.ID,
                    "username":     user.Username,
                    "profileImage": user.ProfileImage,
                },
            },
        },
    })
}

// Belirli bir gönderiyi getirme
func GetPostById(c *gin.Context) {
    userID, _ := c.Get("userID")
    postID := c.Param("id")
    
    var post models.Post
    if err := database.DB.Preload("User").Preload("Images").First(&post, postID).Error; err != nil {
        c.JSON(http.StatusNotFound, Response{
            Success: false,
            Message: "Gönderi bulunamadı",
        })
        return
    }
    
    // Kullanıcının gönderiyi beğenip beğenmediğini kontrol et
    var likeCount int64
    database.DB.Model(&models.Like{}).
        Where("user_id = ? AND post_id = ?", userID, post.ID).
        Count(&likeCount)
    
    // Kullanıcının gönderiyi kaydedip kaydetmediğini kontrol et
    var saveCount int64
    database.DB.Model(&models.SavedPost{}).
        Where("user_id = ? AND post_id = ?", userID, post.ID).
        Count(&saveCount)
    
    // Görsel URL'lerini derle
    var imageURLs []string
    for _, image := range post.Images {
        imageURLs = append(imageURLs, image.URL)
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "post": map[string]interface{}{
                "id":        post.ID,
                "content":   post.Content,
                "likes":     post.LikeCount,
                "comments":  post.CommentCount,
                "createdAt": formatTimeAgo(post.CreatedAt),
                "liked":     likeCount > 0,
                "saved":     saveCount > 0,
                "images":    imageURLs,
                "user": map[string]interface{}{
                    "id":           post.User.ID,
                    "username":     post.User.Username,
                    "profileImage": post.User.ProfileImage,
                },
            },
        },
    })
}

// Gönderiyi beğenme
func LikePost(c *gin.Context) {
    userID, _ := c.Get("userID")
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
    
    // Beğeniyi kontrol et (zaten beğenilmiş mi?)
    var existingLike models.Like
    result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&existingLike)
    if result.RowsAffected > 0 {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Bu gönderi zaten beğenilmiş",
        })
        return
    }
    
    // Beğeni oluştur - created_at sütunu olmadığı için field list'ten çıkarıyoruz
    like := models.Like{
        UserID: userID.(uint),
        PostID: uint(postID),
    }
    
    // Beğeniyi ekle
    if err := database.DB.Omit("created_at").Create(&like).Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Beğeni eklenirken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Gönderi beğeni sayısını artır
    database.DB.Model(&post).Update("like_count", post.LikeCount+1)
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Message: "Gönderi başarıyla beğenildi",
    })
}

// Gönderi beğenisini kaldırma
func UnlikePost(c *gin.Context) {
    userID, _ := c.Get("userID")
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
    
    // Beğeniyi sil
    result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Delete(&models.Like{})
    if result.RowsAffected == 0 {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Bu gönderi beğenilmemiş",
        })
        return
    }
    
    // Gönderi beğeni sayısını azalt
    if post.LikeCount > 0 {
        database.DB.Model(&post).Update("like_count", post.LikeCount-1)
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Message: "Gönderi beğenisi başarıyla kaldırıldı",
    })
}

// Gönderiyi kaydetme
func SavePost(c *gin.Context) {
    userID, _ := c.Get("userID")
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
    
    // Kaydı kontrol et (zaten kaydedilmiş mi?)
    var existingSave models.SavedPost
    result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&existingSave)
    if result.RowsAffected > 0 {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Bu gönderi zaten kaydedilmiş",
        })
        return
    }
    
    // Kayıt oluştur - created_at sütunu olmadığı için field list'ten çıkarıyoruz
    savedPost := models.SavedPost{
        UserID: userID.(uint),
        PostID: uint(postID),
    }
    
    // Kaydı ekle
    if err := database.DB.Omit("created_at").Create(&savedPost).Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Gönderi kaydedilirken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Message: "Gönderi başarıyla kaydedildi",
    })
}

// Gönderi kaydını kaldırma
func UnsavePost(c *gin.Context) {
    userID, _ := c.Get("userID")
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
    
    // Kaydı sil
    result := database.DB.Where("user_id = ? AND post_id = ?", userID, postID).Delete(&models.SavedPost{})
    if result.RowsAffected == 0 {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Bu gönderi kaydedilmemiş",
        })
        return
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Message: "Gönderi kaydı başarıyla kaldırıldı",
    })
}

// Kullanıcının kaydettiği gönderileri getirme
func GetSavedPosts(c *gin.Context) {
    userID, _ := c.Get("userID")
    
    // Kaydedilen gönderileri al
    var savedPostIDs []uint
    database.DB.Model(&models.SavedPost{}).
        Where("user_id = ?", userID).
        Pluck("post_id", &savedPostIDs)
    
    if len(savedPostIDs) == 0 {
        c.JSON(http.StatusOK, Response{
            Success: true,
            Data: map[string]interface{}{
                "posts": []interface{}{},
            },
        })
        return
    }
    
    // Gönderileri getir
    var posts []models.Post
    if err := database.DB.Preload("User").Preload("Images").
        Where("id IN ?", savedPostIDs).
        Order("created_at DESC").
        Find(&posts).Error; err != nil {
        c.JSON(http.StatusInternalServerError, Response{
            Success: false,
            Message: "Kaydedilen gönderiler yüklenirken bir hata oluştu: " + err.Error(),
        })
        return
    }
    
    // Yanıtı hazırla
    var responsePosts []map[string]interface{}
    for _, post := range posts {
        // Kullanıcının bu gönderiyi beğenip beğenmediğini kontrol et
        var likedCount int64
        database.DB.Model(&models.Like{}).
            Where("user_id = ? AND post_id = ?", userID, post.ID).
            Count(&likedCount)
        
        // Görsel URL'lerini derle
        var imageURLs []string
        for _, image := range post.Images {
            imageURLs = append(imageURLs, image.URL)
        }
        
        // Gönderi yanıtını oluştur
        responsePost := map[string]interface{}{
            "id":        post.ID,
            "content":   post.Content,
            "likes":     post.LikeCount,
            "comments":  post.CommentCount,
            "createdAt": formatTimeAgo(post.CreatedAt),
            "liked":     likedCount > 0,
            "saved":     true, // Zaten kaydedilmiş olduğunu biliyoruz
            "images":    imageURLs,
            "user": map[string]interface{}{
                "id":           post.User.ID,
                "username":     post.User.Username,
                "profileImage": post.User.ProfileImage,
            },
        }
        
        responsePosts = append(responsePosts, responsePost)
    }
    
    c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "posts": responsePosts,
        },
    })
}