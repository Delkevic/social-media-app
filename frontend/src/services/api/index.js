// Mevcut dosyanın içeriğini değiştirmeden, polling için gerekli mesaj endpoint'leri ekleyeceğim
// Bu eklenen kısımlar diğer mevcut kodu tamamlayacak

// ... existing code ...

// Mesajlaşma API'leri
const messages = {
  // Bir konuşmanın mesajlarını getir
  getMessages: async (conversationId) => {
    return makeRequest(`/api/messages/${conversationId}`, 'GET');
  },
  
  // Yeni mesaj gönder
  sendMessage: async (data) => {
    return makeRequest(`/api/messages/${data.conversationId}`, 'POST', data);
  },
  
  // Mesajı okundu olarak işaretle
  markAsRead: async (conversationId) => {
    return makeRequest(`/api/messages/${conversationId}/read`, 'POST');
  },
  
  // Tüm konuşmaları getir
  getConversations: async () => {
    return makeRequest('/api/conversations', 'GET');
  },
  
  // Mesajı sil
  deleteMessage: async (messageId) => {
    return makeRequest(`/api/messages/${messageId}`, 'DELETE');
  }
};

// Polling işlemlerini destekleyecek yardımcı fonksiyonlar
const polling = {
  // Polling durumunu kontrol et
  checkPollingStatus: async () => {
    return makeRequest('/api/system/polling-status', 'GET');
  }
};

// ... existing code exports ...

export default {
  // ... existing modules ...
  messages,
  polling
}; 