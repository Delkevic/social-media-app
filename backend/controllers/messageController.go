// controllers/messageController.go
package controllers

import (
    "fmt"
    "net/http"
    "social-media-app/backend/database"
    "social-media-app/backend/models"
    "strconv"
    "github.com/gin-gonic/gin"
)

// Konuşmaları getirme
// Mesajlaşmayı buraya eklicez

func GetConversations(c *gin.Context) {
    userID, _ := c.Get("userID")
    
    // Burada gerçek durumda veritabanından konuşmaları çekmeniz gerekir
    // Örnek amacıyla temsili veri döndürüyoruz
	fmt.Printf("Kullanıcı ID %v için konuşmalar getiriliyor\n", userID)

	c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "conversations": []map[string]interface{}{
                {
                    "id": 1,
                    "sender": map[string]interface{}{
                        "id": 2,
                        "username": "ahmet",
                        "profileImage": "",
                    },
                    "lastMessage": "Merhaba, nasılsın?",
                    "time": "2 saat önce",
                    "unread": true,
                },
                {
                    "id": 2,
                    "sender": map[string]interface{}{
                        "id": 3,
                        "username": "ayse",
                        "profileImage": "",
                    },
                    "lastMessage": "Proje ne durumda?",
                    "time": "1 gün önce",
                    "unread": false,
                },
            },
        },
    })
}

// Belirli bir kullanıcı ile olan mesajları getirme
func GetConversation(c *gin.Context) {
    userID, _ := c.Get("userID")
    otherUserIDStr := c.Param("userId")
    otherUserID, _ := strconv.Atoi(otherUserIDStr)
    
    // Diğer kullanıcının var olup olmadığını kontrol et
    var otherUser models.User
    if err := database.DB.First(&otherUser, otherUserID).Error; err != nil {
        c.JSON(http.StatusNotFound, Response{
            Success: false,
            Message: "Kullanıcı bulunamadı",
        })
        return
    }
    
    // Burada gerçek durumda veritabanından mesajları çekmeniz gerekir
    // Örnek amacıyla temsili veri döndürüyoruz
    c.JSON(http.StatusOK, Response{
        Success: true,
        Data: map[string]interface{}{
            "messages": []map[string]interface{}{
                {
                    "id": 1,
                    "sender": map[string]interface{}{
                        "id": otherUserID,
                        "username": otherUser.Username,
                    },
                    "content": "Merhaba, nasılsın?",
                    "time": "2 saat önce",
                },
                {
                    "id": 2,
                    "sender": map[string]interface{}{
                        "id": userID,
                        "username": "ben",
                    },
                    "content": "İyiyim, teşekkürler. Sen nasılsın?",
                    "time": "1 saat önce",
                },
            },
        },
    })
}

// Mesaj gönderme
func SendMessage(c *gin.Context) {
    userID, _ := c.Get("userID")
    receiverIDStr := c.Param("userId")
    receiverID, _ := strconv.Atoi(receiverIDStr)
    
    var request struct {
        Content string `json:"content" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(http.StatusBadRequest, Response{
            Success: false,
            Message: "Geçersiz mesaj: " + err.Error(),
        })
        return
    }
    
    // Alıcı kullanıcının var olup olmadığını kontrol et
    var receiver models.User
    if err := database.DB.First(&receiver, receiverID).Error; err != nil {
        c.JSON(http.StatusNotFound, Response{
            Success: false,
            Message: "Alıcı kullanıcı bulunamadı",
        })
        return
    }
    
    // Burada gerçek durumda veritabanına mesajı kaydetmeniz gerekir
    // Örnek amacıyla başarılı yanıt döndürüyoruz
    c.JSON(http.StatusCreated, Response{
        Success: true,
        Message: "Mesaj başarıyla gönderildi",
        Data: map[string]interface{}{
            "message": map[string]interface{}{
                "id": 1, // Gerçek durumda veritabanından gelen ID
                "content": request.Content,
                "sender": map[string]interface{}{
                    "id": userID,
                    "username": "ben",
                },
				"time": "Şimdi",
            },
        },
    })
}