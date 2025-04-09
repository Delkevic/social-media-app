import { API_URL, API_BASE_URL } from '../config/constants';

// Token'ı getiren yardımcı fonksiyon
const getToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

// Temel fetch işlemi için yardımcı fonksiyon
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
  
  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  // API isteğini doğru URL ile oluştur
  const url = endpoint.startsWith('/api/') 
    ? `${API_BASE_URL}${endpoint}` 
    : `${API_URL}${endpoint}`;
  
  console.log(`API isteği: ${url}`, config);
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Token süresi dolmuşsa veya yetkisiz erişim varsa
      if (response.status === 401) {
        // Oturumu temizle ve login sayfasına yönlendir
        console.warn('Oturum süresi dolmuş veya geçersiz. Yeniden giriş yapmanız gerekiyor.');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Eğer login sayfasında değilsek yönlendirelim
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return { success: false, message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' };
      }
      
      const errorData = await response.json();
      console.error(`API Hata (${endpoint}):`, errorData);
      return { success: false, message: errorData.message || 'Bir hata oluştu' };
    }
    
    const jsonResponse = await response.json();
    console.log(`API Cevap (${endpoint}):`, jsonResponse);
    
    // Yanıt formatını kontrol et ve standat yanıt yapısına dönüştür
    if (jsonResponse.success === undefined) {
      // API success alanı döndürmüyorsa, bir success alanı ekle
      return { success: true, data: jsonResponse };
    }
    
    return jsonResponse;
  } catch (error) {
    console.error(`API Hatası (${endpoint}):`, error);
    return { success: false, message: error.message || 'API isteği sırasında beklenmeyen bir hata oluştu' };
  }
};

// API metotları
const api = {
  // Kullanıcı ile ilgili işlemler
  user: {
    getProfile: () => fetchWithAuth('/api/user'),
    updateProfile: (data) => fetchWithAuth('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    searchUsers: (query) => {
      console.log(`Kullanıcı arama: query=${query}`);
      
      // Oturum açmış kullanıcının bilgilerini al
      const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
      let currentUserId = '';
      
      if (userRaw) {
        try {
          const userData = JSON.parse(userRaw);
          currentUserId = userData.id || '';
        } catch (e) {
          console.error('Kullanıcı verisi parse edilemedi:', e);
        }
      }
      
      return fetchWithAuth(`/users/search?query=${encodeURIComponent(query)}&currentUserId=${currentUserId}`);
    },
  },
  
  // Gönderi ile ilgili işlemler
  posts: {
    getFeeds: (feed = 'general') => fetchWithAuth(`/posts?feed=${feed}`),
    create: (data) => fetchWithAuth('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    like: (postId) => fetchWithAuth(`/posts/${postId}/like`, {
      method: 'POST',
    }),
    unlike: (postId) => fetchWithAuth(`/posts/${postId}/like`, {
      method: 'DELETE',
    }),
    save: (postId) => fetchWithAuth(`/posts/${postId}/save`, {
      method: 'POST',
    }),
    unsave: (postId) => fetchWithAuth(`/posts/${postId}/save`, {
      method: 'DELETE',
    }),
    addComment: (postId, content, parentId = null) => {
      const data = { content };
      if (parentId !== null) {
        data.parentId = parentId;
      }
      
      return fetchWithAuth(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    getComments: (postId) => fetchWithAuth(`/posts/${postId}/comments`),
    report: (postId) => fetchWithAuth(`/posts/${postId}/report`, {
      method: 'POST',
    }),
  },
  
  // Bildirim ile ilgili işlemler
  notifications: {
    getAll: () => fetchWithAuth('/notifications'),
    markAsRead: (notificationId) => fetchWithAuth(`/notifications/${notificationId}/read`, {
      method: 'POST',
    }),
  },
  
  // Mesajlaşma ile ilgili işlemler
  messages: {
    getConversations: () => fetchWithAuth('/messages'),
    getConversation: (userId) => fetchWithAuth(`/messages/${userId}`),
    sendMessage: (userId, content, mediaUrl = null, mediaType = null) => {
      const data = { content };
      if (mediaUrl) {
        data.mediaUrl = mediaUrl;
        data.mediaType = mediaType;
      }
      return fetchWithAuth(`/messages/${userId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    sendTypingStatus: (userId, isTyping) => fetchWithAuth(`/messages/${userId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    }),
    // WebSocket bağlantısı oluştur
    createWebSocketConnection: () => {
      const token = getToken();
      if (!token) return null;
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      
      // WebSocket API URL'sini düzelt - sadece WebSocket için prefix düzenlemesi yapalım
      console.log("WebSocket bağlantısı oluşturuluyor...");
      
      // URL'den host kısmını (localhost:8080) çıkaralım
      const host = API_BASE_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}${host}/api/ws`;
      
      console.log("WebSocket URL:", wsUrl);
      
      // Yeni WebSocket bağlantısı kur
      const ws = new WebSocket(wsUrl);
      
      // WebSocket açıldığında token ile kimlik doğrulama yap
      ws.onopen = () => {
        console.log('WebSocket bağlantısı kuruldu');
        // Token'ı göndermek için auth mesajı gönderiyoruz
        ws.send(JSON.stringify({ 
          type: 'auth', 
          token: token 
        }));
      };
      
      return ws;
    },
  },

  // Görsel yükleme
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = getToken();
    console.log('Görsel yükleniyor:', file.name, 'boyut:', file.size);
    
    try {
        const response = await fetch(`${API_URL}/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
            },
            body: formData,
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('Görsel yükleme cevap hatası:', error);
            throw new Error(error.message || 'Görsel yüklenirken bir hata oluştu');
        }
        
        const result = await response.json();
        console.log('Görsel yükleme cevabı:', result);
        
        // Önemli değişiklik: URL'yi tam URL'ye dönüştürüyoruz
        if (result.success && result.data && result.data.url) {
            // Backend URL'sine dönüştür
            result.data.fullUrl = getFullImageUrl(result.data.url);
        }
        
        return result;
    } catch (error) {
        console.error('Görsel yükleme hatası:', error);
        throw error;
    }
  },

  // Reels ile ilgili işlemler
  reels: {
    like: (reelId) => fetchWithAuth(`/reels/${reelId}/like`, {
      method: 'POST',
    }),
    unlike: (reelId) => fetchWithAuth(`/reels/${reelId}/like`, {
      method: 'DELETE',
    }),
    getComments: (reelId) => fetchWithAuth(`/reels/${reelId}/comments`),
    addComment: (reelId, content) => fetchWithAuth(`/reels/${reelId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
    report: (reelId) => fetchWithAuth(`/reels/${reelId}/report`, {
      method: 'POST',
    }),
  },
  
  // Yorum ile ilgili işlemler
  comments: {
    toggleLike: (commentId) => fetchWithAuth(`/comments/${commentId}/like`, {
      method: 'POST',
    }),
    delete: (commentId) => fetchWithAuth(`/comments/${commentId}`, {
      method: 'DELETE',
    }),
    report: (commentId) => fetchWithAuth(`/comments/${commentId}/report`, {
      method: 'POST',
    }),
  },
};

// Yardımcı fonksiyonlar
const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // URL'de çift slash varsa düzelt
  const cleanUrl = imageUrl.replace(/\/+/g, '/');
  
  if (cleanUrl.startsWith("/")) {
    return `${API_BASE_URL}${cleanUrl}`;
  } else {
    return `${API_BASE_URL}/${cleanUrl}`;
  }
};

export default api;