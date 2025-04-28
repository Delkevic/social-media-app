import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react';
import { markAsRead } from '../../services/notification-service';
import Avatar from './Avatar';

const NotificationItem = ({ notification }) => {
  const navigate = useNavigate();
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
      case 'followRequest':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const handleClick = async () => {
    try {
      await markAsRead(notification.id);
      
      // Bildirim türüne göre yönlendirme yapılır
      if (notification.type === 'like' || notification.type === 'comment') {
        navigate(`/post/${notification.entityId}`);
      } else if (notification.type === 'follow' || notification.type === 'followRequest') {
        navigate(`/profile/${notification.sender.username}`);
      }
    } catch (error) {
      console.error('Bildirim okundu olarak işaretlenirken hata oluştu:', error);
    }
  };
  
  const getTimeAgo = (createdAt) => {
    try {
      return formatDistanceToNow(new Date(createdAt), {
        addSuffix: true,
        locale: tr
      });
    } catch (error) {
      return 'bilinmeyen zaman';
    }
  };

  return (
    <div 
      className={`p-3 hover:bg-gray-800 cursor-pointer transition-colors duration-200 flex items-start gap-3 ${!notification.isRead ? 'bg-gray-900' : ''}`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0">
        <Avatar src={notification.sender?.profileImageUrl} size="md" username={notification.sender?.username} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-200">
            <span className="font-medium">{notification.sender?.username}</span>
            {' '}
            {notification.content}
          </p>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</span>
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
          </div>
        </div>
      </div>
      
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
      )}
    </div>
  );
};

export default NotificationItem; 