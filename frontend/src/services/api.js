import { API_URL, API_BASE_URL } from '../config/constants';
import axios from 'axios';

// Token'ı getiren yardımcı fonksiyon
const getToken = () => {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
};

// Token yenileme işlemi - api fonksiyonu olarak tanımlandı
const refreshToken = async () => {
  try {
    // Mevcut token'ı al
    const token = getToken();
    
    // Token yoksa hata döndür
    if (!token) {
      return {
        success: false,
        message: "Oturum bulunamadı"
      };
    }
    
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      console.error('Token yenileme başarısız:', response.status);
      return { 
        success: false, 
        message: `Token yenileme başarısız (${response.status})` 
      };
    }
    
    const data = await response.json();
    
    // Yeni token varsa sakla
    if (data.token) {
      if (localStorage.getItem('token')) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      console.log('Token başarıyla yenilendi');
    }
    
    return data;
  } catch (error) {
    console.error('Token yenileme hatası:', error);
    return { success: false, message: error.message || 'Token yenileme işlemi başarısız' };
  }
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
  
  const url = `${API_URL}${endpoint}`;
  const method = options.method || 'GET';
  console.log(`API isteği: ${method} ${url}${options.body ? ` Body: ${JSON.stringify(options.body).substring(0, 100)}...` : ''}`);
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Token süresi dolmuşsa veya yetkisiz erişim varsa
      if (response.status === 401) {
        // Token yenilemeyi dene
        const refreshed = await refreshToken();
        if (refreshed.success) {
          // Token yenilendi, isteği tekrarla
          return fetchWithAuth(endpoint, options);
        }
        
        // Token yenilenemedi, oturumu temizle
        console.warn('Oturum süresi dolmuş veya geçersiz. Yeniden giriş yapmanız gerekiyor.');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Eğer login sayfasında değilsek yönlendirelim
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return { success: false, message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.', status: 401 };
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      console.error(`API Hata (${endpoint}):`, errorData);
      
      // Hata mesajını errorData'nın çeşitli alanlarından almaya çalış
      let errorMessage;
      
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        // error alanı string veya object olabilir
        errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
      } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        // Eğer errors bir dizi ise ilk hatayı al
        errorMessage = typeof errorData.errors[0] === 'string' 
          ? errorData.errors[0] 
          : errorData.errors[0].message || errorData.errors[0].error || JSON.stringify(errorData.errors[0]);
      } else {
        errorMessage = `Sunucu hatası (${response.status})`;
      }
      
      // Standarize edilmiş yanıt oluştur
      const standardizedError = {
        success: false,
        message: errorMessage,
        error: errorData,
        status: response.status
      };
      
      // 400 Bad Request ve benzeri durumlarda özel işlem
      if (response.status === 400) {
        // Özellikle "zaten" içeren hata mesajlarını işaretle
        const isAlreadyDoneError = errorMessage && (
          errorMessage.toLowerCase().includes('zaten') || 
          errorMessage.toLowerCase().includes('already') ||
          errorMessage.toLowerCase().includes('mevcut')
        );
        
        if (isAlreadyDoneError) {
          standardizedError.isAlreadyDoneError = true;
          
          // "zaten beğenilmiş" durumu için ek işaretleme
          if (errorMessage.toLowerCase().includes('beğen') || errorMessage.toLowerCase().includes('like')) {
            standardizedError.isAlreadyLikedError = true;
          }
          
          // "zaten kaydedilmiş" durumu için ek işaretleme
          if (errorMessage.toLowerCase().includes('kaydet') || errorMessage.toLowerCase().includes('save')) {
            standardizedError.isAlreadySavedError = true;
          }
          
          // "zaten takip ediliyor" durumu için ek işaretleme
          if (errorMessage.toLowerCase().includes('takip') || errorMessage.toLowerCase().includes('follow')) {
            standardizedError.isAlreadyFollowingError = true;
          }
        }
      }
      
      return standardizedError;
    }
    
    // Yanıtı parse et
    const responseClone = response.clone();
    try {
      const jsonResponse = await response.json();
      console.log(`API Cevap (${endpoint}):`, jsonResponse);
      
      // Beğeni ile ilgili yanıtları özel olarak logla
      if (endpoint.includes('/like')) {
        console.log(`Beğeni işlemi yanıtı (${endpoint}):`, {
          rawResponse: jsonResponse,
          hasLikeCount: jsonResponse.data && 'likeCount' in jsonResponse.data,
          hasLikes: jsonResponse.data && 'likes' in jsonResponse.data,
          likeValue: jsonResponse.data?.likeCount || jsonResponse.data?.likes
        });
      }
      
      // Standart yanıt yapısı oluştur
      if (jsonResponse.success === undefined) {
        return { 
          success: true, 
          data: jsonResponse, 
          status: response.status 
        };
      }
      
      return { 
        ...jsonResponse, 
        status: response.status 
      };
    } catch (jsonError) {
      // JSON parse edilemezse
      const textResponse = await responseClone.text();
      console.warn(`API Cevap (${endpoint}) JSON parse edilemedi. Durum: ${response.status}, Text: ${textResponse}`);
      
      if (!response.ok) { 
        return { 
          success: false, 
          message: textResponse || `Sunucu hatası: ${response.status}`, 
          status: response.status 
        };
      }
      
      return { 
        success: true, 
        data: null, 
        status: response.status 
      };
    }
  } catch (error) {
    console.error(`API Hatası (${endpoint}):`, error);
    return { 
      success: false, 
      message: error.message || 'API isteği sırasında beklenmeyen bir hata oluştu',
      error: error,
      status: 0 // Ağ hatası durumunda durum kodu 0
    };
  }
};

// API metotları
const api = {
  // Token yenileme
  refreshToken,
  
  // Genel HTTP metodları
  get: (endpoint) => fetchWithAuth(endpoint),
  post: (endpoint, data) => fetchWithAuth(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint, data) => fetchWithAuth(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint) => fetchWithAuth(endpoint, {
    method: 'DELETE',
  }),
  patch: (endpoint, data) => fetchWithAuth(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  // WebSocket endpoint'i devre dışı (artık polling kullanıyoruz)
  ws: {
    endpoint: null, // Önceki API_URL + '/ws' değeriydi
    getUrl: () => null // WebSocket URL'ini alma fonksiyonu devre dışı
  },
  
  // Kullanıcı ile ilgili işlemler
  user: {
    getProfile: () => fetchWithAuth('/user'),
    getUserById: async (id) => {
      console.log('getUserById çağrıldı:', id);
      
      // Önce direkt endpoint'i dene
      try {
        const directResponse = await fetchWithAuth(`/users/id/${id}`);
        if (directResponse.success) {
          return directResponse;
        }
      } catch (error) {
        console.log('Direkt endpoint başarısız, alternatif yöntem deneniyor...');
      }
      
      // Alternatif: Search endpoint'ini kullan
      try {
        console.log('Search endpoint ile kullanıcı aranıyor, ID:', id);
        const searchResponse = await fetchWithAuth(`/users/search?query=${id}`);
        
        if (searchResponse.success && searchResponse.data && Array.isArray(searchResponse.data)) {
          // ID'ye göre kullanıcıyı bul
          const user = searchResponse.data.find(u => String(u.id) === String(id));
          
          if (user) {
            console.log('Kullanıcı search ile bulundu:', user);
            return {
              success: true,
              data: user
            };
          }
        }
        
        // Son çare: Mevcut kullanıcı verilerinden kontrol et
        const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
        if (userRaw) {
          try {
            const currentUser = JSON.parse(userRaw);
            if (String(currentUser.id) === String(id)) {
              return {
                success: true,
                data: currentUser
              };
            }
          } catch (e) {
            console.error('Kullanıcı verisi parse edilemedi:', e);
          }
        }
        
        console.warn('Kullanıcı bulunamadı, varsayılan veri döndürülüyor');
        return { 
          success: false, 
          data: {
            id: id,
            username: `user_${id}`,
            full_name: `Kullanıcı ${id}`,
            fullName: `Kullanıcı ${id}`,
            profile_picture: null,
            profileImage: null
          }
        };
      } catch (error) {
        console.error('getUserById alternatif yöntem hatası:', error);
        return { 
          success: false, 
          data: {
            id: id,
            username: `user_${id}`,
            full_name: `Kullanıcı ${id}`,
            fullName: `Kullanıcı ${id}`,
            profile_picture: null,
            profileImage: null
          }
        };
      }
    },
    getProfileByUsername: (username) => fetchWithAuth(`/profile/${username}`),
    updateProfile: (data) => fetchWithAuth('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    updatePrivacy: (isPrivate) => fetchWithAuth('/user/privacy', {
      method: 'PUT',
      body: JSON.stringify({ isPrivate }),
    }),
    updatePassword: (passwordData) => fetchWithAuth('/user/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    }),
    deactivateAccount: () => fetchWithAuth('/user', {
      method: 'DELETE',
    }),
    deleteAccount: () => fetchWithAuth('/user', {
      method: 'DELETE',
    }),
    getLoginActivities: () => fetchWithAuth('/user/login-activity'),
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
    getFollowing: () => {
      // Oturum açmış kullanıcının kendi username'ini al
      const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
      let username = '';
      
      if (userRaw) {
        try {
          const userData = JSON.parse(userRaw);
          username = userData.username || '';
          console.log('getFollowing: username bulundu:', username);
        } catch (e) {
          console.error('Kullanıcı verisi parse edilemedi:', e);
          return Promise.reject(new Error('Kullanıcı bilgisi alınamadı'));
        }
      }
      
      if (!username) {
        console.warn('getFollowing: Username bulunamadı');
        return Promise.resolve({ success: true, data: { users: [] } }); // Boş liste döndür
      }
      
      console.log('getFollowing: API çağrısı yapılıyor:', `/profile/${username}/following`);
      return fetchWithAuth(`/profile/${username}/following`)
        .catch(error => {
          console.warn('getFollowing API hatası:', error);
          // Hata durumunda boş liste döndür, uygulama çalışmaya devam etsin
          return { success: true, data: { users: [] } };
        });
    },
    getFollowers: () => {
      // Oturum açmış kullanıcının kendi username'ini al  
      const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
      let username = '';
      
      if (userRaw) {
        try {
          const userData = JSON.parse(userRaw);
          username = userData.username || '';
        } catch (e) {
          console.error('Kullanıcı verisi parse edilemedi:', e);
          return Promise.reject(new Error('Kullanıcı bilgisi alınamadı'));
        }
      }
      
      if (!username) {
        return Promise.reject(new Error('Kullanıcı adı bulunamadı'));
      }
      
      return fetchWithAuth(`/profile/${username}/followers`);
    },
    getFollowersByUsername: (username) => fetchWithAuth(`/profile/${username}/followers`),
    getFollowingByUsername: (username) => fetchWithAuth(`/profile/${username}/following`),
    follow: async (username) => {
      try {
        const response = await fetchWithAuth(`/user/follow/${username}`, {
          method: 'POST',
        });
        
        // Response'tan gelen success değerini kullan
        return {
          success: response.success !== false, // Başarısız değilse başarılı
          data: response.data || response,
          message: response.message,
          status: response.status || 'following' // Varsayılan olarak following
        };
      } catch (error) {
        console.error('Follow error:', error);
        return {
          success: false,
          message: error.message || 'Takip işlemi başarısız oldu',
        };
      }
    },
    unfollow: (username) => fetchWithAuth(`/user/follow/${username}`, {
      method: 'DELETE',
    }),
    cancelFollowRequest: (username) => fetchWithAuth(`/user/follow-request/${username}`, {
      method: 'DELETE',
    }),
  },
  
  // Gönderi ile ilgili işlemler
  posts: {
    getFeeds: (feed = 'general') => fetchWithAuth(`/posts?feed=${feed}`),
    getUserPostsByUsername: (username) => fetchWithAuth(`/profile/${username}/posts`),
    getUserPosts: () => fetchWithAuth('/posts/user'),
    getPostById: (postId) => fetchWithAuth(`/posts/${postId}`),
    create: (data) => fetchWithAuth('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    like: (postId) => fetchWithAuth(`/posts/${postId}/like`, {
      method: 'POST',
    }).then(response => {
      console.log(`Like API response for post ${postId}:`, response);
      
      // Başarılı bir yanıt olduğunu doğrula
      if (response.success) {
        // Eğer likeCount veya likes yoksa, bunları eklemeye çalış
        if (!response.data?.likeCount && !response.data?.likes) {
          // Eğer response.data yoksa veya obje değilse, yeni bir obje oluştur
          if (!response.data || typeof response.data !== 'object') {
            return {
              ...response,
              data: {
                likeCount: 1, // Beğenildiği için en az 1 olmalı
                likes: 1,
                isLiked: true
              }
            };
          }
          
          // Eğer data objesi varsa, likeCount ve likes alanlarını ekle
          return {
            ...response,
            data: {
              ...response.data,
              likeCount: typeof response.data.likeCount !== 'undefined' ? response.data.likeCount : 1,
              likes: typeof response.data.likes !== 'undefined' ? response.data.likes : 1,
              isLiked: true
            }
          };
        }
        
        // likeCount ve likes uyumlu değilse, birini diğerine eşitle
        if (response.data && 
            typeof response.data === 'object' && 
            typeof response.data.likeCount !== 'undefined' && 
            typeof response.data.likes !== 'undefined' && 
            response.data.likeCount !== response.data.likes) {
          
          // likeCount'u öncelikli tut
          const likeValue = response.data.likeCount;
          return {
            ...response,
            data: {
              ...response.data,
              likeCount: likeValue,
              likes: likeValue
            }
          };
        }
      }
      
      return response;
    }),
    unlike: (postId) => fetchWithAuth(`/posts/${postId}/like`, {
      method: 'DELETE',
    }).then(response => {
      console.log(`Unlike API response for post ${postId}:`, response);
      
      // Başarılı bir yanıt olduğunu doğrula
      if (response.success) {
        // Eğer likeCount veya likes yoksa, bunları eklemeye çalış
        if (!response.data?.likeCount && !response.data?.likes) {
          // Eğer response.data yoksa veya obje değilse, yeni bir obje oluştur
          if (!response.data || typeof response.data !== 'object') {
            return {
              ...response,
              data: {
                likeCount: 0, // Beğeni kaldırıldığı için 0 olabilir
                likes: 0,
                isLiked: false
              }
            };
          }
          
          // Eğer data objesi varsa, likeCount ve likes alanlarını ekle
          return {
            ...response,
            data: {
              ...response.data,
              likeCount: typeof response.data.likeCount !== 'undefined' ? response.data.likeCount : 0,
              likes: typeof response.data.likes !== 'undefined' ? response.data.likes : 0,
              isLiked: false
            }
          };
        }
        
        // likeCount ve likes uyumlu değilse, birini diğerine eşitle
        if (response.data && 
            typeof response.data === 'object' && 
            typeof response.data.likeCount !== 'undefined' && 
            typeof response.data.likes !== 'undefined' && 
            response.data.likeCount !== response.data.likes) {
          
          // likeCount'u öncelikli tut
          const likeValue = response.data.likeCount;
          return {
            ...response,
            data: {
              ...response.data,
              likeCount: likeValue,
              likes: likeValue
            }
          };
        }
      }
      
      return response;
    }),
    save: (postId) => fetchWithAuth(`/posts/${postId}/save`, {
      method: 'POST',
    }),
    unsave: (postId) => fetchWithAuth(`/posts/${postId}/save`, {
      method: 'DELETE',
    }),
    delete: (postId) => fetchWithAuth(`/posts/${postId}`, {
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
    getComments: (postId) => {
      console.log(`Post ${postId} için yorumlar getiriliyor`);
      return fetchWithAuth(`/posts/${postId}/comments`)
        .then(response => {
          if (!response.success) {
            console.error("Yorumlar alınamadı:", response.message);
            return { success: false, data: [], message: response.message };
          }
          
          // API yanıt formatını kontrol et ve normalize et
          let commentsData = [];
          
          if (Array.isArray(response.data)) {
            commentsData = response.data;
          } else if (response.data && Array.isArray(response.data.comments)) {
            commentsData = response.data.comments;
          } else if (response.data && typeof response.data === 'object') {
            commentsData = [response.data];
          }
          
          return { 
            success: true, 
            data: commentsData,
            message: "Yorumlar başarıyla alındı"
          };
        });
    },
    deleteComment: (commentId) => {
      console.log(`Yorum silme isteği api.posts üzerinden gönderiliyor, ID: ${commentId}`);
      // api.comments.delete metodunu çağır
      return api.comments.delete(commentId);
    },
    likeComment: (commentId) => fetchWithAuth(`/api/comments/${commentId}/like`, {
      method: 'POST',
    }),
    unlikeComment: (commentId) => fetchWithAuth(`/api/comments/${commentId}/like`, {
      method: 'DELETE',
    }),
    reportComment: (commentId) => fetchWithAuth(`/comments/${commentId}/report`, {
      method: 'POST',
    }),
    report: (postId) => fetchWithAuth(`/posts/${postId}/report`, {
      method: 'POST',
    }),
  },
  
  // Bildirim ile ilgili işlemler
  notifications: {
    getAll: (limit = 0) => { // Varsayılan limit 0 (tümünü getir)
      const endpoint = limit > 0 ? `/notifications?limit=${limit}` : '/notifications';
      return fetchWithAuth(endpoint);
    },
    markAsRead: (notificationId) => fetchWithAuth(`/notifications/${notificationId}/read`, {
      method: 'POST',
    }),
    markAllAsRead: () => fetchWithAuth('/notifications/read-all', {
      method: 'POST',
    }),
    create: (notification) => fetchWithAuth('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
    }),
    // Bildirim ayarları (varsa)
    getSettings: () => fetchWithAuth('/notifications/settings'),
    updateSettings: (settings) => fetchWithAuth('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  },
  
  // Mesajlaşma ile ilgili işlemler
  messages: {
    getConversations: () => fetchWithAuth('/messages'),
    getConversation: async (userId) => {
      return await fetchWithAuth(`/messages/${userId}`);
    },
    getPreviousChats: async () => {
      return await fetchWithAuth('/messages/previous-chats');
    },
    sendMessage: async (userId, messageData) => {
      console.log('🚨 API.JS: sendMessage çağrıldı:', { userId, messageData });
      
      // userId'nin geçerli olduğundan emin ol
      if (!userId || userId === 'undefined' || userId === undefined || userId === null) {
        console.error('🚨 API.JS: Geçersiz userId:', userId);
        throw new Error('Geçersiz kullanıcı ID');
      }
      
      const userIdStr = String(userId);
      console.log('🚨 API.JS: Final userId:', userIdStr);
      
      return await fetchWithAuth(`/messages/${userIdStr}`, {
        method: 'POST',
        body: JSON.stringify({
          content: messageData.content,
          mediaUrl: messageData.mediaUrl,
          mediaType: messageData.mediaType
        })
      });
    },
    sendTypingStatus: (userId, isTyping) => fetchWithAuth(`/messages/${userId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    }),
    markAsRead: (messageId) => fetchWithAuth(`/messages/read/${messageId}`, {
      method: 'POST',
    }),
    getUnreadCount: () => fetchWithAuth('/messages/unread-count'),
    markAllAsRead: (userId) => fetchWithAuth(`/messages/read-all/${userId}`, {
      method: 'POST',
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
    delete: (commentId) => {
      console.log(`Yorum silme isteği gönderiliyor, ID: ${commentId}`);
      // Yorum silme endpoint'i: /api/comments/:id veya /comments/:id olabilir
      // Önce /api/comments/:id endpoint'ini deneyelim
      return fetchWithAuth(`/api/comments/${commentId}`, {
        method: 'DELETE',
      }).then(response => {
        // Eğer başarılıysa veya özel bir hata yoksa direkt döndür
        if (response.success || !response.status || response.status !== 404) {
          return response;
        }
        
        // 404 hatası alırsak alternatif endpoint'i deneyelim
        console.log("İlk endpoint başarısız, alternatif endpoint deneniyor");
        return fetchWithAuth(`/comments/${commentId}`, {
          method: 'DELETE',
        });
      });
    },
    report: (commentId) => fetchWithAuth(`/comments/${commentId}/report`, {
      method: 'POST',
    }),
  },

  // Geri Bildirim ile ilgili işlemler (Yeni Eklendi)
  feedback: {
    submit: (data) => fetchWithAuth('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Destek ve Geribildirim servisleri
  support: {
    // Geribildirim gönderme
    submitFeedback: async (data) => {
      try {
        const response = await axios.post('/api/feedback', data);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Destek talebi oluşturma
    createSupportTicket: async (data) => {
      try {
        const response = await axios.post('/api/support/tickets', data);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Kullanıcının destek taleplerini getirme
    getUserTickets: async () => {
      try {
        const response = await axios.get('/api/support/tickets');
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Destek talebi detaylarını getirme
    getTicketDetails: async (ticketId) => {
      try {
        const response = await axios.get(`/api/support/tickets/${ticketId}`);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Destek talebine mesaj ekleme
    addTicketMessage: async (ticketId, message) => {
      try {
        const response = await axios.post(`/api/support/tickets/${ticketId}/messages`, message);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Destek talebini kapatma
    closeTicket: async (ticketId) => {
      try {
        const response = await axios.put(`/api/support/tickets/${ticketId}/close`);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    },
    
    // Kapalı destek talebini yeniden açma
    reopenTicket: async (ticketId) => {
      try {
        const response = await axios.put(`/api/support/tickets/${ticketId}/reopen`);
        return response.data;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    }
  },

  // Güvenlik ayarları ile ilgili işlemler
  security: {
    getSettings: () => fetchWithAuth('/security/settings'),
    updateSettings: (settings) => fetchWithAuth('/security/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
    terminateSession: (sessionId) => fetchWithAuth(`/user/session/${sessionId}`, {
      method: 'DELETE',
    }),
    terminateAllOtherSessions: () => fetchWithAuth('/user/sessions/others', {
      method: 'DELETE',
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

// Kullanıcı araması yap
export const searchUsers = async (query) => {
  try {
    const response = await fetchWithAuth(`/users/search?query=${encodeURIComponent(query)}`);
    return response;
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
    throw error;
  }
};

// Debug amaçlı test gönderisi oluşturma
export const createTestPost = async () => {
  try {
    const testPostData = {
      content: "Bu bir test gönderisidir - " + new Date().toISOString(),
      isPublic: true
    };
    
    console.log("Test gönderisi oluşturuluyor:", testPostData);
    
    const response = await api.posts.create(testPostData);
    
    console.log("Test gönderisi yanıtı:", response);
    
    return response;
  } catch (error) {
    console.error("Test gönderisi oluşturma hatası:", error);
    throw error;
  }
};

export default api;