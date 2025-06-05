// Eğer dosya yoksa sıfırdan oluşturalım

// API URL ve sabitler
export const API_BASE_URL = 'http://localhost:8080'; // Backend API için URL

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  VERIFY_TOKEN: '/api/auth/verify',
  
  // User
  USER_PROFILE: '/api/users/profile',
  USER_FOLLOWING: '/api/users/following',
  USER_FOLLOWERS: '/api/users/followers',
  USER_SEARCH: '/api/users/search',
  
  // Messages
  MESSAGES: '/api/messages',
  CONVERSATIONS: '/api/conversations',
  
  // Posts
  POSTS: '/api/posts',
};

// Zaman formatları
export const DATE_FORMATS = {
  DEFAULT: 'dd.MM.yyyy',
  WITH_TIME: 'dd.MM.yyyy HH:mm',
};

// Dosya boyut limitleri
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB
};

// Uygulama sabitleri
export const APP_CONSTANTS = {
  DEFAULT_POLLING_INTERVAL: 3000, // 3 saniye
};

// API bağlantı noktası
export const API_URL = "http://localhost:8080/api";
export const API_IMAGE_URL = "http://localhost:8080/api/images";

// LocalStorage anahtar isimleri
export const TOKEN_NAME = "token";

// Dosya yükleme limitleri
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Uygulama sabitleri
export const APP_NAME = "Social Media App";
export const DEFAULT_PAGE_SIZE = 10;

// Fallback görsel URL'leri
export const DEFAULT_AVATAR_URL = "https://ui-avatars.com/api/?background=random&color=fff";
export const DEFAULT_PLACEHOLDER_IMAGE = "https://ui-avatars.com/api/?background=random&color=fff&size=200&text=Resim";
export const DEFAULT_VIDEO_THUMBNAIL = "https://ui-avatars.com/api/?background=random&color=fff&size=200&text=Video";