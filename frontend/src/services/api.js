import { API_URL, API_BASE_URL } from '../config/constants';
import axios from 'axios';

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
  
  // URL oluşturma mantığı: Endpoint /api/v1 ile mi başlıyor?
  // Hayır, /v1/ ile başlıyor. Bu yüzden API_URL kullanılmalı.
  // API_URL'nin 'http://localhost:8080/api' olduğunu varsayıyoruz.
  const url = `${API_URL}${endpoint}`; // Endpoint zaten /v1/... içeriyor
  
  console.log(`API isteği: ${options.method || 'GET'} ${url}`, config.body ? `Body: ${config.body.substring(0, 100)}...` : ''); // Loglamayı iyileştir
  
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
    
    // Yanıtı loglarken daha dikkatli olalım
    const responseClone = response.clone(); // Yanıtı klonla
    try {
      const jsonResponse = await response.json();
      console.log(`API Cevap (${url}):`, jsonResponse);
      
      // Yanıt formatını kontrol et ve standat yanıt yapısına dönüştür
      if (jsonResponse.success === undefined) {
        // API success alanı döndürmüyorsa, bir success alanı ekle
        return { success: true, data: jsonResponse };
      }
      
      return jsonResponse;
    } catch (jsonError) {
      // JSON parse edilemezse (örn. 404'te boş yanıt dönerse)
      const textResponse = await responseClone.text(); // Klonlanmış yanıttan text al
      console.warn(`API Cevap (${url}) JSON parse edilemedi. Durum: ${response.status}, Text: ${textResponse}`);
      if (!response.ok) { // Hata durumuysa yine de hata mesajı dön
          return { success: false, message: textResponse || `Sunucu hatası: ${response.status}` };
      }
      // Başarılı ama boş yanıt ise (örn. 204 No Content)
      return { success: true, data: null }; 
    }
  } catch (error) {
    console.error(`API Hatası (${url}):`, error);
    return { success: false, message: error.message || 'API isteği sırasında beklenmeyen bir hata oluştu' };
  }
};

// API metotları
const api = {
  // Kullanıcı ile ilgili işlemler
  user: {
    getProfile: () => fetchWithAuth('/user'),
    getUserById: (userId) => fetchWithAuth(`/users/id/${userId}`),
    getProfileByUsername: (username) => fetchWithAuth(`/profile/${username}`),
    updateProfile: (data) => fetchWithAuth('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
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
    getFollowing: () => fetchWithAuth('/user/following'),
    getFollowers: () => fetchWithAuth('/user/followers'),
    getFollowingByUsername: (username) => fetchWithAuth(`/profile/${username}/following`),
    getFollowersByUsername: (username) => fetchWithAuth(`/profile/${username}/followers`),
    follow: (userId) => fetchWithAuth(`/user/follow/${userId}`, {
      method: 'POST',
    }),
    unfollow: (userId) => fetchWithAuth(`/user/follow/${userId}`, {
      method: 'DELETE',
    }),
  },
  
  // Gönderi ile ilgili işlemler
  posts: {
    getFeeds: (feed = 'general') => fetchWithAuth(`/posts?feed=${feed}`),
    getUserPostsByUsername: (username) => fetchWithAuth(`/profile/${username}/posts`),
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
    getConversations: async () => {
      return await fetchWithAuth('/messages');
    },
    getConversation: async (userId) => {
      return await fetchWithAuth(`/messages/${userId}`);
    },
    getPreviousChats: async () => {
      return await fetchWithAuth('/messages/previous-chats');
    },
    sendMessage: async (message) => {
      return await fetchWithAuth(`/messages/${message.receiverId}`, {
        method: 'POST',
        body: JSON.stringify({
          content: message.content,
          mediaUrl: message.mediaUrl,
          mediaType: message.mediaType
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
    // WebSocket bağlantısı oluştur
    createWebSocketConnection: () => {
      const token = getToken();
      if (!token) {
        console.error("WebSocket bağlantısı için token bulunamadı.");
        return null;
      }
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      
      console.log("WebSocket bağlantısı oluşturuluyor...");
      
      // API URL yapısını kontrol et
      let host = window.location.hostname;
      let port = '8080'; // Backend portu
      
      const wsUrl = `${wsProtocol}${host}:${port}/api/ws`;
      
      console.log("WebSocket URL:", wsUrl);
      
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error("WebSocket oluşturma hatası:", error);
        return null;
      }

      // WebSocket için retry mekanizması
      let authSent = false;
      let authRetries = 0;
      const MAX_AUTH_RETRIES = 5;
      const retryIntervals = [50, 100, 200, 300, 500]; // Daha kısa gecikme süreleri
      let authTimeoutId = null;
      let connectionCheckInterval = null;
      
      // Auth mesajını gönderme fonksiyonu
      const sendAuthMessage = () => {
        if (authSent) return true; // Zaten gönderilmişse tekrar gönderme
        
        try {
          // Token'ı göndermek için auth mesajı oluştur
          const authMessage = JSON.stringify({ 
            type: 'auth', 
            token: token 
          });
          
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(authMessage);
            console.log('Auth mesajı gönderildi:', authMessage);
            authSent = true;
            
            // Auth mesajı gönderildikten sonra timeout'u temizle
            if (authTimeoutId) {
              clearTimeout(authTimeoutId);
              authTimeoutId = null;
            }
            return true; // Başarıyla gönderildi
          } else {
            console.warn('WebSocket bağlantısı hazır değil, readyState:', ws.readyState);
            return false; // Gönderme başarısız
          }
        } catch (err) {
          console.error('Auth mesajı gönderilirken hata:', err);
          return false; // Gönderme başarısız
        }
      };
      
      // Auth mesajını yeniden gönderme işlemi
      const retryAuthMessage = () => {
        if (authSent || authRetries >= MAX_AUTH_RETRIES) return;
        
        const delay = retryIntervals[authRetries] || 500;
        console.log(`Auth mesajı ${authRetries+1}. deneme, ${delay}ms sonra...`);
        
        authTimeoutId = setTimeout(() => {
          if (!authSent) {
            if (ws.readyState === WebSocket.OPEN) {
              if (sendAuthMessage()) {
                console.log(`Auth mesajı ${authRetries+1}. denemede başarıyla gönderildi`);
              } else {
                authRetries++;
                retryAuthMessage(); // Başarısız olursa tekrar dene
              }
            } else if (ws.readyState === WebSocket.CONNECTING) {
              console.log("WebSocket hala bağlanıyor, auth mesajı için bekleniyor...");
              authRetries++;
              retryAuthMessage();
            } else {
              console.error("WebSocket bağlantısı kapandı, auth mesajı gönderilemedi.");
            }
          }
        }, delay);
      };
      
      // Bağlantı açıldıktan sonra auth mesajını göndermeyi garantilemek için Promise döndüren fonksiyon
      const ensureAuthSent = () => {
        return new Promise((resolve, reject) => {
          // Önce bağlantının açık olup olmadığını kontrol et
          if (ws.readyState === WebSocket.OPEN) {
            // Bağlantı açıksa auth mesajını gönder
            if (sendAuthMessage()) {
              resolve(true);
            } else {
              // İlk deneme başarısız olursa, yeniden deneme mekanizmasını başlat
              authRetries++;
              retryAuthMessage();
              
              // Maksimum 1 saniye bekle
              setTimeout(() => {
                resolve(authSent);
              }, 1000);
            }
          } else if (ws.readyState === WebSocket.CONNECTING) {
            // Bağlantı kurulana kadar bekle
            const checkInterval = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                clearInterval(checkInterval);
                if (sendAuthMessage()) {
                  resolve(true);
                } else {
                  authRetries++;
                  retryAuthMessage();
                  setTimeout(() => resolve(authSent), 1000);
                }
              } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                clearInterval(checkInterval);
                reject(new Error("WebSocket bağlantısı kapatıldı."));
              }
            }, 100);
            
            // Maksimum 3 saniye bekle
            setTimeout(() => {
              clearInterval(checkInterval);
              if (!authSent) {
                reject(new Error("WebSocket auth zaman aşımı"));
              } else {
                resolve(true);
              }
            }, 3000);
          } else {
            // Bağlantı kapalı veya kapanıyor
            reject(new Error("WebSocket bağlantısı hazır değil: " + ws.readyState));
          }
        });
      };
      
      // WebSocket nesnesine ensureAuthSent fonksiyonunu ekle
      ws.ensureAuthSent = ensureAuthSent;
      
      // Bağlantı durum kontrolü için periyodik kontrol
      connectionCheckInterval = setInterval(() => {
        if (!authSent && ws.readyState === WebSocket.OPEN) {
          console.log("Bağlantı açık ama auth gönderilmemiş, hemen gönderiliyor...");
          if (sendAuthMessage()) {
            console.log("Auth mesajı periyodik kontrolde başarıyla gönderildi");
            clearInterval(connectionCheckInterval);
          }
        } else if (authSent) {
          console.log("Auth gönderildi, periyodik kontrol durduruluyor");
          clearInterval(connectionCheckInterval);
        }
      }, 300);
      
      // WebSocket açıldığında token ile kimlik doğrulama yap
      ws.onopen = () => {
        console.log('WebSocket bağlantısı kuruldu (onopen tetiklendi)');
        
        // 20ms bekle ve sonra göndermeyi dene
        setTimeout(() => {
          if (!sendAuthMessage()) {
            console.log("Auth mesajı açılışta gönderilemedi, yeniden deneme başlatılıyor...");
            authRetries++;
            retryAuthMessage();
          }
        }, 20);
      };
      
      // Normal mesaj işleme için onmessage
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Auth başarılı mesajı
          if (data.type === 'auth_success') {
            console.log('WebSocket kimlik doğrulama başarılı:', data);
            authSent = true; // Auth başarıyla tamamlandı
            // Tüm zamanlayıcıları temizle
            if (authTimeoutId) {
              clearTimeout(authTimeoutId);
              authTimeoutId = null;
            }
            if (connectionCheckInterval) {
              clearInterval(connectionCheckInterval);
              connectionCheckInterval = null;
            }
          }
          
          // Ping mesajlarına otomatik cevap ver
          if (data.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'pong' }));
                console.log('Ping alındı, pong gönderildi');
              } catch (error) {
                console.error('Pong gönderirken hata:', error);
              }
            }
          }
        } catch (error) {
          console.warn('WebSocket mesajı işlenirken hata:', error);
        }
      };
      
      // WebSocket kapandığında
      ws.onclose = (event) => {
        console.log('WebSocket bağlantısı kapandı:', event);
        
        // Zamanlayıcıları temizle
        if (authTimeoutId) {
          clearTimeout(authTimeoutId);
          authTimeoutId = null;
        }
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
          connectionCheckInterval = null;
        }
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

  // Geri Bildirim ile ilgili işlemler (Yeni Eklendi)
  feedback: {
    submit: (data) => fetchWithAuth('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
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

export default api;