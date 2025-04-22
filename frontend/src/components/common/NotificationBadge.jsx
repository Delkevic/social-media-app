import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import * as notificationService from '../../services/notification-service';
import NotificationList from './NotificationList';

const NotificationBadge = ({ hidePanel = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Bildirim sayısını yükle
  useEffect(() => {
    fetchUnreadCount();
    
    // Periyodik olarak bildirim sayısını güncelle
    const intervalId = setInterval(fetchUnreadCount, 60000); // Her dakika
    
    // WebSocket üzerinden gelen bildirimleri dinle
    const handleNewNotification = () => {
      // Yeni bildirim geldiğinde sayıyı artır
      setUnreadCount(prevCount => prevCount + 1);
    };
    
    // Bildirim dinleyicisi ekle
    const unsubscribe = notificationService.listenForNotifications(handleNewNotification);
    
    // Bileşen kaldırıldığında temizle
    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, []);
  
  // Bildirim sayısını getir
  const fetchUnreadCount = async () => {
    setLoading(true);
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Bildirim sayısı alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Bildirimleri göster/gizle
  const toggleNotifications = (e) => {
    // Hızlı erişim menüsünde özel bir davranış istenmişse, paneli gösterme
    if (hidePanel) {
      // Etkileşimi durdur, çünkü bu durumda paneli NavigationLinks'de göstereceğiz
      e.stopPropagation();
      return;
    }
    
    setIsOpen(prevState => !prevState);
    
    // Bildirimleri açarken sayacı sıfırla
    if (!isOpen) {
      setUnreadCount(0);
      notificationService.markAllAsRead();
    }
  };
  
  // Bildirimleri kapat
  const closeNotifications = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        onClick={toggleNotifications}
        aria-label="Bildirimleri göster"
      >
        <Bell size={20} className="text-gray-300" />
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {!hidePanel && <NotificationList isOpen={isOpen} onClose={closeNotifications} />}
    </div>
  );
};

export default NotificationBadge; 