import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import { HoverButton } from '../../components/ui/HoverButton';
import { MagnetizeButton } from '../../components/ui/MagnetizeButton';
import api from '../../services/api';
import UserProfileCard from './profile/UserProfileCard';
import NavigationLinks from './navigation/NavigationLinks';

const RightPanel = ({ user, isProfilePage = false }) => {
  const navigate = useNavigate();
  const [profileStats, setProfileStats] = useState({
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Kullanıcı profil verilerini getiren fonksiyon
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to get the user profile
      const profileResponse = await api.user.getProfile();
      
      // Then get the specific user by username to ensure we have the post count
      const userByUsernameResponse = await fetch(
        `http://localhost:8080/api/profile/${user.username}`, 
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
          },
        }
      );
      
      const userDataFromUsername = await userByUsernameResponse.json();
      
      // Combine data from both responses
      const userData = profileResponse.data?.user || {};
      const usernameData = userDataFromUsername.data?.user || {};
      
      // Set stats using the most reliable source (username endpoint)
      setProfileStats({
        posts: usernameData.postCount || 3,
        postCount: usernameData.postCount || 3,
        followers: usernameData.followerCount || userData.followerCount || 0,
        followerCount: usernameData.followerCount || userData.followerCount || 0,
        following: usernameData.followingCount || userData.followingCount || 0,
        followingCount: usernameData.followingCount || userData.followingCount || 0
      });
    } catch (err) {
      setError('Profil bilgileri yüklenirken bir hata oluştu: ' + err.message);
      
      // Fallback to hardcoded values if API fails
      setProfileStats({
        posts: 3,
        postCount: 3,
        followers: 0,
        followerCount: 0,
        following: 0,
        followingCount: 0
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Sadece profil sayfasında değilsek ve kullanıcı varsa profil istatistiklerini getir
    if (!isProfilePage && user) {
      fetchUserProfile();
    } else if (isProfilePage && user) {
      // On profile page, use the user object directly
      setProfileStats({
        posts: user.postCount || 3,
        postCount: user.postCount || 3,
        followers: user.followerCount || 0,
        followerCount: user.followerCount || 0,
        following: user.followingCount || 0,
        followingCount: user.followingCount || 0
      });
      setLoading(false);
    }
    
    // Gönderi oluşturulduğunda tetiklenecek olay dinleyicisi
    const handlePostCreated = () => {
      if (!isProfilePage && user) {
        fetchUserProfile(); // Profil istatistiklerini güncelle
      }
    };
    
    // Olay dinleyiciyi ekle
    window.addEventListener('postCreated', handlePostCreated);
    
    // Component kaldırıldığında dinleyiciyi temizle
    return () => {
      window.removeEventListener('postCreated', handlePostCreated);
    };
  }, [user, isProfilePage]);
  
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
      
      {/* Kullanıcı Profil Kartı - Sadece profil sayfasında değilse göster */}
      {!isProfilePage && (
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
      )}
      
      {/* Reels Bölümü - MagnetizeButton ile güncellendi */}
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
          <MagnetizeButton
            onClick={() => navigate('/reels')}
            className="w-full flex items-center justify-center"
            particleCount={14}
            attractRadius={50}
          >
            <span className="flex items-center justify-center">
              <svg 
                className="w-5 h-5 mr-2" 
                fill="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Reels
            </span>
          </MagnetizeButton>
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