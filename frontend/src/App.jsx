// React ve React Router gerekli bileşenlerini içe aktarıyoruz
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Reels from './pages/Reels'; // Uncommented this line
import Messages from './pages/Messages'; // Messages sayfasını import ettik
import SettingsPage from './pages/Settings/SettingsPage'; // Settings sayfasını import ediyoruz
import { ChatPanel } from './components/chat/ChatPanel';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TOKEN_NAME } from './config/constants';

// Korumalı Route bileşeni oluşturuyoruz
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  // Yükleme devam ediyorsa, henüz yönlendirme yapmayalım
  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-pulse text-blue-400">Yükleniyor...</div>
    </div>;
  }
  
  if (!token) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  // Sistem tercihine göre temayı başlatıyoruz
  const [theme, setTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  
  // Sistem tema değişikliklerini dinliyoruz
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = (e) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Bileşen kaldırıldığında dinleyiciyi temizliyoruz
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);
  
  // Temayı HTML kök elemanına uyguluyoruz
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ana sayfa için koruma ekledik */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
        <ChatPanel />
      </Router>
    </AuthProvider>
  );
}

export default App;