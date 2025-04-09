import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/home/LeftPanel';
import MainContent from '../components/home/MainContent';
import RightPanel from '../components/home/RightPanel';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import api from '../services/api';
import { motion } from 'framer-motion';
import { ChatPanel } from '../components/chat/ChatPanel';
import { API_URL } from '../config/constants';
import axios from 'axios';

// Utility function to convert boolean attributes to strings
const convertBooleanProps = (props) => {
  const result = { ...props };
  const attributesToConvert = ['jsx', 'global'];
  
  attributesToConvert.forEach(attr => {
    if (attr in result && typeof result[attr] === 'boolean') {
      result[attr] = result[attr].toString();
    }
  });
  
  return result;
};

const Home = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Animasyon varyantları
  const leftPanelVariants = {
    hidden: { x: -100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24,
        delay: 0.3
      } 
    }
  };

  const rightPanelVariants = {
    hidden: { x: 100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24,
        delay: 0.3
      } 
    }
  };

  const searchVariants = {
    hidden: { y: -50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24,
        delay: 0.2
      } 
    }
  };

  const contentVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 24,
        delay: 0.4
      } 
    }
  };

  useEffect(() => {
    // Kullanıcı oturum bilgilerini kontrol et
    const checkAuthAndFetchProfile = async () => {
      try {
        // Session veya localStorage'dan kullanıcı bilgilerini al
        const storedUser = JSON.parse(sessionStorage.getItem('user')) || JSON.parse(localStorage.getItem('user'));
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        
        // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
        if (!storedUser || !token) {
          navigate('/login');
          return;
        }
        
        // Başlangıçta storedUser'ı ata, böylece sayfa hemen render olur
        setUser(storedUser);
        
        // API'den güncel kullanıcı bilgilerini çek
        const response = await api.user.getProfile();
        
        if (response.success && response.data && response.data.user) {
          // Güncel kullanıcı bilgilerini state'e kaydet
          setUser(response.data.user);
          
          // Güncel kullanıcı bilgilerini storage'a da kaydet
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          } else {
            sessionStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
      } catch (err) {
        setError('Profil bilgileri yüklenirken bir hata oluştu: ' + err.message);
        
        // Kimlik doğrulama hatası varsa, oturumu kapat ve login sayfasına yönlendir
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
          {convertBooleanProps({
            component: <SparklesCore
              id="homeLoaderParticles"
              background="transparent"
              minSize={0.6}
              maxSize={1.4}
              particleDensity={70}
              className="w-full h-full"
              particleColor="#FFFFFF"
              speed={0.8}
              jsx="true"
              global="true"
            />
          }).component}
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
          {convertBooleanProps({
            component: <SparklesCore
              id="homeErrorParticles"
              background="transparent"
              minSize={0.6}
              maxSize={1.4}
              particleDensity={70}
              className="w-full h-full"
              particleColor="#FFFFFF"
              speed={0.5}
              jsx="true"
              global="true"
            />
          }).component}
        </div>
        
        {/* Radyal gradient maskesi */}
        <div 
          className="absolute inset-0 w-full h-full bg-slate-950 opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
          style={{ backdropFilter: "blur(3px)" }}
        ></div>
        
        <div className="relative z-10 max-w-md p-6 rounded-2xl" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <svg className="w-12 h-12 mx-auto mb-4" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-xl font-semibold text-center mb-2">Hata Oluştu</h2>
          <p className="text-center mb-4" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: '#3b82f6', color: 'white' }}
            >
              Tekrar Dene
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
        {convertBooleanProps({
          component: <SparklesCore
            id="homeBackgroundParticles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={50}
            className="w-full h-full"
            particleColor="#FFFFFF"
            speed={0.3}
            jsx="true"
            global="true"
          />
        }).component}
      </div>
      
      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-slate-950 opacity-95 [mask-image:radial-gradient(circle_at_center,transparent_10%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>
      
      <div className="container mx-auto relative z-10 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sol Panel - Profil Bilgileri - Soldan giriş */}
          <motion.div 
            className="w-full lg:w-1/4"
            variants={leftPanelVariants}
            initial="hidden"
            animate="visible"
          >
            <LeftPanel user={user} showMessagesAndNotifications={false} />
          </motion.div>
          
          {/* Orta İçerik - Arama ve Gönderiler - Arama yukarıdan, içerik aşağıdan giriş */}
          <div className="w-full lg:w-2/4">
            <motion.div
              variants={searchVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Arama Çubuğu - yukarıdan gelecek */}
              <div className="mb-4">
                <MainContent user={user} showSearchOnly={true} />
              </div>
            </motion.div>
            
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {/* İçerik - aşağıdan gelecek */}
              <MainContent user={user} hideSearch={true} />
            </motion.div>
          </div>
          
          {/* Sağ Panel - Mini Reels Oynatıcı - Sağdan giriş */}
          <motion.div 
            className="w-full lg:w-1/4"
            variants={rightPanelVariants}
            initial="hidden"
            animate="visible"
          >
            <RightPanel user={user} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;