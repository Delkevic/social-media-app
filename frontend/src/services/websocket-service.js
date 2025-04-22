import { API_URL } from '../config/constants';
import { 
  createWebSocketError, 
  normalizeError, 
  ErrorTypes 
} from './error-service';

/**
 * WebSocketService - Tüm WebSocket iletişimlerini merkezi olarak yöneten servis
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageListeners = [];
    this.connectListeners = [];
    this.disconnectListeners = [];
    this.errorListeners = [];
    this.typingListeners = [];
    this.notificationListeners = [];
    this.isAuthenticated = false;
    this.token = null;
  }

  /**
   * WebSocket bağlantısını başlat
   * @param {string} token - Kullanıcı kimlik doğrulama token'ı
   * @param {boolean} reconnect - Yeniden bağlanma işlemi mi?
   * @returns {WebSocket} - WebSocket bağlantısı
   */
  connect(token, reconnect = false) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket zaten bağlı, yeni bağlantı kurulmadı');
      return this.ws;
    }

    try {
      this.token = token;
      const wsUrl = API_URL.replace('http', 'ws').replace('https', 'wss');
      this.ws = new WebSocket(`${wsUrl}/ws`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      
      if (!reconnect) {
        this.reconnectAttempts = 0;
      }
      
      return this.ws;
    } catch (error) {
      const wsError = createWebSocketError(
        'WEBSOCKET_CONNECTION', 
        'WebSocket bağlantısı kurulamadı: ' + error.message
      );
      this.notifyErrorListeners(wsError);
      console.error('WebSocket bağlantısı kurulamadı:', error);
      return null;
    }
  }

  /**
   * WebSocket bağlantısı açıldığında
   */
  handleOpen(event) {
    console.log('WebSocket bağlantısı kuruldu', event);
    this.reconnectAttempts = 0;
    
    // Kimlik doğrulama mesajı gönder
    if (this.token) {
      this.sendAuthMessage();
    }
    
    // Bağlantı dinleyicilerini çağır
    this.connectListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Connect listener hatası:', error);
      }
    });
  }

  /**
   * WebSocket bağlantısı kapandığında
   */
  handleClose(event) {
    console.log('WebSocket bağlantısı kapandı', event);
    this.isAuthenticated = false;
    
    // Normal kapanma mı?
    const isNormalClosure = event.code === 1000;
    
    // Bağlantı kesilme dinleyicilerini çağır
    this.disconnectListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Disconnect listener hatası:', error);
      }
    });
    
    // Normal kapanma değilse ve otomatik yeniden bağlanma etkinse yeniden bağlanmayı dene
    if (!isNormalClosure) {
      // Hata bildir
      const wsError = createWebSocketError(
        'WEBSOCKET_RECONNECT', 
        `WebSocket bağlantısı kesildi (Kod: ${event.code}). Yeniden bağlanmaya çalışılıyor.`
      );
      this.notifyErrorListeners(wsError);
      
      // Yeniden bağlanmayı dene
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket hatası oluştuğunda
   */
  handleError(error) {
    console.error('WebSocket hatası:', error);
    
    // Hata nesnesini normalize et
    const normalizedError = normalizeError({
      type: 'websocket',
      code: 'WEBSOCKET_CONNECTION',
      message: error.message || 'WebSocket bağlantı hatası'
    }, ErrorTypes.WEBSOCKET);
    
    // Hata dinleyicilerini çağır
    this.notifyErrorListeners(normalizedError);
  }

  /**
   * Hata dinleyicilerine bildir
   */
  notifyErrorListeners(error) {
    this.errorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error listener hatası:', e);
      }
    });
  }

  /**
   * WebSocket mesajı alındığında
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Mesaj tipine göre işlem yap
      switch (message.type) {
        case 'auth_success':
          this.isAuthenticated = true;
          console.log('WebSocket kimlik doğrulama başarılı');
          break;
        
        case 'auth_error':
          this.isAuthenticated = false;
          console.error('WebSocket kimlik doğrulama hatası:', message.error);
          
          // Kimlik doğrulama hatası bildir
          const authError = createWebSocketError(
            'WEBSOCKET_AUTH', 
            'WebSocket kimlik doğrulama hatası: ' + (message.error || '')
          );
          this.notifyErrorListeners(authError);
          break;
        
        case 'error':
          console.error('WebSocket sunucu hatası:', message.error);
          
          // Sunucu hatası bildir
          const serverError = createWebSocketError(
            'WEBSOCKET_SERVER_ERROR', 
            'Sunucu hatası: ' + (message.error || '')
          );
          this.notifyErrorListeners(serverError);
          break;
        
        case 'typing':
          // Yazıyor dinleyicilerini çağır
          this.typingListeners.forEach(callback => {
            try {
              callback(message.senderId, message.isTyping);
            } catch (error) {
              console.error('Typing listener hatası:', error);
            }
          });
          break;

        case 'notification':
          // Bildirim dinleyicilerini çağır
          this.notificationListeners.forEach(callback => {
            try {
              callback(message.notification);
            } catch (error) {
              console.error('Notification listener hatası:', error);
            }
          });
          break;
          
        default:
          // Genel mesaj dinleyicilerini çağır
          this.messageListeners.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Message listener hatası:', error);
            }
          });
          break;
      }
    } catch (error) {
      console.error('WebSocket mesajı işlenirken hata:', error);
      
      // Mesaj işleme hatası bildir
      const parseError = createWebSocketError(
        'WEBSOCKET_MESSAGE_PARSE', 
        'Mesaj işlenirken hata oluştu: ' + error.message
      );
      this.notifyErrorListeners(parseError);
    }
  }

  /**
   * Kimlik doğrulama mesajı gönder
   */
  sendAuthMessage() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'authentication',
          token: this.token
        }));
        console.log('Kimlik doğrulama mesajı gönderildi');
      } catch (error) {
        console.error('Kimlik doğrulama mesajı gönderilirken hata:', error);
        
        // Kimlik doğrulama mesajı gönderme hatası bildir
        const authError = createWebSocketError(
          'WEBSOCKET_AUTH', 
          'Kimlik doğrulama mesajı gönderilemedi: ' + error.message
        );
        this.notifyErrorListeners(authError);
      }
    } else {
      console.warn('WebSocket bağlantısı açık değil, kimlik doğrulama mesajı gönderilemedi');
      
      // WebSocket bağlantısı açık değilse hata bildir
      const connectionError = createWebSocketError(
        'WEBSOCKET_CONNECTION', 
        'WebSocket bağlantısı açık değil, kimlik doğrulama mesajı gönderilemedi'
      );
      this.notifyErrorListeners(connectionError);
    }
  }

  /**
   * Yeniden bağlanmayı planla
   */
  scheduleReconnect() {
    clearTimeout(this.reconnectTimeout);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`WebSocket ${this.reconnectAttempts + 1}. yeniden bağlanma denemesi ${delay}ms sonra`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.token, true);
      }, delay);
    } else {
      console.error(`Maksimum yeniden bağlanma denemesi (${this.maxReconnectAttempts}) aşıldı`);
      
      // Maksimum yeniden bağlanma denemesi aşıldığında hata bildir
      const maxRetriesError = createWebSocketError(
        'WEBSOCKET_MAX_RETRIES', 
        `Maksimum yeniden bağlanma denemesi (${this.maxReconnectAttempts}) aşıldı`
      );
      this.notifyErrorListeners(maxRetriesError);
    }
  }

  /**
   * Mesaj gönder
   * @param {Object} message - Gönderilecek mesaj
   * @returns {boolean} - Mesajın gönderilip gönderilmediği
   */
  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Mesaj gönderilirken hata:', error);
        
        // Mesaj gönderme hatası bildir
        const messageError = createWebSocketError(
          'WEBSOCKET_MESSAGE', 
          'Mesaj gönderilemedi: ' + error.message
        );
        this.notifyErrorListeners(messageError);
        return false;
      }
    }
    
    console.warn('WebSocket bağlantısı açık değil, mesaj gönderilemedi');
    
    // WebSocket bağlantısı açık değilse hata bildir
    const connectionError = createWebSocketError(
      'WEBSOCKET_CONNECTION', 
      'WebSocket bağlantısı açık değil, mesaj gönderilemedi'
    );
    this.notifyErrorListeners(connectionError);
    return false;
  }

  /**
   * Yazıyor durumu gönder
   * @param {string} receiverId - Alıcı kullanıcı ID'si
   * @param {boolean} isTyping - Yazıyor durumu
   * @returns {boolean} - Mesajın gönderilip gönderilmediği
   */
  sendTypingStatus(receiverId, isTyping) {
    return this.sendMessage({
      type: 'typing',
      receiverId,
      isTyping
    });
  }

  /**
   * WebSocket bağlantısını kapat
   */
  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error('WebSocket kapatılırken hata:', error);
      }
      this.ws = null;
    }
    clearTimeout(this.reconnectTimeout);
    this.isAuthenticated = false;
  }

  /**
   * WebSocket durumunu getir
   */
  getStatus() {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * WebSocket nesnesini getir
   */
  getWebSocket() {
    return this.ws;
  }

  /**
   * Mesaj dinleyicisi ekle
   * @param {Function} callback - Mesaj geldiğinde çağrılacak fonksiyon
   */
  addMessageListener(callback) {
    this.messageListeners.push(callback);
  }

  /**
   * Yazıyor durumu dinleyicisi ekle
   * @param {Function} callback - Yazıyor durumu değiştiğinde çağrılacak fonksiyon 
   */
  addTypingListener(callback) {
    this.typingListeners.push(callback);
  }

  /**
   * Bağlantı dinleyicisi ekle
   * @param {Function} callback - Bağlantı kurulduğunda çağrılacak fonksiyon
   */
  addConnectListener(callback) {
    this.connectListeners.push(callback);
  }

  /**
   * Bağlantı kesilme dinleyicisi ekle
   * @param {Function} callback - Bağlantı kesildiğinde çağrılacak fonksiyon
   */
  addDisconnectListener(callback) {
    this.disconnectListeners.push(callback);
  }

  /**
   * Hata dinleyicisi ekle
   * @param {Function} callback - Hata oluştuğunda çağrılacak fonksiyon
   */
  addErrorListener(callback) {
    this.errorListeners.push(callback);
  }

  /**
   * Bildirim dinleyicisi ekle
   * @param {Function} callback - Bildirim geldiğinde çağrılacak fonksiyon
   */
  addNotificationListener(callback) {
    this.notificationListeners.push(callback);
  }

  /**
   * Dinleyiciyi kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   * @param {Array} listenerArray - Dinleyici dizisi
   */
  removeListener(callback, listenerArray) {
    const index = listenerArray.indexOf(callback);
    if (index !== -1) {
      listenerArray.splice(index, 1);
    }
  }

  /**
   * Mesaj dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   */
  removeMessageListener(callback) {
    this.removeListener(callback, this.messageListeners);
  }

  /**
   * Yazıyor durumu dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   */
  removeTypingListener(callback) {
    this.removeListener(callback, this.typingListeners);
  }

  /**
   * Bağlantı dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   */
  removeConnectListener(callback) {
    this.removeListener(callback, this.connectListeners);
  }

  /**
   * Bağlantı kesilme dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   */
  removeDisconnectListener(callback) {
    this.removeListener(callback, this.disconnectListeners);
  }

  /**
   * Hata dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici 
   */
  removeErrorListener(callback) {
    this.removeListener(callback, this.errorListeners);
  }

  /**
   * Bildirim dinleyicisini kaldır
   * @param {Function} callback - Kaldırılacak dinleyici
   */
  removeNotificationListener(callback) {
    this.removeListener(callback, this.notificationListeners);
  }

  /**
   * Takip isteği bildirimi gönder
   * @param {string} userId - Takip edilecek kullanıcı ID'si
   * @returns {boolean} - Mesajın gönderilip gönderilmediği
   */
  sendFollowRequest(userId) {
    return this.sendMessage({
      type: 'follow_request',
      userId
    });
  }

  /**
   * Takip isteği iptal bildirimi gönder
   * @param {string} userId - Takip isteği iptal edilecek kullanıcı ID'si
   * @returns {boolean} - Mesajın gönderilip gönderilmediği
   */
  sendCancelFollowRequest(userId) {
    return this.sendMessage({
      type: 'cancel_follow_request',
      userId
    });
  }
}

// Singleton instance oluştur
const websocketService = new WebSocketService();

export default websocketService; 