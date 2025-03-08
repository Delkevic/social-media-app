import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/home/LeftPanel';
import MainContent from '../components/home/MainContent';
import RightPanel from '../components/home/RightPanel';
import api from '../services/api';

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Kullanıcı oturum bilgilerini kontrol et
    const checkAuthAndFetchProfile = async () => {
      try {
        // Session veya localStorage'dan kullanıcı bilgilerini al
        const storedUser = JSON.parse(sessionStorage.getItem('user')) || JSON.parse(localStorage.getItem('user'));
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        if (!storedUser || !token) {
          navigate('/login');
          return;
        }
        
        // Başlangıçta storedUser'ı ata, böylece sayfa hemen render olur
        setUser(storedUser);
        
        // API'den güncel kullanıcı bilgilerini çek
        const response = await api.user.getProfile();
        
        if (response.success && response.data && response.data.user) {
          // Güncel kullanıcı bilgilerini state'e kaydet
          setUser(response.data.user);
          
          // Güncel kullanıcı bilgilerini storage'a da kaydet
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          } else {
            sessionStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
      } catch (err) {
        setError('Profil bilgileri yüklenirken bir hata oluştu: ' + err.message);
        
        // Kimlik doğrulama hatası varsa, oturumu kapat ve login sayfasına yönlendir
        if (err.message.includes('401') || err.message.includes('yetkisiz')) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthAndFetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--background-gradient)' }}>
        <div className="animate-spin h-12 w-12 border-4 rounded-full"
             style={{ 
               borderColor: 'var(--accent-red) transparent transparent transparent',
             }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col"
           style={{ background: 'var(--background-gradient)' }}>
        <div 
          className="p-6 rounded-lg max-w-md text-center"
          style={{
            backgroundColor: 'var(--background-card)',
            backdropFilter: 'var(--backdrop-blur)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--accent-red)' }}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Bir Hata Oluştu
          </h2>
          <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="py-2 px-4 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
            }}
          >
            Yeniden Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"
         style={{ background: 'var(--background-primary)' }}>
      <div className="container mx-auto flex flex-col lg:flex-row">
        {/* Sol Panel - Bildirimler ve Mesajlar */}
        <div className="w-full lg:w-1/4 p-4">
          <LeftPanel user={user} />
        </div>
        
        {/* Orta İçerik - Arama ve Gönderiler */}
        <div className="w-full lg:w-2/4 p-4">
          <MainContent user={user} />
        </div>
        
        {/* Sağ Panel - Profil ve Ayarlar */}
        <div className="w-full lg:w-1/4 p-4">
          <RightPanel user={user} />
        </div>
      </div>
    </div>
  );
};

export default Home;