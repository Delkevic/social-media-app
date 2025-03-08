import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/home/LeftPanel';
import MainContent from '../components/home/MainContent';
import RightPanel from '../components/home/RightPanel';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
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
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        {/* Sparkles arkaplan */}
        <div className="w-full absolute inset-0 h-screen">
          <SparklesCore
            id="homeLoaderParticles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={70}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={0.8}
          />
        </div>
        
        {/* Radyal gradient maskesi */}
        <div 
          className="absolute inset-0 w-full h-full bg-slate-950 opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
          style={{ backdropFilter: "blur(3px)" }}
        ></div>
        
        <div className="relative z-10">
          <div className="animate-spin h-12 w-12 border-4 rounded-full border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        {/* Sparkles arkaplan */}
        <div className="w-full absolute inset-0 h-screen">
          <SparklesCore
            id="homeErrorParticles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={70}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={0.5}
          />
        </div>
        
        {/* Radyal gradient maskesi */}
        <div 
          className="absolute inset-0 w-full h-full bg-slate-950 opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
          style={{ backdropFilter: "blur(3px)" }}
        ></div>
        
        <div className="relative z-10 max-w-md">
          <div 
            className="relative p-6 rounded-2xl backdrop-blur-lg"
            style={{
              backgroundColor: "rgba(20, 24, 36, 0.7)",
              boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            {/* Hata paneli için GlowingEffect */}
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            
            <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <h2 className="text-xl font-bold mb-2 text-white">
              Bir Hata Oluştu
            </h2>
            <p className="mb-4 text-blue-100">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="py-2 px-4 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Sparkles arkaplan */}
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="homeBackgroundParticles"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor="#FFFFFF"
          speed={0.3}
        />
      </div>
      
      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-slate-950 opacity-95 [mask-image:radial-gradient(circle_at_center,transparent_10%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>
      
      <div className="container mx-auto relative z-10 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sol Panel - Bildirimler ve Mesajlar */}
          <div className="w-full lg:w-1/4">
            <LeftPanel user={user} />
          </div>
          
          {/* Orta İçerik - Arama ve Gönderiler */}
          <div className="w-full lg:w-2/4">
            <MainContent user={user} />
          </div>
          
          {/* Sağ Panel - Profil ve Ayarlar */}
          <div className="w-full lg:w-1/4">
            <RightPanel user={user} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;