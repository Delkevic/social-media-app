import React from 'react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { tr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { getFullImageUrl } from './ChatUIComponents';

/**
 * Konuşma listesi öğesi bileşeni
 * @param {Object} conversation - Konuşma bilgisi
 * @param {boolean} isActive - Seçili olup olmadığı
 * @param {Function} onClick - Tıklama fonksiyonu
 * @param {string|number} currentUserId - Mevcut kullanıcı ID'si
 */
const SohbetOgesi = ({ conversation, isActive, onClick, currentUserId }) => {
  const lastMessageTime = formatDistanceToNow(new Date(conversation.lastTimestamp), { 
    addSuffix: true, locale: tr 
  });
  
  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -5 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out relative overflow-hidden group ${ 
        isActive
          ? 'bg-gradient-to-r from-[#0AAFFD] to-[#0AFFD9]/90 text-black rounded-br-none'
          : 'hover:bg-[#0AAFFD]/10'
      }`}
      onClick={onClick}
    >
      {isActive && (
        <motion.div 
          layoutId="activeConversationHighlight"
          className="absolute left-0 top-0 bottom-0 w-1 bg-[#0AAFFD] rounded-r-full"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      <div className="relative flex-shrink-0 ml-1.5">
        <img
          src={getFullImageUrl(conversation.sender?.profileImage)}
          alt={conversation.sender?.username}
          className={`w-11 h-11 rounded-full object-cover border-2 ${isActive ? 'border-[#0AAFFD]/70' : 'border-gray-700/50 group-hover:border-[#0AAFFD]/30'} transition-colors`}
        />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conversation.sender?.online ? 'bg-green-400' : 'bg-gray-600'} border-2 border-black/70`}></div>
      </div>

      <div className="ml-3 flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#0AAFFD]' : 'text-gray-200 group-hover:text-white'}`}>
            {conversation.sender?.fullName || conversation.sender?.username || 'Bilinmeyen Kullanıcı'}
          </span>
          <span className="text-xs text-gray-500 group-hover:text-gray-400 flex-shrink-0 ml-2">
            {lastMessageTime}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-xs truncate pr-2 ${conversation.unreadCount > 0 && !isActive ? 'text-gray-300 font-medium' : 'text-gray-400 group-hover:text-gray-300'}`}>
             {conversation.lastMessage || "..."}
          </p>
          {conversation.unreadCount > 0 && (
            <div className="flex-shrink-0 w-4 h-4 text-[10px] rounded-full bg-[#0AAFFD] text-black flex items-center justify-center font-bold shadow-md">
              {conversation.unreadCount}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SohbetOgesi; 