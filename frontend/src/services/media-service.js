// media-service.js - Medya işlemleri için merkezi servis
import { API_URL } from '../config/constants';
import api from './api';
import { createApiError, createValidationError } from './error-service';

/**
 * İzin verilen dosya türleri ve boyut limitleri
 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Dosya türünü kontrol eder
 * @param {File} file - Kontrol edilecek dosya
 * @returns {string|null} - Dosya türü veya hata durumunda null
 */
export const getFileType = (file) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'image';
  } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return 'video';
  } else {
    return null;
  }
};

/**
 * Dosya boyutunu kontrol eder
 * @param {File} file - Kontrol edilecek dosya
 * @param {string} fileType - Dosya türü (image, video)
 * @returns {boolean} - Dosya boyutu uygun mu?
 */
export const isFileSizeValid = (file, fileType) => {
  if (fileType === 'image') {
    return file.size <= MAX_IMAGE_SIZE;
  } else if (fileType === 'video') {
    return file.size <= MAX_VIDEO_SIZE;
  }
  return false;
};

/**
 * Dosya seçme işleyicisi
 * @param {Function} onSuccess - Başarı durumunda çağrılacak fonksiyon
 * @param {Function} onError - Hata durumunda çağrılacak fonksiyon
 * @param {Object} options - Dosya seçme seçenekleri
 * @returns {Function} - Dosya seçme işleyicisi
 */
export const handleFileSelect = (onSuccess, onError, options = {}) => {
  return (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    validateAndProcessFile(file, onSuccess, onError, options);
  };
};

/**
 * Dosya sürükle bırak işleyicisi
 * @param {Function} onSuccess - Başarı durumunda çağrılacak fonksiyon
 * @param {Function} onError - Hata durumunda çağrılacak fonksiyon
 * @param {Object} options - Dosya seçme seçenekleri
 * @returns {Object} - Sürükle bırak işleyicileri
 */
export const handleFileDrop = (onSuccess, onError, options = {}) => {
  const onDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (!file) return;
    
    validateAndProcessFile(file, onSuccess, onError, options);
  };
  
  return { onDragOver, onDrop };
};

/**
 * Dosyayı doğrula ve işle
 * @param {File} file - İşlenecek dosya
 * @param {Function} onSuccess - Başarı durumunda çağrılacak fonksiyon
 * @param {Function} onError - Hata durumunda çağrılacak fonksiyon
 * @param {Object} options - İşleme seçenekleri
 */
const validateAndProcessFile = (file, onSuccess, onError, options = {}) => {
  const { allowedTypes = ALLOWED_FILE_TYPES, generatePreview = true } = options;
  
  // Dosya türünü kontrol et
  if (!allowedTypes.includes(file.type)) {
    const error = createValidationError(
      'VALIDATION_FORMAT',
      'Desteklenmeyen dosya türü. Lütfen desteklenen bir dosya türü seçin.',
      { fileType: file.type }
    );
    
    if (onError) onError(error);
    return;
  }
  
  const fileType = getFileType(file);
  
  // Dosya boyutunu kontrol et
  if (!isFileSizeValid(file, fileType)) {
    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    const error = createValidationError(
      'VALIDATION_LENGTH',
      `Dosya boyutu çok büyük. Maksimum boyut: ${maxSize / (1024 * 1024)}MB`,
      { fileSize: file.size, maxSize }
    );
    
    if (onError) onError(error);
    return;
  }
  
  // Önizleme oluştur
  if (generatePreview) {
    createFilePreview(file, (previewUrl) => {
      const fileData = {
        file,
        fileType,
        preview: previewUrl,
        name: file.name,
        size: file.size,
        type: file.type
      };
      
      if (onSuccess) onSuccess(fileData);
    });
  } else {
    const fileData = {
      file,
      fileType,
      preview: null,
      name: file.name,
      size: file.size,
      type: file.type
    };
    
    if (onSuccess) onSuccess(fileData);
  }
};

/**
 * Dosya önizlemesi oluştur
 * @param {File} file - Önizlemesi oluşturulacak dosya
 * @param {Function} callback - Önizleme URL'i ile çağrılacak fonksiyon
 */
const createFilePreview = (file, callback) => {
  const fileType = getFileType(file);
  
  if (fileType === 'image') {
    const reader = new FileReader();
    reader.onload = (event) => {
      callback(event.target.result);
    };
    reader.readAsDataURL(file);
  } else if (fileType === 'video') {
    // Video için blob URL oluştur
    const blobUrl = URL.createObjectURL(file);
    callback(blobUrl);
    
    // Blob URL kullanıldıktan sonra temizlenmeli
    // Bu işlem callback'ten döndükten sonra yapılmalı
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 5000);
  } else {
    callback(null);
  }
};

/**
 * Dosyayı yükle
 * @param {File} file - Yüklenecek dosya
 * @param {Function} onProgress - İlerleme durumunda çağrılacak fonksiyon
 * @param {Function} onSuccess - Başarı durumunda çağrılacak fonksiyon
 * @param {Function} onError - Hata durumunda çağrılacak fonksiyon
 */
export const uploadFile = (file, onProgress, onSuccess, onError) => {
  const fileType = getFileType(file);
  
  if (!fileType) {
    const error = createValidationError(
      'VALIDATION_FORMAT',
      'Desteklenmeyen dosya türü. Lütfen desteklenen bir dosya türü seçin.',
      { fileType: file.type }
    );
    
    if (onError) onError(error);
    return;
  }
  
  // FormData oluştur
  const formData = new FormData();
  formData.append('file', file);
  
  // Token al
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  // XMLHttpRequest kullanarak ilerleme takibi yap
  const xhr = new XMLHttpRequest();
  
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable && onProgress) {
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    }
  });
  
  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          if (onSuccess) onSuccess(response.data);
        } else {
          const error = createApiError(
            'API_INVALID_REQUEST',
            response.message || 'Dosya yükleme hatası'
          );
          
          if (onError) onError(error);
        }
      } catch (error) {
        const parseError = createApiError(
          'API_INVALID_REQUEST',
          'Sunucu yanıtı işlenirken hata oluştu'
        );
        
        if (onError) onError(parseError);
      }
    } else {
      const error = createApiError(
        'API_SERVER_ERROR',
        'Dosya yüklenirken sunucu hatası oluştu'
      );
      
      if (onError) onError(error);
    }
  });
  
  xhr.addEventListener('error', () => {
    const error = createApiError(
      'API_SERVER_ERROR',
      'Dosya yüklenirken ağ hatası oluştu'
    );
    
    if (onError) onError(error);
  });
  
  xhr.addEventListener('abort', () => {
    const error = createApiError(
      'API_INVALID_REQUEST',
      'Dosya yükleme işlemi iptal edildi'
    );
    
    if (onError) onError(error);
  });
  
  // Dosya türüne göre endpoint belirle
  const endpoint = fileType === 'image' ? '/upload/image' : '/upload/video';
  
  // İsteği başlat
  xhr.open('POST', `${API_URL}${endpoint}`);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.send(formData);
  
  // İptal fonksiyonu döndür
  return {
    cancel: () => xhr.abort()
  };
};

/**
 * Tam resim URL'si oluştur
 * @param {string} imageUrl - Resim URL'si
 * @returns {string} - Tam resim URL'si
 */
export const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  return `${API_URL}/images/${imageUrl}`;
};

/**
 * Tam video URL'si oluştur
 * @param {string} videoUrl - Video URL'si
 * @returns {string} - Tam video URL'si
 */
export const getFullVideoUrl = (videoUrl) => {
  if (!videoUrl) return null;
  if (videoUrl.startsWith('http') || videoUrl.startsWith('data:')) {
    return videoUrl;
  }
  return `${API_URL}/videos/${videoUrl}`;
};

/**
 * Tam küçük resim URL'si oluştur
 * @param {string} thumbnailUrl - Küçük resim URL'si
 * @returns {string} - Tam küçük resim URL'si
 */
export const getFullThumbnailUrl = (thumbnailUrl) => {
  if (!thumbnailUrl) return null;
  if (thumbnailUrl.startsWith('http') || thumbnailUrl.startsWith('data:')) {
    return thumbnailUrl;
  }
  return `${API_URL}/thumbnails/${thumbnailUrl}`;
};

/**
 * Medya URL'si oluştur
 * @param {string} url - Medya URL'si
 * @param {string} type - Medya türü (image, video)
 * @returns {string} - Tam medya URL'si
 */
export const getMediaUrl = (url, type) => {
  if (type === 'image') {
    return getFullImageUrl(url);
  } else if (type === 'video') {
    return getFullVideoUrl(url);
  }
  return url;
}; 