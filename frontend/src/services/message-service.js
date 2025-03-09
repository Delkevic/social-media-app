// message-service.js

// API endpoint URL'leri - kendi API adresinizle değiştirin
const API_URL = "https://api.your-app.com";

// Tüm konuşmaları getiren fonksiyon
export const getConversations = async () => {
  try {
    // Gerçek API çağrısı
    // const response = await fetch(`${API_URL}/conversations`);
    // if (!response.ok) throw new Error('Konuşmaları getirme hatası');
    // const data = await response.json();
    // return data;

    // Geliştirme sırasında kullanılacak örnek veri
    return [
      {
        id: "1",
        username: "Ahmet Yılmaz",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        lastMessage: "Projeyi ne zaman bitirebiliriz?",
        lastSeen: "2023-09-15T14:30:00Z",
        online: true,
        unreadCount: 3
      },
      {
        id: "2",
        username: "Ayşe Demir",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
        lastMessage: "Toplantı yarın saat 14:00'te",
        lastSeen: "2023-09-15T12:45:00Z",
        online: false,
        unreadCount: 0
      },
      {
        id: "3",
        username: "Mehmet Kaya",
        avatar: null,
        lastMessage: "Dosyaları inceledim, geri dönüş yapacağım",
        lastSeen: "2023-09-14T18:20:00Z",
        online: false,
        unreadCount: 1
      }
    ];
  } catch (error) {
    console.error("Konuşmaları getirme hatası:", error);
    throw error;
  }
};

// Belirli bir konuşmanın mesajlarını getiren fonksiyon
export const getMessages = async (conversationId) => {
  try {
    // Gerçek API çağrısı
    // const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`);
    // if (!response.ok) throw new Error('Mesajları getirme hatası');
    // const data = await response.json();
    // return data;

    // Geliştirme sırasında kullanılacak örnek veriler
    const messages = [
      {
        id: "101",
        conversationId: "1",
        content: "Merhaba, projenin son durumu nedir?",
        sender: "user2",
        timestamp: "2023-09-15T09:30:00Z"
      },
      {
        id: "102",
        conversationId: "1",
        content: "Merhaba! Frontend kısmı tamamlandı, backend entegrasyonuna başlıyoruz.",
        sender: "currentUser",
        timestamp: "2023-09-15T09:35:00Z"
      },
      {
        id: "103",
        conversationId: "1",
        content: "Harika! Ne zaman bitirebiliriz?",
        sender: "user2",
        timestamp: "2023-09-15T09:40:00Z"
      },
      {
        id: "201",
        conversationId: "2",
        content: "Yarınki toplantı için hazırlık yaptın mı?",
        sender: "user3",
        timestamp: "2023-09-15T10:15:00Z"
      },
      {
        id: "202",
        conversationId: "2",
        content: "Evet, sunumu hazırladım.",
        sender: "currentUser",
        timestamp: "2023-09-15T10:20:00Z"
      },
      {
        id: "203",
        conversationId: "2",
        content: "Toplantı yarın saat 14:00'te",
        sender: "user3",
        timestamp: "2023-09-15T10:25:00Z"
      },
      {
        id: "301",
        conversationId: "3",
        content: "Gönderdiğim dosyaları inceleyebilir misin?",
        sender: "currentUser",
        timestamp: "2023-09-14T17:00:00Z"
      },
      {
        id: "302",
        conversationId: "3",
        content: "Tabii, hemen bakıyorum.",
        sender: "user4",
        timestamp: "2023-09-14T17:10:00Z"
      },
      {
        id: "303",
        conversationId: "3",
        content: "Dosyaları inceledim, geri dönüş yapacağım",
        sender: "user4",
        timestamp: "2023-09-14T18:20:00Z"
      }
    ];

    // Yalnızca ilgili konuşmaya ait mesajları filtrele
    return messages.filter(message => message.conversationId === conversationId);
  } catch (error) {
    console.error("Mesajları getirme hatası:", error);
    throw error;
  }
};

// Yeni mesaj gönderen fonksiyon
export const sendMessage = async (conversationId, content) => {
  try {
    // Gerçek API çağrısı
    // const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ content })
    // });
    // if (!response.ok) throw new Error('Mesaj gönderme hatası');
    // const data = await response.json();
    // return data;

    // Geliştirme sırasında sahte bir gecikme oluştur
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Mesaj gönderildi: ${content} - Konuşma ID: ${conversationId}`);
        resolve({ success: true });
      }, 1000);
    });
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error);
    throw error;
  }
};