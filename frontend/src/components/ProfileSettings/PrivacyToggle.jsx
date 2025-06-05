import React, { useState, useEffect } from 'react';
import { Switch, notification } from 'antd';
import { API_URL } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const PrivacyToggle = () => {
  const { user, setUser } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Kullanıcı bilgilerini al
  useEffect(() => {
    if (user) {
      console.log("PrivacyToggle useEffect - Kullanıcı bilgisi alındı:", user);
      console.log("PrivacyToggle useEffect - isPrivate değeri:", user.isPrivate);
      setIsPrivate(user.isPrivate || false);
    } else {
      console.log("PrivacyToggle useEffect - Kullanıcı bilgisi yok!");
    }
  }, [user]);

  // Gizlilik değişikliğini kaydet
  const handleToggleChange = async (checked) => {
    console.log("PrivacyToggle - Toggle değişikliği başlıyor:", checked);
    
    setLoading(true);
    try {
      console.log("PrivacyToggle - API isteği gönderiliyor:", checked);
      
      const response = await api.user.updatePrivacy(checked);

      console.log("PrivacyToggle - API yanıtı:", response);

      // Backend 'Response' yapısına uygun yanıt kontrolü
      if (response.success) {
        // Response.data.user içinde güncellenmiş kullanıcı bilgileri var
        const updatedUser = response.data?.user;
        
        if (updatedUser && updatedUser.isPrivate !== undefined) {
          console.log("PrivacyToggle - API'den gelen güncellenmiş isPrivate değeri:", updatedUser.isPrivate);
          // Backend'den gelen değeri kullan
          setIsPrivate(updatedUser.isPrivate);
          
          // Kullanıcı context'ini güncelle
          setUser((prevUser) => {
            if (!prevUser) {
              console.warn("PrivacyToggle - Önceki kullanıcı bilgisi yok!");
              return updatedUser;
            }
            
            console.log("PrivacyToggle - Önceki kullanıcı:", prevUser);
            const newUser = {
              ...prevUser,
              isPrivate: updatedUser.isPrivate,
            };
            console.log("PrivacyToggle - Güncellenmiş kullanıcı:", newUser);
            
            // Kullanıcı bilgilerini localStorage ve sessionStorage'da güncelleme
            const userStorage = JSON.stringify(newUser);
            if (localStorage.getItem('token')) {
              localStorage.setItem('user', userStorage);
              console.log("PrivacyToggle - localStorage güncellendi");
            }
            if (sessionStorage.getItem('token')) {
              sessionStorage.setItem('user', userStorage);
              console.log("PrivacyToggle - sessionStorage güncellendi");
            }
            
            return newUser;
          });
        } else {
          // API'den kullanıcı bilgisi dönmediyse, frontend değerini kullan
          console.log("PrivacyToggle - API'den kullanıcı bilgisi dönmedi, frontend değeri kullanılıyor:", checked);
          setIsPrivate(checked);
          
          setUser((prevUser) => {
            if (!prevUser) {
              console.warn("PrivacyToggle - Önceki kullanıcı bilgisi yok!");
              return { isPrivate: checked };
            }
            
            const updatedUser = {
              ...prevUser,
              isPrivate: checked,
            };
            
            // Kullanıcı bilgilerini localStorage ve sessionStorage'da güncelleme
            const userStorage = JSON.stringify(updatedUser);
            if (localStorage.getItem('token')) {
              localStorage.setItem('user', userStorage);
              console.log("PrivacyToggle - localStorage güncellendi");
            }
            if (sessionStorage.getItem('token')) {
              sessionStorage.setItem('user', userStorage);
              console.log("PrivacyToggle - sessionStorage güncellendi");
            }
            
            return updatedUser;
          });
        }
        
        notification.success({
          message: 'Gizlilik ayarı güncellendi',
          description: checked 
            ? 'Hesabınız artık gizli. Sadece takipçileriniz profilinizi görebilir.' 
            : 'Hesabınız artık herkese açık.',
        });
      } else {
        // Başarısız yanıt
        console.error('Gizlilik ayarı güncellenirken hata:', response.message);
        notification.error({
          message: 'Hata',
          description: response.message || 'Gizlilik ayarları güncellenirken bir sorun oluştu.',
        });
        // Hata durumunda eski değere geri dön
        setIsPrivate(!checked);
      }
    } catch (error) {
      console.error('Gizlilik ayarı güncellenirken hata:', error);
      
      notification.error({
        message: 'Hata',
        description: 'Gizlilik ayarları güncellenirken bir sorun oluştu.',
      });
      
      // Hata durumunda eski değere geri dön
      setIsPrivate(!checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="privacy-toggle-container">
      <div className="privacy-toggle-header">
        <h3>Gizli Hesap</h3>
        <Switch
          checked={isPrivate}
          onChange={handleToggleChange}
          loading={loading}
        />
      </div>
      <p className="privacy-toggle-description">
        {isPrivate
          ? 'Hesabınız gizli. Sadece onayladığınız takipçiler gönderilerinizi görebilir.'
          : 'Hesabınız herkese açık. Herkes profilinizi, gönderilerinizi ve hikayelerinizi görebilir.'}
      </p>
      <div className="privacy-info">
        <div className="privacy-info-item">
          <h4>Hesabınız gizli olduğunda:</h4>
          <ul>
            <li>Yeni takipçiler, takip etmek için sizden onay almalıdır</li>
            <li>Sadece takipçileriniz gönderilerinizi, hikayelerinizi görebilir</li>
            <li>Mevcut takipçileriniz etkilenmez</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrivacyToggle; 