import React, { useState, useEffect } from 'react';
import { Button, message, Popconfirm } from 'antd';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { UserAddOutlined, UserDeleteOutlined, LoadingOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';

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
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/users/id/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.success && response.data.data) {
        setTargetUsername(response.data.data.username);
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri alınırken hata:', error);
    }
  };

  // Takip et veya takip isteği gönder
  const handleFollow = async () => {
    if (!targetUsername) {
      message.error('Kullanıcı adı bulunamadı. Lütfen sayfayı yenileyin.');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/user/follow/${targetUsername}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Takip cevabı:', response.data);

      // Önce API yanıtını kontrol et
      if (response.data && response.data.success) {
        // Backend'in döndürdüğü status değerini kullan
        const status = response.data.data?.status || 'none';
        
        if (status === 'following') {
          setFollowStatus('following');
          message.success(`Kullanıcıyı takip etmeye başladınız.`);
        } else if (status === 'pending') {
          setFollowStatus('pending');
          message.success(`Kullanıcıya takip isteği gönderildi.`);
        } else {
          // Mesaj içeriğine göre de değerlendirme yap (eski uyumluluk için)
          if (response.data.message.includes('takip edildi')) {
            setFollowStatus('following');
            message.success(`Kullanıcıyı takip etmeye başladınız.`);
          } else if (response.data.message.includes('istek gönderildi')) {
            setFollowStatus('pending');
            message.success(`Kullanıcıya takip isteği gönderildi.`);
          } else {
            // Genel başarı mesajı
            message.success(response.data.message || 'İşlem başarılı');
          }
        }
        
        // Parent komponenti bilgilendir
        if (onStatusChange) onStatusChange(status);
      } else {
        throw new Error(response.data?.message || 'Beklenmeyen API yanıtı');
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata:', error);
      message.error(error.response?.data?.message || error.message || 'Takip işlemi sırasında bir hata oluştu.');
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
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/user/follow/${targetUsername}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Takipten çıkma cevabı:', response.data);

      // API yanıtını kontrol et
      if (response.data && response.data.success) {
        setFollowStatus('none');
        message.success(response.data.message || `Kullanıcıyı takip etmeyi bıraktınız.`);
        
        // Parent komponenti bilgilendir
        if (onStatusChange) onStatusChange('none');
      } else {
        throw new Error(response.data?.message || 'Beklenmeyen API yanıtı');
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
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/user/follow-request/${targetUsername}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Takip isteği iptal cevabı:', response.data);

      // API yanıtını kontrol et
      if (response.data && response.data.success) {
        setFollowStatus('none');
        message.success(response.data.message || `Kullanıcıya gönderilen takip isteği iptal edildi.`);
        
        // Parent komponenti bilgilendir
        if (onStatusChange) onStatusChange('none');
      } else {
        throw new Error(response.data?.message || 'Beklenmeyen API yanıtı');
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