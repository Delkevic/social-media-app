// notification-service.js - Bildirim yönetimi servisi
import api from './api';
import websocketService from './websocket-service';

// Bildirim türleri
export const NotificationType = {
  FOLLOW: 'follow',       // Takip edilme
  LIKE: 'like',           // Gönderi beğenilme
  COMMENT: 'comment',     // Gönderi yorum yapılma
  MENTION: 'mention',     // Yorumda veya gönderide bahsedilme
  REPLY: 'reply',         // Yoruma yanıt
  FOLLOW_REQUEST: 'follow_request', // Takip isteği
  FOLLOW_ACCEPT: 'follow_accept',   // Takip isteği kabul edilme
  MESSAGE: 'message',     // Yeni mesaj
  SYSTEM: 'system'        // Sistem bildirimi
};

// Okunan bildirimleri takip etmek için localStorage kullanıyoruz
const LAST_READ_KEY = 'last_notification_read';

/**
 * Son okunan bildirim zamanını al
 * @returns {number} - Son okunan bildirim zaman damgası
 */
const getLastReadTimestamp = () => {
  const timestamp = localStorage.getItem(LAST_READ_KEY);
  return timestamp ? parseInt(timestamp, 10) : 0;
};

/**
 * Son okunan bildirim zamanını kaydet
 * @param {number} timestamp - Zaman damgası
 */
const saveLastReadTimestamp = (timestamp) => {
  localStorage.setItem(LAST_READ_KEY, timestamp.toString());
};

/**
 * Tüm bildirimleri getir
 * @returns {Promise<Array>} - Bildirimler dizisi
 */
export const getNotifications = async () => {
  try {
    const response = await api.notifications.getAll();
    if (response && response.success) {
      // Backend response.data.notifications içinde bildirimleri dönüyor
      return response.data?.notifications || [];
    }
    
    console.warn('Bildirim yanıtı başarısız:', response);
    return []; // Başarısız yanıt için boş dizi dön
  } catch (error) {
    console.error('Bildirimler alınırken hata:', error);
    return []; // Hata durumunda boş dizi dön
  }
};

/**
 * Okunmamış bildirim sayısını getir
 * @returns {Promise<number>} - Okunmamış bildirim sayısı
 */
export const getUnreadCount = async () => {
  try {
    const notifications = await getNotifications();
    
    // Bildirimler null veya undefined ise boş dizi kullan
    if (!notifications || !Array.isArray(notifications)) {
      console.warn('Bildirimler bir dizi değil veya null:', notifications);
      return 0;
    }
    
    const lastReadTime = getLastReadTimestamp();
    
    // Zaman damgasını karşılaştırarak okunmamış bildirimleri say
    const unreadCount = notifications.filter(notification => {
      if (!notification.createdAt) return false;
      
      const notifTime = new Date(notification.createdAt).getTime();
      return notifTime > lastReadTime;
    }).length;
    
    return unreadCount;
  } catch (error) {
    console.error('Okunmamış bildirim sayısı alınırken hata:', error);
    return 0;
  }
};

/**
 * Bildirimi okundu olarak işaretle
 * @param {string} notificationId - Bildirim ID'si
 * @returns {Promise<boolean>} - İşlem başarılı mı?
 */
export const markAsRead = async (notificationId) => {
  try {
    const response = await api.notifications.markAsRead(notificationId);
    return response.success;
  } catch (error) {
    console.error('Bildirim okundu olarak işaretlenirken hata:', error);
    return false;
  }
};

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export const markAllAsRead = () => {
  saveLastReadTimestamp(Date.now());
};

/**
 * Bildirimleri canlı dinlemek için ayarla
 * @param {Function} onNotification - Yeni bildirim geldiğinde çağrılacak fonksiyon
 * @returns {Function} - Dinleyiciyi kaldırmak için fonksiyon
 */
export const listenForNotifications = (onNotification) => {
  // WebSocket dinleyicisini ekle
  websocketService.addNotificationListener(onNotification);
  
  // Dinleyiciyi kaldıran fonksiyonu döndür
  return () => {
    websocketService.removeNotificationListener(onNotification);
  };
};

/**
 * Bildirim içeriğini oluştur
 * @param {Object} notification - Bildirim objesi
 * @returns {string} - Bildirim metni
 */
export const createNotificationContent = (notification) => {
  const { type, actorName, entityType } = notification;
  
  switch (type) {
    case NotificationType.FOLLOW:
      return `${actorName} seni takip etmeye başladı.`;
    
    case NotificationType.LIKE:
      if (entityType === 'post') {
        return `${actorName} gönderini beğendi.`;
      } else if (entityType === 'comment') {
        return `${actorName} yorumunu beğendi.`;
      }
      return `${actorName} içeriğini beğendi.`;
    
    case NotificationType.COMMENT:
      return `${actorName} gönderine yorum yaptı.`;
    
    case NotificationType.REPLY:
      return `${actorName} yorumuna yanıt verdi.`;
    
    case NotificationType.MENTION:
      if (entityType === 'post') {
        return `${actorName} bir gönderide senden bahsetti.`;
      } else if (entityType === 'comment') {
        return `${actorName} bir yorumda senden bahsetti.`;
      }
      return `${actorName} senden bahsetti.`;
    
    case NotificationType.FOLLOW_REQUEST:
      return `${actorName} seni takip etmek istiyor.`;
    
    case NotificationType.FOLLOW_ACCEPT:
      return `${actorName} takip isteğini kabul etti.`;
    
    case NotificationType.MESSAGE:
      return `${actorName} sana mesaj gönderdi.`;
    
    case NotificationType.SYSTEM:
      return notification.content || 'Sistem bildirimi';
    
    default:
      return notification.content || 'Yeni bildirim';
  }
};

/**
 * Bildirim ikonunu belirle
 * @param {Object} notification - Bildirim objesi
 * @returns {string} - İkon adı
 */
export const getNotificationIcon = (notification) => {
  const { type } = notification;
  
  switch (type) {
    case NotificationType.FOLLOW:
    case NotificationType.FOLLOW_REQUEST:
    case NotificationType.FOLLOW_ACCEPT:
      return 'user-plus';
    
    case NotificationType.LIKE:
      return 'heart';
    
    case NotificationType.COMMENT:
    case NotificationType.REPLY:
      return 'message-square';
    
    case NotificationType.MENTION:
      return 'at-sign';
    
    case NotificationType.MESSAGE:
      return 'mail';
    
    case NotificationType.SYSTEM:
      return 'bell';
    
    default:
      return 'bell';
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  listenForNotifications,
  createNotificationContent,
  getNotificationIcon
}; 