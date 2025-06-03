// Firebase Firestore için mesajlaşma servisi (Düzeltilmiş)
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  getDocs,
  deleteDoc,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase-config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// Authentication state
let isAuthenticating = false;
let authPromise = null;

// Kullanıcının oturum açtığından emin ol - GEÇİCİ: DEVRE DIŞI
const ensureAuthenticated = async () => {
  // GEÇİCİ: Authentication kontrolünü atla
  console.log('Firebase Auth: Authentication kontrolü geçici olarak devre dışı');
  return Promise.resolve({ uid: 'temp-user' });
  
  // Orijinal kod (tekrar etkinleştirilebilir):
  /*
  if (isAuthenticating && authPromise) {
    return authPromise;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  isAuthenticating = true;
  authPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      isAuthenticating = false;
      authPromise = null;
      
      if (user) {
        console.log('Firebase Auth: Kullanıcı oturum açtı:', user.uid);
        resolve(user);
      } else {
        // Anonim giriş yap
        signInAnonymously(auth)
          .then((result) => {
            console.log('Firebase Auth: Anonim giriş başarılı:', result.user.uid);
            resolve(result.user);
          })
          .catch((error) => {
            console.error('Firebase Auth: Anonim giriş hatası:', error);
            reject(error);
          });
      }
    });
  });

  return authPromise;
  */
};

// Development ortamında emulator kullan - geçici olarak kapatıldı
// if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_USE_FIREBASE_PROD) {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     console.log('Firebase Emulator\'a bağlandı');
//   } catch (error) {
//     console.log('Firebase Emulator bağlantısı zaten mevcut veya hata:', error.message);
//   }
// }

/**
 * Konuşma ID'si oluştur - Firebase ile uyumlu
 */
export const createConversationId = (userId1, userId2) => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

/**
 * Konuşmaları dinle
 */
export const listenForConversations = (currentUserId, callback) => {
  if (!currentUserId) {
    console.error('listenForConversations: currentUserId gerekli');
    callback([]);
    return () => {};
  }

  let retryCount = 0;
  const maxRetries = 3;
  let retryTimeout = null;

  const startListener = async () => {
    try {
      // Authentication sağla
      await ensureAuthenticated();
      
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUserId),
        orderBy('lastMessageTime', 'desc')
      );

      const unsubscribe = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          console.log('Firebase: Konuşma snapshot alındı, doc count:', snapshot.size);
          const conversations = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            const otherParticipantId = data.participants.find(id => id !== currentUserId);
            
            conversations.push({
              id: doc.id,
              otherParticipantId,
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime,
              lastMessageSender: data.lastMessageSender,
              unreadCount: data.unreadCount?.[currentUserId] || 0,
              participants: data.participants
            });
          });
          
          console.log('Firebase: Konuşmalar başarıyla güncellendi:', conversations.length);
          retryCount = 0; // Başarılı bağlantıda retry sayacını sıfırla
          callback(conversations);
        },
        (error) => {
          console.error('Firebase: Konuşma dinleme hatası:', error.code, error.message);
          
          // Retry mekanizması
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Firebase: ${delay/1000}s sonra yeniden denenecek (${retryCount}/${maxRetries})`);
            
            retryTimeout = setTimeout(() => {
              console.log('Firebase: Konuşma listener yeniden başlatılıyor...');
              startListener();
            }, delay);
          } else {
            console.error('Firebase: Maksimum retry sayısına ulaşıldı, boş liste döndürülüyor');
            callback([]);
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('listenForConversations başlatma hatası:', error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Firebase: ${delay/1000}s sonra yeniden denenecek (başlatma)`);
        
        retryTimeout = setTimeout(() => {
          startListener();
        }, delay);
      } else {
        callback([]);
      }
      
      return () => {};
    }
  };

  // Async listener başlat
  let unsubscribePromise = startListener();
  
  return () => {
    // Retry timeout'u temizle
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    
    // Unsubscribe
    unsubscribePromise.then(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  };
};

/**
 * Mesajları dinle
 */
export const listenForMessages = (conversationId, callback) => {
  if (!conversationId) {
    console.error('listenForMessages: conversationId gerekli');
    callback([]);
    return () => {};
  }

  let retryCount = 0;
  const maxRetries = 3;
  let retryTimeout = null;

  const startListener = async () => {
    try {
      // Authentication sağla
      await ensureAuthenticated();
      
      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('sentAt', 'asc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        messagesQuery,
        (snapshot) => {
          console.log('Firebase: Mesaj snapshot alındı, doc count:', snapshot.size);
          const messages = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              ...data,
              sentAt: data.sentAt?.toDate?.() ? data.sentAt.toDate().toISOString() : new Date().toISOString()
            });
          });
          
          console.log('Firebase: Mesajlar başarıyla güncellendi:', messages.length);
          retryCount = 0; // Başarılı bağlantıda retry sayacını sıfırla
          callback(messages);
        },
        (error) => {
          console.error('Firebase: Mesaj dinleme hatası:', error.code, error.message);
          
          // Retry mekanizması
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`Firebase: ${delay/1000}s sonra yeniden denenecek (${retryCount}/${maxRetries})`);
            
            retryTimeout = setTimeout(() => {
              console.log('Firebase: Mesaj listener yeniden başlatılıyor...');
              startListener();
            }, delay);
          } else {
            console.error('Firebase: Maksimum retry sayısına ulaşıldı, boş liste döndürülüyor');
            callback([]);
          }
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('listenForMessages başlatma hatası:', error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Firebase: ${delay/1000}s sonra yeniden denenecek (başlatma)`);
        
        retryTimeout = setTimeout(() => {
          startListener();
        }, delay);
      } else {
        callback([]);
      }
      
      return () => {};
    }
  };

  // Async listener başlat
  let unsubscribePromise = startListener();
  
  return () => {
    // Retry timeout'u temizle
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    
    // Unsubscribe
    unsubscribePromise.then(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  };
};

/**
 * Mesaj gönder
 */
export const sendMessage = async ({ 
  conversationId, 
  recipientId, 
  senderId, 
  content, 
  mediaUrl = null, 
  mediaType = null 
}) => {
  if (!conversationId || !senderId || (!content && !mediaUrl)) {
    throw new Error('Mesaj göndermek için gerekli alanlar eksik');
  }

  try {
    // Authentication sağla
    await ensureAuthenticated();
    
    const messageData = {
      senderId,
      receiverId: recipientId,
      content: content || '',
      sentAt: serverTimestamp(),
      isRead: false,
      isDelivered: true
    };

    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
      messageData.mediaType = mediaType;
    }

    // Mesajı ekle
    const messageRef = await addDoc(
      collection(db, 'conversations', conversationId, 'messages'),
      messageData
    );

    // Konuşmayı güncelle
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: content || 'Medya dosyası',
      lastMessageTime: serverTimestamp(),
      lastMessageSender: senderId,
      [`unreadCount.${recipientId}`]: arrayUnion(messageRef.id)
    });

    console.log('Firebase: Mesaj gönderildi:', messageRef.id);
    return messageRef.id;
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    
    if (error.code === 'permission-denied') {
      console.warn('Firebase: Mesaj gönderme izni reddedildi');
      await ensureAuthenticated();
      throw new Error('Kimlik doğrulama sorunu. Lütfen tekrar deneyin.');
    }
    
    throw error;
  }
};

/**
 * Mesajları okundu olarak işaretle
 */
export const markMessagesAsRead = async (conversationId, currentUserId) => {
  if (!conversationId || !currentUserId) {
    console.error('markMessagesAsRead: Gerekli parametreler eksik');
    return;
  }

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      [`unreadCount.${currentUserId}`]: []
    });
  } catch (error) {
    console.error('Mesajları okundu işaretleme hatası:', error);
  }
};

/**
 * Yeni konuşma oluştur
 */
export const createConversation = async (currentUserId, otherUserId) => {
  if (!currentUserId || !otherUserId) {
    throw new Error('Konuşma oluşturmak için kullanıcı ID\'leri gerekli');
  }

  const conversationId = createConversationId(currentUserId, otherUserId);
  
  try {
    // Authentication sağla
    await ensureAuthenticated();
    
    // Mevcut konuşmayı kontrol et
    const existingConversations = await getDocs(
      query(
        collection(db, 'conversations'),
        where('participants', '==', [currentUserId, otherUserId].sort())
      )
    );

    if (!existingConversations.empty) {
      console.log('Firebase: Mevcut konuşma bulundu:', existingConversations.docs[0].id);
      return existingConversations.docs[0].id;
    }

    // Yeni konuşma oluştur
    const conversationData = {
      participants: [currentUserId, otherUserId],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      lastMessageSender: null,
      unreadCount: {
        [currentUserId]: [],
        [otherUserId]: []
      }
    };

    const conversationRef = doc(db, 'conversations', conversationId);
    // setDoc kullanarak güvenli bir şekilde oluştur
    await setDoc(conversationRef, conversationData);
    
    console.log('Firebase: Yeni konuşma oluşturuldu:', conversationId);
    return conversationId;
  } catch (error) {
    console.error('Konuşma oluşturma hatası:', error);
    
    if (error.code === 'permission-denied') {
      console.warn('Firebase: Konuşma oluşturma izni reddedildi');
      await ensureAuthenticated();
      throw new Error('Kimlik doğrulama sorunu. Lütfen tekrar deneyin.');
    }
    
    throw error;
  }
};

/**
 * Mesaj sil
 */
export const deleteMessage = async (conversationId, messageId) => {
  if (!conversationId || !messageId) {
    throw new Error('Mesaj silmek için conversationId ve messageId gerekli');
  }

  try {
    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Mesaj silme hatası:', error);
    throw error;
  }
};

/**
 * Ağ durumunu kontrol et ve yönet
 */
export const handleNetworkChange = async (isOnline) => {
  try {
    if (isOnline) {
      await enableNetwork(db);
      console.log('Firebase ağ bağlantısı etkinleştirildi');
    } else {
      await disableNetwork(db);
      console.log('Firebase ağ bağlantısı devre dışı bırakıldı');
    }
  } catch (error) {
    console.error('Ağ durumu değişikliği hatası:', error);
  }
};

export { db };