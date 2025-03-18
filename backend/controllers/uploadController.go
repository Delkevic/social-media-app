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
	// Response struct'ını kullanmak için
)

// Dosya yükleme için maksimum boyutu belirleyin
const maxUploadSize = 10 << 20 // 10 MB
const maxVideoSize = 50 << 20  // 50 MB

// Video yükleme debugging için init fonksiyonu
func init() {
	fmt.Println("uploadController.go yüklendi, /api/upload/video endpoint'i hazır")
}

// UploadImage - Resim yükleme işlemi
func UploadImage(c *gin.Context) {
	userID, _ := c.Get("userID")
	fmt.Printf("Kullanıcı %v için görsel yükleme işlemi başlatıldı\n", userID)

	// Çalışma dizinini al ve yazdır
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Çalışma dizini alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Çalışma dizini alınamadı: " + err.Error(),
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
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Upload dizini oluşturulamadı: " + err.Error(),
			})
			return
		}
		fmt.Printf("Upload dizini başarıyla oluşturuldu\n")
	} else if statErr != nil {
		// Başka bir hata oluştu
		fmt.Printf("Dizin kontrolü sırasında hata: %s\n", statErr.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dizin kontrolü sırasında hata: " + statErr.Error(),
		})
		return
	}

	// Dizin izinlerini kontrol et
	testFile := filepath.Join(uploadDir, "test.txt")
	testData := []byte("test")

	if err := os.WriteFile(testFile, testData, 0644); err != nil {
		fmt.Printf("Dizin yazma izni kontrolü başarısız: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Upload dizinine yazma izniniz yok: " + err.Error(),
		})
		return
	}
	os.Remove(testFile) // Test dosyasını sil
	fmt.Printf("Dizin yazma izni kontrolü başarılı\n")

	// 10MB maksimum boyut sınırlaması
	if err := c.Request.ParseMultipartForm(maxUploadSize); err != nil {
		fmt.Printf("Form verisi işleme hatası: %s\n", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Form verisi işlenirken hata: " + err.Error(),
		})
		return
	}

	// Dosyayı al
	file, fileHeader, err := c.Request.FormFile("image")
	if err != nil {
		fmt.Printf("Form'dan dosya alma hatası: %s\n", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Görsel yüklenirken bir hata oluştu: " + err.Error(),
		})
		return
	}
	defer file.Close()

	fmt.Printf("Yüklenen dosya: %s, boyut: %d bytes\n", fileHeader.Filename, fileHeader.Size)

	// Dosya türünü kontrol et
	fileExt := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if fileExt != ".jpg" && fileExt != ".jpeg" && fileExt != ".png" && fileExt != ".gif" {
		fmt.Printf("Desteklenmeyen dosya türü: %s\n", fileExt)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Desteklenmeyen dosya türü. Lütfen jpg, jpeg, png veya gif yükleyin.",
		})
		return
	}

	// Dosya içeriğini hafızada kontrol et (ilk birkaç byte)
	buff := make([]byte, 512)
	_, err = file.Read(buff)
	if err != nil {
		fmt.Printf("Dosya okuma hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dosya içeriği okunamadı: " + err.Error(),
		})
		return
	}

	// İmleçi başa döndür
	_, err = file.Seek(0, io.SeekStart)
	if err != nil {
		fmt.Printf("Dosya imleci hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dosya işleme hatası: " + err.Error(),
		})
		return
	}

	// MIME tipini kontrol et
	fileContentType := http.DetectContentType(buff)
	if !strings.HasPrefix(fileContentType, "image/") {
		fmt.Printf("Geçersiz içerik türü: %s\n", fileContentType)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Yüklenen dosya bir görsel değil. Algılanan tip: " + fileContentType,
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dosya oluşturulurken bir hata oluştu: " + err.Error(),
		})
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		fmt.Printf("Dosya kopyalama hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dosya kaydedilirken bir hata oluştu: " + err.Error(),
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Görsel başarıyla yüklendi",
		"data": gin.H{
			"url": imageURL,
		},
	})
}

// UploadVideo - Video yükleme işlemi
func UploadVideo(c *gin.Context) {
	fmt.Println("==========================================")
	fmt.Println("Video yükleme fonksiyonu başlatıldı")
	fmt.Println("İstek URL: " + c.Request.URL.String())
	fmt.Println("İstek Metodu: " + c.Request.Method)
	fmt.Println("==========================================")

	// Kullanıcı ID'sini kontrol et
	userID, exists := c.Get("userID")
	if !exists {
		fmt.Println("Video yükleme başarısız: Kullanıcı kimliği doğrulanamadı")
		c.JSON(http.StatusUnauthorized, Response{
			Success: false,
			Message: "Yetkilendirme başarısız",
		})
		return
	}

	fmt.Printf("Video yükleme işlemi başlatıldı. Kullanıcı ID: %v\n", userID)

	// Çalışma dizinini al
	workDir, err := os.Getwd()
	if err != nil {
		fmt.Printf("Çalışma dizini alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Çalışma dizini alınamadı: " + err.Error(),
		})
		return
	}

	// Upload dizininin tam yolunu oluştur
	uploadDir := filepath.Join(workDir, "uploads", "videos")
	fmt.Printf("Video upload dizini: %s\n", uploadDir)

	// Klasörün var olup olmadığını kontrol et, yoksa oluştur
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		fmt.Println("uploads/videos klasörü bulunamadı, oluşturuluyor...")
		err = os.MkdirAll(uploadDir, 0755)
		if err != nil {
			fmt.Printf("Klasör oluşturma hatası: %s\n", err.Error())
			c.JSON(http.StatusInternalServerError, Response{
				Success: false,
				Message: "Video yükleme klasörü oluşturulamadı: " + err.Error(),
			})
			return
		}
		fmt.Println("uploads/videos klasörü başarıyla oluşturuldu")
	}

	// Request formundan dosyayı al
	file, header, err := c.Request.FormFile("video")
	if err != nil {
		fmt.Printf("Dosya alma hatası: %s\n", err.Error())
		fmt.Printf("Form verileri: %+v\n", c.Request.Form)

		// Daha detaylı multipart/form-data analizi
		if c.Request.MultipartForm != nil {
			fmt.Println("Multipart form fields:")
			for k, v := range c.Request.MultipartForm.Value {
				fmt.Printf("Field %s: %v\n", k, v)
			}
			fmt.Println("Multipart form files:")
			for k, v := range c.Request.MultipartForm.File {
				fmt.Printf("File field %s: %d files\n", k, len(v))
			}
		}

		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Video dosyası alınamadı: " + err.Error(),
		})
		return
	}
	defer file.Close()

	fmt.Printf("Video alındı - Adı: %s, boyutu: %d bytes\n", header.Filename, header.Size)

	// Dosya boyutunu kontrol et (100MB sınırı)
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if header.Size > maxSize {
		fmt.Println("Dosya boyutu çok büyük")
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Video dosyası çok büyük, maksimum 100MB yükleyebilirsiniz",
		})
		return
	}

	// Dosya uzantısını kontrol et
	ext := filepath.Ext(header.Filename)
	fileExt := strings.ToLower(ext)
	allowedExts := map[string]bool{
		".mp4":  true,
		".webm": true,
		".mov":  true,
	}

	if !allowedExts[fileExt] {
		fmt.Printf("Geçersiz dosya uzantısı: %s\n", fileExt)
		c.JSON(http.StatusBadRequest, Response{
			Success: false,
			Message: "Geçersiz video formatı. Desteklenen formatlar: MP4, WebM, MOV",
		})
		return
	}

	// Benzersiz dosya adı oluştur
	saveFilename := uuid.New().String() + fileExt
	savePath := filepath.Join(uploadDir, saveFilename)
	fmt.Printf("Video kaydedilecek konum: %s\n", savePath)

	// Dosyayı kaydet
	out, err := os.Create(savePath)
	if err != nil {
		fmt.Printf("Dosya oluşturma hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Video dosyası oluşturulamadı: " + err.Error(),
		})
		return
	}
	defer out.Close()

	// Dosya içeriğini kopyala
	_, err = io.Copy(out, file)
	if err != nil {
		fmt.Printf("Dosya kopyalama hatası: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, Response{
			Success: false,
			Message: "Video kaydedilemedi: " + err.Error(),
		})
		return
	}

	// Video URL'sini oluştur
	videoURL := "/uploads/videos/" + saveFilename
	fmt.Printf("Video başarıyla yüklendi. URL: %s\n", videoURL)

	// Başarılı cevap döndür
	c.JSON(http.StatusOK, Response{
		Success: true,
		Message: "Video başarıyla yüklendi",
		Data: map[string]interface{}{
			"videoUrl": videoURL,
			"fileName": saveFilename,
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Çalışma dizini alınamadı",
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
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Geçersiz görsel yolu",
		})
		return
	}

	// Dosyanın varlığını kontrol et
	fileInfo, err := os.Stat(imagePath)
	if os.IsNotExist(err) {
		fmt.Printf("Dosya bulunamadı: %s\n", imagePath)
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Görsel bulunamadı",
		})
		return
	} else if err != nil {
		fmt.Printf("Dosya bilgisi alınamadı: %s\n", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Dosya bilgisi alınamadı",
		})
		return
	}

	// Dosya izinlerini kontrol et
	if fileInfo.Mode().Perm()&0444 == 0 {
		fmt.Printf("Dosya okuma izni yok: %s\n", imagePath)
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Görsel dosyasına erişim izni yok",
		})
		return
	}

	// Dosyayı servis et
	c.File(imagePath)
}

// ServeUploadedVideo - Yüklenen videoları servis et
func ServeUploadedVideo(c *gin.Context) {
	// Görsel adını al
	filename := c.Param("name")

	// Path injection koruması
	if strings.Contains(filename, "..") {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Geçersiz dosya adı",
		})
		return
	}

	// Çalışma dizinini al
	workDir, err := os.Getwd()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Sunucu hatası",
		})
		return
	}

	// Dosya yolunu oluştur
	filePath := filepath.Join(workDir, "uploads", "videos", filename)

	// Dosyanın varlığını kontrol et
	_, err = os.Stat(filePath)
	if os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Video bulunamadı",
		})
		return
	}

	// Mime tipini belirle
	var contentType string
	switch filepath.Ext(filename) {
	case ".mp4":
		contentType = "video/mp4"
	case ".webm":
		contentType = "video/webm"
	case ".mov":
		contentType = "video/quicktime"
	case ".avi":
		contentType = "video/x-msvideo"
	default:
		contentType = "video/mp4" // Varsayılan
	}

	// Dosyayı servis et
	c.Header("Content-Description", "Video File")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "inline; filename="+filename)
	c.Header("Content-Type", contentType)
	c.File(filePath)
}

// ClearOldUploads - Eski yüklenen dosyaları temizler (zamanlanmış görevle çalıştırılabilir)
func ClearOldUploads(c *gin.Context) {
	// Admin yetkisi kontrolü
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "Yetkilendirme başarısız",
		})
		return
	}

	// Bu kısma admin kontrolü eklenebilir
	fmt.Printf("Temizleme isteği - kullanıcı ID: %v\n", userID)

	// Çalışma dizinini al
	workDir, err := os.Getwd()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Çalışma dizini alınamadı",
		})
		return
	}

	uploadDir := filepath.Join(workDir, "uploads", "images")

	// Dizindeki tüm dosyaları listele
	files, err := os.ReadDir(uploadDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Upload dizini okunamadı: " + err.Error(),
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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("%d eski dosya temizlendi", deletedCount),
	})
}
