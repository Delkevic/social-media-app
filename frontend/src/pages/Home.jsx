import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftPanel from '../components/home/LeftPanel';
import MainContent from '../components/home/MainContent';
import RightPanel from '../components/home/RightPanel';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import api from '../services/api';
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // localStorage'dan openPostForm bayrağını kontrol et
    const openPostForm = localStorage.getItem('openPostForm');
    if (openPostForm === 'true') {
      setShowCreateForm(true);
      // Bayrağı temizle
      localStorage.removeItem('openPostForm');
    }
  }, []);

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
        } else {
          // Eğer API'den kullanıcı bilgisi alınamazsa ama token varsa, eski bilgiyi kullanmaya devam et
          // Bu senaryoda bir hata loglayabilir veya kullanıcıya bilgi verebiliriz
          console.warn("API'den güncel profil alınamadı, local storage verisi kullanılacak.");
          if (!storedUser) { // Eğer local storage'da da kullanıcı yoksa logout
             throw new Error("Kullanıcı bilgisi bulunamadı.");
          }
        }
      } catch (err) {
        setError('Profil bilgileri yüklenirken bir hata oluştu: ' + err.message);
        console.error("Auth/Profil Hatası:", err);
        
        // Kimlik doğrulama hatası varsa veya kullanıcı bilgisi hiç yoksa
        if (err.message.includes('401') || err.message.includes('yetkisiz') || err.message.includes('bulunamadı')) {
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
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
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
              particleColor="#0affd9"
              speed={0.8}
              jsx="true"
              global="true"
            />
          }).component}
        </div>
        
        {/* Radyal gradient maskesi */}
        <div 
          className="absolute inset-0 w-full h-full bg-black opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
          style={{ backdropFilter: "blur(3px)" }}
        ></div>
        
        <div className="relative z-10">
          <div className="animate-spin h-12 w-12 border-4 rounded-full border-t-[#0affd9] border-r-transparent border-b-transparent border-l-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-black">
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
              particleColor="#0affd9"
              speed={0.5}
              jsx="true"
              global="true"
            />
          }).component}
        </div>
        
        {/* Radyal gradient maskesi */}
        <div 
          className="absolute inset-0 w-full h-full bg-black opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
          style={{ backdropFilter: "blur(3px)" }}
        ></div>
        
        <div className="relative z-10 max-w-md p-6 rounded-2xl bg-black/70 border border-[#0affd9]/20 backdrop-blur-lg">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h2 className="text-xl font-semibold text-center mb-2 text-white">Hata Oluştu</h2>
          <p className="text-center mb-4 text-gray-300">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-[#0affd9] text-black hover:bg-[#0affd9]/80"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-black text-white">
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
            particleColor="#0affd9"
            speed={0.3}
            jsx="true"
            global="true"
          />
        }).component}
      </div>
      
      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-black opacity-95 [mask-image:radial-gradient(circle_at_center,transparent_10%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>
      
      <div className="container mx-auto relative z-10 p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sol Panel */}
          <div className="w-full lg:w-1/4 lg:sticky lg:top-4 self-start">
            <LeftPanel user={user} showMessagesAndNotifications={true} onPostFormToggle={setShowCreateForm} /> 
          </div>
          
          {/* Orta İçerik */}
          <div className="w-full lg:w-2/4 space-y-6">
             {/* MainContent bileşenine hideSearch prop'unu geçirme */}
            <MainContent user={user} showCreateForm={showCreateForm} setShowCreateForm={setShowCreateForm} /> 
          </div>
          
          {/* Sağ Panel */}
          <div className="w-full lg:w-1/4 lg:sticky lg:top-4 self-start">
            <RightPanel user={user} /> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;