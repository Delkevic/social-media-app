// React ve React Router gerekli bileşenlerini içe aktarıyoruz
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';
import TwoFactorVerify from './pages/TwoFactorVerify'; // İki faktörlü doğrulama sayfasını import ediyoruz
import Home from './pages/Home';
import Profile from './pages/Profile';
import Reels from './pages/Reels'; // Uncommented this line
import Messages from './pages/Messages'; // Messages sayfasını import ettik
import SettingsPage from './pages/Settings/SettingsPage'; // Settings sayfasını import ediyoruz
import FollowRequestsPage from './pages/FollowRequestsPage'; // Takip istekleri sayfasını import ediyoruz
import Explore from './pages/Explore'; // Explore sayfasını import ediyoruz
import { ChatPanel } from './components/chat/ChatPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './context/NotificationContext'; // setNavigationHandler kaldırıldı
import NotificationPanel from './components/Notifications/NotificationPanel'; // NotificationPanel import edildi (yolunu düzelttim)
import { TOKEN_NAME } from './config/constants';
import RegisterPage from './pages/auth/RegisterPage'; // Import the RegisterPage
import notificationService from './services/notification-service'; // Bildirim servisini import ettik

// Korumalı Route bileşeni oluşturuyoruz
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  // Yükleme devam ediyorsa, henüz yönlendirme yapmayalım
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-pulse text-[#0affd9]">Yükleniyor...</div>
    </div>;
  }
  
  if (!token) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    return <Navigate to="/login" />;
  }
  
  return children;
};

// NotificationPanel bileşenini içeren bir wrapper bileşen
const NotificationPanelWrapper = () => {
  const { isPanelOpen, closePanel } = useNotification();
  return <NotificationPanel isOpen={isPanelOpen} onClose={closePanel} />;
};

// Notification Provider'ı Router içinde kullanmak için yeni bileşen
const AppWithNotifications = () => {
  const navigate = useNavigate();

  // Navigate fonksiyonunu NotificationContext'e aktar - artık bunu manuel olarak yapacağız
  useEffect(() => {
    // Global değişken ile iletişim kursunlar
    window.navigationHandler = navigate;
  }, [navigate]);

  return (
    <>
      <NotificationPanelWrapper /> { /* NotificationPanel wrapper ile render ediliyor */ }
      <Routes>
        {/* Ana sayfa için koruma ekledik */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        {/* Authentication routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterPage />} /> {/* Updated to use RegisterPage */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/two-factor-verify" element={<TwoFactorVerify />} /> {/* İki faktörlü doğrulama rotası eklendi */}
        
        {/* Bildirimler sayfası artık olmadığı için, /notifications rotasını ana sayfaya yönlendir */}
        <Route path="/notifications" element={<Navigate to="/" replace />} />
        
        <Route 
          path="/profile/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reels" 
          element={<Reels />} // Using Reels component without protection to test
        />
        {/* Mesajlar sayfası */}
        <Route 
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } 
        />
        {/* Belirli bir kullanıcı ile mesajlaşma */}
        <Route 
          path="/messages/:userId"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          } 
        />
        {/* Ayarlar sayfası */}
        <Route 
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />
        {/* Takip İstekleri sayfası */}
        <Route 
          path="/follow-requests"
          element={
            <ProtectedRoute>
              <FollowRequestsPage />
            </ProtectedRoute>
          } 
        />
        {/* Keşfet Sayfası */}
        <Route 
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <ChatPanel />
    </>
  );
};

function App() {
  // Sistem tercihine göre temayı başlatıyoruz
  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  
  // Sistem tema değişikliklerini dinliyoruz
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Bileşen kaldırıldığında dinleyiciyi temizliyoruz
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);
  
  // Temayı HTML kök elemanına uyguluyoruz
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <AuthProvider>
      <Router>
        <NotificationProvider>
          <AppWithNotifications />
        </NotificationProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
