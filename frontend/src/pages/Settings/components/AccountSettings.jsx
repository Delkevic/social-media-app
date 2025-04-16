import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const AccountSettings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
  // Giriş aktiviteleri için state'ler
  const [loginActivities, setLoginActivities] = useState([]); 
  const [loginActivityLoading, setLoginActivityLoading] = useState(true);
  const [loginActivityError, setLoginActivityError] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setLoginActivityLoading(true);
      try {
        // Kullanıcı profilini getir
        const profileResponse = await api.user.getProfile();
        if (profileResponse.success && profileResponse.data && profileResponse.data.user) {
          const apiUser = profileResponse.data.user;
          setUserData(apiUser);
          setUsername(apiUser.username || '');
          setEmail(apiUser.email || '');
          setPhone(apiUser.phone || '');
        } else {
          setError('Kullanıcı bilgileri alınamadı.');
        }

        // Giriş aktivitelerini getir
        const activityResponse = await api.user.getLoginActivities();
        if (activityResponse.success && Array.isArray(activityResponse.data)) {
          setLoginActivities(activityResponse.data);
        } else {
          setLoginActivityError('Giriş aktiviteleri alınamadı.');
          console.error('Giriş aktiviteleri API hatası:', activityResponse.message);
        }

      } catch (err) {
        console.error('Ayarlar sayfası verileri yüklenirken hata:', err);
        setError('Veriler yüklenirken bir hata oluştu.');
        setLoginActivityError('Giriş aktiviteleri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
        setLoginActivityLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const showStatusMessage = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showStatusMessage('error', 'Kullanıcı adı boş olamaz');
      return;
    }
    try {
      setLoading(true);
      const response = await api.user.updateProfile({ username, email, phone });
      if (response.success) {
        showStatusMessage('success', 'Kullanıcı adı başarıyla güncellendi');
        const updatedUserData = response.data?.user || { ...user, username };
        updateUser(updatedUserData);
        if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(updatedUserData));
        if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updatedUserData } }));
        navigate(`/profile/${updatedUserData.username}`);
      } else {
        showStatusMessage('error', response.message || 'Kullanıcı adı güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Kullanıcı adı güncellenirken hata:', err);
      showStatusMessage('error', 'Kullanıcı adı güncellenirken bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showStatusMessage('error', 'E-posta adresi boş olamaz');
      return;
    }
    try {
      setLoading(true);
      const response = await api.user.updateProfile({ username, email, phone });
      if (response.success) {
        showStatusMessage('success', 'E-posta adresi başarıyla güncellendi');
        const updatedUserData = response.data?.user || { ...user, email };
        updateUser(updatedUserData);
        setEmail(updatedUserData.email || '');
        setUsername(updatedUserData.username || '');
        setPhone(updatedUserData.phone || '');
        if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(updatedUserData));
        if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updatedUserData } }));
      } else {
        showStatusMessage('error', response.message || 'E-posta adresi güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('E-posta güncellenirken hata:', err);
      showStatusMessage('error', 'E-posta adresi güncellenirken bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.user.updateProfile({ username, email, phone });
      if (response.success) {
        showStatusMessage('success', 'Telefon numarası başarıyla güncellendi');
        const updatedUserData = response.data?.user || { ...user, phone };
        updateUser(updatedUserData);
        setPhone(updatedUserData.phone || '');
        setUsername(updatedUserData.username || '');
        setEmail(updatedUserData.email || '');
        if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(updatedUserData));
        if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updatedUserData } }));
      } else {
        showStatusMessage('error', response.message || 'Telefon numarası güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Telefon numarası güncellenirken hata:', err);
      showStatusMessage('error', 'Telefon numarası güncellenirken bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showStatusMessage('error', 'Tüm şifre alanları doldurulmalıdır');
      return;
    }
    if (newPassword !== confirmPassword) {
      showStatusMessage('error', 'Yeni şifre ve onay şifresi eşleşmiyor');
      return;
    }
    try {
      setLoading(true);
      const response = await api.user.updatePassword({
        currentPassword,
        newPassword
      });
      if (response.success) {
        showStatusMessage('success', 'Şifreniz başarıyla güncellendi');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showStatusMessage('error', response.message || 'Şifre güncellenirken bir hata oluştu');
      }
    } catch (err) {
      console.error('Şifre güncellenirken hata:', err);
      showStatusMessage('error', 'Şifre güncellenirken bir hata oluştu');
    } finally { setLoading(false); }
  };

  const handleAccountDeactivate = async () => {
    if (window.confirm('Hesabınızı dondurmak istediğinize emin misiniz?')) {
      try {
        setLoading(true);
        const response = await api.user.deactivateAccount();
        if (response.success) {
          showStatusMessage('success', 'Hesabınız başarıyla donduruldu. Oturumunuz kapatılıyor...');
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
        } else {
          showStatusMessage('error', response.message || 'Hesap dondurulurken bir hata oluştu');
        }
      } catch (err) {
        console.error('Hesap dondurulurken hata:', err);
        showStatusMessage('error', 'Hesap dondurulurken bir hata oluştu');
      } finally { setLoading(false); }
    }
  };

  const handleAccountDelete = async () => {
    const confirmation = prompt('Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz. Onaylamak için kullanıcı adınızı girin:');
    if (confirmation === user?.username) {
       if (window.confirm('SON UYARI: Hesabınız ve tüm verileriniz SİLİNECEK! Emin misiniz?')) {
          try {
            setLoading(true);
            const response = await api.user.deleteAccount();
            if (response.success) {
              showStatusMessage('success', 'Hesabınız başarıyla silindi. Yönlendiriliyorsunuz...');
              setTimeout(() => {
                logout();
                navigate('/login');
              }, 2000);
            } else {
              showStatusMessage('error', response.message || 'Hesap silinirken bir hata oluştu');
            }
          } catch (err) {
            console.error('Hesap silinirken hata:', err);
            showStatusMessage('error', 'Hesap silinirken bir hata oluştu');
          } finally { setLoading(false); }
       }
    } else if (confirmation !== null) {
        showStatusMessage('error', 'Kullanıcı adı eşleşmedi. Silme işlemi iptal edildi.');
    }
  };

  // Formatlama fonksiyonları (isteğe bağlı)
  const formatUserAgent = (userAgent) => {
    // Basit tarayıcı/OS tespiti (daha gelişmiş kütüphaneler kullanılabilir)
    if (!userAgent) return "Bilinmeyen Cihaz";
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return "iOS Cihaz";
    if (userAgent.includes('Android')) return "Android Cihaz";
    if (userAgent.includes('Windows')) return "Windows PC";
    if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return "Mac";
    if (userAgent.includes('Linux')) return "Linux PC";
    if (userAgent.includes('Chrome')) return "Chrome Tarayıcı";
    if (userAgent.includes('Firefox')) return "Firefox Tarayıcı";
    if (userAgent.includes('Safari')) return "Safari Tarayıcı";
    return "Diğer Cihaz"; 
  };
  
  const formatTimestamp = (timestamp) => {
      if (!timestamp) return '-';
      try {
          // Backend'den gelen RFC1123 formatını Date objesine çevir
          const date = new Date(timestamp);
          // Daha kullanıcı dostu bir formatta göster (örn: 2 saat önce, 3 gün önce)
          // Zaman farkını hesapla (şimdi ve giriş zamanı)
          const now = new Date();
          const diffSeconds = Math.floor((now - date) / 1000);
          const diffMinutes = Math.floor(diffSeconds / 60);
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffSeconds < 60) return `${diffSeconds} saniye önce`;
          if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
          if (diffHours < 24) return `${diffHours} saat önce`;
          if (diffDays === 1) return `Dün`;
          if (diffDays < 7) return `${diffDays} gün önce`;
          // Daha eski ise tarihi göster
          return date.toLocaleDateString('tr-TR'); 
      } catch (e) {
          console.error("Timestamp formatlama hatası:", e, timestamp);
          return timestamp; // Hata olursa orijinalini göster
      }
  };

  if (loading && !userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-400">Profil bilgileri yükleniyor...</span>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="text-center p-4 bg-red-500/10 text-red-400 rounded-lg">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <User className="mr-2 text-blue-400" />
          Hesap Ayarları
        </h2>
      </div>

      {statusMessage.message && (
        <div className={`p-3 mb-4 rounded-lg ${statusMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {statusMessage.message}
        </div>
      )}

      <section className="space-y-6">
        {/* Kullanıcı Adı Değiştirme */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <User className="mr-2 h-4 w-4 text-blue-400" /> 
            Kullanıcı Adı Değiştirme
          </h3>
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">
                Yeni Kullanıcı Adı
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yeni kullanıcı adınızı girin"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Değiştir
            </button>
          </form>
        </div>

        {/* E-posta Adresi Güncelleme */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Mail className="mr-2 h-4 w-4 text-blue-400" /> 
            E-posta Adresi Güncelleme
          </h3>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                Yeni E-posta Adresi
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yeni e-posta adresinizi girin"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Güncelle
            </button>
          </form>
        </div>

        {/* Telefon Numarası Güncelleme */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Phone className="mr-2 h-4 w-4 text-blue-400" /> 
            Telefon Numarası Güncelleme
          </h3>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                Yeni Telefon Numarası
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="+90 5XX XXX XX XX"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Güncelle
            </button>
          </form>
        </div>

        {/* Şifre Değiştirme */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Lock className="mr-2 h-4 w-4 text-blue-400" /> 
            Şifre Değiştirme
          </h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-400 mb-1">
                Mevcut Şifre
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mevcut şifrenizi girin"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400 mb-1">
                Yeni Şifre
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yeni şifrenizi girin"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
                Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder="Yeni şifrenizi tekrar girin"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Şifreyi Değiştir
            </button>
          </form>
        </div>

        {/* Hesap Silme veya Dondurma */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" /> 
            Hesap Silme veya Dondurma
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Hesabınızı geçici olarak dondurabilir veya kalıcı olarak silebilirsiniz. Hesabınızı dondurduğunuzda, içerikleriniz ve profil bilgileriniz gizlenecek, ancak istediğiniz zaman hesabınıza geri dönebileceksiniz.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleAccountDeactivate}
                className="px-4 py-2 bg-orange-600/70 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Hesabımı Dondur
              </button>
              <button
                onClick={handleAccountDelete}
                className="px-4 py-2 bg-red-600/70 hover:bg-red-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center"
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Hesabımı Sil
              </button>
            </div>
          </div>
        </div>

        {/* Giriş Aktivitesi */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Clock className="mr-2 h-4 w-4 text-blue-400" /> 
            Giriş Aktivitesi
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-4">
              Hesabınıza yapılan son girişler aşağıda listelenmiştir.
            </p>
            {loginActivityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin mr-2" />
                <span className="text-gray-400">Aktiviteler yükleniyor...</span>
              </div>
            ) : loginActivityError ? (
              <div className="text-center py-4 text-red-400 bg-red-500/10 rounded">
                {loginActivityError}
              </div>
            ) : loginActivities.length === 0 ? (
               <div className="text-center py-4 text-gray-500">
                  Henüz kayıtlı giriş aktivitesi bulunamadı.
               </div>
            ) : (
              <ul className="divide-y divide-gray-700/50">
                {loginActivities.map((activity) => (
                  <li key={activity.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        {formatUserAgent(activity.userAgent)} 
                        {activity.location && <span className="text-gray-500 text-xs"> - {activity.location}</span>}
                      </p>
                      <p className="text-xs text-gray-400">IP: {activity.ipAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{formatTimestamp(activity.timestamp)}</p>
                      {/* 'Şu anki oturum' bilgisi IP ve UserAgent karşılaştırması ile yapılabilir ama karmaşık olabilir */}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccountSettings; 