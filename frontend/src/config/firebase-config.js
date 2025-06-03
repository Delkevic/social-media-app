// Firebase App yapılandırma dosyası
import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, disableNetwork, enableNetwork } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase yapılandırma bilgileri
// NOT: Bu bilgiler Firebase konsolundan alınmıştır
// https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyBPsq-85Q1NFjKLTjuaB_VEiEYFYW_QucU",
  authDomain: "buzzify-message.firebaseapp.com",
  projectId: "buzzify-message",
  storageBucket: "buzzify-message.appspot.com",
  messagingSenderId: "474161901878",
  appId: "1:474161901878:web:bb30c96532b9c46fb18397",
  measurementId: "G-YBSFRKKWCR"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firestore veritabanını başlat - Online-only mode (WebChannel sorunlarını çözer)
let db;
try {
  console.log('Firebase: Online-only Firestore başlatılıyor...');
  
  // Firestore'u minimal konfigürasyonla başlat
  db = initializeFirestore(app, {
    cacheSizeBytes: 1048576, // 1MB cache (minimal)
    experimentalForceLongPolling: false, // WebChannel kullan ama basit şekilde
    experimentalAutoDetectLongPolling: true, // Otomatik tespit et
  });
  
  console.log('Firebase: Online-only Firestore başarıyla başlatıldı');
} catch (error) {
  console.error('Firebase: Firestore başlatma hatası:', error);
  // Fallback: Basit getFirestore
  try {
    db = getFirestore(app);
    console.log('Firebase: Basit Firestore başlatıldı');
  } catch (fallbackError) {
    console.error('Firebase: Firestore fallback hatası:', fallbackError);
    throw fallbackError;
  }
}

// Firebase Authentication'ı başlat
const auth = getAuth(app);

// Authentication state logging
auth.onAuthStateChanged((user) => {
  if (user && !user.isAnonymous) {
    console.log('Firebase Auth: Gerçek kullanıcı giriş yaptı:', user.uid);
  } else if (user && user.isAnonymous) {
    console.log('Firebase Auth: Anonim kullanıcı:', user.uid);
  } else {
    console.log('Firebase Auth: Kullanıcı çıkış yaptı');
  }
});

// Connectivity helpers (opsiyonel)
export const forceOnlineMode = async () => {
  try {
    await enableNetwork(db);
    console.log('Firebase: Ağ bağlantısı zorla etkinleştirildi');
  } catch (error) {
    console.warn('Firebase: Ağ etkinleştirme hatası:', error);
  }
};

export const forceOfflineMode = async () => {
  try {
    await disableNetwork(db);
    console.log('Firebase: Ağ bağlantısı devre dışı bırakıldı');
  } catch (error) {
    console.warn('Firebase: Ağ devre dışı bırakma hatası:', error);
  }
};

export { app, db, auth, firebaseConfig }; 