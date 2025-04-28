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
      // Beğeni ikonunu turkuaz yapalım
      return <Heart className="h-5 w-5 text-[#0affd9]" />;
    case NOTIFICATION_TYPES.COMMENT:
      // Yorum ikonunu turkuaz yapalım
      return <MessageSquare className="h-5 w-5 text-[#0affd9]" />;
    case NOTIFICATION_TYPES.FOLLOW:
    case NOTIFICATION_TYPES.FOLLOW_REQUEST:
      // Takip ikonunu turkuaz yapalım
      return <UserPlus className="h-5 w-5 text-[#0affd9]" />;
    default:
      // Sistem ikonunu turkuaz yapalım
      return <AlertCircle className="h-5 w-5 text-[#0affd9]" />;
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
      className={`relative p-4 mb-3 rounded-xl transition-all duration-200 group hover:scale-[1.01] hover:bg-[#0affd9]/5 dark:hover:bg-[#0affd9]/10 border border-transparent hover:border-[#0affd9]/20 ${
        notification.is_read 
          ? 'bg-black/30 dark:bg-black/50' // Okunmuş arka plan
          : 'bg-black/60 dark:bg-black/70 shadow-sm dark:shadow-gray-900/20 border-l-4 border-[#0affd9]' // Okunmamış arka plan ve vurgu
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* İkon Arka Planı */}
        <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-br from-black/50 to-black/70 dark:from-gray-800 dark:to-gray-900 shadow-inner border border-[#0affd9]/10">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 dark:text-white">
            {notification.content}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center">
            {format(notification.created_at)}
            {notification.reference_id && (
              <ChevronRight className="h-3 w-3 ml-1 inline text-[#0affd9]/70" />
            )}
          </p>
        </div>
        {!notification.is_read && (
          <button
            onClick={() => onMarkAsRead(notification.id)}
            // Okundu işaretle butonu stili
            className="ml-2 inline-flex items-center justify-center p-1.5 rounded-full bg-[#0affd9]/10 hover:bg-[#0affd9]/20 dark:bg-[#0affd9]/10 dark:hover:bg-[#0affd9]/20 transition-colors duration-200"
            aria-label="Okundu olarak işaretle"
          >
            <Check className="h-3.5 w-3.5 text-[#0affd9]" />
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
            // Arka plan stili
            className="fixed inset-0 bg-black/70 dark:bg-black/80 z-40 backdrop-blur-md"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Bildirim paneli */}
          <motion.div
            ref={panelRef}
            // Panel stili
            className="fixed left-0 top-0 h-full w-full sm:w-96 md:w-[420px] bg-black/80 dark:bg-black/90 shadow-2xl z-50 overflow-hidden rounded-r-2xl border-r border-[#0affd9]/20"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header stili */}
            <div className="sticky top-0 z-10 bg-black/95 dark:bg-black/95 backdrop-blur-sm">
              <div className="p-4 border-b border-[#0affd9]/20 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <Bell className="h-5 w-5 mr-2 text-[#0affd9]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-[#0affd9] text-black text-xs rounded-full font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-semibold text-white">Bildirimler</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleMarkAllAsRead}
                    // Tümünü Okundu İşaretle butonu stili
                    className="text-sm text-[#0affd9]/80 hover:text-[#0affd9] dark:text-[#0affd9]/70 dark:hover:text-[#0affd9] transition-colors"
                  >
                    Tümünü Okundu İşaretle
                  </button>
                  <button
                    onClick={onClose}
                    // Kapat butonu stili
                    className="p-1 rounded-full hover:bg-[#0affd9]/10 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Kapat"
                  >
                    <X className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Kategori filtreleri */}
              <div className="flex overflow-x-auto p-2 border-b border-[#0affd9]/20 no-scrollbar">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    // Kategori butonu stilleri
                    className={`px-3 py-1.5 mr-2 text-sm rounded-full whitespace-nowrap transition-all duration-200 ${
                      activeCategory === category.id
                        ? 'bg-[#0affd9] text-black shadow-sm shadow-[#0affd9]/30 font-medium' // Aktif kategori stili
                        : 'bg-black/50 dark:bg-black/70 text-gray-300 dark:text-gray-400 hover:bg-black/70 dark:hover:bg-gray-700' // Pasif kategori stili
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
              {loading ? (
                // Yükleme animasyonu stili
                <div className="flex flex-col items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0affd9]"></div>
                  <p className="text-gray-400 dark:text-gray-500 mt-3 text-sm">Bildirimler yükleniyor...</p>
                </div>
              ) : error ? (
                // Hata mesajı kutusu stili
                <div className="text-center p-6 rounded-lg bg-red-900/20 dark:bg-red-900/30 border border-red-600/30 my-4">
                  <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-300 dark:text-red-400">{error}</p>
                  <button 
                    className="mt-3 px-3 py-1 bg-red-800/30 dark:bg-red-800/40 text-red-300 dark:text-red-400 text-sm rounded-md hover:bg-red-700/40 dark:hover:bg-red-800/60 transition-colors"
                    onClick={() => window.location.reload()} // Fetch tekrar denemek daha iyi olabilir
                  >
                    Yenile
                  </button>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <AnimatePresence>
                  {filteredNotifications.map(notification => (
                    <NotificationItem 
                      key={notification.id} 
                      notification={notification} 
                      onMarkAsRead={markNotificationRead} 
                    />
                  ))}
                </AnimatePresence>
              ) : (
                // Bildirim yok mesajı stili
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <BellOff className="h-10 w-10 text-gray-600 dark:text-gray-700 mb-3" />
                  <p className="text-gray-500 dark:text-gray-600 text-sm">Henüz bildirim yok.</p>
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