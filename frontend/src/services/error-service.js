// error-service.js - Merkezi hata yönetim servisi

/**
 * Hata türleri
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  API: 'API',
  VALIDATION: 'VALIDATION',
  WEBSOCKET: 'WEBSOCKET',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Hata kodları ve karşılık gelen mesajlar
 */
const errorMessages = {
  // Ağ hataları
  'NETWORK_OFFLINE': 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.',
  'NETWORK_TIMEOUT': 'İstek zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.',
  'NETWORK_ERROR': 'Ağ hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  
  // Kimlik doğrulama hataları
  'AUTH_EXPIRED': 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
  'AUTH_INVALID': 'Geçersiz oturum. Lütfen tekrar giriş yapın.',
  'AUTH_REQUIRED': 'Bu işlem için giriş yapmanız gerekiyor.',
  'AUTH_FORBIDDEN': 'Bu işlem için gerekli izinlere sahip değilsiniz.',
  
  // API hataları
  'API_SERVER_ERROR': 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  'API_NOT_FOUND': 'İstenen kaynak bulunamadı.',
  'API_RATE_LIMIT': 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
  'API_INVALID_REQUEST': 'Geçersiz istek formatı.',
  
  // Doğrulama hataları
  'VALIDATION_REQUIRED': 'Lütfen gerekli tüm alanları doldurun.',
  'VALIDATION_FORMAT': 'Lütfen doğru formatta veri girin.',
  'VALIDATION_LENGTH': 'Girilen değer çok uzun veya çok kısa.',
  
  // WebSocket hataları
  'WEBSOCKET_CONNECTION': 'Anlık mesajlaşma bağlantısı kurulamadı.',
  'WEBSOCKET_RECONNECT': 'Anlık mesajlaşma bağlantısı kesildi, yeniden bağlanmaya çalışılıyor.',
  'WEBSOCKET_AUTH': 'Anlık mesajlaşma kimlik doğrulama hatası.',
  'WEBSOCKET_MESSAGE': 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
  
  // Genel hata
  'UNKNOWN_ERROR': 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
};

/**
 * Hata koduna göre kullanıcı dostu mesaj döndürür
 * @param {string} errorCode - Hata kodu
 * @returns {string} - Kullanıcı dostu hata mesajı
 */
export const getErrorMessage = (errorCode) => {
  return errorMessages[errorCode] || errorMessages.UNKNOWN_ERROR;
};

/**
 * HTTP durum koduna göre hata türü döndürür
 * @param {number} statusCode - HTTP durum kodu
 * @returns {string} - Hata türü
 */
export const getErrorTypeFromStatusCode = (statusCode) => {
  if (!statusCode) return ErrorTypes.NETWORK;
  
  if (statusCode === 401 || statusCode === 403) {
    return ErrorTypes.AUTH;
  } else if (statusCode >= 400 && statusCode < 500) {
    return ErrorTypes.VALIDATION;
  } else if (statusCode >= 500) {
    return ErrorTypes.API;
  }
  
  return ErrorTypes.UNKNOWN;
};

/**
 * HTTP durum koduna göre hata kodu döndürür
 * @param {number} statusCode - HTTP durum kodu
 * @returns {string} - Hata kodu
 */
export const getErrorCodeFromStatusCode = (statusCode) => {
  if (!statusCode) return 'NETWORK_ERROR';
  
  switch (statusCode) {
    case 400: return 'API_INVALID_REQUEST';
    case 401: return 'AUTH_EXPIRED';
    case 403: return 'AUTH_FORBIDDEN';
    case 404: return 'API_NOT_FOUND';
    case 408: return 'NETWORK_TIMEOUT';
    case 422: return 'VALIDATION_FORMAT';
    case 429: return 'API_RATE_LIMIT';
    case 500: return 'API_SERVER_ERROR';
    default: return 'UNKNOWN_ERROR';
  }
};

/**
 * Hata nesnesini standart formata dönüştürür
 * @param {Error|Object} error - İşlenecek hata
 * @param {string} defaultType - Varsayılan hata türü
 * @returns {Object} - Standart formatta hata nesnesi
 */
export const normalizeError = (error, defaultType = ErrorTypes.UNKNOWN) => {
  // Hata zaten standart formatta ise doğrudan döndür
  if (error && error.type && error.code && error.message) {
    return error;
  }
  
  // HTTP yanıtı içeren hata
  if (error.response) {
    const statusCode = error.response.status;
    const type = getErrorTypeFromStatusCode(statusCode);
    const code = getErrorCodeFromStatusCode(statusCode);
    const message = error.response.data?.message || getErrorMessage(code);
    
    return {
      type,
      code,
      message,
      originalError: error,
      timestamp: new Date().toISOString()
    };
  }
  
  // Ağ hatası
  if (error.request) {
    return {
      type: ErrorTypes.NETWORK,
      code: 'NETWORK_ERROR',
      message: getErrorMessage('NETWORK_ERROR'),
      originalError: error,
      timestamp: new Date().toISOString()
    };
  }
  
  // WebSocket hatası
  if (error.type === 'websocket') {
    return {
      type: ErrorTypes.WEBSOCKET,
      code: error.code || 'WEBSOCKET_CONNECTION',
      message: error.message || getErrorMessage('WEBSOCKET_CONNECTION'),
      originalError: error,
      timestamp: new Date().toISOString()
    };
  }
  
  // Diğer hatalar
  return {
    type: defaultType,
    code: 'UNKNOWN_ERROR',
    message: error.message || getErrorMessage('UNKNOWN_ERROR'),
    originalError: error,
    timestamp: new Date().toISOString()
  };
};

/**
 * WebSocket hatası oluşturur
 * @param {string} code - WebSocket hata kodu
 * @param {string} message - Hata mesajı
 * @returns {Object} - WebSocket hata nesnesi
 */
export const createWebSocketError = (code, message) => {
  return {
    type: ErrorTypes.WEBSOCKET,
    code,
    message: message || getErrorMessage(code),
    timestamp: new Date().toISOString()
  };
};

/**
 * Doğrulama hatası oluşturur
 * @param {string} code - Doğrulama hata kodu
 * @param {string} message - Hata mesajı
 * @param {Object} errors - Alan bazlı hatalar
 * @returns {Object} - Doğrulama hata nesnesi
 */
export const createValidationError = (code, message, errors = {}) => {
  return {
    type: ErrorTypes.VALIDATION,
    code,
    message: message || getErrorMessage(code),
    errors,
    timestamp: new Date().toISOString()
  };
};

/**
 * Kimlik doğrulama hatası oluşturur
 * @param {string} code - Kimlik doğrulama hata kodu
 * @param {string} message - Hata mesajı
 * @returns {Object} - Kimlik doğrulama hata nesnesi
 */
export const createAuthError = (code, message) => {
  return {
    type: ErrorTypes.AUTH,
    code,
    message: message || getErrorMessage(code),
    timestamp: new Date().toISOString()
  };
};

/**
 * API hatası oluşturur
 * @param {string} code - API hata kodu
 * @param {string} message - Hata mesajı
 * @returns {Object} - API hata nesnesi
 */
export const createApiError = (code, message) => {
  return {
    type: ErrorTypes.API,
    code,
    message: message || getErrorMessage(code),
    timestamp: new Date().toISOString()
  };
};

/**
 * Ağ hatası oluşturur
 * @param {string} code - Ağ hata kodu
 * @param {string} message - Hata mesajı
 * @returns {Object} - Ağ hata nesnesi
 */
export const createNetworkError = (code, message) => {
  return {
    type: ErrorTypes.NETWORK,
    code,
    message: message || getErrorMessage(code),
    timestamp: new Date().toISOString()
  };
}; 