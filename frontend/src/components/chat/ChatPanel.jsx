import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Send, ArrowLeft, User, Image, Paperclip, Smile } from "lucide-react";
import { getConversations, getMessages, sendMessage } from "../../services/message-service";
import { 
  Button, Avatar, AvatarImage, AvatarFallback, 
  ChatBubble, ChatBubbleAvatar, ChatBubbleMessage 
} from "./ChatComponents";

// Ana MessagesPanel bileşeni
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

  // Konuşmaları yükle
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  // Seçili konuşmaya ait mesajları yükle
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      setShowConversations(false); // Konuşma seçildiğinde mesaj görünümüne geç
    }
  }, [selectedConversation]);

  // Yeni mesajlar geldiğinde otomatik kaydırma
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Belirli aralıklarla mesajları güncelle
  useEffect(() => {
    let interval;
    if (isOpen && selectedConversation) {
      interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 15000); // 15 saniyede bir güncelle
    }
    return () => clearInterval(interval);
  }, [isOpen, selectedConversation]);

  // Konuşmaları yükleme fonksiyonu
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

  // Mesajları yükleme fonksiyonu
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

  // Yazıyor... durumunu simüle etme
  const simulateTyping = useCallback(() => {
    if (selectedConversation) {
      clearTimeout(typingTimeoutRef.current);
      setTyping(true);
      
      // Rastgele bir süre sonra typing durumunu kapat
      const typingDuration = Math.floor(Math.random() * 3000) + 1000; // 1-4 saniye
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, typingDuration);
    }
  }, [selectedConversation]);

  // Mesaj gönderme fonksiyonu
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedConversation) return;

    const newMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      content: input.trim(),
      sender: "currentUser",
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Mesajı API'ye gönder
      await sendMessage(selectedConversation.id, input.trim());
      
      // Karşı tarafın cevap yazıyor olduğunu simüle et
      simulateTyping();
      
      // Bir süre sonra mesajlar güncellensin
      setTimeout(() => {
        loadMessages(selectedConversation.id);
      }, 1500);
    } catch (error) {
      console.error("Mesaj gönderilirken hata:", error);
      // Hata durumunda geçici mesajı kaldır
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Panel açma/kapama
  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowConversations(true);
    }
  };

  // Konuşma listesine dön
  const backToConversations = () => {
    setShowConversations(true);
    setSelectedConversation(null);
  };

  // Konuşma arama
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

  // JSX Yapısını güncelleyelim
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div 
          className="bg-background mb-4 rounded-lg shadow-lg overflow-hidden flex flex-col w-[400px] h-[600px] border"
          style={{ 
            backgroundColor: 'var(--background-card)',
            backdropFilter: 'var(--backdrop-blur)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Panel Header */}
          <div 
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {showConversations ? (
              <div className="flex items-center justify-between w-full">
                <h1 className="text-xl font-semibold">Mesajlar</h1>
                <Button
                  className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500"
                  onClick={togglePanel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Button
                    className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500"
                    onClick={backToConversations}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-semibold">{selectedConversation?.username}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {selectedConversation?.online ? (
                        <span className="flex items-center">
                          <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                          Çevrimiçi
                        </span>
                      ) : (
                        `Son görülme: ${formatLastSeen(selectedConversation?.lastSeen)}`
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500"
                  onClick={togglePanel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex flex-grow overflow-hidden">
            {/* Konuşma Listesi (Sidebar) */}
            {showConversations && (
              <div className="w-full overflow-y-auto" ref={conversationsRef}>
                {/* Arama */}
                <div className="p-3 sticky top-0 bg-background z-10" style={{ backgroundColor: 'var(--background-card)' }}>
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 rounded-md border"
                    style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--input-border)',
                      color: 'var(--input-text)'
                    }}
                  />
                </div>
                
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                    <User className="h-12 w-12 mb-2 opacity-30" />
                    <p className="text-lg font-medium">Sonuç bulunamadı</p>
                    <p className="text-sm opacity-70">Farklı bir arama terimi deneyin</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div 
                      key={conversation.id}
                      className="flex items-center gap-3 p-3 hover:bg-opacity-10 hover:bg-gray-500 cursor-pointer relative"
                      onClick={() => setSelectedConversation(conversation)}
                      style={{
                        backgroundColor: conversation.unreadCount > 0 ? 'rgba(0, 123, 255, 0.05)' : 'transparent'
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
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2" style={{ borderColor: 'var(--background-card)' }}></span>
                        )}
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <div className="font-medium">{conversation.username}</div>
                        <div className="text-sm truncate opacity-70">{conversation.lastMessage}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs opacity-70">
                          {new Date(conversation.lastSeen).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="mt-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Mesaj Görünümü */}
            {!showConversations && selectedConversation && (
              <div className="flex flex-col flex-grow">
                {/* Mesaj Listesi */}
                <div className="flex-grow overflow-y-auto p-4">
                  {Object.keys(messageGroups).map(date => (
                    <div key={date}>
                      <div className="flex justify-center my-3">
                        <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--background-tertiary)', color: 'var(--text-secondary)' }}>
                          {date === new Date().toLocaleDateString() ? 'Bugün' : date}
                        </span>
                      </div>
                      
                      {messageGroups[date].map((message) => (
                        <ChatBubble
                          key={message.id}
                          variant={message.sender === "currentUser" ? "sent" : "received"}
                        >
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
                            style={{
                              backgroundColor: message.sender === "currentUser" ? 'var(--accent-blue)' : 'var(--background-secondary)',
                              color: message.sender === "currentUser" ? 'var(--text-inverted)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="flex flex-col">
                              <div>{message.content}</div>
                              <div className="text-xs opacity-70 text-right mt-1">
                                {formatMessageTime(message.timestamp)}
                              </div>
                            </div>
                          </ChatBubbleMessage>
                        </ChatBubble>
                      ))}
                    </div>
                  ))}
                  
                  {typing && (
                    <ChatBubble variant="received">
                      <ChatBubbleAvatar
                        className="h-8 w-8 shrink-0"
                        src={selectedConversation.avatar}
                        fallback={selectedConversation.username.substring(0, 2).toUpperCase()}
                      />
                      <ChatBubbleMessage isLoading />
                    </ChatBubble>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Mesaj Giriş Alanı */}
                <div 
                  className="border-t p-4"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <form 
                    onSubmit={handleSubmit}
                    className="relative rounded-lg border focus-within:ring-1 focus-within:ring-ring"
                    style={{ 
                      backgroundColor: 'var(--input-bg)', 
                      borderColor: 'var(--input-border)' 
                    }}
                  >
                    <div className="flex items-center">
                      <div className="p-2">
                        <Button 
                          type="button" 
                          className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500"
                        >
                          <Smile className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="w-full p-3 bg-transparent border-0 outline-none"
                        style={{ color: 'var(--input-text)' }}
                      />
                      
                      <div className="flex items-center">
                        <Button 
                          type="button" 
                          className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500"
                        >
                          <Paperclip className="h-5 w-5" />
                        </Button>
                        
                        <Button 
                          type="button" 
                          className="p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 mr-1"
                        >
                          <Image className="h-5 w-5" />
                        </Button>
                        
                        <Button 
                          type="submit" 
                          className="flex items-center justify-center p-2 rounded-full mx-1"
                          style={{
                            background: input.trim() ? 'var(--accent-blue)' : 'var(--background-tertiary)',
                            color: input.trim() ? 'var(--text-inverted)' : 'var(--text-secondary)'
                          }}
                          disabled={isLoading || !input.trim()}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mesaj Paneli Açma/Kapama Butonu */}
      <Button
        onClick={togglePanel}
        className="w-14 h-14 rounded-full shadow-md flex items-center justify-center hover:shadow-lg hover:shadow-black/30 transition-all duration-300"
        style={{
          background: 'var(--accent-blue)',
          color: 'var(--text-inverted)'
        }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Users className="h-6 w-6" />}
      </Button>
    </div>
  );
}