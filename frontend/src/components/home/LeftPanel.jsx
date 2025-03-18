import React, { useState, useEffect } from 'react';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import NotificationList from './notifications/NotificationList';
import MessageList from './messages/MessageList';
import NavigationLinks from './navigation/NavigationLinks';
import api from '../../services/api';

const LeftPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Aktif sekmeye göre veri yükle
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (activeTab === 'notifications') {
          const response = await api.notifications.getAll();
          setNotifications(response.data.notifications || []);
        } else if (activeTab === 'messages') {
          const response = await api.messages.getConversations();
          setMessages(response.data.conversations || []);
        }
      } catch (err) {
        setError(`${activeTab === 'notifications' ? 'Bildirimler' : 'Mesajlar'} yüklenirken bir hata oluştu: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab]);

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      // Optimistik güncelleme
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // API çağrısı
      await api.notifications.markAsRead(notificationId);
    } catch (err) {
      // Hata durumunda geri al
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: false } 
            : notification
        )
      );
      
      setError('Bildirim işaretlenirken bir hata oluştu: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bildirimler ve Mesajlar Paneli */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div 
          className="rounded-2xl overflow-hidden backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          {/* Tab Başlıkları */}
          <div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === 'notifications' 
                  ? 'border-b-2' 
                  : 'opacity-70'
              }`}
              style={{ 
                borderColor: activeTab === 'notifications' ? '#3b82f6' : 'transparent',
                color: 'white' 
              }}
              onClick={() => setActiveTab('notifications')}
            >
              Bildirimler
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span 
                  className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full"
                  style={{ backgroundColor: '#3b82f6', color: 'white' }}
                >
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                activeTab === 'messages' 
                  ? 'border-b-2' 
                  : 'opacity-70'
              }`}
              style={{ 
                borderColor: activeTab === 'messages' ? '#3b82f6' : 'transparent',
                color: 'white' 
              }}
              onClick={() => setActiveTab('messages')}
            >
              Mesajlar
              {messages.filter(m => m.unread).length > 0 && (
                <span 
                  className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full"
                  style={{ backgroundColor: '#3b82f6', color: 'white' }}
                >
                  {messages.filter(m => m.unread).length}
                </span>
              )}
            </button>
          </div>
          
          {/* Hata mesajı */}
          {error && (
            <div 
              className="p-3 m-4 rounded-lg text-sm border text-center"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderColor: '#ef4444',
              }}
            >
              {error}
            </div>
          )}
          
          {/* Tab İçeriği */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 rounded-full border-blue-500 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {activeTab === 'notifications' && (
                  <NotificationList 
                    notifications={notifications}
                    onMarkAsRead={handleMarkNotificationAsRead}
                  />
                )}
                
                {activeTab === 'messages' && (
                  <MessageList messages={messages} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Hızlı Erişim Bölümü - NavigationLinks */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <NavigationLinks />
      </div>
    </div>
  );
};

export default LeftPanel;