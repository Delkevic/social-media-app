import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import { HoverButton } from '../../components/ui/HoverButton';
import api from '../../services/api';
import UserProfileCard from './profile/UserProfileCard';
import NavigationLinks from './navigation/ NavigationLinks';

const RightPanel = ({ user }) => {
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState({
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Kullanıcı profilini ve istatistiklerini getir
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.user.getProfile();
        
        if (response.success && response.data && response.data.user) {
          // Profil istatistiklerini ayarla
          setProfileStats({
            postCount: response.data.user.postCount || 0,
            followerCount: response.data.user.followerCount || 0,
            followingCount: response.data.user.followingCount || 0
          });
        }
      } catch (err) {
        setError('Profil bilgileri yüklenirken bir hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user.id]);
  
  const handleLogout = () => {
    // Çıkış işlemi
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  return (
    <div className="space-y-4">
      {/* Hata mesajı */}
      {error && (
        <div 
          className="p-3 rounded-lg text-sm border text-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            borderColor: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}
      
      {/* Kullanıcı Profil Kartı */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <UserProfileCard
          user={user}
          stats={profileStats}
          loading={loading}
        />
      </div>
      
      {/* Navigasyon Bağlantıları */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <NavigationLinks />
      </div>
      
      {/* Çıkış Butonu */}
      <div
        className="relative rounded-2xl overflow-hidden p-4 backdrop-blur-lg"
        style={{
          backgroundColor: "rgba(20, 24, 36, 0.7)",
          boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}
      >
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        
        <HoverButton
          onClick={handleLogout}
          className="w-full flex items-center justify-center"
          style={{
            "--circle-start": "#3b82f6", 
            "--circle-end": "#1e40af"
          }}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            ></path>
          </svg>
          Çıkış Yap
        </HoverButton>
      </div>
    </div>
  );
};

export default RightPanel;