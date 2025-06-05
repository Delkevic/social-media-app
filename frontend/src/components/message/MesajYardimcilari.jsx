import { toast } from 'react-hot-toast';
import api from '../../services/api';
import * as messageService from '../../services/message-services';

/**
 * Yeni bir konuşma başlatma fonksiyonu
 * @param {string|number} userId - Konuşma başlatılacak kullanıcı ID'si
 * @param {Object} params - Parametreler
 * @param {Array} params.conversations - Mevcut konuşmalar
 * @param {Function} params.setConversations - Konuşmaları güncelleyen state fonksiyonu
 * @param {Function} params.setSelectedConversation - Seçili konuşmayı güncelleyen state fonksiyonu 
 * @param {Function} params.setConversationsOpen - Mobil görünümde konuşma listesini gösteren/gizleyen fonksiyon
 * @param {Function} params.navigate - React Router navigate fonksiyonu
 */
export const konusmaBaslat = async (userId, { 
  conversations, 
  setConversations, 
  setSelectedConversation, 
  setConversationsOpen, 
  navigate 
}) => {
  if (!userId) {
    toast.error('Geçersiz kullanıcı bilgisi!');
    return;
  }

  try {
    // Konuşmada bu kullanıcı var mı diye kontrol et
    const conversationExists = conversations.find(
      conv => conv.participants && conv.participants.includes(userId)
    );

    if (conversationExists) {
      // Eğer bu kullanıcıyla zaten bir konuşma varsa, onu seç
      console.log('Bu kullanıcıyla zaten bir konuşma var, seçiliyor:', userId);
      setSelectedConversation(conversationExists);
      setConversationsOpen(false); // Mobil görünümde mesaj panelini göster
      navigate(`/messages/${userId}`);
      return;
    }

    // Yeni konuşma oluşturma isteği yap
    const response = await messageService.createConversation(userId);
    
    if (response && response.id) {
      console.log('Yeni konuşma oluşturuldu:', response);
      
      // Yeni konuşma nesnesini oluştur
      const newConversation = {
        id: response.id,
        participants: [userId],
        lastMessage: null,
        updatedAt: new Date().toISOString(),
        unreadCount: 0
      };
      
      // Konuşmaları güncelle
      setConversations(prev => [newConversation, ...prev]);
      
      // Yeni konuşmayı seç
      setSelectedConversation(newConversation);
      setConversationsOpen(false); // Mobil görünümde mesaj panelini göster
      
      // Konuşma sayfasına yönlendir
      navigate(`/messages/${userId}`);
      return newConversation;
    } else {
      toast.error('Konuşma başlatılamadı. Lütfen tekrar deneyin.');
      return null;
    }
  } catch (error) {
    console.error('Konuşma başlatma hatası:', error);
    toast.error('Konuşma başlatılırken bir hata oluştu.');
    return null;
  }
};

/**
 * Kullanıcı arama fonksiyonu
 * @param {string} query - Arama terimi
 * @returns {Promise<Array>} - Bulunan kullanıcılar
 */
export const kullaniciAra = async (query) => {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await api.user.searchUsers(query);
    if (response.success) {
      return response.data || [];
    }
    return [];
  } catch (error) {
    console.error("Kullanıcı arama hatası:", error);
    toast.error("Arama yapılırken bir hata oluştu");
    return [];
  }
};

/**
 * Mesajları formatla
 * @param {string} timestamp - Zaman bilgisi
 * @returns {string} - Formatlanmış zaman
 */
export const zamanFormatla = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '--:--';
  }
}; 