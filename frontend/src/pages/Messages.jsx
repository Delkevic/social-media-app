import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { API_BASE_URL } from '../config/constants';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay, isYesterday, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
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
  MessageSquare
} from 'lucide-react';
import { FaPaperPlane, FaImage, FaSmile, FaEllipsisV } from 'react-icons/fa';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

// Mesaj baloncuğu bileşeni
const MessageBubble = ({ message, isCurrentUser }) => {
  const bubbleStyle = isCurrentUser 
    ? 'bg-blue-500 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl' 
    : 'bg-gray-700 text-white rounded-tl-2xl rounded-tr-2xl rounded-br-2xl';
  
  const formattedTime = message.sentAt 
    ? formatDistanceToNow(new Date(message.sentAt), { addSuffix: true, locale: tr }) 
    : '';

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
              {message.mediaType?.startsWith('image/') ? (
                <img src={message.mediaUrl} alt="Media" className="rounded-lg max-w-full" />
              ) : message.mediaType?.startsWith('video/') ? (
                <video src={message.mediaUrl} controls className="rounded-lg max-w-full" />
              ) : (
                <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
                  Dosyayı görüntüle
                </a>
              )}
            </div>
          )}
          <p className="break-words">{message.content}</p>
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
  const wsRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

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

  // Konuşmaları getir
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.messages.getConversations();
      if (response.success && response.data && response.data.conversations) {
        setConversations(response.data.conversations);
      }
    } catch (err) {
      setError('Konuşmalar yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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
  };

  // Mesaj gönderme
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await api.messages.sendMessage(selectedConversation.sender.id, newMessage);
      if (response.success && response.data && response.data.message) {
        setMessages([...messages, response.data.message]);
        setNewMessage('');
        messageInputRef.current.focus();
      }
    } catch (err) {
      setError('Mesaj gönderilirken bir hata oluştu: ' + err.message);
    }
  };

  // Tarih formatını düzenle
  const formatMessageTime = (timeString) => {
    try {
      const date = parseISO(timeString);
      if (isToday(date)) {
        return format(date, 'HH:mm', { locale: tr });
      } else if (isYesterday(date)) {
        return 'Dün ' + format(date, 'HH:mm', { locale: tr });
      } else if (isSameDay(date, new Date())) {
        return format(date, 'HH:mm', { locale: tr });
      } else {
        return format(date, 'd MMM, HH:mm', { locale: tr });
      }
    } catch (error) {
      return timeString;
    }
  };

  // Profil fotoğrafı URL'ını tam URL'a çevir
  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Filtrelenmiş konuşmaları al
  const filteredConversations = conversations.filter(conversation => 
    conversation.sender.username.toLowerCase().includes(search.toLowerCase())
  );

  // Mobil görünümde geri dönme
  const handleBackToConversations = () => {
    setShowMobileChat(false);
  };

  // WebSocket bağlantısını oluştur
  useEffect(() => {
    // Mevcut kullanıcıyı al
    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
    
    // WebSocket bağlantısını kur
    const ws = api.messages.createWebSocketConnection();
    wsRef.current = ws;
    
    if (ws) {
      // Mesaj alma işleyicisi
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'typing') {
            // Typing indicator güncelle
            if (data.senderId === parseInt(userId)) {
              setIsTyping(data.isTyping);
            }
          } else {
            // Yeni mesaj geldi
            handleNewMessage(data);
            // Konuşmaları yenile
            fetchConversations();
          }
        } catch (err) {
          console.error("WebSocket mesajı ayrıştırma hatası:", err);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket hatası:", error);
        setError("Mesajlaşma servisi ile bağlantı kurulamadı");
      };
      
      ws.onclose = () => {
        console.log("WebSocket bağlantısı kapandı");
      };
    }
    
    return () => {
      // Bağlantıyı kapat
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  // Konuşmaları yükle
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // URL'den belirli bir konuşma seçilirse
  useEffect(() => {
    if (userId) {
      fetchConversation(userId);
    }
  }, [userId]);
  
  // Mesajlar güncellendiğinde en alta kaydır
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Yeni mesaj geldiğinde
  const handleNewMessage = (message) => {
    // Aktif konuşmada yeni mesaj varsa ekle
    if (activeConversation && 
        (message.senderId === activeConversation.userId || 
         message.receiverId === activeConversation.userId)) {
      setMessages(prevMessages => [...prevMessages, message]);
    }
  };
  
  // Belirli bir konuşmayı getir
  const fetchConversation = async (userId) => {
    try {
      setLoading(true);
      const response = await api.messages.getConversation(userId);
      
      if (response.success) {
        setMessages(response.data.messages || []);
        setActiveConversation(response.data.user);
      } else {
        setError(response.message || "Mesajlar yüklenemedi");
      }
    } catch (err) {
      setError("Mesajlar alınırken bir hata oluştu");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Mesaj gönder
  const sendMessageWebSocket = async () => {
    if ((!newMessage.trim() && !selectedFile) || !activeConversation) return;
    
    try {
      let mediaUrl = null;
      let mediaType = null;
      
      // Eğer dosya seçildiyse önce yükle
      if (selectedFile) {
        const uploadResponse = await api.uploadImage(selectedFile);
        if (uploadResponse.success) {
          mediaUrl = uploadResponse.data.fullUrl || uploadResponse.data.url;
          mediaType = selectedFile.type;
        } else {
          throw new Error("Dosya yüklenemedi: " + uploadResponse.message);
        }
      }
      
      const content = newMessage.trim();
      const response = await api.messages.sendMessage(
        activeConversation.id, 
        content,
        mediaUrl,
        mediaType
      );
      
      if (response.success) {
        // Mesajı listeye ekle
        setMessages(prev => [...prev, response.data]);
        // Mesaj kutusunu temizle
        setNewMessage('');
        setSelectedFile(null);
        // Konuşma listesini güncelle
        fetchConversations();
      } else {
        setError(response.message || "Mesaj gönderilemedi");
      }
    } catch (err) {
      setError("Mesaj gönderilirken bir hata oluştu");
      console.error(err);
    }
  };
  
  // Dosya seçme işlemi
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Sadece resim ve video dosyalarını kabul et
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      } else {
        setError("Sadece resim ve video dosyaları desteklenmektedir");
      }
    }
  };
  
  // Dosya seçme penceresini aç
  const openFileSelector = () => {
    fileInputRef.current.click();
  };
  
  // Yazma durumunu gönder
  const handleTyping = () => {
    if (!activeConversation) return;
    
    // Yazıyor... durumunu bildir
    api.messages.sendTypingStatus(activeConversation.id, true);
    
    // Mevcut zamanlayıcıyı temizle
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // 3 saniye sonra yazma durumunu kapat
    const timeout = setTimeout(() => {
      api.messages.sendTypingStatus(activeConversation.id, false);
    }, 3000);
    
    setTypingTimeout(timeout);
  };
  
  // Mesaj kutusundaki değişiklikleri izle
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };
  
  // Enter tuşuna basınca mesaj gönder
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageWebSocket();
    }
  };
  
  // En alta kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e17] to-[#1f2937] p-4 md:p-6">
      <div className="max-w-7xl mx-auto relative">
        {/* Arka plan parlama efekti */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <SparklesCore
            id="tsparticlesfullscreen"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleColor="#8B5CF6"
            particleDensity={70}
            speed={0.5}
            className="w-full h-full"
          />
        </div>
        
        {/* Ana mesajlaşma arayüzü */}
        <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden rounded-2xl backdrop-blur-lg border border-[rgba(255,255,255,0.1)]">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          
          <div className="flex h-full">
            {/* Sol panel - Konuşma listesi */}
            <div className={`${isMobile && showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-1/3 bg-[rgba(20,24,36,0.7)] backdrop-blur-md h-full border-r border-[rgba(255,255,255,0.05)]`}>
              <div className="p-4 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-bold text-white">Mesajlar</h1>
                  <button className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-blue-400 hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                    <MessageSquare size={18} />
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Konuşmaları ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.05)] text-white placeholder-gray-400 border border-[rgba(255,255,255,0.1)] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.1)] scrollbar-track-transparent p-2">
                {loading && conversations.length === 0 ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-center p-4">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p>{search ? "Arama sonucu bulunamadı." : "Henüz mesajınız bulunmuyor."}</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <motion.div
                      key={conversation.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center p-3 mb-2 rounded-xl cursor-pointer transition-all ${
                        selectedConversation && selectedConversation.id === conversation.id 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
                      }`}
                      onClick={() => {
                        selectConversation(conversation);
                        if (isMobile) setShowMobileChat(true);
                      }}
                    >
                      <div className="relative">
                        {conversation.sender.profileImage ? (
                          <img
                            src={getFullImageUrl(conversation.sender.profileImage)}
                            alt={conversation.sender.username}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://ui-avatars.com/api/?name=' + conversation.sender.username;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {conversation.sender.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className={`absolute right-0 bottom-0 w-3 h-3 rounded-full ${conversation.sender.online ? 'bg-green-500' : 'bg-gray-500'} border-2 border-[rgba(20,24,36,0.7)]`}></div>
                      </div>

                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-white truncate">
                            {conversation.sender.username}
                          </span>
                          <span className="text-xs text-gray-400">
                            {conversation.time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-300 truncate pr-2">{conversation.lastMessage}</p>
                          {conversation.unread && (
                            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Sağ panel - Mesajlaşma */}
            <div className={`${isMobile && !showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-2/3 bg-[rgba(15,19,31,0.8)] backdrop-blur-md h-full`}>
              {!selectedConversation ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-400">
                  <div className="bg-[rgba(30,34,46,0.5)] p-8 rounded-full mb-4">
                    <MessageSquare size={48} className="text-blue-400 opacity-70" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">Mesajlarınız</h3>
                  <p className="max-w-md">Sohbet etmek için sol panelden bir konuşma seçin veya yeni bir mesaj başlatın.</p>
                </div>
              ) : (
                <>
                  {/* Mesaj başlığı */}
                  <div className="p-4 border-b border-[rgba(255,255,255,0.05)] flex items-center">
                    {isMobile && (
                      <button
                        onClick={handleBackToConversations}
                        className="mr-2 text-gray-400 hover:text-white"
                      >
                        <ChevronLeft size={24} />
                      </button>
                    )}
                    
                    <div className="flex items-center flex-1">
                      {selectedConversation.sender.profileImage ? (
                        <img
                          src={getFullImageUrl(selectedConversation.sender.profileImage)}
                          alt={selectedConversation.sender.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {selectedConversation.sender.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div className="ml-3">
                        <h2 className="font-medium text-white">
                          {selectedConversation.sender.username}
                        </h2>
                        <span className="text-xs text-gray-400">
                          {selectedConversation.sender.online ? 'Çevrimiçi' : 'Son görülme: 2 saat önce'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors">
                        <Phone size={18} />
                      </button>
                      <button className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors">
                        <Video size={18} />
                      </button>
                      <button className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Mesaj içeriği */}
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.1)] scrollbar-track-transparent">
                    {loading && messages.length === 0 ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                        <p>Henüz mesaj yok. Bir mesaj göndererek sohbete başlayın.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => {
                          const isCurrentUser = message.sender.id === currentUser?.id;
                          
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex items-end ${!isCurrentUser && 'flex-row-reverse'}`}>
                                {!isCurrentUser && (
                                  <div className="flex-shrink-0 ml-2">
                                    {message.sender.profileImage ? (
                                      <img
                                        src={getFullImageUrl(message.sender.profileImage)}
                                        alt={message.sender.username}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-semibold">
                                          {message.sender.username.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div
                                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-3xl ${
                                    isCurrentUser
                                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-md'
                                      : 'bg-[rgba(255,255,255,0.07)] text-white rounded-bl-md'
                                  }`}
                                >
                                  <p className="text-sm">{message.content}</p>
                                  <span className={`text-xs mt-1 block ${isCurrentUser ? 'text-blue-200' : 'text-gray-400'}`}>
                                    {formatMessageTime(message.time)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                  
                  {/* Mesaj yazma alanı */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors"
                      >
                        <Image size={18} />
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Bir mesaj yazın..."
                          value={newMessage}
                          onChange={handleMessageChange}
                          onKeyPress={handleKeyPress}
                          ref={messageInputRef}
                          className="w-full bg-[rgba(255,255,255,0.05)] text-white placeholder-gray-400 border border-[rgba(255,255,255,0.1)] rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          className="absolute right-12 top-2.5 text-gray-400 hover:text-white"
                        >
                          <Smile size={18} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300 hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors"
                      >
                        <Mic size={18} />
                      </button>
                      <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full ${
                          newMessage.trim()
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                            : 'bg-[rgba(255,255,255,0.05)] text-gray-500'
                        }`}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages; 