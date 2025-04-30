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
 * @param {number} limit - İstenilen bildirim sayısı sınırı
 * @returns {Promise<Array>} - Bildirimler dizisi
 */
export const getNotifications = async (limit) => {
  try {
    let response;
    
    if (limit) {
      response = await api.notifications.getLimit(limit);
    } else {
      response = await api.notifications.getAll();
    }
    
    console.log("API Bildirimleri ham yanıt:", response);
    
    if (response && response.success) {
      // Backend'in yanıt yapısını kontrol et ve bildirim dizisini çıkart
      let notifications = [];
      
      // Olası yanıt yapıları:
      // 1. response.data.notifications - Array
      // 2. response.data - Array
      // 3. response.data - Object with notifications property
      
      if (response.data && response.data.notifications && Array.isArray(response.data.notifications)) {
        console.log("notifications dizisi yapısı bulundu: response.data.notifications");
        notifications = response.data.notifications;
      } else if (response.data && Array.isArray(response.data)) {
        console.log("notifications dizisi yapısı bulundu: response.data (array)");
        notifications = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Nesne içinde alanları kontrol et
        const possibleArrays = Object.values(response.data).filter(value => Array.isArray(value));
        if (possibleArrays.length > 0) {
          console.log("notifications dizisi yapısı bulundu: response.data içindeki ilk dizi");
          notifications = possibleArrays[0];
        }
      }
      
      // Final kontrol
      if (!Array.isArray(notifications)) {
        console.warn("Bildirimler bir dizi değil:", notifications);
        return [];
      }
      
      // API yanıtındaki alan adlarını frontend'in beklediği alan adlarına dönüştür
      const normalizedNotifications = notifications.map(notification => {
        // Alanlar için null korumalı dönüşüm yap
        return {
          id: notification.id,
          type: notification.type || 'system',
          content: notification.content,
          createdAt: notification.createdAt || notification.created_at,
          isRead: notification.isRead || notification.is_read || false,
          referenceId: notification.referenceId || notification.reference_id || 0,
          time: notification.time || formatTimeAgo(notification.createdAt || notification.created_at),
          // Ekstra alanlar
          userId: notification.userId || notification.user_id,
          senderId: notification.senderId || notification.sender_id,
          actorId: notification.actorId || notification.actor_id,
          actorName: notification.actorName || notification.actor_name,
          actorUsername: notification.actorUsername || notification.actor_username,
          actorProfileImage: notification.actorProfileImage || notification.actor_profile_image,
        };
      });
      
      console.log("İşlenmiş bildirimler (toplam " + normalizedNotifications.length + "):", normalizedNotifications);
      return normalizedNotifications;
    }
    
    console.warn('Bildirim yanıtı başarısız:', response);
    return []; // Başarısız yanıt için boş dizi dön
  } catch (error) {
    console.error('Bildirimler alınırken hata:', error);
    return []; // Hata durumunda boş dizi dön
  }
};

// Zaman farkını formatla
const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return 'Az önce';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dakika önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} saat önce`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} gün önce`;
  
  // Tarih formatı: DD.MM.YYYY
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
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
 * @returns {Promise<boolean>} - İşlem başarılı mı?
 */
export const markAllAsRead = async () => {
  try {
    // Backend API'si ile bildirimleri okundu olarak işaretle
    const response = await api.notifications.markAllAsRead();
    
    if (response && response.success) {
      // Yerel olarak son okuma zamanını güncelle
      saveLastReadTimestamp(Date.now());
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Bildirimleri okundu olarak işaretlerken hata:', error);
    return false;
  }
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