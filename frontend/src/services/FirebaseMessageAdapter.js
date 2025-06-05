import {
  sendMessage,
  listenForMessages,
  listenForConversations,
  markMessagesAsRead,
  createConversationId,
  deleteMessage
} from './firebaseService';

/**
 * Firebase mesajlaşma adaptörü
 * Bu sınıf, uygulama ile Firebase arasında köprü görevi görür
 */
class FirebaseMessageAdapter {
  constructor(currentUserId) {
    this.currentUserId = currentUserId;
    this.messageListeners = new Map();
    this.conversationListener = null;
    this.conversationUnsubscribe = null;
    this.messageUnsubscribe = null;
    this.isConnected = false;
    this.connectionStatusCallback = null;
    
    console.log('FirebaseMessageAdapter: Başlatılıyor, UserId:', currentUserId);
  }

  /**
   * Kullanıcı ID'sini güncelle
   * @param {string} userId - Yeni kullanıcı ID'si
   */
  setCurrentUserId(userId) {
    this.currentUserId = userId;
  }

  /**
   * Mesaj gönder
   * @param {object} params - Mesaj parametreleri
   * @returns {Promise<string>} - Gönderilen mesaj ID'si
   */
  async sendMessage(params) {
    console.log('FirebaseMessageAdapter: Mesaj gönderiliyor...', {
      conversationId: params.conversationId,
      recipientId: params.recipientId,
      content: params.content?.substring(0, 50),
      hasMedia: !!params.mediaUrl
    });
    
    const { conversationId, recipientId, content, mediaUrl, mediaType } = params;
    
    // ConversationId oluştur (eğer verilmemişse)
    const actualConversationId = conversationId || createConversationId(this.currentUserId, recipientId);
    
    try {
      // Mesajı gönder - firebaseService API'sine uygun parametreler
      const messageId = await sendMessage({
        conversationId: actualConversationId,
        recipientId,
        senderId: this.currentUserId,
        content: content || '',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null
      });
      
      console.log('FirebaseMessageAdapter: Mesaj başarıyla gönderildi:', messageId);
      return messageId;
    } catch (error) {
      console.error('FirebaseMessageAdapter: Mesaj gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Bir konuşmadaki mesajları dinle
   * @param {string} conversationId - Konuşma ID'si
   * @param {string} recipientId - Alıcı ID'si
   * @param {function} callback - Mesajlar değiştiğinde çağrılacak fonksiyon
   * @returns {function} - Dinlemeyi durdurmak için çağrılacak fonksiyon
   */
  listenToMessages(conversationId, recipientId, callback) {
    console.log('FirebaseMessageAdapter: Mesajlar dinlenmeye başlanıyor, ConversationId:', conversationId);
    
    // Eğer konuşma ID'si verilmemişse, oluştur
    const actualConversationId = conversationId || createConversationId(this.currentUserId, recipientId);
    
    try {
      // Daha önce bir dinleyici varsa, onu durdur
      if (this.messageUnsubscribe) {
        console.log('FirebaseMessageAdapter: Önceki mesaj listener temizleniyor');
        this.messageUnsubscribe();
      }
      
      // Yeni dinleyiciyi oluştur
      this.messageUnsubscribe = listenForMessages(actualConversationId, (messages) => {
        console.log('FirebaseMessageAdapter: Mesajlar güncellendi:', messages.length);
        this.isConnected = true;
        // Mesajları dönüştür (Firebase formatından uygulama formatına)
        const formattedMessages = messages.map(message => ({
          id: message.id,
          content: message.content,
          sentAt: message.sentAt, // Firebase'dan gelen ISO string
          senderId: message.senderId,
          receiverId: message.receiverId,
          isRead: message.isRead,
          isDelivered: message.isDelivered,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType
        }));
        
        callback(formattedMessages);
      });
      
      console.log('FirebaseMessageAdapter: Mesaj listener başlatıldı');
    } catch (error) {
      console.error('FirebaseMessageAdapter: Mesaj listener hatası:', error);
      this.isConnected = false;
      callback([]);
    }
    
    // Mesajları okundu olarak işaretle
    this.markMessagesAsRead(actualConversationId);
    
    return this.messageUnsubscribe;
  }

  /**
   * Bir kullanıcının tüm konuşmalarını dinle
   * @param {function} callback - Konuşmalar değiştiğinde çağrılacak fonksiyon
   * @returns {function} - Dinlemeyi durdurmak için çağrılacak fonksiyon
   */
  listenToConversations(callback) {
    console.log('FirebaseMessageAdapter: Konuşmalar dinlenmeye başlanıyor...');
    
    try {
      // Daha önce bir dinleyici varsa, onu durdur
      if (this.conversationUnsubscribe) {
        console.log('FirebaseMessageAdapter: Önceki konuşma listener temizleniyor');
        this.conversationUnsubscribe();
        this.conversationUnsubscribe = null;
      }
      
      // Yeni dinleyiciyi oluştur
      this.conversationUnsubscribe = listenForConversations(this.currentUserId, (conversations) => {
        console.log('FirebaseMessageAdapter: Konuşmalar güncellendi:', conversations.length);
        this.isConnected = true;
        this.updateConnectionStatus('connected');
        
        // Kullanıcı bilgilerini ekle
        const enhancedConversations = conversations.map(conv => ({
          id: conv.id,
          senderId: conv.otherParticipantId,
          lastMessage: conv.lastMessage,
          timestamp: conv.lastMessageTime,
          name: `Kullanıcı ${conv.otherParticipantId}`,
          avatar: null,
          unreadCount: conv.unreadCount || 0
        }));
        
        callback(enhancedConversations);
      });
      
      // Bağlantı kuruluyor durumu
      this.updateConnectionStatus('connecting');
      
      return this.conversationUnsubscribe;
    } catch (error) {
      console.error('FirebaseMessageAdapter: Konuşma dinleme hatası:', error);
      this.isConnected = false;
      this.updateConnectionStatus('error');
      callback([]);
      return () => {};
    }
  }

  /**
   * Bir konuşmadaki tüm mesajları okundu olarak işaretle
   * @param {string} conversationId - Konuşma ID'si
   * @returns {Promise<void>}
   */
  async markMessagesAsRead(conversationId) {
    if (!conversationId || !this.currentUserId) return;
    
    return await markMessagesAsRead(conversationId, this.currentUserId);
  }

  /**
   * Bir mesajı sil
   * @param {string} conversationId - Konuşma ID'si
   * @param {string} messageId - Mesaj ID'si
   * @returns {Promise<void>}
   */
  async deleteMessage(conversationId, messageId) {
    return await deleteMessage(conversationId, messageId);
  }

  /**
   * Tüm dinleyicileri temizle
   */
  cleanup() {
    console.log('FirebaseMessageAdapter: Temizlik yapılıyor...');
    
    // Mesaj dinleyicilerini temizle
    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
      this.messageUnsubscribe = null;
    }
    
    // Konuşma dinleyicisini temizle
    if (this.conversationUnsubscribe) {
      this.conversationUnsubscribe();
      this.conversationUnsubscribe = null;
    }
    
    // Eski dinleyicileri de temizle (backward compatibility)
    this.messageListeners?.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.messageListeners?.clear();
    
    if (this.conversationListener) {
      this.conversationListener();
      this.conversationListener = null;
    }
    
    this.isConnected = false;
    console.log('FirebaseMessageAdapter: Temizlik tamamlandı');
  }

  // Bağlantı durumu callback'i ayarla
  setConnectionStatusCallback(callback) {
    this.connectionStatusCallback = callback;
  }

  // Bağlantı durumunu güncelle
  updateConnectionStatus(status) {
    this.isConnected = status === 'connected';
    if (this.connectionStatusCallback) {
      this.connectionStatusCallback(status);
    }
  }
}

// Singleton örneği oluştur
let instance = null;

/**
 * Firebase mesajlaşma adaptörü örneği al
 * @param {string} userId - Mevcut kullanıcı ID'si
 * @returns {FirebaseMessageAdapter} - Adaptör örneği
 */
export const getFirebaseMessageAdapter = (userId) => {
  if (!instance) {
    instance = new FirebaseMessageAdapter(userId);
  } else if (userId) {
    instance.setCurrentUserId(userId);
  }
  
  return instance;
};

export default FirebaseMessageAdapter;
