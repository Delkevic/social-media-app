import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import notificationService from '../services/notification-service';
import { toast } from 'react-hot-toast';

// 1. Context Oluşturma
const NotificationContext = createContext();

// 2. Provider Bileşeni
export const NotificationProvider = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastNotification, setLastNotification] = useState(null); // Son bildirimi izlemek için

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
      console.log("Bildirimler alınıyor...");
      const fetchedNotifications = await notificationService.getNotifications(); // Servis fonksiyonunu çağır
      console.log("Alınan bildirimler:", fetchedNotifications);
      
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

  // WebSocket'ten gelen yeni bildirim geldiğinde gösterilecek toast bildirimi
  const showNotificationToast = useCallback((notification) => {
    if (!notification) return;
    
    // Toast bildirimi göster
    toast.custom((t) => (
      <div 
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-black shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {notification.actorProfileImage ? (
                <img 
                  className="h-10 w-10 rounded-full" 
                  src={notification.actorProfileImage} 
                  alt={notification.actorName || "Profil"} 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#0affd9] flex items-center justify-center">
                  <span className="text-black font-bold">
                    {(notification.actorName || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {notification.content}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Şimdi
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-700">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              setIsPanelOpen(true);
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-[#0affd9] hover:text-[#0affd9]/70 focus:outline-none"
          >
            Göster
          </button>
        </div>
      </div>
    ), {
      duration: 5000, // 5 saniye göster
      position: 'top-right',
    });
  }, []);

  // Bildirimleri normalleştirme fonksiyonu
  const normalizeNotification = useCallback((notification) => {
    return {
      id: notification.id,
      type: notification.type || 'system',
      content: notification.content,
      createdAt: notification.createdAt || notification.created_at || new Date().toISOString(),
      isRead: notification.isRead || notification.is_read || false,
      referenceId: notification.referenceId || notification.reference_id || 0,
      time: notification.time || 'Şimdi',
      // Ekstra alanlar
      userId: notification.userId || notification.user_id,
      senderId: notification.senderId || notification.sender_id,
      actorId: notification.actorId || notification.actor_id,
      actorName: notification.actorName || notification.actor_name,
      actorUsername: notification.actorUsername || notification.actor_username,
      actorProfileImage: notification.actorProfileImage || notification.actor_profile_image,
    };
  }, []);

  // Component mount olduğunda ve WebSocket bağlantısı kurulduğunda bildirimleri çek
  useEffect(() => {
    console.log("NotificationContext yükleniyor, bildirimleri çekiyor...");
    fetchNotifications();

    // WebSocket'ten gelen yeni bildirimleri dinle
    const removeListener = notificationService.listenForNotifications((newNotification) => {
      console.log('YENİ BİLDİRİM ALINDI (WebSocket):', newNotification);
      
      // Bildirimi normalleştir
      const normalizedNotification = normalizeNotification(newNotification);
      
      // Son bildirimi kaydet
      setLastNotification(normalizedNotification);
      
      // Yeni bildirimi listenin başına ekle ve okunmamış sayısını artır
      setNotifications(prev => {
        // Eğer bildirim zaten varsa ekleme (id kontrolü)
        if (prev.some(n => n.id === normalizedNotification.id)) {
          console.log("Bu bildirim zaten listede var, tekrar eklenmedi:", normalizedNotification.id);
          return prev;
        }
        return [normalizedNotification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
      
      // Toast bildirimi göster
      showNotificationToast(normalizedNotification);
    });

    // Cleanup: Component unmount olduğunda listener'ı kaldır
    return () => {
      console.log("NotificationContext temizleniyor, dinleyiciler kaldırılıyor...");
      removeListener();
    };
  }, [fetchNotifications, showNotificationToast, normalizeNotification]); // dependency array'e normalizeNotification'ı da ekle

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
    lastNotification, // Son bildirimi de paylaş
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