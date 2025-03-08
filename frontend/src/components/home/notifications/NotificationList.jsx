import React from 'react';

const NotificationList = ({ notifications, onMarkAsRead }) => {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
        Yeni bildiriminiz bulunmuyor.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onMarkAsRead }) => {
  // Bildirime tıklandığında okundu olarak işaretle
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    
    // Bildirimin türüne göre farklı sayfaya yönlendirme yapılabilir
    // örneğin:
    // if (notification.type === 'like' && notification.postId) {
    //   navigate(`/post/${notification.postId}`);
    // }
  };

  // Bildirim türüne göre ikon belirle
  const getIcon = (type) => {
    switch (type) {
      case 'like':
        return (
          <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ color: 'var(--accent-red)' }} fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      case 'comment':
        return (
          <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ color: 'var(--accent-red)' }} fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          </div>
        );
      case 'follow':
        return (
          <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ color: 'var(--accent-red)' }} fill="currentColor">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ color: 'var(--accent-red)' }} fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div 
      className={`flex items-start p-3 rounded-lg transition-colors ${!notification.isRead ? 'bg-opacity-10' : ''}`}
      style={{ 
        backgroundColor: !notification.isRead ? 'var(--background-tertiary)' : 'transparent',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mr-3">
        {getIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p style={{ color: 'var(--text-primary)' }}>
          {notification.content}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {notification.time}
        </p>
      </div>
      
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--accent-red)' }}></div>
      )}
    </div>
  );
};

export default NotificationList;