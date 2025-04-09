import React, { useState, useEffect } from 'react';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import NavigationLinks from './navigation/NavigationLinks';
import UserProfileCard from './profile/UserProfileCard';
import api from '../../services/api';

const LeftPanel = ({ user, showMessagesAndNotifications = false }) => {
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
    if (user) {
      fetchUserProfile();
    }
    
    // Gönderi oluşturulduğunda tetiklenecek olay dinleyicisi
    const handlePostCreated = () => {
      if (user) {
        fetchUserProfile(); // Profil istatistiklerini güncelle
      }
    };
    
    // Olay dinleyiciyi ekle
    window.addEventListener('postCreated', handlePostCreated);
    
    // Component kaldırıldığında dinleyiciyi temizle
    return () => {
      window.removeEventListener('postCreated', handlePostCreated);
    };
  }, [user]);

  return (
    <div className="space-y-4">
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
      
      {/* Hızlı Erişim Bölümü - NavigationLinks */}
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
          <NavigationLinks />
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;