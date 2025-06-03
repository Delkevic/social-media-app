import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { API_BASE_URL, APP_CONSTANTS } from '../config/constants';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, isYesterday, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as mediaService from '../services/media-service';
import { resetMockData } from '../services/mock-api';
import { getRealtimeMessageService, clearMessageStorage } from '../services/realtimeMessageService';
import { 
  Send, 
  Search, 
  Phone, 
  Video, 
  MoreVertical, 
  Image, 
  Smile, 
  Mic, 
  ChevronLeft,
  X,
  User,
  MessageSquare,
  Users,
  PlusCircle,
  Check,
  CheckCheck,
  FileIcon,
  Loader,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import { FaPaperPlane, FaImage, FaSmile, FaEllipsisV } from 'react-icons/fa';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}/${url}`;
};

// Medya dosyası bileşeni
const MediaPreview = ({ media, onCancel }) => {
  if (!media) return null;
  
  const mediaUrl = media.preview;
  
  return (
    <div className="relative mb-2 w-full">
      <div className="rounded-md overflow-hidden border border-[#0affd9]/30 bg-black/30">
        {media.fileType === 'image' ? (
          <img 
            src={mediaUrl} 
            alt="Upload preview" 
            className="max-h-64 max-w-full object-contain mx-auto"
          />
        ) : media.fileType === 'video' ? (
          <video 
            src={mediaUrl} 
            controls 
            className="max-h-64 max-w-full mx-auto"
          />
        ) : (
          <div className="flex items-center justify-center p-4 text-gray-300">
            <FileIcon className="mr-2 text-[#0affd9]" />
            <span>{media.name}</span>
          </div>
        )}
      </div>
      <button 
        className="absolute -top-2 -right-2 rounded-full bg-red-600 hover:bg-red-700 text-white p-1 transition-colors"
        onClick={onCancel}
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Yükleme göstergesi
const UploadProgress = ({ progress }) => {
  return (
    <div className="mb-2 w-full px-1">
      <div className="bg-gray-700/50 rounded-full h-2">
        <div 
          className="bg-[#0affd9] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">
        Yükleniyor... {progress}%
      </p>
    </div>
  );
};

// Mesaj baloncuğu bileşeni
const MessageBubble = ({ message, isCurrentUser }) => {
  const bubbleStyle = isCurrentUser 
    ? 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl' 
    : 'bg-gray-700 text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl';
  
  const formattedTime = message.sentAt 
    ? formatDistanceToNow(new Date(message.sentAt), { addSuffix: true, locale: tr }) 
    : '';
    
  const mediaUrl = message.mediaUrl 
    ? mediaService.getMediaUrl(message.mediaUrl, message.mediaType?.startsWith('image/') ? 'image' : 'video')
    : null;
    
  const isImage = message.mediaType?.startsWith('image/');
  const isVideo = message.mediaType?.startsWith('video/');

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isCurrentUser && (
        <div className="mr-2 w-8 h-8">
          <img 
            src={message.senderInfo?.profileImage || `https://ui-avatars.com/api/?name=${message.senderInfo?.username}`} 
            alt="Avatar" 
            className="rounded-full w-8 h-8" 
          />
        </div>
      )}
      
      <div className="max-w-[75%]">
        <div className={`p-3 ${bubbleStyle}`}>
          {message.mediaUrl && (
            <div className="mb-2">
              {isImage ? (
                <img src={mediaUrl} alt="Medya" className="rounded-lg max-w-full cursor-pointer" 
                  onClick={() => window.open(mediaUrl, '_blank')} />
              ) : isVideo ? (
                <video src={mediaUrl} controls className="rounded-lg max-w-full" />
              ) : (
                <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline flex items-center">
                  <FileIcon size={16} className="mr-1" />
                  Dosyayı görüntüle
                </a>
              )}
            </div>
          )}
          {message.content && <p className="break-words">{message.content}</p>}
        </div>
        <div className={`text-xs text-gray-400 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
          {formattedTime}
          {isCurrentUser && message.isRead && (
            <span className="ml-2 text-blue-400">✓✓</span>
          )}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="ml-2 w-8 h-8">
          <img 
            src={message.senderInfo?.profileImage || `https://ui-avatars.com/api/?name=${message.senderInfo?.username}`} 
            alt="Avatar" 
            className="rounded-full w-8 h-8" 
          />
        </div>
      )}
    </div>
  );
};

// Konuşma listesi öğesi
const ConversationItem = ({ conversation, isActive, onClick, currentUserId }) => {
  const lastMessageTime = formatDistanceToNow(new Date(conversation.lastTimestamp), { 
    addSuffix: true, locale: tr 
  });
  
  return (
    <div 
      className={`flex items-center p-3 cursor-pointer border-b border-gray-700 hover:bg-gray-700/40 transition-colors ${isActive ? 'bg-gray-700/60' : ''}`}
      onClick={onClick}
    >
      <div className="relative">
        <img 
          src={conversation.profileImage || `https://ui-avatars.com/api/?name=${conversation.username}`} 
          alt={conversation.username} 
          className="w-12 h-12 rounded-full object-cover" 
        />
        {conversation.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center text-xs text-white">
            {conversation.unreadCount}
          </div>
        )}
      </div>
      
      <div className="ml-3 flex-1 overflow-hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-white truncate">
            {conversation.fullName || conversation.username}
          </h3>
          <span className="text-xs text-gray-400">{lastMessageTime}</span>
        </div>
        <p className="text-sm text-gray-300 truncate">{conversation.lastContent}</p>
      </div>
    </div>
  );
};

// Takip edilen kullanıcıları listeleyen bileşen
const FollowingSuggestions = ({ users, onSelectUser, currentUserId }) => {
  if (!users || users.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Önerilen kullanıcı bulunamadı
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Takip Ettiklerim</h3>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        {users.map((user, index) => (
          <div 
            key={user.id || `user-${index}`} 
            className="px-4 py-3 hover:bg-gray-50 flex items-center cursor-pointer transition-colors duration-200"
            onClick={() => onSelectUser(user.id)}
          >
            <div className="relative">
              <img 
                src={user.profileImage || '/default-avatar.png'} 
                alt={user.username} 
                className="h-10 w-10 rounded-full object-cover"
              />
              {/* Çevrimiçi durum göstergesi - şu an için herkesi çevrimiçi gösteriyoruz */}
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white"></span>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-900">{user.fullName || user.username}</p>
              </div>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Yeni mesaj başlatma bileşeni
const NewConversation = ({ onClose, onSelectUser, followingUsers }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.user.searchUsers(query);
      if (response.success) {
        setSearchResults(response.data || []);
      }
    } catch (error) {
      console.error("Kullanıcı arama hatası:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      handleSearch(value);
    }, 300);
    setSearchTimeout(timeout);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-black/70 backdrop-blur-md rounded-xl shadow-2xl border border-[#0affd9]/30 w-full max-w-md overflow-hidden"
    >
      <div className="p-4 border-b border-[#0affd9]/20 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#0affd9]">Yeni Mesaj</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-[#0affd9] transition-colors p-1 rounded-full hover:bg-[#0affd9]/10"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Kullanıcı ara..."
            className="w-full py-2.5 px-4 pr-10 bg-black/50 border border-[#0affd9]/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9] transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {loading ? (
              <div className="w-5 h-5 border-t-2 border-[#0affd9] border-solid rounded-full animate-spin"></div>
            ) : (
              <Search size={18} />
            )}
          </div>
        </div>
        
        <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-[#0affd9]/50 scrollbar-track-transparent pr-1">
          {searchResults.length > 0 ? (
            <div className="mb-1">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Arama Sonuçları</h3>
              {searchResults.map(user => (
                <div 
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user.id);
                    onClose();
                  }}
                  className="flex items-center p-2.5 hover:bg-[#0affd9]/10 cursor-pointer rounded-lg transition-colors duration-150"
                >
                  <img 
                    src={getFullImageUrl(user.profileImage)} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#0affd9]/20"
                  />
                  <div className="ml-3 overflow-hidden">
                    <p className="text-gray-100 font-medium truncate text-sm">{user.fullName || user.username}</p>
                    <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : search.trim() !== '' && !loading ? (
            <div className="py-4 text-center text-gray-400 text-sm">
              <p>"<span className='font-medium text-gray-300'>{search}</span>" ile eşleşen kullanıcı bulunamadı.</p>
            </div>
          ) : (
            !search.trim() && !loading && (
              <div className="mb-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {followingUsers.length > 0 ? 'Takip Ettiklerim' : 'Yükleniyor...'}
                </h3>
                {followingUsers.length > 0 ? (
                  followingUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user.id);
                      onClose();
                    }}
                    className="flex items-center p-2.5 hover:bg-[#0affd9]/10 cursor-pointer rounded-lg transition-colors duration-150"
                  >
                    <img 
                      src={getFullImageUrl(user.profileImage)} 
                      alt={user.username} 
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#0affd9]/20"
                    />
                    <div className="ml-3 overflow-hidden">
                      <p className="text-gray-100 font-medium truncate text-sm">{user.fullName || user.username}</p>
                      <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                    </div>
                  </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-gray-400 text-sm">
                    <p>Henüz kimseyi takip etmiyorsunuz.</p>
                    <p className="text-xs mt-1">Yukarıdaki arama kutusunu kullanarak kullanıcı arayabilirsiniz.</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MessageList = React.memo(({ messages, currentUser, formatTime }) => {
  const messageGroups = useMemo(() => {
    const groups = {};
    messages.forEach(message => {
      let messageDateStr;
      try {
        const dateObj = parseISO(message.sentAt);
        if (isToday(dateObj)) messageDateStr = 'Bugün';
        else if (isYesterday(dateObj)) messageDateStr = 'Dün';
        else messageDateStr = format(dateObj, 'd MMMM yyyy', { locale: tr });
      } catch (e) {
        console.warn("Geçersiz tarih formatı:", message.sentAt);
        messageDateStr = "Belirsiz Zaman";
      }
      if (!groups[messageDateStr]) {
        groups[messageDateStr] = [];
      }
      groups[messageDateStr].push(message);
    });
    return groups;
  }, [messages]);
  
  const sortedDates = Object.keys(messageGroups).sort((a, b) => {
    const specialDatesOrder = { "Bugün": 0, "Dün": 1 };
    const aIsSpecial = specialDatesOrder[a] !== undefined;
    const bIsSpecial = specialDatesOrder[b] !== undefined;

    if (aIsSpecial && bIsSpecial) return specialDatesOrder[a] - specialDatesOrder[b];
    if (aIsSpecial) return -1;
    if (bIsSpecial) return 1;
    
    try {
      return parseISO(messages.find(m => format(parseISO(m.sentAt), 'd MMMM yyyy', { locale: tr }) === b || (isToday(parseISO(m.sentAt)) && b === "Bugün") || (isYesterday(parseISO(m.sentAt)) && b === "Dün") ).sentAt) - parseISO(messages.find(m => format(parseISO(m.sentAt), 'd MMMM yyyy', { locale: tr }) === a || (isToday(parseISO(m.sentAt)) && a === "Bugün") || (isYesterday(parseISO(m.sentAt)) && a === "Dün")).sentAt);
    } catch (e) {
        return 0;
    }
  });

  return (
    <div className="space-y-2 px-2 md:px-4 pb-2">
      {sortedDates.map(dateStr => (
          <div key={dateStr}>
            <div className="flex justify-center my-3">
              <span className="text-xs px-3 py-1 rounded-full bg-black/40 text-gray-400 border border-[#0affd9]/20 shadow-sm">
                {dateStr}
              </span>
            </div>
            
            <div className="space-y-3">
              {messageGroups[dateStr].map((message) => {
                const isCurrentUser = currentUser && message.senderId === currentUser.id;
                const isTemporary = message.id && message.id.toString().startsWith('temp-');
                
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
                    {!isCurrentUser && (
                       <img 
                        src={getFullImageUrl(message.senderInfo?.profileImage)} 
                        alt={message.senderInfo?.username || "Avatar"} 
                        className="w-7 h-7 rounded-full object-cover mr-2 self-start border-2 border-transparent group-hover:border-[#0affd9]/50 transition-all"
                      />
                    )}
                    <div 
                      className={`relative max-w-[80%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md group ${ 
                        isCurrentUser
                          ? 'bg-gradient-to-br from-[#0AAFFD] to-[#0AFFD9]/90 text-black rounded-br-none'
                          : 'bg-black/40 text-gray-200 rounded-bl-none border border-[#0affd9]/20'
                      } ${isTemporary ? 'opacity-70' : ''}`}
                    >
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
                      {message.content && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>} 
                      <div className={`text-[11px] mt-1.5 flex items-center ${isCurrentUser ? 'justify-end text-black/60' : 'justify-start text-gray-500/80'}`}>
                        <span>{formatTime(message.sentAt)}</span>
                        {isCurrentUser && tickIcon && (
                          <span className="ml-1.5">
                            {tickIcon}
                          </span>
                        )}
                      </div>
                    </div>
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

// Yazıyor göstergesi bileşeni
const TypingIndicator = React.memo(({ senderInfo }) => {
  const profileImageUrl = getFullImageUrl(senderInfo?.profileImage);

  return (
    <motion.div 
      className="flex mb-1 items-end justify-start pl-2 md:pl-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <img 
        src={profileImageUrl}
        alt={senderInfo?.username || 'avatar'}
        className="w-7 h-7 rounded-full object-cover mr-2 self-start border-2 border-transparent"
      />
      <div className="max-w-[70%] rounded-2xl rounded-bl-none px-3.5 py-3 bg-black/40 border border-[#0affd9]/20 shadow-md">
        <div className="flex space-x-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#0affd9]/70"
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

const Messages = () => {
  const navigate = useNavigate();
  const { id: conversationId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth <= 768);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, error

  // Firebase bağlantı test
  useEffect(() => {
    console.log('Messages: Component yüklendi, test başlatılıyor...');
    setConnectionStatus('connecting');
    
    // RealtimeMessageService'ı başlat
    if (user?.id) {
      const service = getRealtimeMessageService(user.id);
      
      // Bağlantı durumu callback'i ekle
      service.setConnectionStatusCallback((status) => {
        console.log('Messages: Realtime bağlantı durumu:', status);
        setConnectionStatus(status);
      });
      
      // Test connection
      setTimeout(() => {
        service.cleanup();
        setConnectionStatus('connected'); // Geçici test
      }, 2000);
    }
  }, [user]);

  // RealtimeMessageService
  const serviceRef = useRef(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messageContainerRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  // Demo konuşmaları temizle (bir kerelik)
  useEffect(() => {
    const hasCleanedDemo = localStorage.getItem('demoMessagesCleared');
    if (!hasCleanedDemo) {
      console.log('Demo mesaj verileri temizleniyor...');
      // Demo conversation ve message verilerini manuel temizle
      try {
        const conversations = JSON.parse(localStorage.getItem('rms_conversations') || '{}');
        const messages = JSON.parse(localStorage.getItem('rms_messages') || '{}');
        
        let conversationsChanged = false;
        let messagesChanged = false;
        
        // Conversations temizle
        Object.keys(conversations).forEach(userId => {
          const userConvs = conversations[userId];
          Object.keys(userConvs).forEach(convId => {
            if (convId.includes('demo_user_')) {
              delete userConvs[convId];
              conversationsChanged = true;
            }
          });
        });
        
        // Messages temizle  
        Object.keys(messages).forEach(convId => {
          if (convId.includes('demo_user_')) {
            delete messages[convId];
            messagesChanged = true;
          }
        });
        
        if (conversationsChanged) {
          localStorage.setItem('rms_conversations', JSON.stringify(conversations));
        }
        if (messagesChanged) {
          localStorage.setItem('rms_messages', JSON.stringify(messages));
        }
        
        // Temizlik işaretini koy
        localStorage.setItem('demoMessagesCleared', 'true');
        console.log('Demo mesaj verileri temizlendi');
      } catch (error) {
        console.error('Demo veri temizleme hatası:', error);
      }
    }
  }, []);

  // Takip edilen kullanıcıları yükle
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user?.id) return;
      
      try {
        // Kullanıcının kendi takip ettiklerini getir
        const response = await api.user.getFollowing();
        console.log('Takip edilen kullanıcılar API response:', response);
        
        if (response.success && response.data) {
          // Backend'den gelen veri formatına göre users array'ini al
          const users = response.data.users || response.data || [];
          setFollowingUsers(Array.isArray(users) ? users : []);
        } else {
          console.warn('Takip edilen kullanıcılar alınamadı:', response.message);
          setFollowingUsers([]);
        }
      } catch (error) {
        console.error("Takip edilen kullanıcılar yüklenemedi:", error);
        setFollowingUsers([]);
      }
    };
    
    fetchFollowing();
  }, [user]);

  // RealtimeMessageService'ı başlat
  useEffect(() => {
    if (user?.id) {
      // Realtime servisini başlat
      console.log('Realtime mesajlaşma servisi başlatılıyor, userId:', user.id, 'type:', typeof user.id);
      serviceRef.current = getRealtimeMessageService();
      
      // Kullanıcıyı manuel olarak ayarla
      if (serviceRef.current) {
        serviceRef.current.setCurrentUser(user.id);
        console.log('Service başlatıldı ve currentUser ayarlandı:', user.id);
      }
      
      setIsRealtimeConnected(true);
      
      // Tüm konuşmaları dinle
      const unsubscribe = serviceRef.current.listenToConversations(async (conversationsData) => {
        console.log('Realtime\'den konuşmalar alındı:', conversationsData);
        
        // Her konuşma için kullanıcı bilgilerini API'den çek
        const conversationsWithUserInfo = await Promise.all(
          conversationsData.map(async (conv) => {
            try {
              let userInfo = null;
              
              // Demo kullanıcı mı kontrol et
              if (conv.otherParticipantId.startsWith('demo_user_')) {
                userInfo = serviceRef.current.getDemoUserInfo(conv.otherParticipantId);
                console.log('Demo kullanıcı bilgisi alındı:', userInfo);
              } else {
                // Gerçek kullanıcı için API'den çek
                const userResponse = await api.user.getUserById(conv.otherParticipantId);
                if (userResponse.success) {
                  userInfo = userResponse.data;
                }
              }
              
              if (userInfo) {
                return {
                  id: conv.id,
                  senderId: conv.otherParticipantId,
                  receiverId: user.id,
                  lastMessage: conv.lastMessage,
                  lastMessageAt: conv.lastMessageTime,
                  lastMessageSenderId: conv.lastMessageSender,
                  unreadCount: conv.unreadCount,
                  lastTimestamp: conv.lastMessageTime?.toDate ? conv.lastMessageTime.toDate().toISOString() : new Date().toISOString(),
                  lastContent: conv.lastMessage,
                  sender: {
                    id: conv.otherParticipantId,
                    username: userInfo.username,
                    fullName: userInfo.full_name || userInfo.fullName,
                    profile_picture: userInfo.profile_picture || userInfo.profileImage,
                    profileImage: userInfo.profile_picture || userInfo.profileImage,
                    online: false // Şimdilik false, gerçek zamanlı durumu eklenebilir
                  }
                };
              } else {
                // API'den bilgi alınamazsa varsayılan değerler kullan
                return {
                  id: conv.id,
                  senderId: conv.otherParticipantId,
                  receiverId: user.id,
                  lastMessage: conv.lastMessage,
                  lastMessageAt: conv.lastMessageTime,
                  lastMessageSenderId: conv.lastMessageSender,
                  unreadCount: conv.unreadCount,
                  lastTimestamp: conv.lastMessageTime?.toDate ? conv.lastMessageTime.toDate().toISOString() : new Date().toISOString(),
                  lastContent: conv.lastMessage,
                  sender: {
                    id: conv.otherParticipantId,
                    username: 'Kullanıcı',
                    fullName: 'Bilinmeyen Kullanıcı',
                    profile_picture: null,
                    profileImage: null,
                    online: false
                  }
                };
              }
    } catch (error) {
              console.error('Kullanıcı bilgisi alınırken hata:', error);
              // Hata durumunda varsayılan değerler
              return {
                id: conv.id,
                senderId: conv.otherParticipantId,
                receiverId: user.id,
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageTime,
                lastMessageSenderId: conv.lastMessageSender,
                unreadCount: conv.unreadCount,
                lastTimestamp: conv.lastMessageTime?.toDate ? conv.lastMessageTime.toDate().toISOString() : new Date().toISOString(),
                lastContent: conv.lastMessage,
                sender: {
                  id: conv.otherParticipantId,
                  username: 'Kullanıcı',
                  fullName: 'Bilinmeyen Kullanıcı',
                  profile_picture: null,
                  profileImage: null,
                  online: false
                }
              };
            }
          })
        );
        
        setConversations(conversationsWithUserInfo);
        setLoading(false);
      });
      
      // Temizleme fonksiyonu
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [user]);

  // Konuşma seçildiğinde mesajları dinle
  useEffect(() => {
    console.log('useEffect (mesaj yükleme) tetiklendi:', {
      hasUser: !!user?.id,
      hasSelectedUserId: !!selectedUserId,
      selectedUserId
    });

    if (user?.id && selectedUserId) {
      console.log('Mesajlar yükleniyor:', {
        userId: user.id,
        selectedUserId: selectedUserId
      });
      
      // Mevcut mesajları temizle
      setMessages([]);
      setLoading(true);
      
      // API'den mesajları yükle
      const loadMessagesFromAPI = async () => {
        try {
          const response = await api.messages.getConversation(selectedUserId);
          console.log('API\'den mesajlar alındı:', response);
          
          if (response.success && response.data && response.data.messages) {
            const apiMessages = response.data.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              senderId: msg.senderId,
              receiverId: msg.receiverId,
              sentAt: msg.sentAt || msg.createdAt,
              isRead: msg.isRead || false,
              isDelivered: true,
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType,
              senderInfo: {
                id: msg.senderId,
                username: msg.senderId === user.id ? user.username : selectedConversation?.sender?.username || 'Kullanıcı',
                profileImage: msg.senderId === user.id ? user.profile_picture : selectedConversation?.sender?.profileImage
              }
            }));
            
            // Zaman sırasına göre sırala
            const sortedMessages = apiMessages.sort((a, b) => 
              new Date(a.sentAt) - new Date(b.sentAt)
            );
            
            console.log('✅ Mesajlar state\'e yüklendi:', {
              messageCount: sortedMessages.length,
              latestMessage: sortedMessages[sortedMessages.length - 1]
            });
            
            setMessages(sortedMessages);
            
            // Mesajlar gelince otomatik kaydır
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          } else {
            console.log('API\'den mesaj bulunamadı veya boş konuşma');
            setMessages([]);
          }
        } catch (error) {
          console.error('❌ Mesaj yükleme hatası:', error);
          setMessages([]);
        } finally {
          setLoading(false);
        }
      };
      
      loadMessagesFromAPI();
      
    } else {
      console.warn('Mesaj yükleme koşulları sağlanmadı:', {
        hasUser: !!user?.id,
        hasSelectedUserId: !!selectedUserId
      });
      setMessages([]);
      setLoading(false);
    }
  }, [user?.id, selectedUserId]); // Dependency'leri basitleştir

  // URL'den belirli bir kullanıcı seçildiğinde
  useEffect(() => {
    if (conversationId && user?.id) {
      console.log('🔍 URL\'den conversationId alındı:', { conversationId, userId: user.id });
      
      // conversationId'yi selectedUserId olarak set et
      setSelectedUserId(conversationId);
      
      // Konuşmayı bul veya oluştur - DÜZGÜN SENDER BİLGİSİYLE
      const newConversationId = createConversationId(user.id, conversationId);
      setSelectedConversation({
        id: newConversationId,
        senderId: conversationId,
        receiverId: user.id,
        sender: {
          id: conversationId,
          username: 'Kullanıcı',
          fullName: 'Yükleniyor...',
          profileImage: null,
          online: false
        }
      });
      
      console.log('✅ selectedUserId ve selectedConversation set edildi:', {
        selectedUserId: conversationId,
        conversationId: newConversationId
      });
      
      // Kullanıcı bilgilerini API'den yükle ve güncelle
      const loadUserInfo = async () => {
        try {
          const userResponse = await api.user.getUserById(conversationId);
          if (userResponse.success) {
            const userInfo = userResponse.data;
            setSelectedConversation(prev => ({
              ...prev,
              sender: {
                id: conversationId,
                username: userInfo.username,
                fullName: userInfo.fullName || userInfo.full_name,
                profileImage: userInfo.profileImage || userInfo.profile_picture,
                online: false
              }
            }));
            console.log('✅ Kullanıcı bilgisi API\'den yüklendi ve güncellendi:', userInfo.username);
          }
        } catch (error) {
          console.error('❌ Kullanıcı bilgisi yüklenemedi:', error);
        }
      };
      
      loadUserInfo();
      
      // Mobil görünümde sohbet ekranını göster
      if (isSmallScreen) {
        setShowMobileChat(true);
      }
    }
  }, [conversationId, user, isSmallScreen]);

  // Ekran boyutu değişimini izle
  useEffect(() => {
    const handleResize = () => {
      const small = window.innerWidth <= 768;
      setIsSmallScreen(small);
      
      // Mobil moddan çıkıldığında, sohbet görünümünü sıfırla
      if (!small) {
        setShowMobileChat(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Konuşma ID'si oluştur (Realtime ile uyumlu)
  const createConversationId = (userId1, userId2) => {
    const sortedIds = [userId1, userId2].sort();
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Konuşma seçme işlemi
  const selectConversation = (conversation) => {
    if (!user?.id || !conversation?.sender?.id) {
      console.error("selectConversation: Geçersiz kullanıcı veya konuşma bilgisi");
      return;
    }

    const targetUserId = conversation.sender.id;
    setSelectedUserId(targetUserId);
    setSelectedConversation(conversation);
    
    // URL'yi güncelle
    navigate(`/messages/${targetUserId}`);
    
    // Mobil görünümde sohbet ekranını göster
    if (isSmallScreen) {
      setShowMobileChat(true);
    }
  };

  // Mesaj gönderme işlemi
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    // ⚠️ AGRESIF DEBUG VE FALLBACK ⚠️
    console.log('🚨 MESAJ GÖNDERME BAŞLADI - AGRESIF DEBUG:', {
      selectedUserId: selectedUserId,
      selectedUserId_type: typeof selectedUserId,
      conversationId: conversationId,
      conversationId_type: typeof conversationId,
      selectedConversation: selectedConversation,
      user: user,
      newMessage: newMessage
    });
    
    // selectedUserId'yi kontrol et ve gerekirse düzelt
    let actualSelectedUserId = selectedUserId;
    
    // Eğer selectedUserId undefined ise, conversationId'den al
    if (!actualSelectedUserId && conversationId) {
      console.log('⚠️ selectedUserId undefined, conversationId\'den alınıyor:', conversationId);
      actualSelectedUserId = conversationId;
      setSelectedUserId(conversationId);
    }
    
    // Eğer hala undefined ise selectedConversation'dan al
    if (!actualSelectedUserId && selectedConversation?.sender?.id) {
      console.log('⚠️ selectedUserId hala undefined, selectedConversation\'dan alınıyor:', selectedConversation.sender.id);
      actualSelectedUserId = selectedConversation.sender.id;
      setSelectedUserId(selectedConversation.sender.id);
    }
    
    // Son çare: URL'den çıkar
    if (!actualSelectedUserId) {
      const urlParts = window.location.pathname.split('/');
      const urlUserId = urlParts[urlParts.length - 1];
      if (urlUserId && urlUserId !== 'messages' && !isNaN(Number(urlUserId))) {
        console.log('🚨 SON ÇARE: URL\'den alınıyor:', urlUserId);
        actualSelectedUserId = urlUserId;
        setSelectedUserId(urlUserId);
      }
    }
    
    // actualSelectedUserId'yi string'e çevir ve kontrol et
    if (actualSelectedUserId) {
      actualSelectedUserId = String(actualSelectedUserId);
    }
    
    console.log('🔥 FİNAL actualSelectedUserId:', {
      actualSelectedUserId: actualSelectedUserId,
      type: typeof actualSelectedUserId,
      length: actualSelectedUserId ? actualSelectedUserId.length : 0,
      isUndefined: actualSelectedUserId === undefined,
      isNull: actualSelectedUserId === null,
      isEmpty: actualSelectedUserId === '',
      isStringUndefined: actualSelectedUserId === 'undefined'
    });
    
    if ((!newMessage.trim() && !mediaFile) || isUploading) {
      console.warn('❌ Mesaj gönderme durduruldu: Boş mesaj veya upload devam ediyor');
      return;
    }
    
    if (!user || !actualSelectedUserId) {
      console.error('❌ Kullanıcı veya alıcı seçilmedi:', { 
        hasUser: !!user, 
        actualSelectedUserId: actualSelectedUserId,
        selectedUserId_type: typeof actualSelectedUserId 
      });
      toast.error('Kullanıcı veya alıcı seçilmedi');
      return;
    }
    
    // actualSelectedUserId'nin geçerli olduğundan emin ol
    if (actualSelectedUserId === 'undefined' || actualSelectedUserId === undefined || actualSelectedUserId === null || actualSelectedUserId.trim() === '') {
      console.error('❌ actualSelectedUserId geçersiz:', actualSelectedUserId);
      toast.error('Geçersiz kullanıcı seçildi. Lütfen konuşmayı yeniden başlatın.');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Mesaj içeriği
      const messageContent = newMessage.trim();
      let mediaUrl = null;
      let mediaType = null;
      
      if (mediaFile) {
        mediaUrl = mediaFile.preview;
        mediaType = mediaFile.fileType;
      }

      // Geçici mesaj ID'si oluştur
      const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Yeni mesaj objesi oluştur
      const newMessageObj = {
        id: tempMessageId,
        content: messageContent,
        senderId: user.id,
        receiverId: actualSelectedUserId,
        sentAt: new Date().toISOString(),
        isRead: false,
        isDelivered: false,
        mediaUrl,
        mediaType,
        senderInfo: {
          id: user.id,
          username: user.username,
          profileImage: user.profile_picture
        }
      };

      // Input'u hemen temizle
      setNewMessage('');
      setMediaFile(null);
      
      // ANINDA UI'yi güncelle - En önemli kısım!
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newMessageObj];
        console.log('🔥 Mesaj state\'e eklendi - Anında UI güncellenecek!', {
          messageCount: updatedMessages.length,
          newMessage: newMessageObj
        });
        return updatedMessages;
      });
      
      // Mesajları otomatik kaydır
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      
      // Backend'e gönder (background işlem)
      try {
        console.log('📡 Backend\'e mesaj gönderiliyor:', { actualSelectedUserId, messageContent });
        const response = await api.messages.sendMessage(actualSelectedUserId, {
          content: messageContent,
          mediaUrl,
          mediaType
        });
        
        if (response.success) {
          // Backend'den gerçek ID gelince güncelle
          const realMessageId = response.data.id;
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === tempMessageId 
                ? { ...msg, id: realMessageId, isDelivered: true }
                : msg
            )
          );
          
          console.log('✅ Mesaj backend\'e gönderildi, ID güncellendi:', realMessageId);
        } else {
          // Hata durumunda mesajı hata olarak işaretle
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === tempMessageId 
                ? { ...msg, isDelivered: false, error: 'Gönderim başarısız' }
                : msg
            )
          );
          console.error('❌ Backend mesaj gönderme hatası:', response.message);
        }
      } catch (apiError) {
        // API hatası durumunda
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === tempMessageId 
              ? { ...msg, isDelivered: false, error: 'Bağlantı hatası' }
              : msg
          )
        );
        console.error('❌ API çağrısı hatası:', apiError);
      }
        
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      // Hata durumunda input'u geri getir
      setNewMessage(messageContent || '');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Input alanına odaklan
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  // Konuşmaları filtrele
  const filteredConversations = useMemo(() => conversations.filter((conv) =>
    (conv.sender?.username?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (conv.sender?.fullName?.toLowerCase() || '').includes(search.toLowerCase())
  ), [conversations, search]);

  // Mesaj zamanı formatı
  const formatMessageTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  }, []);

  // Son görülme formatı (Örnek)
  const formatLastSeen = useCallback((timestamp) => {
    // ... (Bu fonksiyon geliştirilebilir)
    return 'Çevrimiçi'; // Şimdilik sabit
  }, []);

  // Mobil görünümde konuşmalar listesine dön
  const handleBackToConversations = () => {
    setShowMobileChat(false);
  };

  // Yeni konuşma başlatma işlemi
  const startNewConversation = async (userId) => {
    console.log('🔍 startNewConversation çağrıldı:', { 
      userId, 
      userId_type: typeof userId,
      currentUser: user ? { id: user.id, username: user.username } : null
    });
    
    if (!userId || userId === 'undefined' || userId === undefined || userId === null) {
      console.error("❌ startNewConversation: Geçersiz userId:", userId);
      toast.error('Geçersiz kullanıcı ID\'si');
      return;
    }

    console.log('✅ Yeni konuşma başlatılıyor:', { userId, currentUserId: user.id });

    // userId'yi string'e çevir ve set et
    const userIdStr = String(userId);
    setSelectedUserId(userIdStr);
    
    console.log('✅ selectedUserId set edildi:', userIdStr);
    
    // ConversationId'yi Realtime servisinin beklediği formatta oluştur
    const conversationId = createConversationId(String(user.id), userIdStr);
    
    // Hedef kullanıcının bilgilerini API'den veya cache'den al  
    let targetUserInfo = null;
    try {
      // Önce takip edilen kullanıcılar arasında ara
      const followingUser = followingUsers.find(u => String(u.id) === userIdStr);
      if (followingUser) {
        targetUserInfo = followingUser;
        console.log('✅ Kullanıcı bilgisi followingUsers\'dan alındı:', targetUserInfo.username);
      } else {
        // API'den kullanıcı bilgilerini çek
        console.log('📡 API\'den kullanıcı bilgisi alınıyor...');
        const userResponse = await api.user.getUserById(userId);
        if (userResponse.success) {
          targetUserInfo = userResponse.data;
          console.log('✅ Kullanıcı bilgisi API\'den alındı:', targetUserInfo.username);
        }
      }
    } catch (error) {
      console.error('❌ Kullanıcı bilgisi alınamadı:', error);
    }
    
    if (targetUserInfo) {
      const conversation = {
        id: conversationId,
        senderId: userIdStr,
        receiverId: String(user.id),
        sender: {
          id: userIdStr,
          username: targetUserInfo.username,
          fullName: targetUserInfo.fullName || targetUserInfo.full_name,
          profileImage: targetUserInfo.profileImage || targetUserInfo.profile_picture,
          online: false
        }
      };
      
      setSelectedConversation(conversation);
      console.log('✅ selectedConversation set edildi:', conversation);
    } else {
      // Kullanıcı bilgisi alınamazsa varsayılan bilgilerle devam et
      const conversation = {
        id: conversationId,
        senderId: userIdStr,
        receiverId: String(user.id),
        sender: {
          id: userIdStr,
          username: 'Kullanıcı',
          fullName: 'Bilinmeyen Kullanıcı',
          profileImage: null,
          online: false
        }
      };
      
      setSelectedConversation(conversation);
      console.log('⚠️ selectedConversation varsayılan bilgilerle set edildi:', conversation);
    }
    
    // Yeni konuşma penceresini kapat
    setShowNewConversation(false);
    
    // Mobil görünümde sohbet ekranını göster
    if (isSmallScreen) {
      setShowMobileChat(true);
    }
    
    // URL'yi güncelle
    navigate(`/messages/${userIdStr}`);
    
    // Mesaj input alanına odaklan
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 300);
  };

  // Dosya seçimi
  const handleFileSelect = (event) => {
    if (isUploading) return;
    
    const fileHandler = mediaService.handleFileSelect(
      (fileData) => {
        setMediaFile(fileData);
      },
      (error) => {
        toast.error(error.message);
      },
      {
        generatePreview: true
      }
    );
    
    fileHandler(event);
  };
  
  // Dosya seçim butonuna tıklama
  const handleFileButtonClick = () => {
    if (fileInputRef.current && !isUploading) {
      fileInputRef.current.click();
    }
  };
  
  // Seçilen dosyayı temizle
  const handleCancelMedia = () => {
    setMediaFile(null);
  };

  // Uygulama temizleme işlemi
  useEffect(() => {
    return () => {
      // Realtime dinleyicileri temizle
      if (serviceRef.current) {
        serviceRef.current.cleanup();
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Realtime Bağlantı Durumu */}
      {connectionStatus !== 'connected' && (
        <div className={`fixed top-0 left-0 right-0 z-50 text-white text-center py-2 text-sm ${
          connectionStatus === 'connecting' ? 'bg-yellow-500' : 
          connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`}>
          {connectionStatus === 'connecting' && '🔄 Realtime bağlantısı kuruluyor...'}
          {connectionStatus === 'error' && '❌ Realtime bağlantı hatası - Yeniden deneniyor...'}
        </div>
      )}
      
      {/* Sol Sidebar - Konuşma Listesi */}
      <div className={`${
        isSmallScreen ? (selectedConversation ? 'hidden' : 'w-full') : 'w-1/3'
      } border-r border-gray-300 bg-white flex flex-col`}>
        {/* Arama ve Başlık */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Mesajlar</h1>
            <div className="flex gap-2">
              {/* Test buton - yakup2 ile sohbet başlat */}
                  <button 
                onClick={() => startNewConversation(2)}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                title="yakup2 ile sohbet başlat (test)"
              >
                @yakup2
                  </button>
              
                <button 
                  onClick={() => setShowNewConversation(true)}
                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
                title="Yeni sohbet başlat"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                </button>
            </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Sohbetleri ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-black/50 text-gray-200 placeholder-gray-500 border border-[#0affd9]/30 rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9] transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#0affd9]/40 hover:scrollbar-thumb-[#0affd9]/60 scrollbar-track-transparent scrollbar-thumb-rounded-full pr-1">
              {loading && conversations.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <Loader size={28} className="animate-spin text-[#0affd9]/70" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-gray-500 mt-8">
                   <MessageSquare className="h-16 w-16 mb-4 opacity-30 text-[#0affd9]/50" />
                   <p className="text-sm">Henüz bir sohbetiniz yok.</p>
                   <p className="text-xs mt-1">Yeni bir sohbet başlatarak mesajlaşmaya başlayın.</p>
                 </div>
              ) : filteredConversations.length === 0 && search ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-gray-500 mt-8">
                  <Search className="h-16 w-16 mb-4 opacity-30 text-[#0affd9]/50" />
                  <p className="text-sm">"<span className='font-medium text-gray-300'>{search}</span>" için sonuç bulunamadı.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {filteredConversations.map((conversation) => (
                    <motion.div
                      key={conversation.sender ? conversation.sender.id : `conversation-${Date.now()}-${Math.random()}`}
                      layout 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out relative overflow-hidden group ${ 
                        selectedConversation?.sender?.id === conversation.sender?.id
                          ? 'bg-gradient-to-r from-[#0AAFFD] to-[#0AFFD9]/90 text-black rounded-br-none'
                          : 'hover:bg-[#0AAFFD]/10'
                      }`}
                      onClick={() => {
                        selectConversation(conversation);
                    if (isSmallScreen) setShowMobileChat(true);
                      }}
                    >
                      {selectedConversation?.sender?.id === conversation.sender?.id && (
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
                          className={`w-11 h-11 rounded-full object-cover border-2 ${selectedConversation?.sender?.id === conversation.sender?.id ? 'border-[#0AAFFD]/70' : 'border-gray-700/50 group-hover:border-[#0AAFFD]/30'} transition-colors`}
                        />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conversation.sender?.online ? 'bg-green-400' : 'bg-gray-600'} border-2 border-black/70`}></div>
                      </div>

                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold text-sm truncate ${selectedConversation?.sender?.id === conversation.sender?.id ? 'text-[#0AAFFD]' : 'text-gray-200 group-hover:text-white'}`}>
                            {conversation.sender?.fullName || conversation.sender?.username || 'Bilinmeyen Kullanıcı'}
                          </span>
                          <span className="text-xs text-gray-500 group-hover:text-gray-400 flex-shrink-0 ml-2">
                            {conversation.lastTimestamp ? formatMessageTime(conversation.lastTimestamp) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate pr-2 ${conversation.unreadCount > 0 && selectedConversation?.sender?.id !== conversation.sender?.id ? 'text-gray-300 font-medium' : 'text-gray-400 group-hover:text-gray-300'}`}>
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
                  ))}
                </div>
              )}
            </div>
          </div>

      <div className={`${isSmallScreen && !showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full flex-1 bg-black/50 h-full`}>
            {!selectedConversation ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
                <MessageSquare size={64} className="opacity-20 mb-5 text-[#0AAFFD]/40" />
                <h3 className="text-lg font-medium text-gray-400 mb-1">Sohbet Seç</h3>
                <p className="max-w-xs text-sm">Başlamak için sol panelden bir sohbet seçin veya yeni bir sohbet başlatın.</p>
              </div>
            ) : (
              <>
                <div className="p-3 px-4 border-b border-[#0AAFFD]/20 flex items-center flex-shrink-0 bg-black/60 backdrop-blur-sm shadow-sm">
              {isSmallScreen && (
                    <button
                      onClick={handleBackToConversations}
                      className="mr-3 text-gray-400 hover:text-[#0AAFFD] p-1 rounded-full hover:bg-[#0AAFFD]/10 transition-colors"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}
                  <div className="flex items-center flex-1 min-w-0">
                     <img
                        src={getFullImageUrl(selectedConversation.sender?.profileImage)}
                        alt={selectedConversation.sender?.username}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-[#0AAFFD]/40"
                      />
                    <div className="ml-3 overflow-hidden">
                      <h2 className="font-semibold text-gray-100 truncate text-sm">
                        {selectedConversation.sender?.fullName || selectedConversation.sender?.username}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {selectedConversation.sender?.online ? <span className="text-green-400">Çevrimiçi</span> : formatLastSeen(selectedConversation.sender?.lastSeen)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 ml-3">
                    <button className="p-2 rounded-full text-gray-400 hover:text-[#0AAFFD] hover:bg-[#0AAFFD]/10 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button className="p-2 rounded-full text-gray-400 hover:text-[#0AAFFD] hover:bg-[#0AAFFD]/10 transition-colors">
                      <Video size={18} />
                    </button>
                    <button className="p-2 rounded-full text-gray-400 hover:text-[#0AAFFD] hover:bg-[#0AAFFD]/10 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
                
                <div ref={messageContainerRef} className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-[#0AAFFD]/40 hover:scrollbar-thumb-[#0AAFFD]/60 scrollbar-track-transparent scrollbar-thumb-rounded-full">
                  {loading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader size={28} className="animate-spin text-[#0AAFFD]/70" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
                       <MessageSquare size={48} className="opacity-20 mb-3 text-[#0AAFFD]/40" />
                      <p className="text-sm">Henüz mesaj yok. İlk mesajı gönderin!</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      <MessageList 
                        key="message-list"
                        messages={messages} 
                    currentUser={user} 
                        formatTime={formatMessageTime} 
                      />
                      {isTyping && selectedConversation && (
                        <TypingIndicator key="typing-indicator" senderInfo={selectedConversation.sender} />
                      )}
                      <div key="scroll-end-ref" ref={messagesEndRef} className="h-px" />
                    </AnimatePresence>
                  )}
                </div>
                
                <div className="border-t border-[#0AAFFD]/20 p-3 bg-black/60 backdrop-blur-sm">
                  {mediaFile && !isUploading && (
                    <MediaPreview 
                      media={mediaFile} 
                      onCancel={handleCancelMedia} 
                    />
                  )}
                  {isUploading && <UploadProgress progress={uploadProgress} />}
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    // 🚨 EMERGENCY FIX: selectedUserId undefined kontrolü
                    if (!selectedUserId) {
                      console.log('🚨 EMERGENCY FORM: selectedUserId undefined, URL\'den çıkarılıyor!');
                      const urlParts = window.location.pathname.split('/');
                      const urlUserId = urlParts[urlParts.length - 1];
                      if (urlUserId && urlUserId !== 'messages' && !isNaN(Number(urlUserId))) {
                        console.log('🚨 EMERGENCY FORM: URL\'den alınan userId:', urlUserId);
                        setSelectedUserId(urlUserId);
                        
                        // 100ms bekle ve sonra mesajı gönder
                        setTimeout(() => {
                          handleSendMessage(e);
                        }, 100);
                        return;
                      }
                    }
                    
                    handleSendMessage(e);
                  }} className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={handleFileSelect}
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                    />
                    <button 
                      type="button" 
                      className="p-2.5 text-gray-400 hover:text-[#0AAFFD] transition-colors rounded-full hover:bg-[#0AAFFD]/10"
                      onClick={handleFileButtonClick}
                      disabled={isUploading}
                      title="Dosya Ekle"
                    >
                      {isUploading ? (
                        <Loader size={20} className="animate-spin text-[#0AAFFD]" />
                      ) : (
                        <Image size={20} />
                      )}
                    </button>
                    
                    <input
                      type="text"
                  ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        setIsTyping(e.target.value.trim() !== '');
                      }}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 bg-black/40 border border-[#0AAFFD]/25 text-gray-200 placeholder-gray-500 px-4 py-2.5 rounded-full focus:outline-none"
                      disabled={isUploading}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          // 🚨 EMERGENCY FIX: selectedUserId undefined kontrolü
                          if (!selectedUserId) {
                            console.log('🚨 EMERGENCY KEYPRESS: selectedUserId undefined, URL\'den çıkarılıyor!');
                            const urlParts = window.location.pathname.split('/');
                            const urlUserId = urlParts[urlParts.length - 1];
                            if (urlUserId && urlUserId !== 'messages' && !isNaN(Number(urlUserId))) {
                              console.log('🚨 EMERGENCY KEYPRESS: URL\'den alınan userId:', urlUserId);
                              setSelectedUserId(urlUserId);
                              
                              // 100ms bekle ve sonra mesajı gönder
                              setTimeout(() => {
                                handleSendMessage(e);
                              }, 100);
                              return;
                            }
                          }
                          
                          handleSendMessage(e);
                        }
                      }}
                    />
                    
                    <button
                      type="submit"
                      className={`p-2.5 rounded-full transition-all duration-300 ease-in-out transform ${
                        (!newMessage.trim() && !mediaFile) || isUploading 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#0AAFFD] text-black hover:bg-[#0AAFFD]/80 hover:scale-110 shadow-md hover:shadow-[#0AAFFD]/40'
                      }`}
                      disabled={(!newMessage.trim() && !mediaFile) || isUploading}
                      title="Gönder"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </>
            )}
      </div>

      {/* Yeni Konuşma Modal'ı */}
        <AnimatePresence>
        {showNewConversation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <NewConversation 
                onClose={() => setShowNewConversation(false)} 
                onSelectUser={startNewConversation}
              followingUsers={followingUsers}
              />
          </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Messages; 