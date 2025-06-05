package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"social-media-app/backend/database"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"social-media-app/backend/utils"
)

// SupportTicketRequest destek bileti oluşturma isteği
type SupportTicketRequest struct {
	Subject     string `json:"subject" binding:"required"`
	Description string `json:"description" binding:"required"`
	Category    string `json:"category" binding:"required"`
	Priority    string `json:"priority"`
}

// SupportMessageRequest destek mesajı oluşturma isteği
type SupportMessageRequest struct {
	Message    string `json:"message" binding:"required"`
	Attachment string `json:"attachment"`
}

// SupportTicket yapısı
type SupportTicket struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id"`
	Subject   string     `json:"subject"`
	Category  string     `json:"category"` // "hesap", "teknik", "şikayet", "diğer"
	Priority  string     `json:"priority"` // "düşük", "normal", "yüksek"
	Reference string     `json:"reference"`
	Status    string     `json:"status"` // "açık", "beklemede", "çözüldü", "kapalı"
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	ClosedAt  *time.Time `json:"closed_at"`
}

// TicketMessage yapısı
type TicketMessage struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	TicketID   uint      `json:"ticket_id"`
	SenderID   uint      `json:"sender_id"`
	IsStaff    bool      `json:"is_staff"`
	Message    string    `json:"message"`
	Attachment string    `json:"attachment"` // Dosya yolu veya URL
	CreatedAt  time.Time `json:"created_at"`
}

// Feedback yapısı
type Feedback struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id"`
	Type      string    `json:"type"` // "iyileştirme", "hata", "öneri"
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Rating    int       `json:"rating"` // 1-5 arası değerlendirme
	CreatedAt time.Time `json:"created_at"`
}

// CreateSupportTicket yeni bir destek bileti oluşturur
func CreateSupportTicket(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	var request SupportTicketRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek formatı: " + err.Error()})
		return
	}

	// Kategori kontrolü
	validCategories := map[string]bool{
		"account":   true,
		"technical": true,
		"billing":   true,
		"content":   true,
		"other":     true,
	}

	if !validCategories[request.Category] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz kategori. Geçerli değerler: account, technical, billing, content, other"})
		return
	}

	// Öncelik kontrolü
	priority := "normal" // Varsayılan değer
	if request.Priority != "" {
		if request.Priority == "low" || request.Priority == "normal" || request.Priority == "high" {
			priority = request.Priority
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz öncelik. Geçerli değerler: low, normal, high"})
			return
		}
	}

	// Benzersiz referans oluştur: SR-YYYYMMDD-XXXXXX (SR: Support Request)
	rand.Seed(time.Now().UnixNano())
	dateStr := time.Now().Format("20060102")
	randomStr := fmt.Sprintf("%06d", rand.Intn(1000000))
	reference := fmt.Sprintf("SR-%s-%s", dateStr, randomStr)

	// Yeni destek bileti oluştur
	ticket := SupportTicket{
		UserID:    session.UserID,
		Subject:   request.Subject,
		Category:  request.Category,
		Status:    "açık",
		Priority:  priority,
		Reference: reference,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	tx := db.Begin()

	if err := tx.Create(&ticket).Error; err != nil {
		tx.Rollback()
		fmt.Printf("[ERROR] Destek bileti oluşturulurken hata (UserID: %v): %v\n", session.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti oluşturulurken bir hata oluştu"})
		return
	}

	// İlk mesajı da oluştur (açıklama alanı)
	message := TicketMessage{
		TicketID:  ticket.ID,
		SenderID:  session.UserID,
		IsStaff:   false,
		Message:   request.Description,
		CreatedAt: time.Now(),
	}

	if err := tx.Create(&message).Error; err != nil {
		tx.Rollback()
		fmt.Printf("[ERROR] İlk destek mesajı oluşturulurken hata (TicketID: %v): %v\n", ticket.ID, err)
		// Hata loglama sadece, kullanıcıya hata döndürmeyelim
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Destek talebiniz başarıyla oluşturuldu",
		"ticket":  ticket,
	})
}

// GetUserTickets kullanıcının tüm destek biletlerini getirir
func GetUserTickets(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	var tickets []SupportTicket
	if err := db.Where("user_id = ?", session.UserID).Order("created_at DESC").Find(&tickets).Error; err != nil {
		fmt.Printf("[ERROR] Destek biletleri alınırken hata (UserID: %v): %v\n", session.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek biletleri alınırken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

// GetTicketDetails belirli bir destek biletinin detaylarını ve mesajlarını getirir
func GetTicketDetails(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	ticketID := c.Param("id")

	var ticket SupportTicket
	if err := db.Where("id = ? AND user_id = ?", ticketID, session.UserID).First(&ticket).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Destek bileti bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti alınırken bir hata oluştu"})
		}
		return
	}

	var messages []TicketMessage
	if err := db.Where("ticket_id = ?", ticketID).Order("created_at ASC").Find(&messages).Error; err != nil {
		fmt.Printf("[ERROR] Destek mesajları alınırken hata (TicketID: %v): %v\n", ticket.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek mesajları alınırken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ticket":   ticket,
		"messages": messages,
	})
}

// AddTicketMessage destek biletine yeni bir mesaj ekler
func AddTicketMessage(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	ticketID := c.Param("id")

	var ticket SupportTicket
	if err := db.Where("id = ? AND user_id = ?", ticketID, session.UserID).First(&ticket).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Destek bileti bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti alınırken bir hata oluştu"})
		}
		return
	}

	// Kapalı bilete mesaj eklenemez
	if ticket.Status == "kapalı" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kapalı bilete mesaj eklenemez"})
		return
	}

	var request SupportMessageRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek formatı: " + err.Error()})
		return
	}

	message := TicketMessage{
		TicketID:   ticket.ID,
		SenderID:   session.UserID,
		IsStaff:    false,
		Message:    request.Message,
		Attachment: request.Attachment,
		CreatedAt:  time.Now(),
	}

	tx := db.Begin()

	if err := tx.Create(&message).Error; err != nil {
		tx.Rollback()
		fmt.Printf("[ERROR] Destek mesajı oluşturulurken hata (TicketID: %v): %v\n", ticket.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Mesaj eklenirken bir hata oluştu"})
		return
	}

	// Bilet durumunu "çözüldü" ise "açık" olarak güncelle
	if ticket.Status == "çözüldü" {
		ticket.Status = "açık"
		ticket.UpdatedAt = time.Now()
		if err := tx.Save(&ticket).Error; err != nil {
			tx.Rollback()
			fmt.Printf("[ERROR] Bilet durumu güncellenirken hata (TicketID: %v): %v\n", ticket.ID, err)
			// Hata loglama sadece, kullanıcıya hata döndürmeyelim
		}
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Mesajınız başarıyla eklendi",
		"ticket_message": message,
	})
}

// CloseTicket destek biletini kapatır
func CloseTicket(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	ticketID := c.Param("id")

	var ticket SupportTicket
	if err := db.Where("id = ? AND user_id = ?", ticketID, session.UserID).First(&ticket).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Destek bileti bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti alınırken bir hata oluştu"})
		}
		return
	}

	// Zaten kapalı bilet kontrolü
	if ticket.Status == "kapalı" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Destek bileti zaten kapatılmış"})
		return
	}

	now := time.Now()
	ticket.Status = "kapalı"
	ticket.UpdatedAt = now
	ticket.ClosedAt = &now

	if err := db.Save(&ticket).Error; err != nil {
		fmt.Printf("[ERROR] Bilet kapatılırken hata (TicketID: %v): %v\n", ticket.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti kapatılırken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Destek bileti başarıyla kapatıldı",
		"ticket":  ticket,
	})
}

// ReopenTicket kapalı bir destek biletini yeniden açar
func ReopenTicket(c *gin.Context) {
	db := database.DB
	session := utils.GetSession(c)

	if session == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum bulunamadı"})
		return
	}

	ticketID := c.Param("id")

	var ticket SupportTicket
	if err := db.Where("id = ? AND user_id = ?", ticketID, session.UserID).First(&ticket).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Destek bileti bulunamadı"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti alınırken bir hata oluştu"})
		}
		return
	}

	// Kapalı olmayan bilet kontrolü
	if ticket.Status != "kapalı" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Destek bileti zaten açık durumda"})
		return
	}

	ticket.Status = "açık"
	ticket.UpdatedAt = time.Now()
	ticket.ClosedAt = nil

	if err := db.Save(&ticket).Error; err != nil {
		fmt.Printf("[ERROR] Bilet yeniden açılırken hata (TicketID: %v): %v\n", ticket.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Destek bileti yeniden açılırken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Destek bileti başarıyla yeniden açıldı",
		"ticket":  ticket,
	})
}

// CreateFeedback kullanıcının geribildirim göndermesini sağlar
func CreateFeedback(c *gin.Context) {
	db := database.DB

	// Kullanıcı girişi yapmış mı kontrol et
	var userID uint
	session := utils.GetSession(c)
	if session != nil {
		userID = session.UserID
	}

	var feedback struct {
		Type    string `json:"type" binding:"required"`
		Subject string `json:"subject" binding:"required"`
		Message string `json:"message" binding:"required"`
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	}

	if err := c.ShouldBindJSON(&feedback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz istek formatı"})
		return
	}

	newFeedback := Feedback{
		UserID:    userID,
		Type:      feedback.Type,
		Subject:   feedback.Subject,
		Message:   feedback.Message,
		Rating:    feedback.Rating,
		CreatedAt: time.Now(),
	}

	if err := db.Create(&newFeedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Geribildirim gönderilirken bir hata oluştu"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Geribildiriminiz için teşekkür ederiz",
		"feedback": newFeedback,
	})
}
