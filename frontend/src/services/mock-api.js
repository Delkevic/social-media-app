// Test amaçlı mock API veri ve fonksiyonları
import { API_BASE_URL } from '../config/constants';
import api from '../services/api';

// Test için localStorage anahtarları
const STORAGE_KEYS = {
  CONVERSATIONS: 'mock_conversations',
  MESSAGES: 'mock_messages',
  USERS: 'mock_users',
  CURRENT_USER: 'mock_current_user',
  FOLLOWING: 'mock_following'
};

// Gerçek API'den takip edilen kullanıcıları getir ve mock veriyi hazırla
const initializeFromRealData = async () => {
  try {
    // Giriş yapmış kullanıcıyı al (Auth context'ten gelmediğinden localStorage'dan alıyoruz)
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
    
    if (!currentUser) {
      console.warn('[MOCK API] Giriş yapmış kullanıcı bulunamadı, varsayılan veriler kullanılacak');
      return false;
    }
    
    console.log('[MOCK API] Giriş yapmış kullanıcı:', currentUser);
    
    // Takip edilen kullanıcıları getir
    const followingResponse = await fetch(`${API_BASE_URL}/api/users/following`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      }
    });
    
    if (!followingResponse.ok) {
      console.warn('[MOCK API] Takip edilen kullanıcılar getirilemedi, varsayılan veriler kullanılacak');
      return false;
    }
    
    const followingData = await followingResponse.json();
    const followingUsers = followingData.data || [];
    
    console.log('[MOCK API] Takip edilen kullanıcılar:', followingUsers);
    
    if (followingUsers.length === 0) {
      console.warn('[MOCK API] Takip edilen kullanıcı bulunamadı, varsayılan veriler kullanılacak');
      return false;
    }
    
    // Kullanıcıları ve mevcut kullanıcıyı kaydet
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([currentUser, ...followingUsers]));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    localStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(followingUsers));
    
    // Bu kullanıcılarla konuşmalar oluştur
    const mockConversations = followingUsers.map(user => {
      const conversationId = createConversationId(currentUser.id, user.id);
      return {
        id: conversationId,
        participants: [currentUser.id, user.id],
        lastMessage: '',
        lastTimestamp: new Date().toISOString(),
        unreadCount: 0,
        sender: user
      };
    });
    
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(mockConversations));
    
    // Boş mesaj koleksiyonu oluştur
    const mockMessages = {};
    followingUsers.forEach(user => {
      const conversationId = createConversationId(currentUser.id, user.id);
      mockMessages[conversationId] = [];
    });
    
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(mockMessages));
    
    console.log('[MOCK API] Gerçek kullanıcılardan mock veri başarıyla oluşturuldu');
    return true;
    
  } catch (error) {
    console.error('[MOCK API] Gerçek veriler alınırken hata:', error);
    return false;
  }
};

// Örnek kullanıcılar (API bağlantısı olmadığında kullanılacak)
const MOCK_USERS = [
  { id: '1', username: 'admin', fullName: 'Admin Kullanıcı', profileImage: 'https://ui-avatars.com/api/?name=A&background=0D1117&color=0AFFD9' },
  { id: '2', username: 'test', fullName: 'Test Kullanıcı', profileImage: 'https://ui-avatars.com/api/?name=T&background=0D1117&color=0AFFD9' },
  { id: '3', username: 'yakup', fullName: 'Yakup Can', profileImage: 'https://ui-avatars.com/api/?name=Y&background=0D1117&color=0AFFD9' },
  { id: '4', username: 'ahmet', fullName: 'Ahmet Yılmaz', profileImage: 'https://ui-avatars.com/api/?name=A&background=0D1117&color=0AFFD9' }
];

// Örnek konuşmalar
const MOCK_CONVERSATIONS = [
  {
    id: '1_2',
    participants: ['1', '2'],
    lastMessage: 'Merhaba, nasılsın?',
    lastTimestamp: new Date().toISOString(),
    unreadCount: 2,
    sender: MOCK_USERS[1] // test kullanıcısı
  },
  {
    id: '1_3',
    participants: ['1', '3'],
    lastMessage: 'Proje tamamlandı mı?',
    lastTimestamp: new Date(Date.now() - 3600000).toISOString(), // 1 saat önce
    unreadCount: 0,
    sender: MOCK_USERS[2] // yakup kullanıcısı
  },
  {
    id: '1_4',
    participants: ['1', '4'],
    lastMessage: 'Toplantıyı unutma!',
    lastTimestamp: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
    unreadCount: 1,
    sender: MOCK_USERS[3] // ahmet kullanıcısı
  }
];

// Örnek mesajlar (konuşma ID'lerine göre)
const MOCK_MESSAGES = {
  '1_2': [
    {
      id: '101',
      conversationId: '1_2',
      senderId: '2',
      content: 'Merhaba, nasılsın?',
      sentAt: new Date(Date.now() - 7200000).toISOString(), // 2 saat önce
      isRead: true,
      mediaUrl: null,
      mediaType: null,
      senderInfo: MOCK_USERS[1]
    },
    {
      id: '102',
      conversationId: '1_2',
      senderId: '1',
      content: 'İyiyim, teşekkürler. Sen nasılsın?',
      sentAt: new Date(Date.now() - 7000000).toISOString(), 
      isRead: true,
      mediaUrl: null,
      mediaType: null,
      senderInfo: MOCK_USERS[0]
    },
    {
      id: '103',
      conversationId: '1_2',
      senderId: '2',
      content: 'Ben de iyiyim. Projede ilerleme var mı?',
      sentAt: new Date(Date.now() - 6800000).toISOString(),
      isRead: false,
      mediaUrl: null,
      mediaType: null,
      senderInfo: MOCK_USERS[1]
    },
    {
      id: '104',
      conversationId: '1_2',
      senderId: '2',
      content: 'Acil görüşmemiz gerekiyor.',
      sentAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: false,
      mediaUrl: null,
      mediaType: null,
      senderInfo: MOCK_USERS[1]
    }
  ],
  '1_3': [],
  '1_4': []
};

// Mock veriyi localStorage'a kaydet - önce gerçek kullanıcılardan yüklemeyi dener, başarısız olursa örnek veriyi kullanır
const initMockData = async () => {
  // Daha önce kaydedilmiş mock veri varsa, tekrar kaydetme
  if (localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
    return;
  }
  
  // Önce gerçek verilerden yüklemeyi dene
  const success = await initializeFromRealData();
  
  // Başarısız olursa örnek veriyi kullan
  if (!success) {
    console.log('[MOCK API] Varsayılan örnek veriler kullanılıyor');
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(MOCK_CONVERSATIONS));
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(MOCK_MESSAGES));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(MOCK_USERS[0])); // Default olarak admin kullanıcısı
  }
};

// Mock veriyi sıfırla (mesajlaşma verilerini temizle)
export const resetMockData = async () => {
  localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.FOLLOWING);
  
  // Yeniden yükle
  await initMockData();
  
  console.log('[MOCK API] Tüm mock veriler sıfırlandı');
  return true;
};

// Mock API isteklerini simüle et
export const mockFetch = async (url, options = {}) => {
  // Başlangıçta mock veriyi yükle
  await initMockData();
  
  console.log(`[MOCK API] ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body) : '');
  
  // Gecikmeyi simüle et
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Conversations endpoint
  if (url.includes('/api/conversations')) {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    const conversations = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONVERSATIONS));
    
    // Mevcut kullanıcının konuşmalarını filtrele
    const userConversations = conversations.filter(conv => 
      conv.participants.includes(currentUser.id)
    );
    
    console.log(`[MOCK API] Konuşmalar döndürülüyor (${userConversations.length} adet)`, userConversations);
    
    return {
      ok: true,
      json: async () => ({ 
        success: true, 
        conversations: userConversations 
      })
    };
  }
  
  // Messages endpoint
  if (url.includes('/api/messages/') && !url.includes('/read')) {
    const conversationId = url.split('/api/messages/')[1];
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES));
    
    if (options.method === 'POST') {
      // Yeni mesaj gönderme
      const body = JSON.parse(options.body);
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
      
      const newMessage = {
        id: `msg_${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        content: body.content,
        sentAt: new Date().toISOString(),
        isRead: false,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        senderInfo: currentUser
      };
      
      // Konuşmada mesaj yoksa dizi oluştur
      if (!messages[conversationId]) {
        messages[conversationId] = [];
      }
      
      // Yeni mesajı ekle
      messages[conversationId].push(newMessage);
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
      
      // Konuşmaları güncelle
      const conversations = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONVERSATIONS));
      const updatedConversations = conversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: body.content,
            lastTimestamp: new Date().toISOString()
          };
        }
        return conv;
      });
      
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
      
      return {
        ok: true,
        json: async () => ({ 
          success: true, 
          message: 'Mesaj gönderildi',
          data: newMessage
        })
      };
    } else {
      // Mesajları getir
      return {
        ok: true,
        json: async () => {
          const result = { 
            success: true, 
            messages: messages[conversationId] || [] 
          };
          console.log(`[MOCK API] Mesajlar döndürülüyor (${result.messages.length} adet)`, result.messages);
          return result;
        }
      };
    }
  }
  
  // Mesajları okundu olarak işaretle
  if (url.includes('/api/messages/') && url.includes('/read')) {
    const conversationId = url.split('/api/messages/')[1].split('/read')[0];
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES));
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    
    if (!messages[conversationId]) {
      return {
        ok: true,
        json: async () => ({ success: true })
      };
    }
    
    // Karşı tarafın mesajlarını okundu olarak işaretle
    const updatedMessages = messages[conversationId].map(msg => {
      if (msg.senderId !== currentUser.id) {
        return { ...msg, isRead: true };
      }
      return msg;
    });
    
    messages[conversationId] = updatedMessages;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    
    // Konuşmaları güncelle (okundu sayısını sıfırla)
    const conversations = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONVERSATIONS));
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
    
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(updatedConversations));
    
    return {
      ok: true,
      json: async () => ({ success: true })
    };
  }
  
  // Bilinmeyen endpoint
  return {
    ok: false,
    json: async () => ({ 
      success: false, 
      message: 'Endpoint bulunamadı' 
    })
  };
};

// Test için konuşma ID oluştur
export const createConversationId = (userId1, userId2) => {
  const user1 = String(userId1);
  const user2 = String(userId2);
  return [user1, user2].sort().join('_');
};

// Test için aktif kullanıcıyı ayarla
export const setMockCurrentUser = (userId) => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find(u => u.id === userId) || users[0];
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}; 