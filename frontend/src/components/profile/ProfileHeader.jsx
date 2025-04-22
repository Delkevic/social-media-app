import React from 'react';
import { Avatar, Typography, Space, Divider, Row, Col, Button } from 'antd';
import { SettingOutlined, MessageOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FollowButton from './FollowButton';

const { Title, Text, Paragraph } = Typography;

const ProfileHeader = ({ profile, followStatus, onFollowStatusChange }) => {
  const { user } = useAuth();
  const isOwnProfile = user && user.username === profile.username;

  return (
    <div className="profile-header">
      <Row gutter={[24, 20]} align="middle">
        <Col xs={24} sm={8} md={6} className="profile-avatar-container">
          <Avatar
            src={profile.profileImage || 'https://via.placeholder.com/150'}
            size={150}
            alt={`${profile.username} profil fotoğrafı`}
          />
        </Col>
        
        <Col xs={24} sm={16} md={18} className="profile-info-container">
          <div className="profile-info-header">
            <Title level={3} style={{ marginBottom: 0 }}>
              {profile.fullName}
              {profile.isVerified && (
                <span className="verified-badge" title="Onaylanmış hesap">✓</span>
              )}
            </Title>
            
            <div className="profile-actions">
              {isOwnProfile ? (
                <>
                  <Link to="/settings/profile">
                    <Button icon={<SettingOutlined />}>Profili Düzenle</Button>
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
                      <Button icon={<MessageOutlined />}>Mesaj</Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="profile-stats">
            <div className="stat-item">
              <Text strong>{profile.postCount}</Text>
              <Text type="secondary">Gönderi</Text>
            </div>
            <div className="stat-item">
              <Link to={`/profile/${profile.username}/followers`}>
                <Text strong>{profile.followerCount}</Text>
                <Text type="secondary">Takipçi</Text>
              </Link>
            </div>
            <div className="stat-item">
              <Link to={`/profile/${profile.username}/following`}>
                <Text strong>{profile.followingCount}</Text>
                <Text type="secondary">Takip</Text>
              </Link>
            </div>
          </div>
          
          {profile.bio && (
            <Paragraph className="profile-bio">{profile.bio}</Paragraph>
          )}
          
          {profile.website && (
            <Paragraph className="profile-website">
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                 target="_blank" 
                 rel="noopener noreferrer">
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            </Paragraph>
          )}
          
          {profile.location && (
            <Text type="secondary" className="profile-location">
              {profile.location}
            </Text>
          )}
          
          {profile.isPrivate && (
            <div className="profile-privacy-badge">
              <Text type="secondary">
                <span role="img" aria-label="Kilit">🔒</span> Gizli Hesap
              </Text>
            </div>
          )}
        </Col>
      </Row>
      
      <Divider style={{ margin: '20px 0' }} />
    </div>
  );
};

export default ProfileHeader; 