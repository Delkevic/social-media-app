import React from 'react';
import { Avatar, Typography, Space, Divider, Row, Col, Button } from 'antd';
import { SettingOutlined, MessageOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FollowButton from '../Profile/FollowButton';
import { API_BASE_URL } from '../../config/constants';

const { Title, Text, Paragraph } = Typography;

const ProfileHeader = ({ profile, followStatus, onFollowStatusChange }) => {
  const { user } = useAuth();
  const isOwnProfile = user && user.username === profile.username;

  return (
    <div className="profile-header bg-black/70 rounded-xl border border-[#0affd9]/20 p-6 backdrop-blur-sm">
      <Row gutter={[24, 20]} align="middle">
        <Col xs={24} sm={8} md={6} className="profile-avatar-container">
          <Avatar
            src={profile.profileImage ? `${API_BASE_URL}/${profile.profileImage}` : `${API_BASE_URL}/uploads/images/no-image.jpg`}
            size={150}
            alt={`${profile.username} profil fotoğrafı`}
            style={{ 
              border: '3px solid rgba(10, 255, 217, 0.3)',
              boxShadow: '0 0 10px rgba(10, 255, 217, 0.2)'
            }}
          />
        </Col>
        
        <Col xs={24} sm={16} md={18} className="profile-info-container">
          <div className="profile-info-header">
            <Title level={3} style={{ marginBottom: 0, color: 'white' }}>
              {profile.fullName}
              {profile.isVerified && (
                <span className="verified-badge" title="Onaylanmış hesap" style={{ color: '#0affd9', marginLeft: '8px' }}>✓</span>
              )}
            </Title>
            
            <div className="profile-actions" style={{ marginTop: '12px' }}>
              {isOwnProfile ? (
                <>
                  <Link to="/settings/profile">
                    <Button 
                      icon={<SettingOutlined />} 
                      style={{ 
                        background: 'rgba(10, 255, 217, 0.1)', 
                        borderColor: '#0affd9', 
                        color: '#0affd9' 
                      }}
                      className="hover:bg-[#0affd9]/20"
                    >
                      Profili Düzenle
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <FollowButton
                    username={profile.username}
                    initialFollowStatus={followStatus}
                    onStatusChange={onFollowStatusChange}
                  />
                  
                  {followStatus === 'following' && (
                    <Link to={`/messages/${profile.username}`}>
                      <Button 
                        icon={<MessageOutlined />} 
                        style={{ 
                          background: 'rgba(10, 255, 217, 0.1)', 
                          borderColor: '#0affd9', 
                          color: '#0affd9',
                          marginLeft: '8px'
                        }}
                        className="hover:bg-[#0affd9]/20"
                      >
                        Mesaj
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="profile-stats" style={{ display: 'flex', gap: '28px', marginTop: '20px' }}>
            <div className="stat-item" style={{ textAlign: 'center' }}>
              <Text strong style={{ color: 'white', fontSize: '18px', display: 'block' }}>{profile.postCount}</Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Gönderi</Text>
            </div>
            <div className="stat-item" style={{ textAlign: 'center' }}>
              <Link to={`/profile/${profile.username}/followers`} className="hover:text-[#0affd9]">
                <Text strong style={{ color: 'white', fontSize: '18px', display: 'block' }}>{profile.followerCount}</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Takipçi</Text>
              </Link>
            </div>
            <div className="stat-item" style={{ textAlign: 'center' }}>
              <Link to={`/profile/${profile.username}/following`} className="hover:text-[#0affd9]">
                <Text strong style={{ color: 'white', fontSize: '18px', display: 'block' }}>{profile.followingCount}</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Takip</Text>
              </Link>
            </div>
          </div>
          
          {profile.bio && (
            <Paragraph className="profile-bio" style={{ color: 'white', marginTop: '16px' }}>{profile.bio}</Paragraph>
          )}
          
          {profile.website && (
            <Paragraph className="profile-website" style={{ marginTop: '8px' }}>
              <a 
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                 target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0affd9', textDecoration: 'none' }}
                className="hover:text-white hover:underline"
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </Paragraph>
          )}
          
          {profile.location && (
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }} className="profile-location">
              {profile.location}
            </Text>
          )}
          
          {profile.isPrivate && (
            <div className="profile-privacy-badge" style={{ marginTop: '12px', display: 'inline-block', padding: '4px 10px', background: 'rgba(10, 255, 217, 0.1)', borderRadius: '4px' }}>
              <Text style={{ color: '#0affd9' }}>
                <span role="img" aria-label="Kilit">🔒</span> Gizli Hesap
              </Text>
            </div>
          )}
        </Col>
      </Row>
      
      <Divider style={{ margin: '20px 0', borderColor: 'rgba(10, 255, 217, 0.2)' }} />
    </div>
  );
};

export default ProfileHeader; 