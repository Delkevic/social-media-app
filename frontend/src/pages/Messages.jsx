import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { API_BASE_URL } from '../config/constants';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, isYesterday, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as messageService from '../services/message-services';
import * as mediaService from '../services/media-service';
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
  Loader
} from 'lucide-react';
import { FaPaperPlane, FaImage, FaSmile, FaEllipsisV } from 'react-icons/fa';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { toast } from 'react-hot-toast';

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U`;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}/${url}`;
};

// Medya dosyası bileşeni
const MediaPreview = ({ media, onCancel }) => {
  if (!media) return null;
  
  const mediaUrl = media.preview;
  
  return (
    <div className="relative mb-2 w-full">
      <div className="rounded-md overflow-hidden border border-gray-700 bg-gray-800">
        {media.fileType === 'image' ? (
          <img 
            src={mediaUrl} 
            alt="Upload preview" 
            className="max-h-64 max-w-full object-contain"
          />
        ) : media.fileType === 'video' ? (
          <video 
            src={mediaUrl} 
            controls 
            className="max-h-64 max-w-full"
          />
        ) : (
          <div className="flex items-center justify-center p-4">
            <FileIcon className="mr-2 text-blue-400" />
            <span className="text-white">{media.name}</span>
          </div>
        )}
      </div>
      <button 
        className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-1"
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
    <div className="mb-2 w-full">
      <div className="bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-blue-500 h-2.5 rounded-full" 
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
const NewConversation = ({ onClose, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Takip edilen kullanıcıları getir
  useEffect(() => {
    const fetchFollowing = async () => {
      setFollowingLoading(true);
      try {
        const response = await api.user.getFollowing();
        if (response.success) {
          setFollowingUsers(response.data || []);
        }
      } catch (error) {
        console.error("Takip edilen kullanıcılar yüklenemedi:", error);
      } finally {
        setFollowingLoading(false);
      }
    };

    fetchFollowing();
  }, []);

  // Kullanıcı arama - debounce ile
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
    } finally {
      setLoading(false);
    }
  };

  // Arama değişikliği - debounce ile anlık arama
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    
    // Önceki timeout'u temizle
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // 300ms sonra aramayı başlat (debounce)
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
      className="bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-700/50 w-full max-w-md overflow-hidden"
    >
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-100">Yeni Mesaj</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700/50"
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
            placeholder="Kime mesaj göndermek istiyorsun?"
            className="w-full py-2.5 px-4 pr-10 bg-gray-700/60 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 border border-transparent focus:border-indigo-500/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {loading ? (
              <div className="w-5 h-5 border-t-2 border-indigo-400 border-solid rounded-full animate-spin"></div>
            ) : (
              <Search size={18} />
            )}
          </div>
        </div>
        
        <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent pr-1">
          {searchResults.length > 0 ? (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Arama Sonuçları</h3>
              {searchResults.map(user => (
                <div 
                  key={user.id}
                  onClick={() => onSelectUser(user.id)}
                  className="flex items-center p-2.5 hover:bg-gray-700/50 cursor-pointer rounded-lg transition-colors duration-150"
                >
                  <img 
                    src={getFullImageUrl(user.profileImage)} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

const MessageList = React.memo(({ messages, currentUser, formatTime }) => {
  const messageGroups = useMemo(() => {
    const groups = {};
    
    messages.forEach(message => {
      // Geçerli bir tarih olduğundan emin olalım
      let messageDateStr;
      try {
        messageDateStr = new Date(message.sentAt).toLocaleDateString(tr.code); 
      } catch (e) {
        console.warn("Geçersiz tarih formatı:", message.sentAt);
        messageDateStr = "Bilinmeyen Tarih";
      }
      
      if (!groups[messageDateStr]) {
        groups[messageDateStr] = [];
      }
      groups[messageDateStr].push(message);
    });
    
    return groups;
  }, [messages]);
  
  return (
    <div className="space-y-4 px-2 md:px-4">
      {Object.keys(messageGroups).sort((a, b) => new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-'))).map(dateStr => {
        let displayDate;
        const todayStr = new Date().toLocaleDateString(tr.code);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString(tr.code);

        if (dateStr === todayStr) {
          displayDate = 'Bugün';
        } else if (dateStr === yesterdayStr) {
          displayDate = 'Dün';
        } else {
          displayDate = dateStr;
        }
        
        return (
          <div key={dateStr}>
            <div className="flex justify-center my-4">
              <span className="text-xs px-3 py-1 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/50">
                {displayDate}
              </span>
            </div>
            
            {messageGroups[dateStr].map((message) => {
              const isCurrentUser = currentUser && message.senderId === currentUser.id;
              const isTemporary = message.id && message.id.toString().startsWith('temp-');
              
              // Tik durumunu belirle
              let tickIcon = null;
              if (isCurrentUser) {
                if (isTemporary) {
                  tickIcon = <Check size={16} className="text-gray-500" />;
                } else if (message.isRead) {
                  tickIcon = <CheckCheck size={16} className="text-sky-400" />;
                } else if (message.isDelivered) {
                  tickIcon = <CheckCheck size={16} className="text-gray-500" />;
                } else {
                  tickIcon = <Check size={16} className="text-gray-500" />;
                }
              }
              
              return (
                <motion.div 
                  key={message.id} 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`flex mb-3 items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Karşı tarafın avatarı (isteğe bağlı) */} 
                  {/* {!isCurrentUser && ( ... avatar kodu ... )} */}
                  
                  <div 
                    className={`relative max-w-[75%] md:max-w-[65%] rounded-t-2xl px-4 py-2.5 shadow-sm ${ 
                      isCurrentUser
                        ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-l-2xl'
                        : 'bg-gray-700/80 text-gray-100 rounded-r-2xl border border-gray-600/50'
                    } ${isTemporary ? 'opacity-60' : ''}`}
                  >
                    <p className="text-sm leading-relaxed break-words">{message.content}</p> 
                    <div className="text-xs mt-1.5 text-right flex items-center justify-end space-x-1 ${isCurrentUser ? 'text-sky-100/70' : 'text-gray-400/70'}">
                      <span>{formatTime(message.sentAt)}</span>
                      {isCurrentUser && tickIcon && (
                        <span>
                          {tickIcon}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

// Yazıyor göstergesi bileşeni
const TypingIndicator = React.memo(({ senderInfo }) => {
  // senderInfo yoksa veya resmi yoksa varsayılan göster
  const profileImageUrl = getFullImageUrl(senderInfo?.profileImage);
  const usernameInitial = senderInfo?.username?.charAt(0).toUpperCase() || '?';

  return (
    <motion.div 
      className="flex mb-3 items-end justify-start pl-2 md:pl-4"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Profil Resmi */} 
      <div className="flex-shrink-0 mr-2">
        <img 
          src={profileImageUrl}
          alt={senderInfo?.username || 'avatar'}
          className="w-8 h-8 rounded-full object-cover border border-gray-600/50"
        />
      </div>
      {/* Baloncuk */}
      <div className="max-w-[70%] rounded-t-2xl rounded-r-2xl px-4 py-3 bg-gray-700/80 text-gray-100 border border-gray-600/50">
        <div className="flex space-x-1.5 items-center h-5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400/70"
              animate={{
                opacity: [0.3, 0.8, 0.3], // Soluklaşma efekti
                scale: [0.8, 1.1, 0.8]    // Hafif büyüme efekti
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,            // Süreyi biraz uzat
                ease: "easeInOut",
                delay: i * 0.2           // Noktaları gecikmeli başlat
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
  const { userId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);
  
  // WebSocket referansı
  const wsRef = useRef(null);
  const wsConnectedRef = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [followingSuggestions, setFollowingSuggestions] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const messageContainerRef = useRef(null);

  // Ekran boyutunu kontrol etmek için
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Kullanıcı oturumunu kontrol et
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('user')) || JSON.parse(localStorage.getItem('user'));
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    setCurrentUser(storedUser);
    fetchConversations();
  }, [navigate]);

  // Komponent yüklenmesi esnasında daha önce mesajlaşılan kullanıcıları çek
  useEffect(() => {
    if (currentUser) {
      fetchPreviousChats();
    }
  }, [currentUser]);

  // Daha önce mesajlaşılan kullanıcıları getir
  const fetchPreviousChats = async () => {
    try {
      console.log("Önceki mesajlaşmalar getiriliyor...");
      const response = await api.messages.getPreviousChats();
      if (response.success && response.data) {
        // Önceki mesajlaşmalar için state'i güncelle
        setPreviousChats(response.data);
        console.log("Önceki mesajlaşmalar yüklendi:", response.data.length);
      } else {
        console.warn("Önceki mesajlaşmalar yüklenemedi:", response.message || "Bilinmeyen hata");
      }
    } catch (error) {
      console.error("Önceki mesajlaşmalar yüklenemedi:", error);
    }
  };

  // URL'den gelen userId ile konuşma seçme
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const conversation = conversations.find(c => c.sender.id.toString() === userId);
      if (conversation) {
        selectConversation(conversation);
        if (isMobile) {
          setShowMobileChat(true);
        }
      }
    }
  }, [userId, conversations, isMobile]);

  // Mesajları otomatik kaydırma
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Yazıyor göstergesine göre de otomatik kaydırma
  useEffect(() => {
    if (isTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isTyping]);

  // WebSocket bağlantısı - useEffect
  useEffect(() => {
    if (!currentUser) return;
    
    const connectWebSocket = async () => {
      console.log("WebSocket bağlantısı başlatılıyor...");
      wsConnectedRef.current = false;
      
      try {
        // Önce token'ın geçerli olduğundan emin ol
        try {
          const refreshResponse = await api.refreshToken();
          if (!refreshResponse.success) {
            console.error("Token yenileme başarısız, WebSocket bağlantısı kurulamayabilir");
          }
        } catch (refreshError) {
          console.warn("Token yenileme sırasında hata:", refreshError);
        }
        
        // WebSocket bağlantısı oluştur
        const newWs = api.websocket.connect();
        wsRef.current = newWs;
        
        // Token doğrulama işlemini gerçekleştir
        try {
          await newWs.ensureAuthSent();
          console.log("WebSocket auth başarıyla tamamlandı");
          wsConnectedRef.current = true;
        } catch (authError) {
          console.error("WebSocket auth hatası:", authError.message);
          return; // Auth başarısız olduğunda bağlantıyı yeniden kurmaya çalışma
        }
        
        // Mesaj alma işleyicisi
        newWs.onmessage = (event) => {
          const receptionTime = Date.now();
          
          try {
            const data = JSON.parse(event.data);
            
            // Auth başarı mesajı
            if (data.type === 'auth_success') {
              console.log("WebSocket bağlantı başarı mesajı alındı:", data.message);
              return;
            }

            // Auth hata mesajı - token yenileme ihtiyacı
            if (data.type === 'auth_error' && data.error && data.error.includes('expired')) {
              console.log("Token süresi dolmuş, yenileme deneniyor...");
              
              // WebSocket'i kapat ve yeniden bağlan
              scheduleReconnect(0);
              return;
            }
            
            // ... Mevcut diğer mesaj işlemleri ...
          } catch (error) {
            console.error(`[${receptionTime}] WebSocket mesajı ayrıştırma hatası:`, error, "Ham veri:", event.data);
          }
        };
      } catch (error) {
        console.error("WebSocket bağlantısı kurulurken hata:", error);
      }
    };
    
    // Yeniden bağlanma zamanla
    const scheduleReconnect = (delay) => {
      console.log("Yeniden bağlanma planlanıyor...");
      
      // Önceki yeniden bağlanma zamanlayıcısını temizle
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 3 saniye sonra yeniden bağlanma girişimi
      console.log("WebSocket 3 saniye sonra yeniden bağlanacak");
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("WebSocket yeniden bağlanma girişimi başlatılıyor...");
        connectWebSocket();
      }, delay * 1000);
    };
    
    // İlk bağlantıyı kur
    connectWebSocket();
    
    // Komponent temizlendiğinde bağlantıyı kapat
    return () => {
      console.log('WebSocket temizleniyor...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [currentUser]);
  
  // WebSocket üzerinden gelen yeni mesajı işle
  const handleNewWebSocketMessage = (message, receptionTime) => {
    console.log(`[${Date.now()}] handleNewWebSocketMessage çağrıldı (alınma zamanı: ${receptionTime}):`, message);
    // Mesaj objesinin geçerli olup olmadığını kontrol et
    if (!message || typeof message !== 'object') {
      console.warn("Geçersiz WebSocket mesajı alındı:", message);
      return;
    }

    // Mesaj türüne göre işle
    if (message.type === 'typing') {
      console.log("Yazma durumu mesajı alındı:", message);
      // Seçili sohbete ait mi kontrol et
      if (selectedConversation && message.senderId === selectedConversation.sender.id) {
        setIsTyping(message.isTyping); // Yazma göstergesini güncelle
      }
      return;
    }
    
    // Normal mesaj değilse veya gerekli alanlar yoksa işleme
    if (!message.id && !message.tempId) {
      console.warn("Mesaj ID eksik, işlenemez:", message);
      return;
    }

    // Backend'den gelen mesaj için teslim edildi ve okundu durumlarını belirle
    const receivedMessage = {
      ...message,
      id: message.id || message.tempId || `temp-${Date.now()}`,
      isDelivered: true, // Backend'den geldi, teslim edildi varsayımı
      isRead: message.isRead || false // Okundu bilgisi varsa kullan, yoksa false
    };

    // Mesaj şu anki konuşmaya ait mi kontrol et
    const isCurrentConversation = selectedConversation && 
      (message.senderId === selectedConversation.sender.id || 
       (message.receiverId === selectedConversation.sender.id && message.senderId === currentUser.id));
       
    if (isCurrentConversation) {
      console.log("Geçerli konuşma için mesaj alındı, mesajlar listesi güncelleniyor:", receivedMessage.id);
      // Mesajlar listesine ekle/güncelle
      setMessages(prevMessages => {
        // Backend'den gelen gerçek ID ile eşleşen geçici mesaj var mı?
        const tempMessageIndex = prevMessages.findIndex(m => 
          m.id.toString().startsWith('temp-') && 
          m.senderId === message.senderId &&
          m.receiverId === message.receiverId &&
          m.content === message.content // İçerik eşleşmesi de kontrol edilebilir
        );

        if (tempMessageIndex !== -1) {
          // Geçici mesajı gerçek mesajla değiştir
          const updatedMessages = [...prevMessages];
          updatedMessages[tempMessageIndex] = receivedMessage;
          console.log("Geçici mesaj güncellendi:", receivedMessage.id);
          return updatedMessages;
        } else {
          // Mesaj zaten listede var mı kontrol et (çift mesajı önle)
          const exists = prevMessages.some(m => m.id === receivedMessage.id);
          if (exists) {
            console.log("Mesaj zaten mevcut:", receivedMessage.id);
            return prevMessages; // Değişiklik yapma
          }
          // Yeni mesajı ekle
          console.log("Mesaj ekleniyor:", receivedMessage);
          return [...prevMessages, receivedMessage];
        }
      });
      
      // Mesaj karşı taraftansa okundu olarak işaretle
      if (message.senderId === selectedConversation.sender.id && !receivedMessage.isRead) {
        markMessageAsRead(receivedMessage.id);
      }
    } else {
      console.log("Arka plandaki bir sohbete mesaj geldi:", message.senderId);
    }
    
    // Konuşmalar listesini güncelle (her zaman, sadece açık olana değil)
    updateConversationsWithNewMessage(receivedMessage);
  };
  
  // Konuşmalar listesini yeni mesaja göre güncelle
  const updateConversationsWithNewMessage = (message) => {
    console.log(`[${Date.now()}] updateConversationsWithNewMessage çağrıldı, mesaj:`, message);
    
    // Gerekli mesaj bilgilerini kontrol et
    if (!message || !message.id || !message.senderId || !message.receiverId || !currentUser) {
      console.error("updateConversationsWithNewMessage: Gerekli mesaj bilgileri eksik.", {message, currentUser});
      return;
    }

    setConversations(prevConversations => {
      console.log(`[${Date.now()}] setConversations tetiklendi (önceki: ${prevConversations.length} konuşma)`);
      let conversationUpdated = false;
      let isNewConversation = false;
      
      let updatedConversations = prevConversations.map(conv => {
        // Konuşma objesi ve sender kontrolü
        if (!conv || !conv.sender || typeof conv.sender.id === 'undefined') {
          console.warn("Geçersiz konuşma objesi atlanıyor:", conv);
          return conv;
        }
        
        // İlgili konuşmayı bul (mesajın göndericisi veya alıcısı mevcut kullanıcı değilse)
        const otherPartyId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
        const isRelated = conv.sender.id === otherPartyId;
        
        if (isRelated) {
          console.log(`[${Date.now()}] İlgili konuşma bulundu:`, conv.sender.username);
          conversationUpdated = true;
          // Konuşma bilgilerini güncelle
          const updatedConv = {
            ...conv,
            lastMessage: message.content || 'Medya', // İçerik yoksa medya varsayımı
            lastTimestamp: message.sentAt, // Son mesaj zamanını güncelle
            unreadCount: (message.receiverId === currentUser.id && 
                          (!selectedConversation || selectedConversation.sender.id !== message.senderId)) 
                          ? (conv.unreadCount || 0) + 1 
                          : conv.unreadCount
          };
          console.log(`[${Date.now()}] Konuşma güncellendi:`, updatedConv);
          return updatedConv;
        }
        return conv;
      });

      // Eğer ilgili konuşma bulunamadıysa ve mesaj bize geldiyse (yeni konuşma)
      if (!conversationUpdated && message.receiverId === currentUser.id) {
        console.log(`[${Date.now()}] Mevcut konuşma bulunamadı, yeni konuşma kontrol ediliyor...`);
        // Yeni konuşmayı eklemek için gönderen bilgisi var mı?
        if (message.senderInfo && message.senderInfo.id) {
          isNewConversation = true;
          const newConversation = {
            sender: {
              id: message.senderInfo.id,
              username: message.senderInfo.username || 'Bilinmeyen',
              fullName: message.senderInfo.fullName || '',
              profileImage: message.senderInfo.profileImage || null,
              online: true // Bu bilgi idealde backend'den gelmeli
            },
            lastMessage: message.content || 'Medya',
            unreadCount: 1, // Yeni konuşma olduğu için 1 okunmamış mesaj
            lastTimestamp: message.sentAt
          };
          updatedConversations = [newConversation, ...updatedConversations.filter(c => c && c.sender && c.sender.id !== newConversation.sender.id)]; // Varsa eski geçiciyi kaldır
          console.log(`[${Date.now()}] Yeni konuşma listeye eklendi:`, newConversation);
        } else {
           console.warn(`[${Date.now()}] Yeni konuşma eklenemedi: senderInfo eksik.`, message);
        }
      }
      
      // Eğer var olan bir konuşma güncellendiyse veya yeni konuşma eklendiyse, sırala
      if (conversationUpdated || isNewConversation) {
         // Güncellenen/yeni konuşmayı listenin başına taşı
        const targetUserId = message.senderId === currentUser.id ? message.receiverId : message.senderId;
        const targetConversationIndex = updatedConversations.findIndex(conv => conv && conv.sender && conv.sender.id === targetUserId);
        
        if (targetConversationIndex > 0) { // Zaten başta değilse
          console.log(`[${Date.now()}] Konuşma başa taşınıyor:`, updatedConversations[targetConversationIndex].sender.username);
          const targetConversation = updatedConversations.splice(targetConversationIndex, 1)[0];
          updatedConversations.unshift(targetConversation);
        } else if (targetConversationIndex === -1 && isNewConversation) {
           console.log(`[${Date.now()}] Yeni konuşma zaten başta.`);
        } else if (targetConversationIndex === 0) {
           console.log(`[${Date.now()}] Konuşma zaten başta.`);
        }
      }
      
      console.log(`[${Date.now()}] setConversations tamamlandı (sonraki: ${updatedConversations.length} konuşma)`);
      return updatedConversations;
    });
  };

  // Konuşmaları getir
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.messages.getConversations();
      if (response.success && response.data && response.data.conversations) {
        setConversations(response.data.conversations);
      } else {
        // Yanıt başarılı değilse veya beklenen veri yoksa hata ayarla
        setError(response.message || 'Konuşmalar yüklenirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Konuşmalar yüklenirken bir hata oluştu: ' + err.message);
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mesajları getir
  const fetchMessages = async (conversationId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.messages.getConversation(conversationId);
      if (response.success && response.data && response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (err) {
      setError('Mesajlar yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Konuşma seçildiğinde
  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.sender.id);
    
    // Konuşma seçildiğinde okunmamış mesaj sayısını sıfırla
    setConversations(prev => 
      prev.map(conv => 
        conv.sender.id === conversation.sender.id 
          ? { ...conv, unreadCount: 0 } 
          : conv
      )
    );
  };

  // Yazma durumunu gönder
  const sendTypingStatus = (isTyping) => {
    if (!selectedConversation || !wsConnectedRef.current || !wsRef.current || !currentUser) return;
    
    try {
      const typingMessage = {
        type: 'typing',
        senderId: currentUser.id,
        receiverId: selectedConversation.sender.id,
        isTyping: isTyping
      };
      
      // WebSocket hazır mı kontrol et
      if (wsRef.current.readyState === WebSocket.OPEN) {
        console.log("Yazma durumu gönderiliyor:", typingMessage);
        wsRef.current.send(JSON.stringify(typingMessage));
      } else {
        console.warn("WebSocket hazır değil, yazma durumu gönderilemiyor");
      }
    } catch (error) {
      console.error('Yazma durumu gönderme hatası:', error);
    }
  };

  // Mesaj okundu olarak işaretle
  const markMessageAsRead = async (messageId) => {
    try {
      await api.messages.markAsRead(messageId);
    } catch (err) {
      console.error('Mesaj okundu işaretleme hatası:', err);
    }
  };

  // Mesaj girmesi sırasında yazma durumunu gönder
  const handleMessageInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Yazma durumunu gönder
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Yazıyor olarak işaretle
    sendTypingStatus(true);
    
    // 2 saniye sonra yazma durumunu sonlandır
    const newTimeout = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
    
    setTypingTimeout(newTimeout);
  };

  // Mesajı gönderme
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && !mediaFile) || isUploading || !selectedConversation) return;
    
    // Medya yükleme varsa
    if (mediaFile) {
      setIsUploading(true);
      setUploadProgress(0);
      
      const uploadCancel = mediaService.uploadFile(
        mediaFile.file,
        (progress) => {
          setUploadProgress(progress);
        },
        async (uploadedMedia) => {
          // Başarılı yükleme sonrası mesaj gönder
          try {
            const messageData = {
              receiverId: selectedConversation.id,
              content: newMessage.trim(),
              mediaUrl: uploadedMedia.filename || uploadedMedia.url
            };
            
            const newMessage = {
              id: `temp-${Date.now()}`,
              conversationId: selectedConversation.id,
              content: newMessage.trim(),
              mediaUrl: mediaFile.preview,
              mediaType: mediaFile.type,
              sender: "currentUser",
              timestamp: new Date().toISOString(),
              isNew: true,
            };
            
            setMessages(prev => [...prev, newMessage]);
            setNewMessage("");
            setMediaFile(null);
            setIsUploading(false);
            
            await api.messages.sendMessage(messageData);
            
            // Yazıyor durumunu iptal et
            if (isTyping) {
              sendTypingStatus(false);
            }
            
            // Mesaj gönderildikten sonra mesajları yeniden yükle
            setTimeout(() => {
              fetchMessages(selectedConversation.id);
            }, 1000);
          } catch (error) {
            console.error("Medya içerikli mesaj gönderilirken hata:", error);
            toast.error("Mesaj gönderilemedi, lütfen tekrar deneyin");
          }
        },
        (error) => {
          setIsUploading(false);
          toast.error(error.message || "Dosya yüklenirken bir hata oluştu");
        }
      );
      
      return;
    }
    
    // Normal metin mesajı gönderme
    const newMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: newMessage.trim(),
      sender: "currentUser",
      timestamp: new Date().toISOString(),
      isNew: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    setNewMessage("");
    
    try {
      await messageService.sendMessage(selectedConversation.id, newMessage.content);
      
      // Yazıyor durumunu iptal et
      if (isTyping) {
        sendTypingStatus(false);
      }
      
      // Mesaj gönderildikten sonra mesajları yeniden yükle
      setTimeout(() => {
        fetchMessages(selectedConversation.id);
      }, 1000);
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      toast.error("Mesaj gönderilemedi, lütfen tekrar deneyin");
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
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

  // Yeni mesaj başlatma fonksiyonu
  const startNewConversation = (userId) => {
    setShowNewConversation(false);
    
    // Kullanıcı ID'sinin geçerli olduğundan emin ol
    if (!userId) {
      console.error("startNewConversation: Geçersiz userId", userId);
      setError("Kullanıcı seçilirken bir hata oluştu.");
      return;
    }

    // WebSocket bağlantısı kurulduktan sonra konuşma başlatma işlemine devam et
    const continueWithConversation = () => {
      // İlgili kullanıcı zaten seçilen kullanıcılar listesinden geldiği için
      // Doğrudan konuşmaya gidebiliriz
      fetchMessages(userId);
      
      // Konuşma listesinde varsa seç, yoksa kullanıcılar aramalarından seçilmiş bilgilerle oluştur
      const existingConversation = conversations.find(c => c.sender.id === userId);
      if (existingConversation) {
        selectConversation(existingConversation);
      } else {
        // Seçilen kullanıcıyı previousChats veya searchResults'tan bul
        let userData = null;
        
        // Önce previousChats içinde ara
        if (previousChats && previousChats.length > 0) {
          const foundUser = previousChats.find(user => user.id === userId);
          if (foundUser) {
            userData = foundUser;
          }
        }
        
        // Kullanıcı bulunamadıysa bir geçici kullanıcı bilgisi oluştur
        const tempConversation = {
          sender: {
            id: userId,
            username: userData ? userData.username : "Kullanıcı",
            fullName: userData ? userData.fullName : "Kullanıcı",
            profileImage: userData ? userData.profileImage : null
          },
          lastMessage: "",
          unreadCount: 0
        };
        
        // Konuşmayı seç
        setSelectedConversation(tempConversation);
        
        // Konuşmayı listeye ekle (böylece "Henüz mesajınız yok" yazısı kaybolur)
        setConversations(prevConversations => {
          // Eğer bu ID ile bir konuşma zaten varsa listeyi olduğu gibi döndür
          if (prevConversations.some(conv => conv.sender.id === userId)) {
            return prevConversations;
          }
          
          // Yoksa yeni konuşmayı ekle
          return [tempConversation, ...prevConversations];
        });
        
        // Mobil görünümde mesaj alanını göster
        if (isMobile) {
          setShowMobileChat(true);
        }
      }
    };
    
    // WebSocket bağlantısını kontrol et ve gerekirse yeniden kur
    if (!wsConnectedRef.current || !wsRef.current) {
      console.warn("startNewConversation: WebSocket bağlantısı hazır değil, yeniden bağlanılıyor...");
      
      // API üzerinden mesaj göndermek için WebSocket'i yeniden başlat
      const reconnectWs = async () => {
        // Önceki bağlantıyı kapat
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        
        // Yeni bir bağlantı başlat ve durumunu bekle
        const newWs = api.messages.createWebSocketConnection();
        wsRef.current = newWs;
        
        // Bağlantının kurulmasını bekle
        return new Promise((resolve) => {
          if (!newWs) {
            resolve(false);
            return;
          }
          
          // Yeni bağlantı zaten açıksa hemen true dön
          if (newWs.readyState === WebSocket.OPEN) {
            wsConnectedRef.current = true;
            resolve(true);
            return;
          }
          
          // Bağlantı açılana kadar bekle
          const openHandler = () => {
            wsConnectedRef.current = true;
            newWs.removeEventListener('open', openHandler);
            newWs.removeEventListener('error', errorHandler);
            resolve(true);
          };
          
          const errorHandler = () => {
            newWs.removeEventListener('open', openHandler);
            newWs.removeEventListener('error', errorHandler);
            resolve(false);
          };
          
          newWs.addEventListener('open', openHandler);
          newWs.addEventListener('error', errorHandler);
          
          // 5 saniye sonra hala bağlanamadıysak false dön
          setTimeout(() => {
            newWs.removeEventListener('open', openHandler);
            newWs.removeEventListener('error', errorHandler);
            resolve(false);
          }, 5000);
        });
      };
      
      // Bağlantıyı yeniden kur ve sonucuna göre devam et
      reconnectWs().then(connected => {
        if (connected) {
          console.log("WebSocket bağlantısı yeniden kuruldu, konuşma başlatılıyor...");
          continueWithConversation(); // Şimdi `continueWithConversation` tanımlı
        } else {
          setError("Mesajlaşma servisine bağlanılamadı. Sayfayı yenileyip tekrar deneyin.");
          console.error("WebSocket bağlantısı kurulamadı, konuşma başlatılamıyor.");
        }
      });
    } else {
      // WebSocket bağlantısı zaten mevcutsa doğrudan devam et
      continueWithConversation();
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black p-0 md:p-4 lg:p-6 flex items-center justify-center">
      <div className="max-w-screen-xl w-full mx-auto relative">
        {/* Arka plan */} 
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-50">
          {/* İsteğe bağlı: Daha soyut bir arka plan eklenebilir */}
        </div>
        
        {/* Ana mesajlaşma arayüzü */} 
        <div className="relative w-full h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] overflow-hidden rounded-none md:rounded-2xl shadow-2xl bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 flex">
          
          {/* Sol panel - Konuşma listesi */} 
          <div className={`${isMobile && showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[320px] lg:w-[360px] bg-gray-800/70 h-full border-r border-gray-700/50`}>
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold text-gray-100">Sohbetler</h1>
                <button 
                  onClick={() => setShowNewConversation(true)}
                  className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
                >
                  <PlusCircle size={16} className="mr-1.5" /> Yeni
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Sohbetleri ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-700/50 text-gray-200 placeholder-gray-400 border border-gray-600/70 rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 focus:border-transparent transition-colors"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent">
              {loading && conversations.length === 0 ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-400"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                   {(!previousChats || previousChats.length === 0) && (
                     <>
                       <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                       <p className="text-sm">Henüz bir sohbetiniz yok.</p>
                     </>
                   )}
                   
                   {previousChats && previousChats.length > 0 && (
                     <div className="w-full">
                       <div className="space-y-1">
                         {previousChats.map((user) => (
                           <motion.div
                             key={user.id}
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             transition={{ delay: 0.05 }}
                             className="flex items-center p-2.5 rounded-lg cursor-pointer hover:bg-gray-700/40 transition-colors"
                             onClick={() => startNewConversation(user.id)}
                           >
                             <img
                               src={getFullImageUrl(user.profileImage)}
                               alt={user.username}
                               className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-700/70"
                             />
                             <div className="ml-3 overflow-hidden">
                               <p className="text-gray-200 text-sm font-medium truncate">{user.fullName || user.username}</p>
                               <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                             </div>
                           </motion.div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
              ) : filteredConversations.length === 0 && search ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <Search className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">"<span className='font-medium text-gray-300'>{search}</span>" için sonuç bulunamadı.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredConversations.map((conversation) => (
                    <motion.div
                      key={conversation.sender ? conversation.sender.id : `conversation-${Date.now()}-${Math.random()}`}
                      layout // Animate layout changes
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 ease-out relative overflow-hidden ${ 
                        selectedConversation?.sender?.id === conversation.sender?.id
                          ? 'bg-gradient-to-r from-gray-700/50 to-gray-700/30 shadow-inner'
                          : 'hover:bg-gray-700/40'
                      }`}
                      onClick={() => {
                        selectConversation(conversation);
                        if (isMobile) setShowMobileChat(true);
                      }}
                    >
                      {/* Aktif Konuşma Vurgusu */} 
                      {selectedConversation?.sender?.id === conversation.sender?.id && (
                        <motion.div 
                          layoutId="activeConversationHighlight"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"
                          initial={false}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}

                      <div className="relative flex-shrink-0 ml-1.5">
                        <img
                          src={getFullImageUrl(conversation.sender?.profileImage)}
                          alt={conversation.sender?.username}
                          className="w-11 h-11 rounded-full object-cover border-2 border-gray-700/50"
                        />
                        {/* Online Durum */} 
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${conversation.sender?.online ? 'bg-green-500' : 'bg-gray-600'} border-2 border-gray-800`}></div>
                      </div>

                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold text-sm truncate ${selectedConversation?.sender?.id === conversation.sender?.id ? 'text-white' : 'text-gray-200'}`}>
                            {conversation.sender?.fullName || conversation.sender?.username || 'Bilinmeyen Kullanıcı'}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {conversation.lastTimestamp ? formatMessageTime(conversation.lastTimestamp) : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-400 truncate pr-2">
                             {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <div className="flex-shrink-0 w-4 h-4 text-[10px] rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
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

          {/* Sağ panel - Mesajlaşma */} 
          <div className={`${isMobile && !showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full flex-1 bg-gradient-to-b from-gray-800/80 to-gray-900/90 h-full`}>
            {!selectedConversation ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500">
                <MessageSquare size={56} className="opacity-20 mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-1">Sohbet Seç</h3>
                <p className="max-w-xs text-sm">Başlamak için sol panelden bir sohbet seçin veya yeni bir sohbet başlatın.</p>
              </div>
            ) : (
              <>
                {/* Mesaj başlığı */} 
                <div className="p-3 px-4 border-b border-gray-700/50 flex items-center flex-shrink-0 bg-gray-800/50 shadow-sm">
                  {isMobile && (
                    <button
                      onClick={handleBackToConversations}
                      className="mr-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50 transition-colors"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}
                  
                  <div className="flex items-center flex-1 min-w-0">
                     <img
                        src={getFullImageUrl(selectedConversation.sender?.profileImage)}
                        alt={selectedConversation.sender?.username}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    <div className="ml-3 overflow-hidden">
                      <h2 className="font-semibold text-gray-100 truncate text-sm">
                        {selectedConversation.sender?.fullName || selectedConversation.sender?.username}
                      </h2>
                      <span className="text-xs text-gray-400">
                        {formatLastSeen(selectedConversation.sender?.lastSeen)} {/* lastSeen backend'den gelmeli */}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    {/* Başlık ikonları */} 
                    <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
                      <Video size={18} />
                    </button>
                    <button className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Mesaj içeriği */} 
                <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent">
                  {loading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-400"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
                      <MessageSquare size={40} className="opacity-20 mb-3" />
                      <p className="text-sm">Henüz mesaj yok. İlk mesajı gönderin!</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      <MessageList 
                        key="message-list"
                        messages={messages} 
                        currentUser={currentUser} 
                        formatTime={formatMessageTime} 
                      />
                      
                      {/* Yazma göstergesi */} 
                      {isTyping && selectedConversation && (
                        <TypingIndicator key="typing-indicator" senderInfo={selectedConversation.sender} />
                      )}

                      {/* Scroll hedefi her zaman en sonda olmalı */} 
                      <div key="scroll-spacer" ref={messagesEndRef} className="h-px" /> 
                      
                    </AnimatePresence>
                  )}
                </div>
                
                {/* Mesaj yazma alanı */} 
                <div className="message-input-container border-t border-gray-700 p-3">
                  {mediaFile && !isUploading && (
                    <MediaPreview 
                      media={mediaFile} 
                      onCancel={handleCancelMedia} 
                    />
                  )}
                  
                  {isUploading && <UploadProgress progress={uploadProgress} />}
                  
                  <form onSubmit={handleSendMessage} className="flex items-center">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      onChange={handleFileSelect}
                      accept="image/*, video/*" 
                    />
                    
                    <button 
                      type="button" 
                      className="p-2 text-gray-400 hover:text-white transition-colors mr-2"
                      onClick={handleFileButtonClick}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader size={20} className="animate-spin" />
                      ) : (
                        <Image size={20} />
                      )}
                    </button>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleMessageInputChange}
                      placeholder="Mesajınızı yazın..."
                      className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-full focus:outline-none"
                      disabled={isUploading}
                    />
                    
                    <button
                      type="submit"
                      className={`p-2 ml-2 text-white rounded-full ${(!newMessage.trim() && !mediaFile) || isUploading ? 'bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                      disabled={(!newMessage.trim() && !mediaFile) || isUploading}
                    >
                      <Send size={20} />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Yeni Mesaj Modal */} 
      {showNewConversation && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewConversation(false)} // Arka plana tıklayınca kapat
          >
            <motion.div onClick={(e) => e.stopPropagation()} > {/* Modal içeriğine tıklanınca kapanmasın */} 
              <NewConversation 
                onClose={() => setShowNewConversation(false)} 
                onSelectUser={startNewConversation}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Messages; 