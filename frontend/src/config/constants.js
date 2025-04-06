// API bağlantı noktası
export const API_URL = "http://localhost:8080/api";
export const API_BASE_URL = "http://localhost:8080"; 
export const API_IMAGE_URL = "http://localhost:8080/api/images";

// LocalStorage anahtar isimleri
export const TOKEN_NAME = "token";

// Dosya yükleme limitleri
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Zaman formatları
export const DATE_FORMAT = "DD MMM YYYY";
export const TIME_FORMAT = "HH:mm";

// Uygulama sabitleri
export const APP_NAME = "Social Media App";
export const DEFAULT_PAGE_SIZE = 10;

// Fallback görsel URL'leri
export const DEFAULT_AVATAR_URL = "https://ui-avatars.com/api/?background=random&color=fff";
export const DEFAULT_PLACEHOLDER_IMAGE = "https://ui-avatars.com/api/?background=random&color=fff&size=200&text=Resim";
export const DEFAULT_VIDEO_THUMBNAIL = "https://ui-avatars.com/api/?background=random&color=fff&size=200&text=Video";