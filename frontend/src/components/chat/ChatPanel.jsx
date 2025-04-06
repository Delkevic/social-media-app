import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Send, ArrowLeft, User, Image, Paperclip, Smile } from "lucide-react";
import { getConversations, getMessages, sendMessage } from "../../services/message-services";
import { 
  Button, Avatar, AvatarImage, AvatarFallback, 
  ChatBubble, ChatBubbleAvatar, ChatBubbleMessage,
  SendButton, MessageBubbleTrail, KeyboardEffect, EmojiPack
} from "./ChatComponents";
import { motion, AnimatePresence } from "framer-motion";

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

// Ana MessagesPanel bileşeni
export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Yeni state'ler ekleyelim
  const [showConversations, setShowConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const conversationsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Konuşmaları yükle
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Seçili konuşmaya ait mesajları yükle
  /* useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setTimeout(() => {
        setShowConversations(false); // Konuşma seçildiğinde mesaj görünümüne geç
      }, 10);
    }
  }, [selectedConversation]); */

  // Yeni mesajlar geldiğinde otomatik kaydırma
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Belirli aralıklarla mesajları güncelle
  useEffect(() => {
    let interval;
    if (isOpen && selectedConversation) {
      interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 15000); // 15 saniyede bir güncelle
    }
    return () => clearInterval(interval);
  }, [isOpen, selectedConversation]);

  // Konuşmaları yükleme fonksiyonu
  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      
      // İlk konuşmayı varsayılan olarak seç
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error("Konuşmalar yüklenirken hata:", error);
    }
  };

  // Mesajları yükleme fonksiyonu
  const loadMessages = async (conversationId) => {
    setIsLoading(true);
    try {
      const data = await getMessages(conversationId);
      setMessages(data);
      
      // Okunmamış mesajları okundu olarak işaretle
      markConversationAsRead(conversationId);
    } catch (error) {
      console.error("Mesajlar yüklenirken hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Okunmamış mesajları okundu olarak işaretle
  const markConversationAsRead = (conversationId) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  // Yazıyor... durumunu simüle etme
  const simulateTyping = useCallback(() => {
    if (selectedConversation) {
      clearTimeout(typingTimeoutRef.current);
      setTyping(true);
      
      // Rastgele bir süre sonra typing durumunu kapat
      const typingDuration = Math.floor(Math.random() * 2000) + 500; // 0.5-2.5 saniye (daha kısa süre)
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, typingDuration);
    }
  }, [selectedConversation]);

  // Mesaj gönderme fonksiyonu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedConversation) return;

    const newMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: input.trim(),
      sender: "currentUser",
      timestamp: new Date().toISOString(),
      isNew: true, // Animasyon için yeni eklenen mesajları işaretleyelim
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Mesajı API'ye gönder
      await sendMessage(selectedConversation.id, input.trim());
      
      // Karşı tarafın cevap yazıyor olduğunu simüle et
      simulateTyping();
      
      // Bir süre sonra mesajlar güncellensin
      setTimeout(() => {
        loadMessages(selectedConversation.id);
      }, 1000); // 1.5 saniyeden 1 saniyeye düşürüldü
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      // Hata durumunda geçici mesajı kaldır
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Panel açma/kapama
  const togglePanel = () => {
    if (isOpen) {
      // Önce UI'ı konuşma listesine getir, sonra kapat
      setShowConversations(true);
      // Animasyonların düzgün çalışması için state güncellemelerini zamanla
      setTimeout(() => {
        setIsOpen(false);
      }, 100); // Biraz daha uzun süre bekleme ekledik
    } else {
      setIsOpen(true);
      setShowConversations(true);
    }
  };

  // Konuşma listesine dön
  const backToConversations = () => {
    // Direkt olarak UI'ı güncelleyelim
    setShowConversations(true);
    // UI güncellemesinin oturmasını bekleyelim, sonra state'i temizleyelim
    setTimeout(() => {
      setSelectedConversation(null);
    }, 100);
  };

  // Konuşma seçme fonksiyonu
  const selectConversation = (conversation) => {
    // Önce mesajları yükleyelim
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    // UI'ı güncelleyelim
    setTimeout(() => {
      setShowConversations(false);
    }, 50); // Daha uzun bir gecikme
  };

  // Konuşma arama
  const filteredConversations = conversations.filter((conv) =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tarih formatları
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  // Mesajları grupla (tarih bazlı)
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

  // Panel animasyon varyantları - basitleştirilmiş
  const panelVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  // Konuşma listesi animasyon varyantları - basitleştirilmiş
  const conversationListVariants = {
    hidden: { 
      opacity: 0,
      x: -20,
      transition: { 
        duration: 0.15
      }
    },
    visible: { 
      opacity: 1,
      x: 0,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      x: -20,
      transition: { 
        duration: 0.15
      }
    }
  };

  // Mesaj bölümü animasyon varyantları - basitleştirilmiş
  const messageViewVariants = {
    hidden: { 
      opacity: 0,
      x: 20,
      transition: { 
        duration: 0.15
      }
    },
    visible: { 
      opacity: 1,
      x: 0,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      x: 20,
      transition: { 
        duration: 0.15
      }
    }
  };

  // Buton animasyon varyantları - basitleştirilmiş
  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.1
      }
    },
    tap: {
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  };

  const headerGradient = "linear-gradient(135deg, rgba(149, 76, 233, 0.2), rgba(43, 192, 228, 0.2))";
  
  // JSX içindeki animasyonları hızlandırma
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <AnimatePresence mode="wait" initial={false}>
        {isOpen && (
          <motion.div
            key="chat-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-background mb-4 rounded-xl shadow-2xl overflow-hidden flex flex-col w-[400px] h-[600px]"
            style={{ 
              backgroundColor: 'rgba(13, 13, 20, 0.85)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(149, 76, 233, 0.25), 0 0 0 1px rgba(149, 76, 233, 0.1)',
              border: '1px solid rgba(149, 76, 233, 0.3)',
              transformOrigin: 'bottom right'
            }}
          >
            {/* Panel Header */}
            <motion.div 
              className="p-4 flex items-center justify-between"
              style={{ 
                background: headerGradient,
                borderBottom: '1px solid rgba(149, 76, 233, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
              initial={{ opacity: 0, y: -5 }} // Daha az hareket
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }} // Daha hızlı
            >
              {showConversations ? (
                <div className="flex items-center justify-between w-full">
                  <motion.h1 
                    className="text-xl font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: 1,
                      textShadow: "0 0 5px rgba(149, 76, 233, 0.3)" // Daha az gölge
                    }}
                    transition={{ duration: 0.15 }} // Daha hızlı
                  >
                    Mesajlar
                  </motion.h1>
                  <motion.div
                    whileHover={{ 
                      rotate: 90,
                      scale: 1.05 // Daha az büyüme
                    }}
                    transition={{ duration: 0.1 }} // Daha hızlı
                  >
                    <Button
                      className="p-2 rounded-full hover:bg-purple-500/20"
                      onClick={togglePanel}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ 
                        x: -2, // Daha az hareket
                        scale: 1.05 // Daha az büyüme
                      }}
                      whileTap={{ scale: 0.95, rotate: -3 }} // Daha az dönme
                      transition={{ duration: 0.15 }} // Daha hızlı
                    >
                      <Button
                        className="p-2 rounded-full hover:bg-purple-500/20"
                        onClick={backToConversations}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div 
                      className="flex flex-col"
                      initial={{ opacity: 0, x: 5 }} // Daha az hareket
                      animate={{ 
                        opacity: 1, 
                        x: 0,
                        transition: {
                          type: "spring",
                          damping: 12,
                          stiffness: 800, // Daha sert yay
                          duration: 0.15 // Daha hızlı
                        }
                      }}
                    >
                      <h1 className="text-xl font-semibold">{selectedConversation?.username}</h1>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {selectedConversation?.online ? (
                          <span className="flex items-center">
                            <motion.span 
                              className="h-2 w-2 rounded-full mr-1"
                              style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)" }}
                              animate={{ 
                                scale: [1, 1.2, 1], // Daha az ölçeklendirme
                                opacity: [0.7, 1, 0.7],
                                boxShadow: [
                                  "0 0 0px rgba(74, 222, 128, 0)",
                                  "0 0 5px rgba(74, 222, 128, 0.6)", // Daha az gölge
                                  "0 0 0px rgba(74, 222, 128, 0)"
                                ]
                              }}
                              transition={{ 
                                repeat: Infinity, 
                                duration: 0.8, // Daha hızlı
                                repeatType: "loop" 
                              }}
                            ></motion.span>
                            Çevrimiçi
                          </span>
                        ) : (
                          <>Son görülme: {formatLastSeen(selectedConversation?.lastSeen)}</>
                        )}
                      </p>
                    </motion.div>
                  </div>
                  <motion.div
                    whileHover={{ 
                      rotate: 90,
                      scale: 1.05 // Daha az büyüme
                    }}
                    transition={{ duration: 0.1 }} // Daha hızlı
                  >
                    <Button
                      className="p-2 rounded-full hover:bg-purple-500/20"
                      onClick={togglePanel}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              )}
            </motion.div>

            {/* Panel Content */}
            <div className="flex flex-grow overflow-hidden">
              {/* Konuşma Listesi (Sidebar) ve Mesaj Görünümü tek AnimatePresence içinde */}
              <AnimatePresence mode="wait" initial={false}>
                {showConversations ? (
                  // Konuşma Listesi
                  <motion.div 
                    key="conversations"
                    variants={conversationListVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full overflow-y-auto hide-scrollbar"
                    ref={conversationsRef}
                    style={{
                      background: "linear-gradient(135deg, rgba(149, 76, 233, 0.05), rgba(43, 192, 228, 0.05))"
                    }}
                  >
                    {/* Arama */}
                    <motion.div 
                      className="p-3 sticky top-0 z-10 backdrop-blur-md" 
                      style={{ background: "rgba(13, 13, 20, 0.7)" }}
                      initial={{ opacity: 0, y: -5 }} // Daha az hareket
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }} // Daha hızlı
                    >
                      <div className="relative">
                        <motion.div 
                          className="absolute inset-0 rounded-md opacity-20"
                          animate={{
                            boxShadow: [
                              "0 0 0 rgba(149, 76, 233, 0)",
                              "0 0 5px rgba(149, 76, 233, 0.4)", // Daha az gölge
                              "0 0 0 rgba(149, 76, 233, 0)"
                            ]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1, // Daha hızlı
                            repeatType: "loop"
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Ara..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full p-2 rounded-md border bg-transparent"
                          style={{ 
                            borderColor: 'rgba(149, 76, 233, 0.3)',
                            color: 'white'
                          }}
                        />
                      </div>
                    </motion.div>
                    
                    {filteredConversations.length === 0 ? (
                      <motion.div 
                        className="flex flex-col items-center justify-center h-64 text-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: 1,
                          transition: { duration: 0.15 } // Daha hızlı
                        }}
                      >
                        <motion.div
                          animate={{
                            opacity: [0.4, 0.7, 0.4], // Daha az opacity değişimi
                            scale: [1, 1.03, 1], // Daha az ölçeklendirme
                            rotate: [0, 3, 0] // Daha az dönme
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.5, // Daha hızlı
                            repeatType: "reverse",
                            ease: "easeInOut"
                          }}
                        >
                          <User className="h-16 w-16 mb-3" style={{ color: "rgba(149, 76, 233, 0.5)" }} />
                        </motion.div>
                        <motion.p 
                          className="text-lg font-medium"
                          animate={{
                            textShadow: [
                              "0 0 0px rgba(149, 76, 233, 0)",
                              "0 0 3px rgba(149, 76, 233, 0.6)", // Daha az gölge
                              "0 0 0px rgba(149, 76, 233, 0)",
                            ]
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.2, // Daha hızlı
                            repeatType: "mirror"
                          }}
                        >
                          Sonuç bulunamadı
                        </motion.p>
                        <p className="text-sm opacity-70">Farklı bir arama terimi deneyin</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        variants={{ 
                          visible: { 
                            transition: { 
                              staggerChildren: 0.01 // Daha kısa gecikme
                            } 
                          } 
                        }}
                        initial="hidden"
                        animate="visible"
                      >
                        {filteredConversations.map((conversation, index) => (
                          <motion.div 
                            key={conversation.id}
                            custom={index}
                            variants={conversationListVariants}
                            whileHover="hover"
                            className="flex items-center gap-3 p-3 cursor-pointer relative m-2 rounded-lg"
                            onClick={() => selectConversation(conversation)}
                            style={{
                              backgroundColor: conversation.unreadCount > 0 
                                ? 'rgba(149, 76, 233, 0.15)' 
                                : 'rgba(13, 13, 20, 0.4)',
                              backdropFilter: 'blur(8px)',
                              borderLeft: conversation.unreadCount > 0 
                                ? '3px solid rgba(149, 76, 233, 0.7)' 
                                : '1px solid rgba(149, 76, 233, 0.1)'
                            }}
                          >
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                {conversation.avatar ? (
                                  <AvatarImage src={conversation.avatar} />
                                ) : (
                                  <AvatarFallback>{conversation.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                )}
                              </Avatar>
                              {conversation.online && (
                                <motion.span 
                                  className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2" 
                                  style={{ 
                                    background: "linear-gradient(135deg, #4ade80, #22d3ee)",
                                    borderColor: 'rgba(13, 13, 20, 0.8)'
                                  }}
                                  animate={{ 
                                    scale: [1, 1.2, 1], // Daha az ölçeklendirme
                                    opacity: [0.8, 1, 0.8],
                                    boxShadow: [
                                      "0 0 0px rgba(74, 222, 128, 0)",
                                      "0 0 5px rgba(74, 222, 128, 0.6)", // Daha az gölge
                                      "0 0 0px rgba(74, 222, 128, 0)"
                                    ]
                                  }}
                                  transition={{ 
                                    repeat: Infinity, 
                                    duration: 1, // Daha hızlı
                                    repeatType: "loop" 
                                  }}
                                ></motion.span>
                              )}
                            </div>
                            <div className="flex-grow overflow-hidden">
                              <motion.div 
                                className="font-medium"
                                initial={{ opacity: 0, y: 3 }} // Daha az hareket
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.02 + index * 0.01, duration: 0.15 }} // Daha hızlı
                              >
                                {conversation.username}
                              </motion.div>
                              <motion.div 
                                className="text-sm truncate opacity-70"
                                initial={{ opacity: 0, y: 3 }} // Daha az hareket
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 + index * 0.01, duration: 0.15 }} // Daha hızlı
                              >
                                {conversation.lastMessage}
                              </motion.div>
                            </div>
                            <div className="flex flex-col items-end">
                              <motion.div 
                                className="text-xs opacity-70"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ delay: 0.08 + index * 0.01, duration: 0.15 }} // Daha hızlı
                              >
                                {new Date(conversation.lastSeen).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                              </motion.div>
                              {conversation.unreadCount > 0 && (
                                <motion.div 
                                  className="mt-1 rounded-full min-w-5 h-5 flex items-center justify-center text-xs px-1"
                                  style={{ 
                                    background: "linear-gradient(135deg, #954ce9, #2bc0e4)",
                                    boxShadow: "0 0 8px rgba(149, 76, 233, 0.4)" // Daha az gölge
                                  }}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ 
                                    scale: 1, 
                                    opacity: 1,
                                    transition: {
                                      type: "spring",
                                      damping: 8,
                                      stiffness: 600, // Daha sert yay
                                      delay: 0.1 + index * 0.01, // Daha kısa gecikme
                                      duration: 0.15 // Daha hızlı
                                    }
                                  }}
                                >
                                  {conversation.unreadCount}
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  // Mesaj Görünümü
                  selectedConversation && (
                    <motion.div 
                      key="messages"
                      variants={messageViewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex flex-col flex-grow w-full"
                      style={{
                        background: "linear-gradient(135deg, rgba(149, 76, 233, 0.05), rgba(43, 192, 228, 0.05))"
                      }}
                    >
                      {/* Mesaj Listesi */}
                      <div className="flex-grow overflow-y-auto p-4 hide-scrollbar">
                        {Object.keys(messageGroups).map(date => (
                          <div key={date}>
                            <motion.div 
                              className="flex justify-center my-4"
                              initial={{ opacity: 0, y: 3 }} // Daha az hareket
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ 
                                type: "spring",
                                damping: 8,
                                stiffness: 1000, // Daha sert yay
                                duration: 0.08 // Daha hızlı
                              }}
                            >
                              <motion.span 
                                className="text-xs px-4 py-1 rounded-full backdrop-blur-sm"
                                style={{ 
                                  background: "rgba(149, 76, 233, 0.2)",
                                  border: "1px solid rgba(149, 76, 233, 0.3)",
                                  color: 'white',
                                  boxShadow: "0 4px 12px rgba(149, 76, 233, 0.15)"
                                }}
                                whileHover={{
                                  scale: 1.03, // Daha az büyüme
                                  boxShadow: "0 4px 15px rgba(149, 76, 233, 0.25)", // Daha az gölge
                                  transition: { duration: 0.08 } // Daha hızlı
                                }}
                              >
                                {date === new Date().toLocaleDateString() ? 'Bugün' : date}
                              </motion.span>
                            </motion.div>
                            
                            {messageGroups[date].map((message, index) => (
                              <div key={message.id} className="relative mb-2">
                                <ChatBubble variant={message.sender === "currentUser" ? "sent" : "received"}>
                                  <ChatBubbleAvatar
                                    className="h-8 w-8 shrink-0"
                                    src={
                                      message.sender === "currentUser"
                                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&q=80&crop=faces&fit=crop"
                                        : selectedConversation.avatar
                                    }
                                    fallback={message.sender === "currentUser" ? "ME" : selectedConversation.username.substring(0, 2).toUpperCase()}
                                  />
                                  <ChatBubbleMessage
                                    variant={message.sender === "currentUser" ? "sent" : "received"}
                                  >
                                    <div className="flex flex-col">
                                      <div className="message-content">
                                        <KeyboardEffect text={message.content} speed={0.005} delay={0.001} />
                                      </div>
                                      <div className="text-xs opacity-70 text-right mt-1">
                                        {formatMessageTime(message.timestamp)}
                                      </div>
                                    </div>
                                  </ChatBubbleMessage>
                                </ChatBubble>
                                {message.isNew && (
                                  <MessageBubbleTrail variant={message.sender === "currentUser" ? "sent" : "received"} />
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                        
                        {typing && (
                          <motion.div
                            initial={{ opacity: 0, y: 3 }} // Daha az hareket
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 2 }} // Daha az hareket
                            transition={{ duration: 0.08 }} // Daha hızlı
                          >
                            <ChatBubble variant="received">
                              <ChatBubbleAvatar
                                className="h-8 w-8 shrink-0"
                                src={selectedConversation.avatar}
                                fallback={selectedConversation.username.substring(0, 2).toUpperCase()}
                              />
                              <ChatBubbleMessage isLoading />
                            </ChatBubble>
                          </motion.div>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Mesaj Giriş Alanı */}
                      <motion.div 
                        className="p-4"
                        style={{ 
                          background: "rgba(13, 13, 20, 0.7)",
                          borderTop: '1px solid rgba(149, 76, 233, 0.2)',
                          backdropFilter: 'blur(5px)'
                        }}
                        initial={{ opacity: 0, y: 8 }} // Daha az hareket
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          duration: 0.15, // Daha hızlı
                          type: "spring",
                          damping: 12,
                          stiffness: 800 // Daha sert yay
                        }}
                      >
                        <form 
                          onSubmit={handleSubmit}
                          className="relative rounded-lg backdrop-blur-md overflow-hidden"
                          style={{ 
                            backgroundColor: 'rgba(149, 76, 233, 0.1)', 
                            border: '1px solid rgba(149, 76, 233, 0.3)',
                            boxShadow: "0 4px 15px rgba(149, 76, 233, 0.2), inset 0 0 15px rgba(149, 76, 233, 0.05)" // Daha az gölge
                          }}
                        >
                          <motion.div
                            className="absolute inset-0 z-0 opacity-20"
                            animate={{
                              background: [
                                "linear-gradient(120deg, rgba(149, 76, 233, 0.4), rgba(43, 192, 228, 0.4))",
                                "linear-gradient(320deg, rgba(149, 76, 233, 0.4), rgba(43, 192, 228, 0.4))",
                              ],
                            }}
                            transition={{ 
                              duration: 1.5, // Daha hızlı
                              repeat: Infinity,
                              repeatType: "mirror"
                            }}
                          />
                          <div className="flex items-center relative z-10">
                            <motion.div 
                              className="p-2"
                              whileHover={{ 
                                scale: 1.05, // Daha az büyüme
                                rotate: 5, // Daha az dönme
                                transition: { type: "spring", stiffness: 800, damping: 6, duration: 0.1 } // Daha hızlı
                              }}
                              whileTap={{ scale: 0.95 }} // Daha az küçültme
                            >
                              <Button type="button" className="p-2 rounded-full hover:bg-white/10">
                                <Smile className="h-5 w-5" style={{ color: "rgba(149, 76, 233, 0.9)" }} />
                              </Button>
                            </motion.div>
                            
                            <input
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Mesajınızı yazın..."
                              className="w-full p-3 bg-transparent border-0 outline-none"
                              style={{ color: 'white' }}
                            />
                            
                            <div className="flex items-center">
                              <motion.div 
                                whileHover={{ 
                                  scale: 1.05, // Daha az büyüme
                                  rotate: -3, // Daha az dönme
                                  transition: { type: "spring", stiffness: 800, damping: 6, duration: 0.1 } // Daha hızlı
                                }}
                                whileTap={{ scale: 0.95 }} // Daha az küçültme
                              >
                                <Button type="button" className="p-2 rounded-full hover:bg-white/10">
                                  <Paperclip className="h-5 w-5" style={{ color: "rgba(149, 76, 233, 0.9)" }} />
                                </Button>
                              </motion.div>
                              
                              <motion.div 
                                whileHover={{ 
                                  scale: 1.05, // Daha az büyüme
                                  rotate: 3, // Daha az dönme
                                  transition: { type: "spring", stiffness: 800, damping: 6, duration: 0.1 } // Daha hızlı
                                }}
                                whileTap={{ scale: 0.95 }} // Daha az küçültme
                              >
                                <Button type="button" className="p-2 rounded-full hover:bg-white/10 mr-1">
                                  <Image className="h-5 w-5" style={{ color: "rgba(149, 76, 233, 0.9)" }} />
                                </Button>
                              </motion.div>
                              
                              <SendButton 
                                onClick={handleSubmit} 
                                disabled={isLoading || !input.trim()} 
                              />
                            </div>
                          </div>
                        </form>
                      </motion.div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mesaj Paneli Açma/Kapama Butonu */}
      <motion.div
        variants={buttonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        className="rounded-full overflow-hidden"
        animate={{
          boxShadow: [
            "0 0 10px rgba(149, 76, 233, 0.4), 0 0 0 1px rgba(149, 76, 233, 0.2)",
            "0 0 20px rgba(149, 76, 233, 0.5), 0 0 10px rgba(43, 192, 228, 0.3)", // Daha az gölge
            "0 0 10px rgba(149, 76, 233, 0.4), 0 0 0 1px rgba(149, 76, 233, 0.2)"
          ]
        }}
        transition={{
          repeat: Infinity,
          duration: 1.2, // Daha hızlı
          repeatType: "mirror"
        }}
      >
        <Button
          onClick={togglePanel}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #954ce9, #2bc0e4)',
          }}
        >
          <motion.div
            animate={{ 
              rotate: isOpen ? 180 : 0,
              transition: {
                rotate: { duration: 0.15, ease: "easeOut" }, // Daha hızlı
              }
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.03, 1], // Daha az ölçeklendirme
                filter: [
                  "drop-shadow(0 0 0px rgba(255, 255, 255, 0))",
                  "drop-shadow(0 0 3px rgba(255, 255, 255, 0.8))", // Daha az gölge
                  "drop-shadow(0 0 0px rgba(255, 255, 255, 0))"
                ]
              }}
              transition={{
                repeat: Infinity,
                duration: 0.8, // Daha hızlı
                repeatType: "mirror"
              }}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </motion.div>
          </motion.div>
        </Button>
      </motion.div>

      {/* Global CSS - skrollbarı gizlemek için */}
      {convertBooleanProps({
        component: <style jsx="true" global="true">{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      }).component}
    </div>
  );
}