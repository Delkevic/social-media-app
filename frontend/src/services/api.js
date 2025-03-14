const API_BASE_URL = 'http://localhost:8080/api';

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
  
  let requestUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`API İsteği: ${options.method || 'GET'} ${requestUrl}`);
  
  try {
    const response = await fetch(requestUrl, config);
    
    // Detaylı hata bilgileri yazdır
    if (!response.ok) {
      console.error(`API Hata Yanıtı: ${response.status} (${response.statusText})`);
      
      // Token süresi dolmuşsa veya yetkisiz erişim varsa
      if (response.status === 401) {
        // Oturumu temizle ve login sayfasına yönlendir
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      // Yanıt içeriğini güvenli bir şekilde JSON olarak parse etmeye çalış
      let errorData;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          // JSON değilse, text olarak oku
          const text = await response.text();
          errorData = { message: text || `HTTP Hata: ${response.status} ${response.statusText}` };
        }
      } catch (parseError) {
        console.error('Hata yanıtı parse edilemedi:', parseError);
        errorData = { message: `Sunucu yanıtı işlenemedi: ${response.status} ${response.statusText}` };
      }
      
      throw new Error(errorData.message || `Sunucu hatası: ${response.status}`);
    }
    
    // Yanıtı güvenli bir şekilde parse et
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data;
      } else {
        // JSON değilse, text olarak döndür
        const text = await response.text();
        return { success: true, data: text };
      }
    } catch (parseError) {
      console.error('Başarılı yanıt parse edilemedi:', parseError);
      throw new Error('Sunucu yanıtı işlenemedi');
    }
  } catch (error) {
    console.error(`API Hatası (${endpoint}):`, error);
    throw error;
  }
};

// API metotları
const api = {
  // Kullanıcı ile ilgili işlemler
  user: {
    getProfile: () => fetchWithAuth('/user'),
    updateProfile: (data) => fetchWithAuth('/user/profile', {
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
    delete: (postId) => fetchWithAuth(`/posts/${postId}`, {
      method: 'DELETE',
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
    addComment: (postId, data) => fetchWithAuth(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getComments: (postId) => fetchWithAuth(`/posts/${postId}/comments`),
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
      
      try {
          const response = await fetch(`${API_BASE_URL}/upload/image`, {
              method: 'POST',
              headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
              },
              body: formData,
          });
          
          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || 'Görsel yüklenirken bir hata oluştu');
          }
          
          const result = await response.json();
          
          // URL'yi düzelt
          if (result.success && result.data && result.data.url) {
              // Sadece dosya adını al
              const fileName = result.data.url.split('/').pop();
              result.data.url = fileName;
          }
          
          return result;
      } catch (error) {
          console.error('Görsel yükleme hatası:', error);
          throw error;
      }
  },

  // Yorum ile ilgili işlemler
  comments: {
    toggleLike: (commentId) => fetchWithAuth(`/comments/${commentId}/like`, {
      method: 'POST'
    }),
    delete: (commentId) => fetchWithAuth(`/comments/${commentId}`, {
      method: 'DELETE'
    }),
    report: (commentId) => fetchWithAuth(`/comments/${commentId}/report`, {
      method: 'POST'
    }),
  },
};

export default api;