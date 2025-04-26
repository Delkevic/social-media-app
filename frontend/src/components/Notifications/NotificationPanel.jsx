import React, { Fragment, useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'timeago.js';
import { Bell, Check, X, Heart, MessageSquare, UserPlus, AlertCircle, ChevronRight, Filter, BellOff } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

// Bildirim kategorileri
const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  FOLLOW_REQUEST: 'follow_request',
  SYSTEM: 'system'
};

const CATEGORIES = [
  { id: 'all', label: 'Tümü' },
  { id: 'follow', label: 'Takip', types: ['follow', 'follow_request'] },
  { id: 'like', label: 'Beğeni', types: ['like'] },
  { id: 'comment', label: 'Yorum', types: ['comment'] },
  { id: 'other', label: 'Diğer', types: ['system'] }
];

// Icon türleri
const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.LIKE:
      return <Heart className="h-5 w-5 text-red-500" />;
    case NOTIFICATION_TYPES.COMMENT:
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case NOTIFICATION_TYPES.FOLLOW:
      return <UserPlus className="h-5 w-5 text-green-500" />;
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      return <UserPlus className="h-5 w-5 text-purple-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  }
};

// Tekil bildirim komponenti
const NotificationItem = ({ notification, onMarkAsRead }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className={`relative p-4 mb-3 rounded-xl transition-all duration-200 group hover:scale-[1.01] ${
        notification.is_read 
          ? 'bg-gray-100 dark:bg-gray-800/60' 
          : 'bg-white dark:bg-gray-700/90 shadow-sm dark:shadow-gray-900/20 border-l-4 border-blue-500'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-sm">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {notification.content}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
            {format(notification.created_at)}
            {notification.reference_id && (
              <ChevronRight className="h-3 w-3 ml-1 inline" />
            )}
          </p>
        </div>
        {!notification.is_read && (
          <button
            onClick={() => onMarkAsRead(notification.id)}
            className="ml-2 inline-flex items-center justify-center p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 transition-colors duration-200"
            aria-label="Okundu olarak işaretle"
          >
            <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const NotificationPanel = ({ isOpen, onClose }) => {
  const panelRef = useRef(null);
  const { notifications, loading, error, markNotificationRead, markAllNotificationsRead } = useNotification();
  const [activeCategory, setActiveCategory] = useState('all');

  // Bildirimleri filtrele
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    if (activeCategory === 'all') {
      return notifications;
    }
    
    const selectedCategory = CATEGORIES.find(cat => cat.id === activeCategory);
    if (!selectedCategory || !selectedCategory.types) return [];
    
    return notifications.filter(notification => 
      selectedCategory.types.includes(notification.type)
    );
  }, [notifications, activeCategory]);

  // Okunmamış bildirimlerin sayısı
  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Panel animasyonu
  const panelVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: 'spring', 
        stiffness: 350, 
        damping: 30,
        mass: 1
      } 
    },
    exit: { 
      x: '-100%', 
      opacity: 0,
      transition: { 
        duration: 0.25,
        ease: [0.32, 0.72, 0.35, 0.94] // Cubic bezier curve for smooth exit
      } 
    }
  };

  // Arka plan animasyonu
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15, delay: 0.1 } }
  };
  
  const handleMarkAllAsRead = () => {
    markAllNotificationsRead();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Karartma arka planı */}
          <motion.div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Bildirim paneli */}
          <motion.div
            ref={panelRef}
            className="fixed left-0 top-0 h-full w-full sm:w-96 md:w-[420px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden rounded-r-2xl"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <Bell className="h-5 w-5 mr-2 text-blue-500" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold dark:text-white">Bildirimler</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Tümünü Okundu İşaretle
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Kapat"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* Kategori filtreleri */}
              <div className="flex overflow-x-auto p-2 border-b border-gray-200 dark:border-gray-800 no-scrollbar">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-3 py-1.5 mr-2 text-sm rounded-full whitespace-nowrap transition-all duration-200 ${
                      activeCategory === category.id
                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">Bildirimler yükleniyor...</p>
                </div>
              ) : error ? (
                <div className="text-center p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 my-4">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button 
                    className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-800/30 text-red-600 dark:text-red-400 text-sm rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                    onClick={() => window.location.reload()}
                  >
                    Yenile
                  </button>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <AnimatePresence>
                  <div className="space-y-1">
                    {filteredNotifications.map(notification => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markNotificationRead}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                  <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                    <BellOff className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">
                    {activeCategory === 'all' 
                      ? 'Henüz bildiriminiz yok' 
                      : 'Bu kategoride bildirim bulunamadı'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                    {activeCategory === 'all' 
                      ? 'Yeni bildirimler aldığınızda burada görünecekler.' 
                      : 'Farklı bir kategori seçmeyi deneyin.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel; 