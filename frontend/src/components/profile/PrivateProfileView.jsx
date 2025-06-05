import React from 'react';
import { Card, Typography, Avatar, Space, Divider, Empty } from 'antd';
import { LockOutlined, ClockCircleOutlined } from '@ant-design/icons';
import FollowButton from '../Profile/FollowButton';
import { API_BASE_URL } from '../../config/constants';

const { Title, Text, Paragraph } = Typography;

const PrivateProfileView = ({ profile, followStatus, onFollowStatusChange }) => {
  return (
    <Card 
      className="private-profile-container" 
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.7)', 
        borderColor: 'rgba(10, 255, 217, 0.2)',
        color: 'white',
        boxShadow: '0 4px 12px rgba(10, 255, 217, 0.1)'
      }}
    >
      <div className="private-profile-header">
        <Space size="large" align="center">
          <Avatar 
            src={profile.profileImage ? `${API_BASE_URL}/${profile.profileImage}` : `${API_BASE_URL}/uploads/images/no-image.jpg`} 
            size={120} 
            alt={`${profile.username} profil fotoğrafı`}
            style={{ border: '2px solid rgba(10, 255, 217, 0.3)' }}
          />
          <div className="private-profile-info">
            <Title level={3} style={{ color: 'white', margin: 0 }}>
              {profile.fullName}
              {profile.isVerified && (
                <span className="verified-badge" title="Onaylanmış hesap" style={{ color: '#0affd9', marginLeft: '8px' }}>✓</span>
              )}
            </Title>
            <Text style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.65)' }}>@{profile.username}</Text>
            
            <div className="profile-stats" style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <div className="stat-item">
                <Text strong style={{ color: 'white' }}>{profile.postCount}</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Gönderi</Text>
              </div>
              <div className="stat-item">
                <Text strong style={{ color: 'white' }}>{profile.followerCount}</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Takipçi</Text>
              </div>
              <div className="stat-item">
                <Text strong style={{ color: 'white' }}>{profile.followingCount}</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>Takip</Text>
              </div>
            </div>
          </div>
        </Space>
      </div>

      <div className="follow-button-container" style={{ marginTop: 16 }}>
        <FollowButton 
          username={profile.username} 
          initialFollowStatus={followStatus}
          onStatusChange={onFollowStatusChange}
        />
      </div>

      <Divider style={{ borderColor: 'rgba(10, 255, 217, 0.2)' }} />

      <div className="private-profile-message" style={{ textAlign: 'center', padding: '24px 0' }}>
        <LockOutlined style={{ fontSize: 48, color: '#0affd9', marginBottom: 16 }} />
        <Title level={4} style={{ color: 'white' }}>Bu Hesap Gizli</Title>
        
        {followStatus === 'pending' ? (
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            <ClockCircleOutlined style={{ color: '#0affd9' }} /> @{profile.username} kullanıcısına gönderdiğiniz takip isteği onay bekliyor.
            İsteğiniz kabul edildiğinde gönderilerini görüntüleyebileceksiniz.
          </Paragraph>
        ) : (
          <Paragraph style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            @{profile.username} kullanıcısının fotoğraflarını ve videolarını görmek için takip etmeniz gerekiyor.
          </Paragraph>
        )}
        
        <div className="profile-content-placeholder" style={{ marginTop: '24px' }}>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Gönderiler gizlidir</span>} 
            imageStyle={{ opacity: 0.5 }}
          />
        </div>
      </div>
    </Card>
  );
};

export default PrivateProfileView; 