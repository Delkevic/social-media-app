import React, { useState, useEffect } from 'react';
import { Button, message, Popconfirm } from 'antd';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { UserAddOutlined, UserDeleteOutlined, LoadingOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../services/api';

const FollowButton = ({ userId, username, initialFollowStatus, onStatusChange }) => {
  const [followStatus, setFollowStatus] = useState(initialFollowStatus || 'none');
  const [loading, setLoading] = useState(false);

  // Username olmadığında userId'den username sorgulama için useEffect ekleyelim
  const [targetUsername, setTargetUsername] = useState(username || '');

  useEffect(() => {
    // Eğer username prop'u verildiyse, onu kullan
    if (username) {
      setTargetUsername(username);
      return;
    }
    
    // Username verilmediyse ve userId varsa, kullanıcı bilgilerini al
    if (userId && !targetUsername) {
      fetchUserInfo();
    }
  }, [userId, username]);

  // Kullanıcı bilgilerini getir
  const fetchUserInfo = async () => {
    try {
      const response = await api.user.getUserById(userId);
      
      if (response.success && response.data) {
        setTargetUsername(response.data.username);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri alınırken hata:', error);
    }
  };

  // Takip et veya takip isteği gönder
  const handleFollow = async () => {
    setLoading(true);
    try {
      const response = await api.user.follow(targetUsername || username || userId);
      console.log('Takip yanıtı:', response);
      
      if (response.success) {
        // API yanıtında status bilgisini kullan
        const newStatus = response.data?.status || 'following';
        setFollowStatus(newStatus);
        onStatusChange?.(newStatus);
        
        // API'den gelen mesajı veya varsayılan mesajı göster
        message.success(
          newStatus === 'pending' 
            ? response.message || 'Takip isteği gönderildi'
            : response.message || 'Kullanıcıyı takip ediyorsunuz'
        );
      } else {
        message.error(response.message || 'Takip işlemi başarısız oldu');
      }
    } catch (error) {
      console.error('Takip işlemi hatası:', error);
      message.error('Takip işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Takipten çık
  const handleUnfollow = async () => {
    if (!targetUsername) {
      message.error('Kullanıcı adı bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.user.unfollow(targetUsername);
      console.log('Takipten çıkma cevabı:', response);

      if (response.success) {
        setFollowStatus('none');
        message.success(response.message || `Kullanıcıyı takip etmeyi bıraktınız.`);
        
        if (onStatusChange) onStatusChange('none');
      } else {
        throw new Error(response.message || 'Beklenmeyen API yanıtı');
      }
    } catch (error) {
      console.error('Takipten çıkma sırasında hata:', error);
      message.error(error.response?.data?.message || error.message || 'Takipten çıkma sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Takip isteğini iptal et
  const handleCancelRequest = async () => {
    if (!targetUsername) {
      message.error('Kullanıcı adı bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.user.cancelFollowRequest(targetUsername);
      console.log('Takip isteği iptal cevabı:', response);

      if (response.success) {
        setFollowStatus('none');
        message.success(response.message || `Kullanıcıya gönderilen takip isteği iptal edildi.`);
        
        if (onStatusChange) onStatusChange('none');
      } else {
        throw new Error(response.message || 'Beklenmeyen API yanıtı');
      }
    } catch (error) {
      console.error('Takip isteği iptal sırasında hata:', error);
      message.error(error.response?.data?.message || error.message || 'Takip isteği iptal edilirken bir hata oluştu.');
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
        overlayStyle={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          borderColor: 'rgba(10, 255, 217, 0.3)' 
        }}
        okButtonProps={{ 
          style: { backgroundColor: '#0affd9', borderColor: '#0affd9', color: 'black' } 
        }}
        cancelButtonProps={{ 
          style: { borderColor: '#0affd9', color: '#0affd9' } 
        }}
      >
        <Button 
          type="primary" 
          ghost
          icon={loading ? <LoadingOutlined /> : <CheckOutlined />}
          loading={loading}
          style={{ 
            borderColor: '#0affd9', 
            color: '#0affd9',
            backgroundColor: 'rgba(10, 255, 217, 0.1)'
          }}
          className="hover:bg-[#0affd9]/20 hover:text-white"
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
        style={{ 
          borderColor: '#0affd9', 
          color: '#0affd9',
          backgroundColor: 'rgba(10, 255, 217, 0.05)',
          borderStyle: 'dashed'
        }}
        className="hover:bg-[#0affd9]/20 hover:text-white"
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
      style={{ 
        backgroundColor: '#0affd9', 
        borderColor: '#0affd9',
        color: 'black'
      }}
      className="hover:bg-[#0affd9]/80"
    >
      Takip Et
    </Button>
  );
};

export default FollowButton; 