import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// Genel Ayar Bileşeni Stili
const SettingsSection = ({ title, icon: Icon, children }) => (
  <div className="mb-8 p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm">
    <h3 className="text-lg font-semibold mb-4 flex items-center text-[#0affd9]">
      {Icon && <Icon size={20} className="mr-2 opacity-80" />} 
      {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

// Input Stili (global stillerden alınabilir ama burada da tanımlanabilir)
const StyledInput = (props) => (
  <input 
    {...props}
    className={`w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none ${props.className || ''}`}
  />
);

// Buton Stili
const StyledButton = ({ children, onClick, disabled, variant = 'primary' }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variantStyle}`}>
      {children}
    </button>
  );
};

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

  const getTimeAgo = (date) => {
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
    return date.toLocaleDateString('tr-TR');
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
    <div className="space-y-6">
      {statusMessage.message && (
        <div className={`p-3 rounded-lg text-sm border text-center ${statusMessage.type === 'success' ? 'bg-green-900/30 text-green-400 border-green-700/50' : 'bg-red-900/30 text-red-400 border-red-700/50'}`}>
          {statusMessage.message}
        </div>
      )}

      <SettingsSection title="Kullanıcı Adı" icon={User}>
        <form onSubmit={handleUsernameSubmit} className="flex items-center gap-3">
          <StyledInput 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            placeholder="Yeni kullanıcı adı"
            className="flex-grow"
              />
          <StyledButton type="submit" disabled={loading || username === userData?.username} variant="secondary">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </StyledButton>
          </form>
      </SettingsSection>

      <SettingsSection title="E-posta Adresi" icon={Mail}>
        <form onSubmit={handleEmailSubmit} className="flex items-center gap-3">
           <StyledInput 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            placeholder="yeni@email.com"
             className="flex-grow"
              />
          <StyledButton type="submit" disabled={loading || email === userData?.email} variant="secondary">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </StyledButton>
          </form>
        {/* E-posta doğrulama durumu eklenebilir */}
      </SettingsSection>

      <SettingsSection title="Telefon Numarası" icon={Phone}>
         <form onSubmit={handlePhoneSubmit} className="flex items-center gap-3">
           <StyledInput 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
            placeholder="+90 5xx xxx xx xx"
             className="flex-grow"
              />
          <StyledButton type="submit" disabled={loading || phone === userData?.phone} variant="secondary">
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </StyledButton>
          </form>
      </SettingsSection>

      <SettingsSection title="Şifre Değiştir" icon={Lock}>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <StyledInput 
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Mevcut Şifre"
              />
          <StyledInput 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Yeni Şifre"
              />
          <StyledInput 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni Şifreyi Doğrula"
              />
          <StyledButton type="submit" disabled={loading} variant="secondary">
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </StyledButton>
          </form>
      </SettingsSection>
      
      <SettingsSection title="Giriş Aktiviteleri" icon={Clock}>
            {loginActivityLoading ? (
            <div className="text-center p-4"><Loader2 className="animate-spin mx-auto text-[#0affd9]" /></div>
            ) : loginActivityError ? (
            <div className="text-red-500 text-sm">{loginActivityError}</div>
         ) : loginActivities.length > 0 ? (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {loginActivities.map((activity, index) => (
                <li key={index} className="flex justify-between items-center text-sm border-b border-[#0affd9]/10 pb-2 last:border-b-0">
                    <div>
                    <span className="font-medium text-gray-300 block">{formatUserAgent(activity.user_agent)}</span>
                    <span className="text-gray-400 text-xs">IP: {activity.ip_address}</span>
                    </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{getTimeAgo(new Date(activity.login_time))}</span>
                  </li>
                ))}
              </ul>
         ) : (
           <p className="text-gray-400 text-sm">Giriş aktivitesi bulunamadı.</p>
         )}
       </SettingsSection>

      <SettingsSection title="Hesap Yönetimi" icon={AlertTriangle}>
        <div className="space-y-3">
           <p className="text-sm text-gray-400">
            Hesabınızı geçici olarak dondurabilir veya kalıcı olarak silebilirsiniz. Bu işlemler dikkatli yapılmalıdır.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <StyledButton onClick={handleAccountDeactivate} disabled={loading} variant="secondary">
              Hesabı Dondur
            </StyledButton>
            <StyledButton onClick={handleAccountDelete} disabled={loading} variant="danger">
              Hesabı Kalıcı Olarak Sil
            </StyledButton>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default AccountSettings; 