import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  Heart, 
  UserPlus, 
  MessageSquare, 
  AtSign, 
  Mail, 
  Bell
} from 'lucide-react';
import { createNotificationContent, getNotificationIcon, NotificationType } from '../../services/notification-service';

// Bildirim ikonu seçme fonksiyonu
const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'user-plus':
      return <UserPlus size={18} className="text-green-500" />;
    case 'heart':
      return <Heart size={18} className="text-red-500" />;
    case 'message-square':
      return <MessageSquare size={18} className="text-indigo-500" />;
    case 'at-sign':
      return <AtSign size={18} className="text-blue-500" />;
    case 'mail':
      return <Mail size={18} className="text-purple-500" />;
    default:
      return <Bell size={18} className="text-gray-500" />;
  }
};

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const navigate = useNavigate();
  const isUnread = !notification.isRead;
  const iconType = getNotificationIcon(notification);
  const content = createNotificationContent(notification);
  
  // Tarih formatı
  const formattedTime = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: tr
  });

  // Bildirime tıklama işleyicisi
  const handleClick = () => {
    // Okundu olarak işaretle
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    // Bildirim türüne göre yönlendirme
    if (notification.entityUrl) {
      navigate(notification.entityUrl);
    } else {
      // Bildirim türüne göre varsayılan sayfaya yönlendir
      switch (notification.type) {
        case NotificationType.FOLLOW:
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.FOLLOW_ACCEPT:
          navigate(`/profile/${notification.actorUsername}`);
          break;
          
        case NotificationType.MESSAGE:
          navigate(`/messages/${notification.actorId}`);
          break;
          
        case NotificationType.LIKE:
        case NotificationType.COMMENT:
        case NotificationType.REPLY:
        case NotificationType.MENTION:
          if (notification.entityId) {
            navigate(`/post/${notification.entityId}`);
          }
          break;
          
        default:
          // Sistem bildirimleri için özel bir yönlendirme yok
          break;
      }
    }
  };

  return (
    <div 
      className={`flex items-start p-3 cursor-pointer border-b border-gray-700/30 hover:bg-gray-800/50 transition-colors ${isUnread ? 'bg-blue-900/10' : ''}`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 w-9 h-9 mr-3">
        {notification.actorProfileImage ? (
          <img 
            src={notification.actorProfileImage} 
            alt={notification.actorName} 
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            {notification.actorName?.charAt(0) || '?'}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start">
          <div className="flex-1">
            <p className="text-sm text-gray-200">
              {content}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formattedTime}
            </p>
          </div>
          
          <div className="ml-2 mt-1 flex-shrink-0">
            <NotificationIcon type={iconType} />
          </div>
        </div>
      </div>
      
      {isUnread && (
        <div className="ml-2 mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
      )}
    </div>
  );
};

export default NotificationItem; 