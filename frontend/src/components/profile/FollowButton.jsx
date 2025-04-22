import React, { useState } from 'react';
import { Button, message, Popconfirm } from 'antd';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { UserAddOutlined, UserDeleteOutlined, LoadingOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';

const FollowButton = ({ userId, username, initialFollowStatus, onStatusChange }) => {
  const [followStatus, setFollowStatus] = useState(initialFollowStatus || 'none');
  const [loading, setLoading] = useState(false);

  // Takip et veya takip isteği gönder
  const handleFollow = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/user/follow/${username}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Başarı mesajında "takip edildi" veya "istek gönderildi" durumunu kontrol et
      if (response.data.message.includes('takip edildi')) {
        setFollowStatus('following');
        message.success(`${username} kullanıcısını takip etmeye başladınız.`);
        // Parent komponenti bilgilendir
        if (onStatusChange) onStatusChange('following');
      } else if (response.data.message.includes('istek gönderildi')) {
        setFollowStatus('pending');
        message.success(`${username} kullanıcısına takip isteği gönderildi.`);
        // Parent komponenti bilgilendir
        if (onStatusChange) onStatusChange('pending');
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata:', error);
      message.error('Takip işlemi sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Takipten çık
  const handleUnfollow = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/user/follow/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFollowStatus('none');
      message.success(`${username} kullanıcısını takip etmeyi bıraktınız.`);
      // Parent komponenti bilgilendir
      if (onStatusChange) onStatusChange('none');
    } catch (error) {
      console.error('Takipten çıkma sırasında hata:', error);
      message.error('Takipten çıkma sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Takip isteğini iptal et
  const handleCancelRequest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/user/follow-request/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFollowStatus('none');
      message.success(`${username} kullanıcısına gönderilen takip isteği iptal edildi.`);
      // Parent komponenti bilgilendir
      if (onStatusChange) onStatusChange('none');
    } catch (error) {
      console.error('Takip isteği iptal sırasında hata:', error);
      message.error('Takip isteği iptal edilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Duruma göre buton renderla
  if (followStatus === 'self') {
    return null; // Kendi profili için buton gösterme
  }

  if (followStatus === 'following') {
    return (
      <Popconfirm
        title="Takibi bırakmak istediğinize emin misiniz?"
        onConfirm={handleUnfollow}
        okText="Evet"
        cancelText="Hayır"
        disabled={loading}
      >
        <Button 
          type="primary" 
          ghost
          icon={loading ? <LoadingOutlined /> : <CheckOutlined />}
          loading={loading}
        >
          Takip Ediliyor
        </Button>
      </Popconfirm>
    );
  }

  if (followStatus === 'pending') {
    return (
      <Button
        type="dashed"
        icon={loading ? <LoadingOutlined /> : <ClockCircleOutlined />}
        onClick={handleCancelRequest}
        loading={loading}
      >
        İstek Gönderildi
      </Button>
    );
  }

  // Takip etmiyorsa
  return (
    <Button
      type="primary"
      icon={loading ? <LoadingOutlined /> : <UserAddOutlined />}
      onClick={handleFollow}
      loading={loading}
    >
      Takip Et
    </Button>
  );
};

export default FollowButton; 