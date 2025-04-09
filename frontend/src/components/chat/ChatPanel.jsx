import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, User, Send, ArrowLeft, Paperclip, Image, 
  Smile, Search, Clock, MessageSquare
} from "lucide-react";
import { getConversations, getMessages, sendMessage } from "../../services/message-services";
import { motion, AnimatePresence } from "framer-motion";

// Ana ChatPanel bileşeni
export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Konuşmaları yükle
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Mesajları otomatik kaydır
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mesajları periyodik güncelle
  useEffect(() => {
    let interval;
    if (isOpen && selectedConversation) {
      interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 15000);
    }
    return () => clearInterval(interval);
  }, [isOpen, selectedConversation]);

  // Konuşmaları yükleme
  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      
      // İlk konuşmayı varsayılan olarak seç
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error("Konuşmalar yüklenirken hata:", error);
    }
  };

  // Mesajları yükleme
  const loadMessages = async (conversationId) => {
    setIsLoading(true);
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      
      // Okunmamış mesajları okundu olarak işaretle
      markConversationAsRead(conversationId);
    } catch (error) {
      console.error("Mesajlar yüklenirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Okunmamış mesajları okundu olarak işaretle
  const markConversationAsRead = (conversationId) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  // Yazıyor simülasyonu
  const simulateTyping = useCallback(() => {
    if (selectedConversation) {
      clearTimeout(typingTimeoutRef.current);
      setTyping(true);
      
      const typingDuration = Math.floor(Math.random() * 2000) + 500;
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, typingDuration);
    }
  }, [selectedConversation]);

  // Mesaj gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedConversation) return;

    const newMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: input.trim(),
      sender: "currentUser",
      timestamp: new Date().toISOString(),
      isNew: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await sendMessage(selectedConversation.id, input.trim());
      simulateTyping();
      
      setTimeout(() => {
        loadMessages(selectedConversation.id);
      }, 1000);
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Panel açma/kapama
  const togglePanel = () => {
    if (isOpen) {
      setShowConversations(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 100);
    } else {
      setIsOpen(true);
      setShowConversations(true);
    }
  };

  // Konuşma listesine dön
  const backToConversations = () => {
    setShowConversations(true);
    setTimeout(() => {
      setSelectedConversation(null);
    }, 100);
  };

  // Konuşma seçme
  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    setTimeout(() => {
      setShowConversations(false);
    }, 50);
  };

  // Konuşmaları filtrele
  const filteredConversations = conversations.filter((conv) =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mesaj zamanı formatı
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Son görülme formatı
  const formatLastSeen = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Bugün ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Dün ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Mesajları tarihe göre grupla
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };
  
  const messageGroups = groupMessagesByDate();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Ana Sohbet Paneli */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-4 rounded-xl shadow-lg overflow-hidden flex flex-col w-[400px] h-[600px]"
            style={{ 
              backgroundColor: 'rgba(18, 18, 23, 0.95)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Panel Başlık */}
            <div 
              className="p-4 flex items-center justify-between border-b border-white/5"
              style={{ 
                background: 'rgba(30, 30, 35, 0.5)'
              }}
            >
              {showConversations ? (
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-xl font-light text-white">Mesajlar</h2>
                  <motion.button
                    whileHover={{ opacity: 0.8 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/80"
                    onClick={togglePanel}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileHover={{ opacity: 0.8 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/80"
                      onClick={backToConversations}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </motion.button>
                    <div className="flex flex-col">
                      <p className="text-lg font-light text-white">
                        {selectedConversation?.username}
                      </p>
                      <p className="text-xs text-white/50">
                        {selectedConversation?.online 
                          ? <span className="flex items-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                              Çevrimiçi
                            </span>
                          : <>Son görülme: {formatLastSeen(selectedConversation?.lastSeen)}</>
                        }
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ opacity: 0.8 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/80"
                    onClick={togglePanel}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              )}
            </div>

            {/* Panel İçeriği */}
            <div className="flex flex-grow overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {showConversations ? (
                  // Konuşma Listesi
                  <motion.div 
                    key="conversations"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full h-full flex flex-col"
                  >
                    {/* Arama Kutusu */}
                    <div className="p-3 border-b border-white/5">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full p-2 pl-9 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                        <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-white/40" />
                      </div>
                    </div>

                    {/* Konuşma Listesi */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar">
                      {filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                          <User className="h-16 w-16 mb-3 text-white/20" />
                          <p className="text-lg font-light text-white/90 mb-1">Sonuç bulunamadı</p>
                          <p className="text-sm text-white/40">Farklı bir arama terimi deneyin</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {filteredConversations.map((conversation) => (
                            <motion.div 
                              key={conversation.id}
                              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                conversation.unreadCount > 0 ? 'bg-white/[0.02]' : ''
                              }`}
                              onClick={() => selectConversation(conversation)}
                            >
                              <div className="relative">
                                {conversation.avatar ? (
                                  <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10">
                                    <img 
                                      src={conversation.avatar} 
                                      alt={conversation.username}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-light bg-white/10 border border-white/10">
                                    {conversation.username.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                {conversation.online && (
                                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#12121B]"></span>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-baseline">
                                  <p className="font-light text-white truncate">{conversation.username}</p>
                                  <p className="text-xs text-white/40 flex items-center whitespace-nowrap">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {new Date(conversation.lastSeen).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                  <p className="text-sm text-white/60 truncate">{conversation.lastMessage}</p>
                                  {conversation.unreadCount > 0 && (
                                    <span className="ml-2 min-w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs text-white px-1.5">
                                      {conversation.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  // Mesaj Görünümü
                  <motion.div 
                    key="messages"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full h-full flex flex-col"
                  >
                    {/* Mesaj Listesi */}
                    <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                      {Object.keys(messageGroups).map(date => (
                        <div key={date}>
                          <div className="flex justify-center my-3">
                            <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/40 border border-white/5">
                              {date === new Date().toLocaleDateString() ? 'Bugün' : date}
                            </span>
                          </div>
                          
                          {messageGroups[date].map((message) => (
                            <motion.div 
                              key={message.id} 
                              initial={message.isNew ? { opacity: 0, y: 10 } : false}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`flex mb-3 ${message.sender === "currentUser" ? 'justify-end' : 'justify-start'}`}
                            >
                              {message.sender !== "currentUser" && (
                                <div className="flex-shrink-0 mr-2">
                                  {selectedConversation.avatar ? (
                                    <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
                                      <img 
                                        src={selectedConversation.avatar} 
                                        alt={selectedConversation.username}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-light bg-white/10 border border-white/10">
                                      {selectedConversation.username.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div 
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                  message.sender === "currentUser"
                                    ? 'bg-white/10 text-white border border-white/5'
                                    : 'bg-white/5 text-white border border-white/5'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className="text-xs mt-1 text-right opacity-50">
                                  {formatMessageTime(message.timestamp)}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ))}

                      {typing && (
                        <div className="flex justify-start mb-3">
                          <div className="flex-shrink-0 mr-2">
                            {selectedConversation.avatar ? (
                              <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
                                <img 
                                  src={selectedConversation.avatar} 
                                  alt={selectedConversation.username}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-light bg-white/10 border border-white/10">
                                {selectedConversation.username.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-white">
                            <div className="flex space-x-1">
                              <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                              <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                              <div className="h-2 w-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Mesaj Giriş Alanı */}
                    <div className="p-3 border-t border-white/5">
                      <form 
                        onSubmit={handleSubmit}
                        className="flex items-center rounded-lg bg-white/5 border border-white/10 overflow-hidden"
                      >
                        <motion.button 
                          type="button" 
                          whileHover={{ opacity: 0.8 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-white/50 hover:text-white/80 transition-colors"
                        >
                          <Smile className="h-5 w-5" />
                        </motion.button>
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Mesajınızı yazın..."
                          className="flex-grow p-2 bg-transparent border-0 text-white focus:outline-none placeholder-white/30"
                        />
                        <motion.button 
                          type="button"
                          whileHover={{ opacity: 0.8 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-white/50 hover:text-white/80 transition-colors"
                        >
                          <Paperclip className="h-5 w-5" />
                        </motion.button>
                        <motion.button 
                          type="button"
                          whileHover={{ opacity: 0.8 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 text-white/50 hover:text-white/80 transition-colors"
                        >
                          <Image className="h-5 w-5" />
                        </motion.button>
                        <motion.button 
                          type="submit" 
                          disabled={isLoading || !input.trim()}
                          whileHover={isLoading || !input.trim() ? {} : { opacity: 0.8 }}
                          whileTap={isLoading || !input.trim() ? {} : { scale: 0.95 }}
                          className={`p-2 ${
                            isLoading || !input.trim() 
                              ? 'text-white/20 bg-white/5' 
                              : 'text-white bg-white/10 hover:bg-white/15'
                          } rounded-r-lg transition-colors`}
                        >
                          <Send className="h-5 w-5" />
                        </motion.button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mesaj Butonu */}
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
        whileTap={{ scale: 0.95 }}
        onClick={togglePanel}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center relative"
        style={{
          background: 'rgba(30, 30, 35, 0.95)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {!isOpen && conversations.some(c => c.unreadCount > 0) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-xs bg-white/10 text-white border border-white/20">
            {conversations.reduce((total, conv) => total + conv.unreadCount, 0)}
          </span>
        )}
        <motion.div
          animate={isOpen ? {} : { 
            y: [0, -3, 0],
            transition: { 
              repeat: Infinity, 
              repeatType: "loop", 
              duration: 2,
              repeatDelay: 3
            }
          }}
        >
          {isOpen ? 
            <X className="h-6 w-6 text-white" /> : 
            <MessageSquare className="h-6 w-6 text-white" />
          }
        </motion.div>
      </motion.button>

      {/* Global CSS - Özel kaydırma çubuğu */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}