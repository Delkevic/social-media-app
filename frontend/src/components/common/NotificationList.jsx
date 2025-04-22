import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Loader } from 'lucide-react';
import NotificationItem from './NotificationItem';
import * as notificationService from '../../services/notification-service';

const NotificationList = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Bildirimleri yükle
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
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
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full right-0 mt-2 w-80 bg-gray-900 rounded-lg shadow-lg overflow-hidden z-[1000]"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          <div className="p-3 border-b border-gray-700/50 bg-gray-800 flex items-center justify-between">
            <h3 className="text-white font-medium flex items-center">
              <Bell size={16} className="mr-2" />
              Bildirimler
            </h3>
            
            <div className="flex space-x-2">
              <button 
                className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                onClick={markAllAsRead}
                aria-label="Tümünü okundu olarak işaretle"
                title="Tümünü okundu olarak işaretle"
              >
                <Check size={16} />
              </button>
              
              <button 
                className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                onClick={onClose}
                aria-label="Kapat"
                title="Kapat"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader size={24} className="text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-400">
              <p>{error}</p>
              <button 
                onClick={fetchNotifications}
                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Tekrar Dene
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p>Henüz bildiriminiz yok</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 170px)' }}>
              {notifications.map(notification => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification}
                  onMarkAsRead={markAsRead} 
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationList; 