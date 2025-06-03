// message-service.js
import api from './api';
import { API_BASE_URL, APP_CONSTANTS } from '../config/constants';
import websocketService from './websocket-service';

// Tüm konuşmaları getiren fonksiyon
export const getConversations = async () => {
  try {
    // Gerçek API'den konuşmaları getir
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Konuşmalar alınamadı');
    }

    const data = await response.json();
    console.log('Gerçek API konuşma verileri:', data);
    
    if (data.success) {
      return data.data || [];
    }
    throw new Error(data.message || 'Konuşmaları getirme hatası');
  } catch (error) {
    console.error("Konuşmaları getirme hatası:", error);
    throw error;
  }
};

// Belirli bir konuşmanın mesajlarını getiren fonksiyon (getMessages alias)
export const getMessages = async (conversationId) => {
  return fetchMessages(conversationId);
};

// Belirli bir konuşmanın mesajlarını getir
export const fetchMessages = async (conversationId) => {
  try {
    // Konuşma ID'sinden kullanıcı ID'sini çıkar
    // conversationId formatı: user1_user2 şeklinde (örn: 1_2)
    const userIds = conversationId.split('_');
    if (userIds.length !== 2) {
      throw new Error('Geçersiz konuşma ID');
    }
    
    // Şu anki kullanıcı ID'sini al
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!currentUser || !currentUser.id) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }
    
    // Diğer kullanıcı ID'sini bul
    const otherUserId = userIds[0] == currentUser.id ? userIds[1] : userIds[0];
    
    // Gerçek API'den mesajları getir
    const response = await fetch(`${API_BASE_URL}/api/messages/${otherUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mesajlar alınamadı: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Tek seferlik] Gerçek API mesajları alındı:`, data);
    
    if (data.success) {
      // Backend'den gelen mesaj formatını düzenleme
      return data.data?.messages || [];
    }
    throw new Error(data.message || 'Mesajlar alınamadı');
  } catch (error) {
    console.error('Mesajları getirme hatası:', error);
    return [];
  }
};

// Okunmamış mesajları okundu olarak işaretle
export const markMessagesAsRead = async (conversationId) => {
  try {
    // Konuşma ID'sinden kullanıcı ID'sini çıkar
    const userIds = conversationId.split('_');
    if (userIds.length !== 2) {
      throw new Error('Geçersiz konuşma ID');
    }
    
    // Şu anki kullanıcı ID'sini al
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!currentUser || !currentUser.id) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }
    
    // Diğer kullanıcı ID'sini bul
    const otherUserId = userIds[0] == currentUser.id ? userIds[1] : userIds[0];
    
    // Gerçek API ile mesajları okundu olarak işaretle
    const response = await fetch(`${API_BASE_URL}/api/messages/read-all/${otherUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Mesajlar okundu olarak işaretlenemedi');
    }

    const data = await response.json();
    
    // WebSocket üzerinden okundu durumunu bildir - sadece açık ise
    if (websocketService && websocketService.getStatus() === 'OPEN') {
      websocketService.sendMessage({
        type: 'mark_read',
        conversationId: conversationId
      });
    }
    
    return {
      success: data.success
    };
  } catch (error) {
    console.error('Mesajları okundu olarak işaretleme hatası:', error);
    return {
      success: false
    };
  }
};

// Aktif konuşmaları getir
export const fetchConversations = async () => {
  try {
    // Gerçek API ile uyumlu endpoint - backend'de /api/conversations yoksa /api/messages kullan
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Konuşmalar alınamadı: ${errorText}`);
    }

    const data = await response.json();
    console.log('Konuşmalar alındı:', data);
    
    // Tüm konuşmaları döndür
    if (data.success && Array.isArray(data.data)) {
      // Backend'den gelen konuşma formatını düzenleyerek döndür
      return data.data.map(conv => ({
        id: createConversationId(conv.userId),
        participants: [getCurrentUserId(), conv.userId],
        lastMessage: conv.lastContent || '',
        lastTimestamp: conv.lastTimestamp,
        unreadCount: conv.unreadCount || 0,
        sender: {
          id: conv.userId,
          username: conv.username,
          fullName: conv.fullName,
          profileImage: conv.profileImage
        }
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Konuşmaları getirme hatası:', error);
    return [];
  }
};

// Yeni mesaj gönderen fonksiyon
export const sendMessage = async (conversationId, content, mediaFile = null) => {
  try {
    // Önce medya varsa yükle
    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      const formData = new FormData();
      formData.append('file', mediaFile);
      
      const mediaResponse = await fetch(`${API_BASE_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: formData
      });
      
      if (!mediaResponse.ok) {
        throw new Error('Medya yüklenemedi');
      }
      
      const mediaData = await mediaResponse.json();
      mediaUrl = mediaData.url;
      mediaType = mediaFile.type;
    }

    // Konuşma ID'sinden kullanıcı ID'sini çıkar
    const userIds = conversationId.split('_');
    if (userIds.length !== 2) {
      throw new Error('Geçersiz konuşma ID');
    }
    
    // Şu anki kullanıcı ID'sini al
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
    if (!currentUser || !currentUser.id) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }
    
    // Diğer kullanıcı ID'sini bul
    const otherUserId = userIds[0] == currentUser.id ? userIds[1] : userIds[0];
    
    // Gerçek API ile mesaj gönder
    const response = await fetch(`${API_BASE_URL}/api/messages/${otherUserId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
      },
      body: JSON.stringify({
        content,
        mediaUrl,
        mediaType
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Mesaj gönderilemedi: ${errorData}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message || 'Mesaj gönderildi',
      data: data.data
    };
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    return {
      success: false,
      message: error.message || 'Mesaj gönderilemedi',
    };
  }
};

// Yardımcı fonksiyonlar
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
  return currentUser?.id;
}

// Konuşma ID'si oluştur
export const createConversationId = (userId1, userId2 = null) => {
  // Eğer tek parametre geldiyse, mevcut kullanıcı ID'si ile kombine et
  if (userId2 === null) {
    userId2 = getCurrentUserId();
  }
  
  // Kullanıcı ID'leri string olmayabilir
  const user1 = String(userId1);
  const user2 = String(userId2);
  
  // ID'leri sıralayıp birleştir (konuşma ID'si her iki kullanıcı için de aynı olsun)
  return [user1, user2].sort().join('_');
};