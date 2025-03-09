// React ve React Router gerekli bileşenlerini içe aktarıyoruz
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';

// Korumalı Route bileşeni oluşturuyoruz
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('token') || localStorage.getItem('token');
  
  if (!isAuthenticated) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    return <Navigate to="/login" />;
  }
  
  return children;
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
    <Router>
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Profil sayfası için username parametresi ekledik */}
        <Route 
          path="/profile/:username" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;