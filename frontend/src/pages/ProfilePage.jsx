import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Tabs, message, Card, Empty } from 'antd';
import { PictureOutlined, PlayCircleOutlined, BookmarkOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import ProfileHeader from '../components/Profile/ProfileHeader';
import PostGrid from '../components/Profile/PostGrid';
import ReelsGrid from '../components/Profile/ReelsGrid';
import SavedPostsGrid from '../components/Profile/SavedPostsGrid';
import PrivateProfileView from '../components/Profile/PrivateProfileView';
import FollowButton from '../components/Profile/FollowButton';

const { TabPane } = Tabs;

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followStatus, setFollowStatus] = useState('none');
  const [canViewProfile, setCanViewProfile] = useState(false);
  
  // Profil verilerini yükle
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/profile/${username}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (response.data && response.data.success) {
          setProfile(response.data.data.user);
          // API'den kullanıcı takip durumu ve görüntüleme izni bilgisini al
          setFollowStatus(response.data.data.user.followStatus || 'none');
          setCanViewProfile(response.data.data.user.canViewProfile || false);
        } else {
          setError('Profil bilgileri alınamadı');
        }
      } catch (error) {
        console.error('Profil yüklenirken hata:', error);
        
        if (error.response && error.response.status === 404) {
          setError('Kullanıcı bulunamadı');
        } else {
          setError('Profil bilgileri yüklenirken bir sorun oluştu');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [username]);
  
  // Takip durumu değiştiğinde takip edilen durumunu güncelle
  const handleFollowStatusChange = (newStatus) => {
    setFollowStatus(newStatus);
    // Takip durumu gizli hesap görüntüleme iznini etkiler
    if (newStatus === 'following') {
      setCanViewProfile(true);
    } else if (newStatus === 'none' || newStatus === 'pending') {
      // Hesap gizliyse ve takip edilmiyorsa veya istek beklemedeyse profil görüntülenemez
      setCanViewProfile(profile && !profile.isPrivate);
    }
  };
  
  if (loading) {
    return (
      <div className="profile-loading-container">
        <Spin size="large" />
        <p>Profil yükleniyor...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="profile-error-container">
        <Empty 
          description={error}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }
  
  // Profil yoksa hata mesajı göster
  if (!profile) {
    return (
      <div className="profile-not-found">
        <Empty 
          description="Profil bulunamadı"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }
  
  // Gizli hesap ve takip edilmiyor/istek beklemede durumunda
  if (profile.isPrivate && !canViewProfile) {
    return <PrivateProfileView 
      profile={profile} 
      followStatus={followStatus} 
      onFollowStatusChange={handleFollowStatusChange} 
    />;
  }
  
  return (
    <div className="profile-page">
      <ProfileHeader 
        profile={profile} 
        followStatus={followStatus}
        onFollowStatusChange={handleFollowStatusChange}
      />
      
      <Card className="profile-content">
        <Tabs defaultActiveKey="posts">
          <TabPane 
            tab={
              <span>
                <PictureOutlined />
                Gönderiler
              </span>
            } 
            key="posts"
          >
            <PostGrid username={username} />
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <PlayCircleOutlined />
                Reels
              </span>
            } 
            key="reels"
          >
            <ReelsGrid username={username} />
          </TabPane>
          
          {/* Sadece kendi profilinde kayıtlı gönderileri göster */}
          {user && user.username === username && (
            <TabPane 
              tab={
                <span>
                  <BookmarkOutlined />
                  Kaydedilenler
                </span>
              } 
              key="saved"
            >
              <SavedPostsGrid />
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default ProfilePage; 