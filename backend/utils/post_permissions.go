package utils

import (
	"social-media-app/backend/models"
)

// CanViewPost, belirtilen kullanıcının gönderiyi görüntüleme yetkisi olup olmadığını kontrol eder
func CanViewPost(userID uint, post models.Post) bool {
	// Basit model: Şimdilik tüm kullanıcılar tüm gönderileri görebilir
	// Gerçek uygulamada bu kısım, post sahibinin hesap gizliliğine ve takipçi durumuna göre kontrol edilmelidir

	// Gönderinin sahibiyse her türlü görebilir
	if post.UserID == userID {
		return true
	}

	// Normalde burada:
	// 1. Post sahibinin hesabı gizli mi diye kontrol et
	// 2. Gizli ise, mevcut kullanıcı onu takip ediyor mu kontrol et
	// 3. Takip etmiyorsa erişim izni verme
	// gibi mantık olur, ancak basitleştirme için şimdilik herkese erişim verelim

	return true
}
