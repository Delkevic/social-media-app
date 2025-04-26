import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import notificationService from '../services/notification-service';

// 1. Context Oluşturma
const NotificationContext = createContext();

// 2. Provider Bileşeni
export const NotificationProvider = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    // Panel açıldığında bildirimleri çekebiliriz
    fetchNotifications(); 
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => {
      const nextState = !prev;
      if (nextState) { // Panel açılıyorsa
        fetchNotifications();
      }
      return nextState;
    });
  }, []);

  // Bildirimleri API'den çekme fonksiyonu
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await notificationService.getNotifications(); // Servis fonksiyonunu çağır
      setNotifications(fetchedNotifications);
      
      // Okunmamış sayısını hesapla (backend bunu ayrıca dönmüyorsa)
      const count = fetchedNotifications.filter(n => !n.isRead).length;
      setUnreadCount(count);
      
    } catch (err) {
      console.error("Bildirimler alınırken hata:", err);
      setError('Bildirimler yüklenemedi.');
      setNotifications([]); // Hata durumunda listeyi temizle
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tek bir bildirimi okundu olarak işaretle
  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      const success = await notificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        // Okunmamış sayısını azalt
        setUnreadCount(prev => (prev > 0 ? prev - 1 : 0));
      }
    } catch (err) {
      console.error(`Bildirim ${notificationId} okundu olarak işaretlenemedi:`, err);
    }
  }, []);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllNotificationsRead = useCallback(async () => {
    try {
      const success = await notificationService.markAllAsRead();
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Tüm bildirimler okundu olarak işaretlenemedi:', err);
    }
  }, []);

  // Component mount olduğunda ve WebSocket bağlantısı kurulduğunda bildirimleri çek
  useEffect(() => {
    fetchNotifications();

    // WebSocket'ten gelen yeni bildirimleri dinle
    const removeListener = notificationService.listenForNotifications((newNotification) => {
      console.log('Yeni bildirim alındı (WebSocket):', newNotification);
      // Yeni bildirimi listenin başına ekle ve okunmamış sayısını artır
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      // İsteğe bağlı: Yeni bildirim geldiğinde bir toast mesajı gösterilebilir
    });

    // Cleanup: Component unmount olduğunda listener'ı kaldır
    return () => {
      removeListener();
    };
  }, [fetchNotifications]); // fetchNotifications'ı dependency array'e ekle

  const value = {
    isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications, // Dışarıdan tetiklemek için export et
    markNotificationRead,
    markAllNotificationsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// 3. Custom Hook
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 