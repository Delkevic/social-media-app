import React, { useState, useEffect } from 'react';
import { ShieldCheck, LockKeyhole, BellRing, LogOut, Loader2, AlertTriangle, Smartphone, Computer } from 'lucide-react';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';

// Yardımcı Bileşenler (PrivacySettings veya AccountSettings'ten kopyalandı/uyarlandı)
const SettingsSection = ({ title, icon: Icon, children }) => (
  // Gölge efekti eklendi
  <div className="mb-8 p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]">
    <h3 className="text-lg font-semibold mb-4 flex items-center text-[#0affd9]">
      {Icon && <Icon size={20} className="mr-2 opacity-80" />} 
      {title}
    </h3>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variantStyle}`}>
      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
      {children}
    </button>
  );
};

const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <div className={`w-11 h-6 bg-black/60 border border-[#0affd9]/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0affd9]/50 rounded-full peer 
                    peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full 
                    peer-checked:after:border-[#000] after:content-[''] after:absolute after:top-[2px] 
                    after:start-[2px] after:bg-[#0affd9] after:border-black after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0affd9]/30`}></div>
  </label>
);

const SecuritySettings = () => {
  // State değişkenleri
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [suspiciousLoginAlerts, setSuspiciousLoginAlerts] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false); // Ayar yükleme durumu
  const [updatingSetting, setUpdatingSetting] = useState(null); // Hangi ayarın güncellendiğini takip et
  const [errorMessage, setErrorMessage] = useState('');
  // successMessage yerine toast kullanacağız
  
  // Aktif oturumlar için state
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [terminatingSession, setTerminatingSession] = useState(null); // Hangi oturumun sonlandırıldığını takip et

  // Sayfa yüklendiğinde güvenlik ayarlarını getir
  useEffect(() => {
    fetchSecuritySettings();
    fetchLoginActivities();
  }, []);

  // Güvenlik ayarlarını API'den getir
  const fetchSecuritySettings = async () => {
    setLoadingSettings(true);
    setErrorMessage('');
    
    try {
      const response = await api.security.getSettings();
      
      if (response.success && response.data) { // data varlığını kontrol et
        const settings = response.data;
        setTwoFactorEnabled(settings.twoFactorEnabled || false);
        setSuspiciousLoginAlerts(settings.loginAlerts !== undefined ? settings.loginAlerts : true);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları yüklenemedi.');
        toast.error(response.message || 'Güvenlik ayarları yüklenemedi.');
      }
    } catch (error) {
      console.error('Güvenlik ayarları getirilirken hata:', error);
      const errorMsg = 'Güvenlik ayarları yüklenemedi: ' + (error.response?.data?.message || error.message);
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoadingSettings(false);
    }
  };

  // Oturum aktivitelerini API'den getir
  const fetchLoginActivities = async () => {
    setSessionsLoading(true);
    setSessionsError('');
    
    try {
      const response = await api.user.getLoginActivities();
      
      if (response.success && Array.isArray(response.data)) { // data'nın dizi olduğunu kontrol et
        const formattedSessions = response.data.map(activity => {
          let device = 'Bilinmeyen Cihaz';
          let DeviceIcon = Computer; // Varsayılan ikon
          const userAgent = activity.userAgent || '';

          if (userAgent.includes('iPhone')) { device = 'iPhone'; DeviceIcon = Smartphone; }
          else if (userAgent.includes('iPad')) { device = 'iPad'; DeviceIcon = Smartphone; } // Tablet ikonu eklenebilir
          else if (userAgent.includes('Android')) { device = 'Android Cihaz'; DeviceIcon = Smartphone; }
          else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) { device = 'MacOS'; DeviceIcon = Computer; }
          else if (userAgent.includes('Windows')) { device = 'Windows PC'; DeviceIcon = Computer; }
          else if (userAgent.includes('Linux')) { device = 'Linux PC'; DeviceIcon = Computer; }
          
          // Tarayıcıyı da ekleyebiliriz
          if (userAgent.includes('Chrome')) device += ' (Chrome)';
          else if (userAgent.includes('Firefox')) device += ' (Firefox)';
          else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) device += ' (Safari)'; // Chrome userAgent'ında Safari de geçebilir
          else if (userAgent.includes('Edg')) device += ' (Edge)';

          // `window.clientIp` globalde tanımlı olmayabilir, bu kısmı API'den gelen veriyle yapmak daha doğru
          // const isCurrent = activity.ipAddress === window.clientIp; 
          const isCurrent = activity.isCurrentSession || false; // API'den bu bilgi gelmeli
          
          const location = activity.location || activity.ipAddress || 'Bilinmeyen Konum';
          const lastActive = formatTimeAgo(new Date(activity.timestamp));
          
          return {
            id: activity.id,
            device,
            DeviceIcon, // İkonu da ekleyelim
            location,
            lastActive,
            current: isCurrent,
            ipAddress: activity.ipAddress,
            userAgent: activity.userAgent,
            timestamp: activity.timestamp
          };
        });
        
        setActiveSessions(formattedSessions);
      } else {
        setSessionsError(response.message || 'Oturum bilgileri yüklenemedi.');
        toast.error(response.message || 'Oturum bilgileri yüklenemedi.');
      }
    } catch (error) {
      console.error('Oturum bilgileri getirilirken hata:', error);
      const errorMsg = 'Oturum bilgileri yüklenemedi: ' + (error.response?.data?.message || error.message);
      setSessionsError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Zaman formatını güzelleştiren yardımcı fonksiyon
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHour < 24) return `${diffHour} sa önce`;
    if (diffDay === 1) return 'Dün';
    if (diffDay < 7) return `${diffDay} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  // Belirli bir oturumu sonlandırma
  const terminateSession = async (sessionId) => {
    if (window.confirm('Bu oturumu sonlandırmak istediğinize emin misiniz?')) {
      setTerminatingSession(sessionId); // Hangi oturumun sonlandırıldığını set et
      try {
        const response = await api.security.terminateSession(sessionId);
        
        if (response.success) {
          setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
          toast.success(response.message || "Oturum başarıyla sonlandırıldı.");
        } else {
          setSessionsError(response.message || "Oturum sonlandırılamadı.");
          toast.error(response.message || "Oturum sonlandırılamadı.");
        }
      } catch (error) {
        console.error('Oturum sonlandırma hatası:', error);
        const errorMsg = 'Oturum sonlandırılamadı: ' + (error.response?.data?.message || error.message);
        setSessionsError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setTerminatingSession(null); // İşlem bitince null yap
      }
    }
  };

  // Diğer tüm oturumları sonlandırma
  const terminateAllOtherSessions = async () => {
    if (window.confirm('Diğer tüm oturumları sonlandırmak istediğinize emin misiniz?')) {
      setTerminatingSession('all'); // Tümünü sonlandırma işlemi olduğunu belirt
      try {
        const response = await api.security.terminateAllOtherSessions();
        
        if (response.success) {
          // Sadece mevcut oturumu tut (API'den isCurrentSession gelmeli)
          setActiveSessions(prev => prev.filter(session => session.current));
          toast.success(response.message || "Diğer tüm oturumlar başarıyla sonlandırıldı.");
        } else {
          setSessionsError(response.message || "Oturumlar sonlandırılamadı.");
          toast.error(response.message || "Oturumlar sonlandırılamadı.");
        }
      } catch (error) {
        console.error('Oturumları sonlandırma hatası:', error);
        const errorMsg = 'Oturumlar sonlandırılamadı: ' + (error.response?.data?.message || error.message);
        setSessionsError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setTerminatingSession(null); // İşlem bitince null yap
      }
    }
  };
  
  // İki faktörlü doğrulamayı etkinleştirme/devre dışı bırakma
  const handleToggleTwoFactor = async () => {
    setUpdatingSetting('twoFactor');
    setErrorMessage('');
    
    try {
      const newStatus = !twoFactorEnabled;
      const response = await api.security.updateSettings({ twoFactorEnabled: newStatus });
      
      if (response.success) {
        setTwoFactorEnabled(newStatus);
        toast.success(`İki faktörlü doğrulama başarıyla ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları güncellenemedi.');
        toast.error(response.message || 'Güvenlik ayarları güncellenemedi.');
      }
    } catch (error) {
      console.error('2FA güncelleme hatası:', error);
      const errorMsg = 'Güvenlik ayarları güncellenemedi: ' + (error.response?.data?.message || error.message);
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      fetchSecuritySettings(); // Hata durumunda state'i senkronize et
    } finally {
      setUpdatingSetting(null);
    }
  };

  // Şüpheli giriş uyarılarını değiştirme
  const handleToggleLoginAlerts = async () => {
    setUpdatingSetting('loginAlerts');
    setErrorMessage('');
    
    try {
      const newStatus = !suspiciousLoginAlerts;
      const response = await api.security.updateSettings({ loginAlerts: newStatus });
      
      if (response.success) {
        setSuspiciousLoginAlerts(newStatus);
        toast.success(`Şüpheli giriş uyarıları ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları güncellenemedi.');
        toast.error(response.message || 'Güvenlik ayarları güncellenemedi.');
      }
    } catch (error) {
      console.error('Giriş uyarıları güncelleme hatası:', error);
      const errorMsg = 'Güvenlik ayarları güncellenemedi: ' + (error.response?.data?.message || error.message);
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      fetchSecuritySettings(); // Hata durumunda state'i senkronize et
    } finally {
      setUpdatingSetting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <ShieldCheck className="mr-2 text-[#0affd9]" />
          Güvenlik Ayarları
        </h2>
      </div>

      {/* Hata Mesajı Alanı */}
      {errorMessage && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2 border border-red-500/30">
          <AlertTriangle size={18}/>
          <span>{errorMessage}</span>
        </div>
      )}
      
      {/* İki Faktörlü Doğrulama */} 
      <SettingsSection title="İki Faktörlü Doğrulama" icon={LockKeyhole}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">İki Faktörlü Doğrulama (2FA)</p>
            <p className="text-xs text-gray-400">
              Hesabınıza ek bir güvenlik katmanı ekleyin.
            </p>
          </div>
          <ToggleSwitch 
            checked={twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            disabled={loadingSettings || updatingSetting === 'twoFactor'}
          />
        </div>
        {updatingSetting === 'twoFactor' && <Loader2 className="w-4 h-4 text-[#0affd9] animate-spin ml-2" />}
      </SettingsSection>
      
      {/* Şüpheli Giriş Uyarıları */} 
      <SettingsSection title="Giriş Uyarıları" icon={BellRing}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">Şüpheli Giriş Uyarıları</p>
            <p className="text-xs text-gray-400">
              Tanınmayan bir cihazdan veya konumdan giriş yapıldığında bildirim alın.
            </p>
          </div>
          <ToggleSwitch 
            checked={suspiciousLoginAlerts}
            onChange={handleToggleLoginAlerts}
            disabled={loadingSettings || updatingSetting === 'loginAlerts'}
          />
        </div>
        {updatingSetting === 'loginAlerts' && <Loader2 className="w-4 h-4 text-[#0affd9] animate-spin ml-2" />}
      </SettingsSection>

      {/* Aktif Oturumlar */} 
      <SettingsSection title="Aktif Oturumlar" icon={LogOut}>
        <p className="text-xs text-gray-400 mb-4">
          Hesabınıza giriş yapılan cihazları ve konumları yönetin.
        </p>
        {sessionsError && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2 border border-red-500/30">
            <AlertTriangle size={18}/>
            <span>{sessionsError}</span>
          </div>
        )}
        {sessionsLoading ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="w-6 h-6 text-[#0affd9] animate-spin" />
          </div>
        ) : activeSessions.length > 0 ? (
          <div className="space-y-4">
            {activeSessions.map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-[#0affd9]/10">
                <div className="flex items-center gap-3">
                  <session.DeviceIcon size={24} className="text-[#0affd9]/80 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      {session.device}
                      {session.current && <span className="ml-2 text-xs text-[#0affd9] bg-[#0affd9]/10 px-1.5 py-0.5 rounded-full">Mevcut</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {session.location} • {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <StyledButton 
                    variant="danger" 
                    onClick={() => terminateSession(session.id)}
                    disabled={terminatingSession === session.id}
                    loading={terminatingSession === session.id}
                  >
                    Çıkış Yap
                  </StyledButton>
                )}
              </div>
            ))}
            <div className="pt-4 border-t border-[#0affd9]/10 flex justify-end">
              <StyledButton 
                variant="danger" 
                onClick={terminateAllOtherSessions}
                disabled={terminatingSession === 'all' || activeSessions.filter(s => !s.current).length === 0}
                loading={terminatingSession === 'all'}
              >
                Diğer Tüm Oturumları Sonlandır
              </StyledButton>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-2">Aktif oturum bulunamadı.</p>
        )}
      </SettingsSection>
    </div>
  );
};

export default SecuritySettings; 