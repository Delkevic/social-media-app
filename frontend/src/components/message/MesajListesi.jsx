import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, isYesterday, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, FileIcon, MessageCircle } from 'lucide-react';
import { getFullImageUrl } from './ChatUIComponents';
import * as mediaService from '../../services/media-service';

/**
 * Mesaj listesi bileşeni
 * @param {Object} props
 * @param {Array} props.messages - Mesajlar dizisi
 * @param {boolean} props.loading - Yükleniyor durumu
 * @param {Object} props.currentUser - Mevcut kullanıcı bilgisi
 * @param {Function} props.formatTime - Zaman formatlama fonksiyonu
 */
const MesajListesi = React.memo(({ messages, loading, currentUser, formatTime }) => {
  // Mesajları tarih gruplarına ayırma
  const messageGroups = useMemo(() => {
    const groups = {};
    messages.forEach(message => {
      let messageDateStr;
      try {
        const dateObj = parseISO(message.sentAt || message.created_at);
        if (isToday(dateObj)) messageDateStr = 'Bugün';
        else if (isYesterday(dateObj)) messageDateStr = 'Dün';
        else messageDateStr = format(dateObj, 'd MMMM yyyy', { locale: tr });
      } catch (e) {
        console.warn("Geçersiz tarih formatı:", message.sentAt || message.created_at);
        messageDateStr = "Belirsiz Zaman";
      }
      if (!groups[messageDateStr]) {
        groups[messageDateStr] = [];
      }
      groups[messageDateStr].push(message);
    });
    return groups;
  }, [messages]);
  
  // Tarih gruplarını sıralama
  const sortedDates = Object.keys(messageGroups).sort((a, b) => {
    const specialDatesOrder = { "Bugün": 0, "Dün": 1 };
    const aIsSpecial = specialDatesOrder[a] !== undefined;
    const bIsSpecial = specialDatesOrder[b] !== undefined;

    if (aIsSpecial && bIsSpecial) return specialDatesOrder[a] - specialDatesOrder[b];
    if (aIsSpecial) return -1;
    if (bIsSpecial) return 1;
    
    try {
      return parseISO(messages.find(m => format(parseISO(m.sentAt || m.created_at), 'd MMMM yyyy', { locale: tr }) === b || (isToday(parseISO(m.sentAt || m.created_at)) && b === "Bugün") || (isYesterday(parseISO(m.sentAt || m.created_at)) && b === "Dün") ).sentAt || m.created_at) - parseISO(messages.find(m => format(parseISO(m.sentAt || m.created_at), 'd MMMM yyyy', { locale: tr }) === a || (isToday(parseISO(m.sentAt || m.created_at)) && a === "Bugün") || (isYesterday(parseISO(m.sentAt || m.created_at)) && a === "Dün")).sentAt || m.created_at);
    } catch (e) {
        return 0;
    }
  });

  // Mesajlar yükleniyor
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#0affd9] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-3 text-gray-400">Mesajlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Mesaj yok
  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <MessageCircle className="h-10 w-10 mx-auto text-gray-500 mb-2" />
          <h3 className="text-lg font-semibold text-white mb-1">Henüz mesaj yok</h3>
          <p className="text-gray-400">Sohbete başlamak için bir mesaj gönderin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-2 md:px-4 pb-2">
      {sortedDates.map(dateStr => (
          <div key={dateStr}>
            {/* Tarih başlığı */}
            <div className="flex justify-center my-3">
              <span className="text-xs px-3 py-1 rounded-full bg-black/40 text-gray-400 border border-[#0affd9]/20 shadow-sm">
                {dateStr}
              </span>
            </div>
            
            {/* Mesaj grubu */}
            <div className="space-y-3">
              {messageGroups[dateStr].map((message) => {
                const isCurrentUser = currentUser && message.senderId === currentUser.id;
                const isTemporary = message.id && message.id.toString().startsWith('temp-');
                
                // Okundu/İletildi durumu için ikon belirleme
                let tickIcon = null;
                if (isCurrentUser && !isTemporary) {
                  if (message.isRead) {
                    tickIcon = <CheckCheck size={16} className="text-[#0affd9]/80" />;
                  } else if (message.isDelivered) {
                    tickIcon = <CheckCheck size={16} className="text-gray-500" />;
                  } else {
                    tickIcon = <Check size={16} className="text-gray-500" />;
                  }
                }
                
                return (
                  <motion.div 
                    key={message.id} 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`flex mb-1 items-end ${isCurrentUser ? 'justify-end pl-10' : 'justify-start pr-10'}`}
                  >
                    {/* Diğer kullanıcının avatarı */}
                    {!isCurrentUser && (
                       <img 
                        src={getFullImageUrl(message.senderInfo?.profileImage)} 
                        alt={message.senderInfo?.username || "Avatar"} 
                        className="w-7 h-7 rounded-full object-cover mr-2 self-start border-2 border-transparent group-hover:border-[#0affd9]/50 transition-all"
                      />
                    )}
                    
                    {/* Mesaj balonu */}
                    <div 
                      className={`relative max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md group ${ 
                        isCurrentUser
                          ? 'bg-gradient-to-br from-[#0AAFFD] to-[#0AFFD9]/90 text-black rounded-br-none'
                          : 'bg-black/40 text-gray-200 rounded-bl-none border border-[#0affd9]/20'
                      } ${isTemporary ? 'opacity-70' : ''}`}
                    >
                      {/* Medya içeriği */}
                      {message.mediaUrl && (
                        <div className="mb-1.5 last:mb-0">
                           {message.mediaType?.startsWith('image/') ? (
                            <img src={mediaService.getMediaUrl(message.mediaUrl, 'image')} alt="Medya" className="rounded-lg max-w-xs max-h-60 object-contain cursor-pointer shadow-md" 
                              onClick={() => window.open(mediaService.getMediaUrl(message.mediaUrl, 'image'), '_blank')} />
                          ) : message.mediaType?.startsWith('video/') ? (
                            <video src={mediaService.getMediaUrl(message.mediaUrl, 'video')} controls className="rounded-lg max-w-xs max-h-60 shadow-md" />
                          ) : (
                            <a href={mediaService.getMediaUrl(message.mediaUrl, 'file')} target="_blank" rel="noopener noreferrer" className="text-[#0affd9] hover:underline flex items-center bg-black/30 p-2 rounded-md">
                              <FileIcon size={18} className="mr-2" />
                              Dosyayı Görüntüle
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Mesaj metni */}
                      {message.content && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>} 
                      
                      {/* Mesaj zamanı ve durumu */}
                      <div className={`text-[11px] mt-1.5 flex items-center ${isCurrentUser ? 'justify-end text-black/60' : 'justify-start text-gray-500/80'}`}>
                        <span>{formatTime(message.sentAt || message.created_at)}</span>
                        {isCurrentUser && tickIcon && (
                          <span className="ml-1.5">
                            {tickIcon}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Kullanıcının kendi avatarı */}
                    {isCurrentUser && (
                       <img 
                        src={getFullImageUrl(currentUser?.profile_picture)}
                        alt={currentUser?.username || "Avatar"} 
                        className="w-7 h-7 rounded-full object-cover ml-2 self-start border-2 border-transparent group-hover:border-[#0affd9]/50 transition-all"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
});

export default MesajListesi; 