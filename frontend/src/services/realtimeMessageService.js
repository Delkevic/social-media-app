/**
 * Real-time Mesajlaşma Servisi
 * localStorage + API polling ile gerçek zamanlı mesajlaşma
 */

// Mesaj formatı
const MESSAGE_FORMAT = {
  id: '',
  conversationId: '',
  senderId: '',
  receiverId: '',
  content: '',
  mediaUrl: null,
  mediaType: null,
  sentAt: '',
  isRead: false,
  isDelivered: true
};

// Konuşma formatı
const CONVERSATION_FORMAT = {
  id: '',
  participants: [],
  lastMessage: '',
  lastMessageTime: '',
  lastMessageSender: '',
  unreadCount: {}
};

class RealtimeMessageService {
  constructor() {
    this.currentUserId = null;
    this.conversations = new Map();
    this.messages = new Map(); // conversationId -> messages[]
    this.listeners = new Map(); // event -> callbacks[]
    this.pollInterval = null;
    this.pollFrequency = 2000; // 2 saniye
    this.isPolling = false;
    this.connectionStatusCallback = null;
    
    console.log('RealtimeMessageService: Başlatılıyor...');
    this.initializeStorage();
  }

  // LocalStorage'ı başlat
  initializeStorage() {
    if (!localStorage.getItem('rms_conversations')) {
      localStorage.setItem('rms_conversations', JSON.stringify({}));
    }
    if (!localStorage.getItem('rms_messages')) {
      localStorage.setItem('rms_messages', JSON.stringify({}));
    }
  }

  // Event listener ekle
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    console.log(`RealtimeMessageService: ${event} listener eklendi`);
  }

  // Event listener kaldır
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Event emit et
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`RealtimeMessageService: ${event} listener hatası:`, error);
        }
      });
    }
  }

  // Kullanıcı ayarla ve polling başlat
  setCurrentUser(userId) {
    // userId'yi string'e çevir
    const userIdStr = userId ? String(userId) : null;
    
    if (this.currentUserId === userIdStr) return;
    
    console.log('RealtimeMessageService: setCurrentUser çağrıldı:', {
      'original userId': userId,
      'userId type': typeof userId,
      'converted userIdStr': userIdStr,
      'userIdStr type': typeof userIdStr
    });
    
    this.currentUserId = userIdStr;
    console.log('RealtimeMessageService: Kullanıcı ayarlandı:', this.currentUserId);
    
    if (userIdStr) {
      // Demo verileri temizle
      this.clearDemoData();
      
      this.startPolling();
      this.loadInitialData();
    } else {
      this.stopPolling();
    }
  }

  // İlk veriyi yükle
  async loadInitialData() {
    try {
      // Konuşmaları yükle
      await this.loadConversations();
      
      console.log('RealtimeMessageService: İlk veriler yüklendi');
    } catch (error) {
      console.error('RealtimeMessageService: İlk veri yükleme hatası:', error);
    }
  }

  // Token alma yardımcı fonksiyonu
  getToken() {
    // Önce sessionStorage'dan kontrol et, sonra localStorage
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  // Konuşmaları yükle
  async loadConversations() {
    if (!this.currentUserId) return;

    try {
      // LocalStorage'dan konuşmaları al
      const stored = JSON.parse(localStorage.getItem('rms_conversations') || '{}');
      const userConversations = stored[this.currentUserId] || {};
      
      // Map'e yükle - sadece gerçek konuşmaları
      Object.entries(userConversations).forEach(([id, conv]) => {
        // Demo konuşmaları filtrele
        if (!id.includes('demo_user_')) {
          this.conversations.set(id, conv);
        }
      });

      // API'den güncel konuşmaları çek (mevcut konuşmalar varsa)
      try {
        const API_URL = 'http://localhost:8080/api';
        const token = this.getToken();
        
        if (!token) {
          console.log('RealtimeMessageService: Token bulunamadı, API çağrısı yapılmıyor');
          this.emit('conversations:updated', this.getConversationsArray());
          return;
        }
        
        const response = await fetch(`${API_URL}/messages`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (response.ok) {
          const apiConversations = await response.json();
          // API verilerini merge et...
          console.log('RealtimeMessageService: API\'den konuşmalar alındı:', apiConversations);
        } else {
          console.log('RealtimeMessageService: API konuşma yükleme başarısız:', response.status);
        }
      } catch (apiError) {
        console.log('RealtimeMessageService: API\'den konuşma yüklenemedi, localStorage kullanılıyor');
      }

      this.emit('conversations:updated', this.getConversationsArray());
    } catch (error) {
      console.error('RealtimeMessageService: Konuşma yükleme hatası:', error);
    }
  }

  // Konuşmaları array olarak al
  getConversationsArray() {
    return Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(this.currentUserId))
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
  }

  // Mesajları yükle
  async loadMessages(conversationId) {
    if (!conversationId) return [];

    try {
      // Önce localStorage'dan mesajları al
      const stored = JSON.parse(localStorage.getItem('rms_messages') || '{}');
      let conversationMessages = stored[conversationId] || [];
      
      // API'den mesajları yüklemeye çalış
      try {
        // conversationId'den userId'leri çıkar (format: conv_1_2)
        const userIds = conversationId.replace('conv_', '').split('_');
        const otherUserId = userIds.find(id => id !== this.currentUserId);
        
        if (otherUserId) {
          const API_URL = 'http://localhost:8080/api';
          const token = this.getToken();
          
          if (!token) {
            console.log('RealtimeMessageService: Token bulunamadı, API mesaj çağrısı yapılmıyor');
            this.messages.set(conversationId, conversationMessages);
            console.log(`RealtimeMessageService: ${conversationId} konuşması için ${conversationMessages.length} mesaj yüklendi (sadece localStorage)`);
            return conversationMessages;
          }
          
          const response = await fetch(`${API_URL}/messages/${otherUserId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            }
          });

          if (response.ok) {
            const apiResponse = await response.json();
            if (apiResponse.success && apiResponse.data && apiResponse.data.messages) {
              console.log(`RealtimeMessageService: API'den ${apiResponse.data.messages.length} mesaj yüklendi`);
              
              // API mesajlarını localStorage formatına çevir
              const apiMessages = apiResponse.data.messages.map(msg => ({
                id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                conversationId,
                senderId: String(msg.senderId),
                receiverId: String(msg.receiverId),
                content: msg.content || '',
                mediaUrl: msg.mediaUrl,
                mediaType: msg.mediaType,
                sentAt: msg.sentAt || msg.createdAt || new Date().toISOString(),
                isRead: msg.isRead || false,
                isDelivered: true
              }));
              
              // API mesajları ile localStorage mesajlarını birleştir
              const allMessages = [...conversationMessages];
              
              // API'den gelen yeni mesajları ekle (duplicate kontrolü)
              apiMessages.forEach(apiMsg => {
                const exists = allMessages.find(msg => 
                  msg.id === apiMsg.id || 
                  (msg.content === apiMsg.content && 
                   Math.abs(new Date(msg.sentAt) - new Date(apiMsg.sentAt)) < 1000)
                );
                
                if (!exists) {
                  allMessages.push(apiMsg);
                }
              });
              
              // Zaman sırasına göre sırala
              conversationMessages = allMessages.sort((a, b) => 
                new Date(a.sentAt) - new Date(b.sentAt)
              );
              
              // Güncellenmiş mesajları localStorage'a kaydet
              this.saveMessagesToStorage(conversationId, conversationMessages);
            }
          } else {
            console.log('RealtimeMessageService: API mesaj yükleme başarısız:', response.status);
          }
        }
      } catch (apiError) {
        console.log('RealtimeMessageService: API\'den mesaj yüklenemedi, localStorage kullanılıyor');
      }
      
      this.messages.set(conversationId, conversationMessages);
      
      console.log(`RealtimeMessageService: ${conversationId} konuşması için ${conversationMessages.length} mesaj yüklendi`);
      return conversationMessages;
    } catch (error) {
      console.error('RealtimeMessageService: Mesaj yükleme hatası:', error);
      return [];
    }
  }

  // Konuşma ID'si oluştur
  createConversationId(userId1, userId2) {
    const sortedIds = [userId1, userId2].sort();
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
  }

  // Yeni konuşma oluştur
  async createConversation(otherUserId) {
    if (!this.currentUserId || !otherUserId) {
      throw new Error('Kullanıcı ID\'leri gerekli');
    }

    const conversationId = this.createConversationId(this.currentUserId, otherUserId);
    
    // Mevcut konuşma var mı kontrol et
    if (this.conversations.has(conversationId)) {
      return conversationId;
    }

    // Yeni konuşma oluştur
    const conversation = {
      id: conversationId,
      participants: [this.currentUserId, otherUserId],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      lastMessageSender: null,
      unreadCount: {
        [this.currentUserId]: 0,
        [otherUserId]: 0
      }
    };

    // Kaydet
    this.conversations.set(conversationId, conversation);
    this.saveConversationToStorage(conversation);
    
    console.log('RealtimeMessageService: Yeni konuşma oluşturuldu:', conversationId);
    
    // Dinleyicileri bilgilendir
    this.emit('conversations:updated', this.getConversationsArray());
    
    return conversationId;
  }

  // Mesaj gönder
  async sendMessage({ recipientId, content, mediaUrl = null, mediaType = null }) {
    console.log('sendMessage çağrıldı:', { 
      currentUserId: this.currentUserId, 
      recipientId, 
      content: content?.slice(0, 50) + '...' 
    });

    if (!this.currentUserId || !recipientId) {
      console.error('sendMessage hatası: currentUserId =', this.currentUserId, 'recipientId =', recipientId);
      throw new Error('Gönderici ve alıcı ID\'leri gerekli');
    }

    if (!content && !mediaUrl) {
      throw new Error('Mesaj içeriği veya medya gerekli');
    }

    try {
      // Konuşma ID'si oluştur
      const conversationId = this.createConversationId(this.currentUserId, recipientId);
      
      // Konuşma yoksa oluştur
      if (!this.conversations.has(conversationId)) {
        await this.createConversation(recipientId);
      }

      // Mesaj oluştur
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId: this.currentUserId,
        receiverId: recipientId,
        content: content || '',
        mediaUrl,
        mediaType,
        sentAt: new Date().toISOString(),
        isRead: false,
        isDelivered: true
      };

      // Önce localStorage'a kaydet ve UI'yi hemen güncelle
      let messages = this.messages.get(conversationId) || [];
      messages.push(message);
      this.messages.set(conversationId, messages);
      this.saveMessageToStorage(conversationId, message);

      // Konuşmayı güncelle
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.lastMessage = content || 'Medya dosyası';
        conversation.lastMessageTime = message.sentAt;
        conversation.lastMessageSender = this.currentUserId;
        conversation.unreadCount[recipientId] = (conversation.unreadCount[recipientId] || 0) + 1;
        
        this.saveConversationToStorage(conversation);
      }

      // ÖNEMLİ: UI'yi hemen güncelle (backend'den bağımsız)
      console.log('RealtimeMessageService: UI güncelleniyor - mesaj sayısı:', messages.length);
      
      // Event'i emit et - UI anında güncellensin
      setTimeout(() => {
        console.log('RealtimeMessageService: messages:updated event emit ediliyor:', {
          conversationId,
          messageCount: messages.length
        });
        this.emit('messages:updated', { conversationId, messages });
        this.emit('conversations:updated', this.getConversationsArray());
      }, 50); // Kısa bir delay ile UI thread'ını bloklamayalım

      // Backend'e mesajı gönder (background işlem)
      this.sendToBackend(message, recipientId, content, mediaUrl, mediaType);

      console.log('RealtimeMessageService: Mesaj gönderildi:', message.id);
      return message.id;
    } catch (error) {
      console.error('RealtimeMessageService: Mesaj gönderme hatası:', error);
      throw error;
    }
  }

  // Backend'e mesaj gönderme (ayrı fonksiyon)
  async sendToBackend(message, recipientId, content, mediaUrl, mediaType) {
    try {
      const API_URL = 'http://localhost:8080/api';
      const token = this.getToken();
      
      if (!token) {
        console.log('RealtimeMessageService: Token bulunamadı, mesaj sadece localStorage\'a kaydedildi');
        message.isDelivered = false;
        message.error = 'Token bulunamadı';
        return;
      }

      const response = await fetch(`${API_URL}/messages/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: content || '',
          mediaUrl,
          mediaType
        })
      });

      if (response.ok) {
        const apiResponse = await response.json();
        console.log('RealtimeMessageService: Mesaj backend\'e gönderildi:', apiResponse);
        
        // API'den gelen mesaj ID'si ile güncelle
        if (apiResponse.data && apiResponse.data.id) {
          message.id = apiResponse.data.id;
          message.isDelivered = true;
          
          // Güncellenmiş mesajı kaydet
          const conversationId = message.conversationId;
          let messages = this.messages.get(conversationId) || [];
          messages = messages.map(msg => 
            msg.sentAt === message.sentAt && msg.senderId === message.senderId 
              ? message 
              : msg
          );
          this.messages.set(conversationId, messages);
          this.saveMessageToStorage(conversationId, message);
          
          // UI'yi tekrar güncelle (backend ID ile)
          this.emit('messages:updated', { conversationId, messages });
        }
      } else {
        console.error('RealtimeMessageService: Backend mesaj gönderme başarısız:', response.status);
        message.isDelivered = false;
        message.error = 'Gönderim başarısız';
      }
    } catch (apiError) {
      console.error('RealtimeMessageService: Backend API hatası:', apiError);
      message.isDelivered = false;
      message.error = 'API hatası';
    }
  }

  // Mesajları dinle
  listenToMessages(conversationId, callback) {
    if (!conversationId) {
      console.error('RealtimeMessageService: Konuşma ID\'si gerekli');
      return () => {};
    }

    console.log('RealtimeMessageService: Mesajlar dinlenmeye başlandı:', conversationId);

    // İlk mesajları yükle
    this.loadMessages(conversationId).then(messages => {
      callback(messages);
    });

    // Event listener ekle
    const messageListener = (data) => {
      if (data.conversationId === conversationId) {
        callback(data.messages);
      }
    };

    this.on('messages:updated', messageListener);

    // Cleanup fonksiyonu döndür
    return () => {
      this.off('messages:updated', messageListener);
      console.log('RealtimeMessageService: Mesaj dinleyicisi kaldırıldı:', conversationId);
    };
  }

  // Konuşmaları dinle
  listenToConversations(callback) {
    console.log('RealtimeMessageService: Konuşmalar dinlenmeye başlandı');

    // Bağlantı durumunu güncelle
    this.updateConnectionStatus('connecting');

    // İlk konuşmaları yükle ve formatlayalım
    setTimeout(() => {
      const conversations = this.getConversationsArray();
      
      // Messages.jsx'in beklediği format için dönüştür
      const formattedConversations = conversations.map(conv => {
        // Diğer katılımcıyı bul
        const otherParticipantId = conv.participants.find(id => id !== this.currentUserId);
        
        return {
          id: conv.id,
          otherParticipantId: otherParticipantId,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          lastMessageSender: conv.lastMessageSender,
          unreadCount: conv.unreadCount[this.currentUserId] || 0
        };
      });
      
      console.log('RealtimeMessageService: Formatlanmış konuşmalar:', formattedConversations);
      this.updateConnectionStatus('connected');
      callback(formattedConversations);
    }, 500);

    // Event listener ekle
    const conversationListener = (conversations) => {
      // Aynı formatlama işlemini uygula
      const formattedConversations = conversations.map(conv => {
        const otherParticipantId = conv.participants.find(id => id !== this.currentUserId);
        
        return {
          id: conv.id,
          otherParticipantId: otherParticipantId,
          lastMessage: conv.lastMessage,
          lastMessageTime: conv.lastMessageTime,
          lastMessageSender: conv.lastMessageSender,
          unreadCount: conv.unreadCount[this.currentUserId] || 0
        };
      });
      
      callback(formattedConversations);
    };

    this.on('conversations:updated', conversationListener);

    // Cleanup fonksiyonu döndür
    return () => {
      this.off('conversations:updated', conversationListener);
      console.log('RealtimeMessageService: Konuşma dinleyicisi kaldırıldı');
    };
  }

  // Mesajları okundu işaretle
  async markMessagesAsRead(conversationId) {
    if (!conversationId || !this.currentUserId) return;

    try {
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        conversation.unreadCount[this.currentUserId] = 0;
        this.saveConversationToStorage(conversation);
        
        // Mesajları okundu olarak işaretle
        const messages = this.messages.get(conversationId) || [];
        let updated = false;
        messages.forEach(message => {
          if (message.receiverId === this.currentUserId && !message.isRead) {
            message.isRead = true;
            updated = true;
          }
        });

        if (updated) {
          this.saveMessagesToStorage(conversationId, messages);
          this.emit('messages:updated', { conversationId, messages });
        }

        this.emit('conversations:updated', this.getConversationsArray());
      }
    } catch (error) {
      console.error('RealtimeMessageService: Mesaj okundu işaretleme hatası:', error);
    }
  }

  // LocalStorage'a konuşma kaydet
  saveConversationToStorage(conversation) {
    try {
      const stored = JSON.parse(localStorage.getItem('rms_conversations') || '{}');
      if (!stored[this.currentUserId]) {
        stored[this.currentUserId] = {};
      }
      stored[this.currentUserId][conversation.id] = conversation;
      localStorage.setItem('rms_conversations', JSON.stringify(stored));
    } catch (error) {
      console.error('RealtimeMessageService: Konuşma kaydetme hatası:', error);
    }
  }

  // LocalStorage'a mesaj kaydet
  saveMessageToStorage(conversationId, message) {
    try {
      const stored = JSON.parse(localStorage.getItem('rms_messages') || '{}');
      if (!stored[conversationId]) {
        stored[conversationId] = [];
      }
      stored[conversationId].push(message);
      localStorage.setItem('rms_messages', JSON.stringify(stored));
    } catch (error) {
      console.error('RealtimeMessageService: Mesaj kaydetme hatası:', error);
    }
  }

  // LocalStorage'a mesajları kaydet
  saveMessagesToStorage(conversationId, messages) {
    try {
      const stored = JSON.parse(localStorage.getItem('rms_messages') || '{}');
      stored[conversationId] = messages;
      localStorage.setItem('rms_messages', JSON.stringify(stored));
    } catch (error) {
      console.error('RealtimeMessageService: Mesajlar kaydetme hatası:', error);
    }
  }

  // Polling başlat
  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('RealtimeMessageService: Polling başlatıldı');
    
    this.pollInterval = setInterval(() => {
      this.poll();
    }, this.pollFrequency);
  }

  // Polling durdur
  stopPolling() {
    if (!this.isPolling) return;
    
    this.isPolling = false;
    console.log('RealtimeMessageService: Polling durduruldu');
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Polling işlemi - yeni mesajları kontrol et
  async poll() {
    if (!this.currentUserId) return;

    try {
      // Basit simülasyon - gerçek uygulamada API'den yeni mesajlar çekilir
      // Bu örnek localStorage'daki değişiklikleri kontrol eder
      
      console.log('RealtimeMessageService: Polling check...');
      
      // Konuşmaları yeniden yükle
      await this.loadConversations();
      
    } catch (error) {
      console.error('RealtimeMessageService: Polling hatası:', error);
    }
  }

  // Temizlik
  cleanup() {
    console.log('RealtimeMessageService: Temizlik yapılıyor...');
    
    this.stopPolling();
    this.listeners.clear();
    this.conversations.clear();
    this.messages.clear();
    this.currentUserId = null;
    
    console.log('RealtimeMessageService: Temizlik tamamlandı');
  }

  // Bağlantı durumu (her zaman bağlı varsayıyoruz)
  getConnectionStatus() {
    return 'connected';
  }

  // Bağlantı durumu callback'i ayarla
  setConnectionStatusCallback(callback) {
    this.connectionStatusCallback = callback;
  }

  // Bağlantı durumunu güncelle
  updateConnectionStatus(status) {
    if (this.connectionStatusCallback) {
      this.connectionStatusCallback(status);
    }
  }

  // Demo konuşmalar oluştur (test için)
  createDemoConversations() {
    if (!this.currentUserId) return;
    
    console.log('RealtimeMessageService: Demo konuşmalar oluşturuluyor...');
    
    // Demo kullanıcı bilgileri - gerçek kullanıcı gibi görünmesi için
    const demoUsers = [
      {
        id: 'demo_user_1',
        username: 'ahmet_demo',
        fullName: 'Ahmet Yılmaz',
        profileImage: 'https://ui-avatars.com/api/?name=AY&background=0D1117&color=0AFFD9'
      },
      {
        id: 'demo_user_2', 
        username: 'zehra_demo',
        fullName: 'Zehra Kaya',
        profileImage: 'https://ui-avatars.com/api/?name=ZK&background=0D1117&color=0AFFD9'
      },
      {
        id: 'demo_user_3',
        username: 'can_demo', 
        fullName: 'Can Özdemir',
        profileImage: 'https://ui-avatars.com/api/?name=CO&background=0D1117&color=0AFFD9'
      }
    ];
    
    demoUsers.forEach((demoUser, index) => {
      if (demoUser.id === this.currentUserId) return;
      
      const conversationId = this.createConversationId(this.currentUserId, demoUser.id);
      
      // Konuşma oluştur
      const conversation = {
        id: conversationId,
        participants: [this.currentUserId, demoUser.id],
        lastMessage: `Merhaba! Bu ${index + 1}. demo konuşması.`,
        lastMessageTime: new Date(Date.now() - index * 60000).toISOString(), // Farklı zamanlar
        lastMessageSender: demoUser.id,
        unreadCount: {
          [this.currentUserId]: index > 0 ? 1 : 0, // İlk konuşmada okunmamış mesaj yok
          [demoUser.id]: 0
        }
      };
      
      this.conversations.set(conversationId, conversation);
      this.saveConversationToStorage(conversation);
      
      // Demo mesajlar oluştur
      const messages = [
        {
          id: `msg_demo_${index}_1`,
          conversationId,
          senderId: demoUser.id,
          receiverId: this.currentUserId,
          content: `Merhaba! Bu ${index + 1}. demo konuşması.`,
          mediaUrl: null,
          mediaType: null,
          sentAt: new Date(Date.now() - index * 60000).toISOString(),
          isRead: index === 0, // İlk konuşma okunmuş
          isDelivered: true
        },
        {
          id: `msg_demo_${index}_2`,
          conversationId,
          senderId: demoUser.id,
          receiverId: this.currentUserId,
          content: `Nasılsın? Bugün ne yapıyorsun?`,
          mediaUrl: null,
          mediaType: null,
          sentAt: new Date(Date.now() - index * 50000).toISOString(),
          isRead: index === 0,
          isDelivered: true
        }
      ];
      
      this.messages.set(conversationId, messages);
      this.saveMessagesToStorage(conversationId, messages);
    });
    
    // Dinleyicileri bilgilendir
    this.emit('conversations:updated', this.getConversationsArray());
    
    console.log('RealtimeMessageService: Demo konuşmalar oluşturuldu');
  }

  // Demo kullanıcı bilgilerini al (API yerine)
  getDemoUserInfo(userId) {
    const demoUsers = {
      'demo_user_1': {
        id: 'demo_user_1',
        username: 'ahmet_demo',
        full_name: 'Ahmet Yılmaz',
        fullName: 'Ahmet Yılmaz',
        profile_picture: 'https://ui-avatars.com/api/?name=AY&background=0D1117&color=0AFFD9',
        profileImage: 'https://ui-avatars.com/api/?name=AY&background=0D1117&color=0AFFD9'
      },
      'demo_user_2': {
        id: 'demo_user_2',
        username: 'zehra_demo',
        full_name: 'Zehra Kaya',
        fullName: 'Zehra Kaya',
        profile_picture: 'https://ui-avatars.com/api/?name=ZK&background=0D1117&color=0AFFD9',
        profileImage: 'https://ui-avatars.com/api/?name=ZK&background=0D1117&color=0AFFD9'
      },
      'demo_user_3': {
        id: 'demo_user_3',
        username: 'can_demo',
        full_name: 'Can Özdemir', 
        fullName: 'Can Özdemir',
        profile_picture: 'https://ui-avatars.com/api/?name=CO&background=0D1117&color=0AFFD9',
        profileImage: 'https://ui-avatars.com/api/?name=CO&background=0D1117&color=0AFFD9'
      }
    };
    
    return demoUsers[userId] || null;
  }

  // Demo verileri temizle
  clearDemoData() {
    try {
      console.log('RealtimeMessageService: Demo veriler temizleniyor...');
      
      // Conversations'dan demo verileri temizle
      const storedConversations = JSON.parse(localStorage.getItem('rms_conversations') || '{}');
      let conversationsChanged = false;
      
      Object.keys(storedConversations).forEach(userId => {
        const userConversations = storedConversations[userId];
        Object.keys(userConversations).forEach(convId => {
          if (convId.includes('demo_user_') || userConversations[convId].participants?.some(p => String(p).includes('demo_user_'))) {
            delete userConversations[convId];
            conversationsChanged = true;
          }
        });
      });
      
      if (conversationsChanged) {
        localStorage.setItem('rms_conversations', JSON.stringify(storedConversations));
      }
      
      // Messages'dan demo verileri temizle
      const storedMessages = JSON.parse(localStorage.getItem('rms_messages') || '{}');
      let messagesChanged = false;
      
      Object.keys(storedMessages).forEach(convId => {
        if (convId.includes('demo_user_')) {
          delete storedMessages[convId];
          messagesChanged = true;
        }
      });
      
      if (messagesChanged) {
        localStorage.setItem('rms_messages', JSON.stringify(storedMessages));
      }
      
      // Memory'deki demo verileri temizle
      this.conversations.forEach((conv, id) => {
        if (id.includes('demo_user_') || conv.participants?.some(p => String(p).includes('demo_user_'))) {
          this.conversations.delete(id);
        }
      });
      
      this.messages.forEach((messages, convId) => {
        if (convId.includes('demo_user_')) {
          this.messages.delete(convId);
        }
      });
      
      console.log('RealtimeMessageService: Demo veriler temizlendi');
      
      // Dinleyicileri güncelle
      this.emit('conversations:updated', this.getConversationsArray());
      
    } catch (error) {
      console.error('RealtimeMessageService: Demo veri temizleme hatası:', error);
    }
  }
}

// Manual localStorage temizleme fonksiyonu
export const clearMessageStorage = () => {
  try {
    console.log('Mesaj verilerini temizliyor...');
    localStorage.removeItem('rms_conversations');
    localStorage.removeItem('rms_messages');
    console.log('Mesaj verileri temizlendi');
    
    // Sayfa yenilenmesi gerekebilir
    if (window.confirm('Mesaj verileri temizlendi. Sayfayı yenilemek ister misiniz?')) {
      window.location.reload();
    }
  } catch (error) {
    console.error('localStorage temizleme hatası:', error);
  }
};

// Singleton instance
let instance = null;

export const getRealtimeMessageService = () => {
  if (!instance) {
    console.log('RealtimeMessageService: Yeni instance oluşturuluyor...');
    instance = new RealtimeMessageService();
  }
  
  return instance;
};

export default RealtimeMessageService; 