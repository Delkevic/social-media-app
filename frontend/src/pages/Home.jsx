import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Session veya localStorage'dan kullanıcı bilgilerini al
    const storedUser = JSON.parse(sessionStorage.getItem('user')) || JSON.parse(localStorage.getItem('user'));
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    // Kullanıcı bilgilerini state'e kaydet
    setUser(storedUser);
    setLoading(false);

    // Opsiyonel: Token'ın geçerliliğini kontrol et
    const verifyToken = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/user', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Token geçersizse oturumu temizle ve login sayfasına yönlendir
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } catch (error) {
        console.error('Token doğrulama hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: 'var(--background-gradient)' }}>
        <div className="animate-spin h-12 w-12 border-4 rounded-full"
             style={{ 
               borderColor: 'var(--accent-blue) transparent transparent transparent',
             }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen"
         style={{ background: 'var(--background-gradient)' }}>
      <div className="container mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
            BUZZIFY
          </h1>
          <div className="flex items-center gap-4">
            <button 
              className="py-2 px-4 rounded-lg"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => {
                // Çıkış işlemi
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
              }}
            >
              Çıkış Yap
            </button>
          </div>
        </header>

        <div 
          className="rounded-2xl p-6 mb-6"
          style={{
            backgroundColor: 'var(--background-card)',
            backdropFilter: 'var(--backdrop-blur)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {user.username || 'Kullanıcı'}
              </h2>
              <p style={{ color: 'var(--text-tertiary)' }}>
                {user.email || 'E-posta bilgisi yok'}
              </p>
            </div>
          </div>
          
          <p style={{ color: 'var(--text-secondary)' }}>
            Hoş geldiniz! Bu, Buzzify uygulamasının ana sayfasıdır. Profilinizi güncellemek veya paylaşım yapmak 
            için gerekli özellikleri ekleyebilirsiniz.
          </p>
        </div>
        
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--background-card)',
            backdropFilter: 'var(--backdrop-blur)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Yakında Gelecek Özellikler
          </h3>
          <ul className="space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>• Gönderi paylaşma ve beğenme</li>
            <li>• Kullanıcıları takip etme</li>
            <li>• Profil düzenleme</li>
            <li>• Bildirimler</li>
            <li>• Mesajlaşma</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;