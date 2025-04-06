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
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      const errorData = await response.json();
      console.error(`API Hata (${endpoint}):`, errorData);
      throw new Error(errorData.message || 'Bir hata oluştu');
    }
    
    const jsonResponse = await response.json();
    console.log(`API Cevap (${endpoint}):`, jsonResponse);
    return jsonResponse;
  } catch (error) {
    console.error(`API Hatası (${endpoint}):`, error);
    throw error;
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
    addComment: (postId, content) => fetchWithAuth(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
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
    sendMessage: (userId, content) => fetchWithAuth(`/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
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