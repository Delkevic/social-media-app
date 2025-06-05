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

// Utility function to convert boolean attributes to strings
const convertBooleanProps = (props) => {
  const result = { ...props };
  const attributesToConvert = ['jsx', 'global'];
  
  attributesToConvert.forEach(attr => {
    if (attr in result && typeof result[attr] === 'boolean') {
      result[attr] = result[attr].toString();
    }
  });
  
  return result;
};

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
};

// Medya dosyası bileşeni
const MediaPreview = ({ media, onCancel }) => {
  if (!media) return null;
  
  const mediaUrl = media.preview;
  
  return (
    <div className="relative mb-2 w-full">
      <div className="rounded-xl overflow-hidden border border-[#0affd9]/30 bg-black/50 backdrop-blur-sm">
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
        className="absolute -top-2 -right-2 rounded-full bg-red-600 hover:bg-red-700 text-white p-1 transition-colors shadow-lg"
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
      <div className="bg-black/50 rounded-full h-2 backdrop-blur-sm border border-[#0affd9]/20">
        <div 
          className="bg-gradient-to-r from-[#0affd9] to-[#00d4aa] h-2 rounded-full transition-all duration-300 ease-out"
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
    ? 'bg-gradient-to-r from-[#0affd9] to-[#00d4aa] text-black rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl shadow-lg' 
    : 'bg-black/70 backdrop-blur-sm text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl border border-[#0affd9]/20';
  
  const formattedTime = message.sentAt 
    ? formatDistanceToNow(new Date(message.sentAt), { addSuffix: true, locale: tr }) 
    : '';
    
  const mediaUrl = message.mediaUrl 
    ? mediaService.getMediaUrl(message.mediaUrl, message.mediaType?.startsWith('image/') ? 'image' : 'video')
    : null;
    
  const isImage = message.mediaType?.startsWith('image/');
  const isVideo = message.mediaType?.startsWith('video/');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!isCurrentUser && (
        <div className="mr-2 w-8 h-8">
          <img 
            src={getFullImageUrl(message.senderInfo?.profileImage)} 
            alt="Avatar" 
            className="rounded-full w-8 h-8 border-2 border-[#0affd9]/30" 
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
            <span className="ml-2 text-[#0affd9]">✓✓</span>
          )}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="ml-2 w-8 h-8">
          <img 
            src={getFullImageUrl(message.senderInfo?.profileImage)} 
            alt="Avatar" 
            className="rounded-full w-8 h-8 border-2 border-[#0affd9]/30" 
          />
        </div>
      )}
    </motion.div>
  );
};

// Konuşma listesi öğesi
const ConversationItem = ({ conversation, isActive, onClick, currentUserId }) => {
  const lastMessageTime = formatDistanceToNow(new Date(conversation.lastTimestamp), { 
    addSuffix: true, locale: tr 
  });
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`flex items-center p-4 cursor-pointer border-b border-[#0affd9]/10 hover:bg-black/40 transition-all duration-200 backdrop-blur-sm ${
        isActive ? 'bg-black/60 border-l-4 border-l-[#0affd9]' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <img 
          src={getFullImageUrl(conversation.profileImage)} 
          alt={conversation.username} 
          className="w-12 h-12 rounded-full object-cover border-2 border-[#0affd9]/30" 
        />
        {conversation.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#0affd9] to-[#00d4aa] rounded-full w-5 h-5 flex items-center justify-center text-xs text-black font-bold shadow-lg">
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
    </motion.div>
  );
};

// Takip edilen kullanıcıları listeleyen bileşen
const FollowingSuggestions = ({ users, onSelectUser, currentUserId }) => {
  if (!users || users.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400">
        <Users size={48} className="mx-auto mb-4 opacity-50" />
        <p>Önerilen kullanıcı bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="bg-black/70 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-[#0affd9]/20 h-full">
      <div className="px-6 py-4 border-b border-[#0affd9]/20">
        <h3 className="text-sm font-medium text-[#0affd9]">Takip Ettiklerim</h3>
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        {users.map((user, index) => (
          <motion.div 
            key={user.id || `user-${index}`} 
            whileHover={{ scale: 1.02 }}
            className="px-6 py-4 hover:bg-black/40 flex items-center cursor-pointer transition-all duration-200"
            onClick={() => onSelectUser(user.id)}
          >
            <div className="relative">
              <img 
                src={user.profileImage || '/default-avatar.png'} 
                alt={user.username} 
                className="h-10 w-10 rounded-full object-cover border-2 border-[#0affd9]/30"
              />
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-black shadow-lg"></span>
            </div>
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-white">{user.fullName || user.username}</p>
              </div>
              <p className="text-xs text-gray-400 truncate">@{user.username}</p>
            </div>
          </motion.div>
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
  console.log('🔍 MessageList render edildi - Mesaj sayısı:', messages.length);

  // Basit tarih gruplandırması
  const messageGroups = useMemo(() => {
    const groups = {};
    
    messages.forEach(message => {
      let messageDateStr = 'Bugün'; // Varsayılan olarak bugün
      
      try {
        if (message.sentAt) {
          const messageDate = new Date(message.sentAt);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (messageDate.toDateString() === today.toDateString()) {
            messageDateStr = 'Bugün';
          } else if (messageDate.toDateString() === yesterday.toDateString()) {
            messageDateStr = 'Dün';
          } else {
            messageDateStr = messageDate.toLocaleDateString('tr-TR');
          }
        }
      } catch (e) {
        console.warn("Tarih formatlanamadı:", message.sentAt, e);
        messageDateStr = "Bugün";
      }
      
      if (!groups[messageDateStr]) {
        groups[messageDateStr] = [];
      }
      groups[messageDateStr].push(message);
    });
    
    console.log('📊 Mesaj grupları:', Object.keys(groups), 'Toplam mesaj sayısı:', messages.length);
    return groups;
  }, [messages]);
  
  const sortedDates = Object.keys(messageGroups).sort((a, b) => {
    // Basit sıralama: Bugün en üstte, sonra tarih sırasına göre
    if (a === 'Bugün') return -1;
    if (b === 'Bugün') return 1;
    if (a === 'Dün') return -1;
    if (b === 'Dün') return 1;
    return 0; // Diğerleri için sıralama yapmayalım şimdilik
  });

  if (messages.length === 0) {
    console.log('⚠️ MessageList: Hiç mesaj yok');
    return <div className="text-center text-gray-400 py-8">Henüz mesaj yok</div>;
  }

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
    
    console.log('🔥 MESAJ GÖNDERME DEBUG BAŞLADI:', {
      messageInput: messageInput,
      messageInput_length: messageInput.length,
      messageInput_trimmed: messageInput.trim(),
      messageInput_trimmed_length: messageInput.trim().length,
      selectedUserId: selectedUserId,
      conversationId: conversationId,
      selectedConversation: selectedConversation,
      mediaFile: mediaFile,
      isUploading: isUploading,
      user: user
    });
    
    // Basit validasyon kontrolü
    if (!messageInput.trim() && !mediaFile) {
      console.warn('❌ Mesaj boş veya medya dosyası yok');
      return;
    }
    
    if (isUploading) {
      console.warn('❌ Upload devam ediyor');
      return;
    }
    
    if (!user) {
      console.error('❌ User undefined');
      toast.error('Kullanıcı girişi gerekli');
      return;
    }
    
    // selectedUserId'yi kontrol et ve düzelt
    let actualSelectedUserId = selectedUserId;
    
    if (!actualSelectedUserId && conversationId) {
      console.log('⚠️ selectedUserId undefined, conversationId kullanılıyor:', conversationId);
      actualSelectedUserId = conversationId;
      setSelectedUserId(conversationId);
    }
    
    if (!actualSelectedUserId && selectedConversation?.sender?.id) {
      console.log('⚠️ selectedUserId hala undefined, selectedConversation kullanılıyor:', selectedConversation.sender.id);
      actualSelectedUserId = selectedConversation.sender.id;
      setSelectedUserId(selectedConversation.sender.id);
    }
    
    // URL'den çıkar (son çare)
    if (!actualSelectedUserId) {
      const urlParts = window.location.pathname.split('/');
      const urlUserId = urlParts[urlParts.length - 1];
      if (urlUserId && urlUserId !== 'messages' && !isNaN(Number(urlUserId))) {
        console.log('🚨 SON ÇARE: URL\'den alınıyor:', urlUserId);
        actualSelectedUserId = urlUserId;
        setSelectedUserId(urlUserId);
      }
    }
    
    if (!actualSelectedUserId) {
      console.error('❌ actualSelectedUserId bulunamadı');
      toast.error('Alıcı kullanıcı seçilmedi');
      return;
    }
    
    // String'e çevir
    actualSelectedUserId = String(actualSelectedUserId);
    
    console.log('✅ FİNAL KONTROL:', {
      actualSelectedUserId: actualSelectedUserId,
      messageContent: messageInput.trim(),
      userValid: !!user,
      readyToSend: true
    });
    
    try {
      setIsUploading(true);
      
      const messageContent = messageInput.trim();
      
      // Input'u hemen temizle
      setMessageInput('');
      setMediaFile(null);
      
      // Backend'e gönder
      console.log('📡 Backend\'e gönderiliyor...', {
        receiverId: actualSelectedUserId,
        content: messageContent
      });
      
      const response = await api.messages.sendMessage(actualSelectedUserId, {
        content: messageContent,
        mediaUrl: mediaFile?.preview || '',
        mediaType: mediaFile?.fileType || ''
      });
      
      console.log('📨 Backend response:', response);
      
      if (response.success) {
        console.log('✅ Backend\'e başarıyla gönderildi!');
        toast.success('Mesaj gönderildi!');
        
        // MESAJLARI YENİDEN YÜKLE!
        console.log('🔄 Mesajları yeniden yüklüyoruz...');
        try {
          const messagesResponse = await api.messages.getConversation(actualSelectedUserId);
          console.log('🔄 Yeniden yüklenen mesajlar:', messagesResponse);
          
          if (messagesResponse.success && messagesResponse.data && messagesResponse.data.messages) {
            const apiMessages = messagesResponse.data.messages.map(msg => ({
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
            
            console.log('✅ Mesajlar yeniden yüklendi ve state\'e set edildi:', {
              previousCount: messages.length,
              newCount: sortedMessages.length,
              latestMessage: sortedMessages[sortedMessages.length - 1]
            });
            
            setMessages(sortedMessages);
            
            // Scroll to bottom
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }
        } catch (reloadError) {
          console.error('❌ Mesajları yeniden yükleme hatası:', reloadError);
        }
        
      } else {
        console.error('❌ Backend hatası:', response.message);
        toast.error('Mesaj gönderilemedi: ' + response.message);
        setMessageInput(messageContent); // Input'u geri getir
      }
      
    } catch (error) {
      console.error('❌ GENEL HATA:', error);
      toast.error('Mesaj gönderilirken hata oluştu');
      setMessageInput(messageInput); // Input'u geri getir
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Input'a tekrar odaklan
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
    <div className="min-h-screen w-full relative bg-black text-white overflow-hidden">
      {/* Sparkles arkaplan */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="messagesSparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={30}
            className="w-full h-full"
            particleColor="#0affd9"
            speed={0.2}
            jsx="true"
            global="true"
          />
        }).component}
      </div>

      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-black opacity-85 [mask-image:radial-gradient(circle_at_center,transparent_20%,black)]"
        style={{ backdropFilter: "blur(2px)" }}
      ></div>

      {/* Ana konteyner */}
      <div className="relative z-10 h-screen flex">
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
        } border-r border-[#0affd9]/20 bg-black/70 backdrop-blur-sm flex flex-col relative`}>
          
          {/* GlowingEffect */}
          <GlowingEffect
            color="#0affd9"
            spread={30}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={1}
          />
          
          {/* Arama ve Başlık */}
          <div className="p-6 border-b border-[#0affd9]/20">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">
                <span className="bg-gradient-to-r from-[#0affd9] to-[#00d4aa] bg-clip-text text-transparent">
                  Mesajlar
                </span>
              </h1>
              <div className="flex gap-3">
                <button 
                  onClick={() => startNewConversation(2)}
                  className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 rounded-xl text-sm hover:from-green-700 hover:to-green-600 transition-all duration-200 shadow-lg"
                  title="yakup2 ile sohbet başlat (test)"
                >
                  @yakup2
                </button>
                
                <button 
                  onClick={() => setShowNewConversation(true)}
                  className="bg-gradient-to-r from-[#0affd9] to-[#00d4aa] text-black p-3 rounded-xl hover:scale-105 transition-all duration-200 shadow-lg"
                  title="Yeni sohbet başlat"
                >
                  <PlusCircle size={20} />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Sohbetleri ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/50 text-gray-200 placeholder-gray-400 border border-[#0affd9]/30 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#0affd9]/50 focus:border-[#0affd9] transition-all duration-200 backdrop-blur-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[#0affd9]/40 hover:scrollbar-thumb-[#0affd9]/60 scrollbar-track-transparent scrollbar-thumb-rounded-full pr-1">
            {loading && conversations.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <Loader size={28} className="animate-spin text-[#0affd9]/70" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400 mt-8">
                 <MessageSquare className="h-20 w-20 mb-6 opacity-30 text-[#0affd9]/50" />
                 <p className="text-lg mb-2">Henüz bir sohbetiniz yok</p>
                 <p className="text-sm">Yeni bir sohbet başlatarak mesajlaşmaya başlayın</p>
               </div>
            ) : filteredConversations.length === 0 && search ? (
              <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400 mt-8">
                <Search className="h-20 w-20 mb-6 opacity-30 text-[#0affd9]/50" />
                <p className="text-lg mb-2">"<span className='font-medium text-gray-300'>{search}</span>" için sonuç bulunamadı</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredConversations.map((conversation) => (
                  <motion.div
                    key={conversation.sender ? conversation.sender.id : `conversation-${Date.now()}-${Math.random()}`}
                    layout 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ease-out relative overflow-hidden group ${ 
                      selectedConversation?.sender?.id === conversation.sender?.id
                        ? 'bg-gradient-to-r from-[#0affd9]/20 to-[#00d4aa]/20 border border-[#0affd9]/40 shadow-lg'
                        : 'hover:bg-black/40 backdrop-blur-sm border border-transparent hover:border-[#0affd9]/20'
                    }`}
                    onClick={() => {
                      selectConversation(conversation);
                      if (isSmallScreen) setShowMobileChat(true);
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={getFullImageUrl(conversation.sender?.profileImage)}
                        alt={conversation.sender?.username}
                        className={`w-12 h-12 rounded-full object-cover border-2 ${
                          selectedConversation?.sender?.id === conversation.sender?.id 
                            ? 'border-[#0affd9]' 
                            : 'border-[#0affd9]/30 group-hover:border-[#0affd9]/50'
                        } transition-colors`}
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${
                        conversation.sender?.online ? 'bg-green-400' : 'bg-gray-600'
                      } border-2 border-black shadow-lg`}></div>
                    </div>

                    <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`font-semibold text-sm truncate ${
                          selectedConversation?.sender?.id === conversation.sender?.id 
                            ? 'text-[#0affd9]' 
                            : 'text-gray-200 group-hover:text-white'
                        }`}>
                          {conversation.sender?.fullName || conversation.sender?.username || 'Bilinmeyen Kullanıcı'}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-gray-300 flex-shrink-0 ml-2">
                          {conversation.lastTimestamp ? formatMessageTime(conversation.lastTimestamp) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className={`text-xs truncate pr-2 ${
                          conversation.unreadCount > 0 && selectedConversation?.sender?.id !== conversation.sender?.id 
                            ? 'text-gray-200 font-medium' 
                            : 'text-gray-400 group-hover:text-gray-300'
                        }`}>
                           {conversation.lastMessage || "..."}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <div className="flex-shrink-0 w-5 h-5 text-[10px] rounded-full bg-gradient-to-r from-[#0affd9] to-[#00d4aa] text-black flex items-center justify-center font-bold shadow-lg">
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

        {/* Sağ taraf - Mesaj alanı */}
        <div className={`${isSmallScreen && !showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full flex-1 bg-black/70 backdrop-blur-sm h-full relative`}>
          
          {/* GlowingEffect */}
          <GlowingEffect
            color="#0affd9"
            spread={20}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={1}
          />
          
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
              <MessageSquare size={80} className="opacity-20 mb-8 text-[#0affd9]/40" />
              <h3 className="text-2xl font-medium text-gray-300 mb-3">Sohbet Seç</h3>
              <p className="max-w-md text-gray-400">Başlamak için sol panelden bir sohbet seçin veya yeni bir sohbet başlatın.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#0affd9]/20 flex items-center flex-shrink-0 bg-black/60 backdrop-blur-sm">
                {isSmallScreen && (
                  <button
                    onClick={handleBackToConversations}
                    className="mr-4 text-gray-400 hover:text-[#0affd9] p-2 rounded-full hover:bg-[#0affd9]/10 transition-all duration-200"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}
                <div className="flex items-center flex-1 min-w-0">
                   <img
                      src={getFullImageUrl(selectedConversation.sender?.profileImage)}
                      alt={selectedConversation.sender?.username}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-[#0affd9]/40"
                    />
                  <div className="ml-4 overflow-hidden">
                    <h2 className="font-semibold text-gray-100 truncate text-lg">
                      {selectedConversation.sender?.fullName || selectedConversation.sender?.username}
                    </h2>
                    <span className="text-sm text-gray-400">
                      {selectedConversation.sender?.online ? 
                        <span className="text-green-400">Çevrimiçi</span> : 
                        formatLastSeen(selectedConversation.sender?.lastSeen)
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-3 rounded-full text-gray-400 hover:text-[#0affd9] hover:bg-[#0affd9]/10 transition-all duration-200">
                    <Phone size={20} />
                  </button>
                  <button className="p-3 rounded-full text-gray-400 hover:text-[#0affd9] hover:bg-[#0affd9]/10 transition-all duration-200">
                    <Video size={20} />
                  </button>
                  <button className="p-3 rounded-full text-gray-400 hover:text-[#0affd9] hover:bg-[#0affd9]/10 transition-all duration-200">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
              
              {/* Messages Container */}
              <div ref={messageContainerRef} className="flex-1 overflow-y-auto py-6 px-4 scrollbar-thin scrollbar-thumb-[#0affd9]/40 hover:scrollbar-thumb-[#0affd9]/60 scrollbar-track-transparent scrollbar-thumb-rounded-full">
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader size={32} className="animate-spin text-[#0affd9]/70" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-4">
                     <MessageSquare size={64} className="opacity-20 mb-6 text-[#0affd9]/40" />
                    <p className="text-lg mb-2">Henüz mesaj yok</p>
                    <p className="text-gray-500">İlk mesajı gönderin!</p>
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
              
              {/* Message Input */}
              <div className="border-t border-[#0affd9]/20 p-4 bg-black/60 backdrop-blur-sm">
                {mediaFile && !isUploading && (
                  <MediaPreview 
                    media={mediaFile} 
                    onCancel={handleCancelMedia} 
                  />
                )}
                {isUploading && <UploadProgress progress={uploadProgress} />}
                
                <form onSubmit={(e) => {
                  console.log('🔥 FORM SUBMIT TETIKLENDI!');
                  handleSendMessage(e);
                }} className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                  />
                  <button 
                    type="button" 
                    className="p-3 text-gray-400 hover:text-[#0affd9] transition-all duration-200 rounded-xl hover:bg-[#0affd9]/10"
                    onClick={() => {
                      console.log('📎 File button clicked');
                      handleFileButtonClick();
                    }}
                    disabled={isUploading}
                    title="Dosya Ekle"
                  >
                    <Image size={20} />
                  </button>
                  
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        console.log('⌨️ Key pressed:', e.key);
                        if (e.key === 'Enter' && !e.shiftKey) {
                          console.log('🔥 ENTER PRESSED!');
                          e.preventDefault();
                          if (messageInput.trim() || mediaFile) {
                            handleSendMessage(e);
                          }
                        }
                      }}
                      placeholder="Mesajınızı yazın..."
                      className="w-full bg-black/50 text-gray-200 placeholder-gray-400 border border-[#0affd9]/30 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#0affd9]/50 focus:border-[#0affd9] transition-all duration-200 backdrop-blur-sm resize-none max-h-32"
                      rows={1}
                      disabled={isUploading}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={(!messageInput.trim() && !mediaFile) || isUploading}
                    onClick={() => {
                      console.log('🔥 SUBMIT BUTTON CLICKED!');
                    }}
                    className="p-3 rounded-xl bg-gradient-to-r from-[#0affd9] to-[#00d4aa] text-black hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
                    title="Mesaj Gönder"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* NewConversation Modal */}
      <AnimatePresence>
        {showNewConversation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowNewConversation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/70 backdrop-blur-sm rounded-2xl border border-[#0affd9]/20 p-6 w-full max-w-md mx-4 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <GlowingEffect
                color="#0affd9"
                spread={30}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={1}
              />
              
              <NewConversation 
                onClose={() => setShowNewConversation(false)}
                onSelectUser={startNewConversation}
                followingUsers={followingUsers}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Messages; 