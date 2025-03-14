package controllers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Dosya yükleme için maksimum boyutu belirleyin
const maxUploadSize = 10 << 20 // 10 MB

// UploadImage - Görsel yükleme işlemi
func UploadImage(c *gin.Context) {
	userID, _ := c.Get("userID")
	fmt.Printf("Kullanıcı %v için görsel yükleme işlemi başlatıldı\n", userID)

	// Çalışma dizinini al ve yazdır
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Çalışma dizini alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Çalışma dizini alınamadı: " + err.Error(),
		})
		return
	}
	fmt.Printf("Çalışma dizini: %s\n", workDir)

	// Upload dizinini tam yolunu oluştur
	uploadDir := filepath.Join(workDir, "uploads", "images")
	fmt.Printf("Upload dizini: %s\n", uploadDir)

	// Dizinin varlığını kontrol et
	_, statErr := os.Stat(uploadDir)
	if os.IsNotExist(statErr) {
		fmt.Printf("Upload dizini mevcut değil, oluşturuluyor: %s\n", uploadDir)
		// Dizini oluştur (gerekiyorsa üst dizinleri de)
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			fmt.Printf("Upload dizini oluşturma hatası: %s\n", err.Error())
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Upload dizini oluşturulamadı: " + err.Error(),
			})
			return
		}
		fmt.Printf("Upload dizini başarıyla oluşturuldu\n")
	} else if statErr != nil {
		// Başka bir hata oluştu
		fmt.Printf("Dizin kontrolü sırasında hata: %s\n", statErr.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dizin kontrolü sırasında hata: " + statErr.Error(),
		})
		return
	}

	// Dizin izinlerini kontrol et
	testFile := filepath.Join(uploadDir, "test.txt")
	testData := []byte("test")

	if err := os.WriteFile(testFile, testData, 0644); err != nil {
		fmt.Printf("Dizin yazma izni kontrolü başarısız: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Upload dizinine yazma izniniz yok: " + err.Error(),
		})
		return
	}
	os.Remove(testFile) // Test dosyasını sil
	fmt.Printf("Dizin yazma izni kontrolü başarılı\n")

	// 10MB maksimum boyut sınırlaması
	if err := c.Request.ParseMultipartForm(maxUploadSize); err != nil {
		fmt.Printf("Form verisi işleme hatası: %s\n", err.Error())
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Form verisi işlenirken hata: " + err.Error(),
		})
		return
	}

	// Dosyayı al
	file, fileHeader, err := c.Request.FormFile("image")
	if err != nil {
		fmt.Printf("Form'dan dosya alma hatası: %s\n", err.Error())
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Görsel yüklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}
	defer file.Close()

	fmt.Printf("Yüklenen dosya: %s, boyut: %d bytes\n", fileHeader.Filename, fileHeader.Size)

	// Dosya türünü kontrol et
	fileExt := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if fileExt != ".jpg" && fileExt != ".jpeg" && fileExt != ".png" && fileExt != ".gif" {
		fmt.Printf("Desteklenmeyen dosya türü: %s\n", fileExt)
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Desteklenmeyen dosya türü. Lütfen jpg, jpeg, png veya gif yükleyin.",
		})
		return
	}

	// Dosya içeriğini hafızada kontrol et (ilk birkaç byte)
	buff := make([]byte, 512)
	_, err = file.Read(buff)
	if err != nil {
		fmt.Printf("Dosya okuma hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dosya içeriği okunamadı: " + err.Error(),
		})
		return
	}

	// İmleçi başa döndür
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		fmt.Printf("Dosya imleci hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dosya işleme hatası: " + err.Error(),
		})
		return
	}

	// MIME tipini kontrol et
	fileContentType := http.DetectContentType(buff)
	if !strings.HasPrefix(fileContentType, "image/") {
		fmt.Printf("Geçersiz içerik türü: %s\n", fileContentType)
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Yüklenen dosya bir görsel değil. Algılanan tip: " + fileContentType,
		})
		return
	}

	// Benzersiz bir dosya adı oluştur
	fileName := fmt.Sprintf("%s-%s%s", uuid.New().String(), time.Now().Format("20060102150405"), fileExt)
	fmt.Printf("Yeni dosya adı: %s\n", fileName)

	// Dosyanın tam yolunu oluştur
	uploadPath := filepath.Join(uploadDir, fileName)
	fmt.Printf("Dosya kaydedilecek: %s\n", uploadPath)

	// Dosyayı kaydet
	out, err := os.Create(uploadPath)
	if err != nil {
		fmt.Printf("Dosya oluşturma hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dosya oluşturulurken bir hata oluştu: " + err.Error(),
		})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		fmt.Printf("Dosya kopyalama hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dosya kaydedilirken bir hata oluştu: " + err.Error(),
		})
		return
	}

	fmt.Printf("Dosya başarıyla kaydedildi: %s\n", uploadPath)

	// Dosya izinlerini kontrol et
	fileInfo, err := os.Stat(uploadPath)
	if err != nil {
		fmt.Printf("Kaydedilen dosya bilgileri alınamadı: %s\n", err.Error())
	} else {
		fmt.Printf("Kaydedilen dosya boyutu: %d bytes, izinleri: %v\n", fileInfo.Size(), fileInfo.Mode())
	}

	// Görsel URL'sini döndür
	imageURL := "/uploads/images/" + fileName
	fmt.Printf("Oluşturulan URL: %s\n", imageURL)

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Görsel başarıyla yüklendi",
		Data: map[string]interface{}{
			"url": imageURL,
		},
	})
}

// ServeUploadedImage - Yüklenen görselleri servis et
func ServeUploadedImage(c *gin.Context) {
	imageName := c.Param("name")
	fmt.Printf("İstenen görsel: %s\n", imageName)

	// Güvenlik: Dosya adını temizle
	cleanImageName := filepath.Base(imageName)
	if cleanImageName != imageName {
		fmt.Printf("Güvenlik uyarısı: Dosya adı temizlendi %s -> %s\n", imageName, cleanImageName)
		imageName = cleanImageName
	}

	// Çalışma dizinini al
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Çalışma dizini alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Çalışma dizini alınamadı",
		})
		return
	}

	// Görsel tam yolunu oluştur
	imagePath := filepath.Join(workDir, "uploads", "images", imageName)
	fmt.Printf("Görsel dosya yolu: %s\n", imagePath)

	// Güvenlik: Yol enjeksiyonunu önle
	uploadDir := filepath.Join(workDir, "uploads", "images")
	if !strings.HasPrefix(filepath.Clean(imagePath), uploadDir) {
		fmt.Printf("Güvenlik uyarısı: Geçersiz dosya yolu: %s\n", imagePath)
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz görsel yolu",
		})
		return
	}

	// Dosyanın varlığını kontrol et
	fileInfo, err := os.Stat(imagePath)
	if os.IsNotExist(err) {
		fmt.Printf("Dosya bulunamadı: %s\n", imagePath)
		c.JSON(http.StatusNotFound, Response{
			Success: false,
			Message: "Görsel bulunamadı",
		})
		return
	} else if err != nil {
		fmt.Printf("Dosya bilgisi alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Dosya bilgisi alınamadı",
		})
		return
	}

	// Dosya izinlerini kontrol et
	if fileInfo.Mode().Perm()&0444 == 0 {
		fmt.Printf("Dosya okuma izni yok: %s\n", imagePath)
		c.JSON(http.StatusForbidden, Response{
			Success: false,
			Message: "Görsel dosyasına erişim izni yok",
		})
		return
	}

	// Dosyayı servis et
	c.File(imagePath)
}

// ClearOldUploads - Eski yüklenen dosyaları temizler (zamanlanmış görevle çalıştırılabilir)
func ClearOldUploads(c *gin.Context) {
	// Admin yetkisi kontrolü
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Yetkilendirme başarısız",
		})
		return
	}

	// Bu kısma admin kontrolü eklenebilir
	fmt.Printf("Temizleme isteği - kullanıcı ID: %v\n", userID)

	// Çalışma dizinini al
	workDir, err := os.Getwd()
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Çalışma dizini alınamadı",
		})
		return
	}

	uploadDir := filepath.Join(workDir, "uploads", "images")

	// Dizindeki tüm dosyaları listele
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Upload dizini okunamadı: " + err.Error(),
		})
		return
	}

	// 30 gün öncesinden eski olan dosyaları sil
	cutoffTime := time.Now().AddDate(0, 0, -30)
	deletedCount := 0

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		filePath := filepath.Join(uploadDir, file.Name())
		fileInfo, err := file.Info()
		if err != nil {
			fmt.Printf("Dosya bilgileri alınamadı: %s - %s\n", file.Name(), err.Error())
			continue
		}

		if fileInfo.ModTime().Before(cutoffTime) {
			if err := os.Remove(filePath); err != nil {
				fmt.Printf("Dosya silinemedi: %s - %s\n", file.Name(), err.Error())
			} else {
				deletedCount++
				fmt.Printf("Eski dosya silindi: %s\n", file.Name())
			}
		}
	}

	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: fmt.Sprintf("%d eski dosya temizlendi", deletedCount),
	})
}
