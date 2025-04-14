// Yeni bir konuşma başlat (arama sonuçlarından seçildiğinde)
const startNewConversation = async (user) => {
  if (!user || !user.username) {
    toast.error('Geçersiz kullanıcı bilgisi!');
    return;
  }

  // WebSocket durumunu kontrol et
  let wsReady = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  const checkWebSocketReady = () => {
    const ws = messagesService.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket bağlantısı hazır değil, yeniden bağlanmaya çalışılacak:', 
        ws ? `readyState: ${ws.readyState}` : 'WebSocket yok');
      return false;
    }
    return true;
  };

  // WebSocket'i hazırla
  const prepareWebSocket = async () => {
    console.log('WebSocket hazırlanıyor...');
    
    // Mevcut WebSocket'i kontrol et
    if (checkWebSocketReady()) {
      console.log('WebSocket zaten hazır!');
      return true;
    }
    
    // WebSocket bağlantısını yenile
    try {
      console.log('WebSocket bağlantısı yenileniyor...');
      await messagesService.refreshWebSocketConnection();
      
      // Bağlantı kurulduktan sonra kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (checkWebSocketReady()) {
        console.log('WebSocket bağlantısı başarıyla yenilendi!');
        return true;
      } else {
        console.error('WebSocket bağlantısı yenilendi ama hala hazır değil');
        return false;
      }
    } catch (error) {
      console.error('WebSocket bağlantısı yenilenirken hata:', error);
      return false;
    }
  };
  
  // WebSocket'in hazır olmasını bekle
  while (!wsReady && retryCount < MAX_RETRIES) {
    wsReady = await prepareWebSocket();
    if (!wsReady) {
      retryCount++;
      console.log(`WebSocket hazır değil, ${retryCount}/${MAX_RETRIES} deneme...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
    }
  }
  
  if (!wsReady) {
    toast.error('Mesajlaşma servisiyle bağlantı kurulamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
    return;
  }

  try {
    // Konuşmada bu kullanıcı var mı diye kontrol et
    const conversationExists = conversations.find(
      conv => conv.participants.some(p => p.username === user.username)
    );

    if (conversationExists) {
      // Eğer bu kullanıcıyla zaten bir konuşma varsa, onu seç
      console.log('Bu kullanıcıyla zaten bir konuşma var, seçiliyor:', user.username);
      setSelectedConversation(conversationExists);
      setConversationsOpen(false); // Mobil görünümde mesaj panelini göster
      return;
    }

    // Yeni konuşma oluşturma isteği yap
    setLoadingConversation(true);
    const response = await api.createConversation([user.id]);
    
    if (response && response.id) {
      console.log('Yeni konuşma oluşturuldu:', response);
      
      // Yeni konuşma nesnesini oluştur
      const newConversation = {
        id: response.id,
        participants: [user],
        lastMessage: null,
        updatedAt: new Date().toISOString(),
        unreadCount: 0
      };
      
      // Konuşmaları güncelle
      setConversations(prev => [newConversation, ...prev]);
      
      // Yeni konuşmayı seç
      setSelectedConversation(newConversation);
      setConversationsOpen(false); // Mobil görünümde mesaj panelini göster
      
      // Aramı temizle
      setSearchTerm('');
      setSearchResults([]);
    } else {
      toast.error('Konuşma başlatılamadı. Lütfen tekrar deneyin.');
    }
  } catch (error) {
    console.error('Konuşma başlatma hatası:', error);
    toast.error('Konuşma başlatılırken bir hata oluştu.');
  } finally {
    setLoadingConversation(false);
  }
}; 