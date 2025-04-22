import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Loader, ArrowLeft } from 'lucide-react';
import NotificationItem from '../common/NotificationItem';
import * as notificationService from '../../services/notification-service';

const NotificationSlidePanel = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Bildirimleri yükle
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Bildirimler paneli açıldığında tüm bildirimleri okundu olarak işaretle
      notificationService.markAllAsRead();
    }
  }, [isOpen]);
  
  // WebSocket üzerinden gelen bildirimleri dinle
  useEffect(() => {
    // Yeni bildirim geldiğinde çağrılacak fonksiyon
    const handleNewNotification = (notification) => {
      // Yeni bildirimi liste başına ekle
      setNotifications(prevNotifications => 
        [notification, ...prevNotifications]
      );
    };
    
    // Bildirim dinleyicisi ekle
    const unsubscribe = notificationService.listenForNotifications(handleNewNotification);
    
    // Bileşen kaldırıldığında dinleyiciyi temizle
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Bildirimleri getir
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Bildirimler alınamadı:', err);
      setError('Bildirimler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId) => {
    try {
      const success = await notificationService.markAsRead(notificationId);
      
      if (success) {
        // Bildirim durumunu güncelle
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true } 
              : notification
          )
        );
      }
    } catch (err) {
      console.error('Bildirim okundu olarak işaretlenemedi:', err);
    }
  };
  
  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = () => {
    notificationService.markAllAsRead();
    
    // Tüm bildirimleri okundu olarak güncelle
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({
        ...notification, 
        isRead: true
      }))
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Arka plan overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000]"
            onClick={onClose}
          />
          
          {/* Yan panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full md:w-96 bg-gray-900 z-[1001] flex flex-col"
          >
            {/* Panel başlığı */}
            <div className="p-4 border-b border-gray-700/80 bg-gray-800/90 flex items-center justify-between sticky top-0">
              <div className="flex items-center">
                <button 
                  onClick={onClose}
                  className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft size={20} className="text-gray-300" />
                </button>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Bell size={20} className="mr-2" />
                  Bildirimler
                </h2>
              </div>
              
              <button 
                className="p-2 rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                onClick={markAllAsRead}
                aria-label="Tümünü okundu olarak işaretle"
                title="Tümünü okundu olarak işaretle"
              >
                <Check size={20} />
              </button>
            </div>
            
            {/* Panel içeriği */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center p-10">
                  <Loader size={30} className="text-blue-500 animate-spin" />
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <p className="text-red-400 mb-4">{error}</p>
                  <button 
                    onClick={fetchNotifications}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 h-full">
                  <Bell size={40} className="text-gray-500 mb-4" />
                  <p className="text-gray-400 text-lg">Henüz bildiriminiz yok</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map(notification => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification}
                      onMarkAsRead={markAsRead} 
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationSlidePanel; 