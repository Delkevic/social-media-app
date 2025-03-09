import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import { HoverButton } from '../../components/ui/HoverButton';
import api from '../../services/api';
import UserProfileCard from './profile/UserProfileCard';

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
      
      {/* Reels Bölümü */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div 
          className="rounded-2xl p-4 backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          
          <HoverButton
            onClick={() => navigate('/reels')}
            className="w-full flex items-center justify-center"
            style={{
              "--circle-start": "#3b82f6", 
              "--circle-end": "#1e40af"
            }}
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            Reels
          </HoverButton>
        </div>
      </div>
      
      {/* Çıkış Butonu */}
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div
          className="rounded-2xl p-4 backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
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
    </div>
  );
};

export default RightPanel;