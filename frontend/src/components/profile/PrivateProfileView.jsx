import React from 'react';
import { Card, Typography, Button, Avatar, Space, Divider, Empty } from 'antd';
import { LockOutlined, UserAddOutlined, ClockCircleOutlined } from '@ant-design/icons';
import FollowButton from './FollowButton';

const { Title, Text, Paragraph } = Typography;

const PrivateProfileView = ({ profile, followStatus, onFollowStatusChange }) => {
  return (
    <Card className="private-profile-container">
      <div className="private-profile-header">
        <Space size="large" align="center">
          <Avatar 
            src={profile.profileImage || 'https://via.placeholder.com/120'} 
            size={120} 
            alt={`${profile.username} profil fotoğrafı`}
          />
          <div className="private-profile-info">
            <Title level={3}>
              {profile.fullName}
              {profile.isVerified && (
                <span className="verified-badge" title="Onaylanmış hesap">✓</span>
              )}
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>@{profile.username}</Text>
            
            <div className="profile-stats">
              <div className="stat-item">
                <Text strong>{profile.postCount}</Text>
                <Text type="secondary">Gönderi</Text>
              </div>
              <div className="stat-item">
                <Text strong>{profile.followerCount}</Text>
                <Text type="secondary">Takipçi</Text>
              </div>
              <div className="stat-item">
                <Text strong>{profile.followingCount}</Text>
                <Text type="secondary">Takip</Text>
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

      <Divider />

      <div className="private-profile-message">
        <LockOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 16 }} />
        <Title level={4}>Bu Hesap Gizli</Title>
        
        {followStatus === 'pending' ? (
          <Paragraph>
            <ClockCircleOutlined /> @{profile.username} kullanıcısına gönderdiğiniz takip isteği onay bekliyor.
            İsteğiniz kabul edildiğinde gönderilerini görüntüleyebileceksiniz.
          </Paragraph>
        ) : (
          <Paragraph>
            @{profile.username} kullanıcısının fotoğraflarını ve videolarını görmek için takip etmeniz gerekiyor.
          </Paragraph>
        )}
        
        <div className="profile-content-placeholder">
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Gönderiler gizlidir" 
          />
        </div>
      </div>
    </Card>
  );
};

export default PrivateProfileView; 