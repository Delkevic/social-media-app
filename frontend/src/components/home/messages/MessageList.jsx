import React from 'react';
import { useNavigate } from 'react-router-dom';

const MessageList = ({ messages }) => {
  const navigate = useNavigate();

  if (messages.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
        Hiç mesajınız bulunmuyor.
      </div>
    );
  }

  const handleMessageClick = (messageId) => {
    // Mesaj detay sayfasına yönlendir
    navigate(/messages/$`{messageId}`);
  };

  return (
    <div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {messages.map(message => (
          <MessageItem
            key={message.id}
            message={message}
            onClick={() => handleMessageClick(message.id)}
          />
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button
          className="w-full py-2 px-4 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-primary)',
          }}
          onClick={() => navigate('/messages')}
        >
          Tüm Mesajları Gör
        </button>
      </div>
    </div>
  );
};

const MessageItem = ({ message, onClick }) => {
  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : '?';
  };

  return (
    <div 
      className={"flex items-center p-3 rounded-lg transition-colors ${message.unread ? 'bg-opacity-10' : ''}"}
      style={{ 
        backgroundColor: message.unread ? 'var(--background-tertiary)' : 'transparent',
        cursor: 'pointer'
      }}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mr-3">
        {message.sender.profileImage ? (
          <img 
            src={message.sender.profileImage}
            alt={message.sender.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-red)' }}
          >
            <span style={{ color: 'white', fontWeight: 'bold' }}>
              {getInitials(message.sender.username)}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {message.sender.username}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {message.time}
          </p>
        </div>
        <p className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
          {message.lastMessage}
        </p>
      </div>
      
      {message.unread && (
        <div className="w-2 h-2 rounded-full ml-2" style={{ backgroundColor: 'var(--accent-red)' }}></div>
      )}
    </div>
  );
};

export default MessageList;