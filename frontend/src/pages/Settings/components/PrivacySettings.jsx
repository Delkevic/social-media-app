import React, { useState, useEffect } from 'react';
import { Lock, EyeOff, UserX, MicOff, Users, MessageCircle, Tag, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

// Yeni tema için yardımcı bileşenler (AccountSettings'ten alınabilir veya burada tanımlanabilir)
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

// Toggle Switch Stili
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

// Radio Buton Stili
const StyledRadio = ({ name, value, checked, onChange, disabled, label }) => (
  <label className="flex items-center cursor-pointer">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 text-[#0affd9] bg-black/60 border-[#0affd9]/30 focus:ring-[#0affd9]/50 focus:ring-2"
    />
    <span className="ms-2 text-sm text-gray-300">{label}</span>
  </label>
);

const PrivacySettings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Gizlilik durumu
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);

  // Yorum ve etiket kontrolleri
  const [commentPermission, setCommentPermission] = useState('all'); // all, followers, none
  const [tagPermission, setTagPermission] = useState('all'); // all, followers, none

  // Engellenen kullanıcılar (Boş başlatılıyor)
  const [blockedUsers] = useState([]);

  // Sessize alınan hesaplar (Boş başlatılıyor)
  const [mutedUsers] = useState([]);

  // Mevcut ayarları API'den çek
  useEffect(() => {
    const fetchPrivacySettings = () => {
      setLoading(true);
      setError(null);

      if (user) {
        const initialIsPrivate = user.isPrivate === true;
        setIsPrivateAccount(initialIsPrivate);
        setCommentPermission(user.commentPermission || 'all');
        setTagPermission(user.tagPermission || 'all');
      } else {
        setError("Kullanıcı bilgileri yüklenemedi. Lütfen tekrar giriş yapın.");
      }
      
      setLoading(false);
    };

    fetchPrivacySettings();
  }, [user]);

  // Ayarları kaydetme fonksiyonu
  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Sadece gizlilik ayarını updatePrivacy ile güncelleyin
      const privacyResponse = await api.user.updatePrivacy(isPrivateAccount);
      
      if (privacyResponse.success) {
        // Diğer ayarları updateProfile ile güncelleyin
        const settingsData = {
          "commentPermission": commentPermission,
          "tagPermission": tagPermission,
        };
        
        const profileResponse = await api.user.updateProfile(settingsData);
        
        if (profileResponse.success) {
          toast.success('Gizlilik ayarları başarıyla kaydedildi!');
          
          if (profileResponse.data?.user) {
            const updatedUser = profileResponse.data.user;
            
            // State'i güncelleyelim
            setIsPrivateAccount(updatedUser.isPrivate === true); 
            setCommentPermission(updatedUser.commentPermission || 'all');
            setTagPermission(updatedUser.tagPermission || 'all');
            
            // AuthContext'teki kullanıcıyı ve depolamayı güncelle
            updateUser(updatedUser); 
          } else {
            console.warn("Kullanıcı verisi API yanıtında bulunamadı:", profileResponse);
          }
        } else {
          setError(profileResponse.message || 'Ayarlar kaydedilirken bir hata oluştu.');
          toast.error(profileResponse.message || 'Ayarlar kaydedilemedi!');
        }
      } else {
        setError(privacyResponse.message || 'Gizlilik ayarları kaydedilemedi');
        toast.error(privacyResponse.message || 'Gizlilik ayarları kaydedilemedi!');
      }
    } catch (err) {
      setError("Ayarlar kaydedilirken bir hata oluştu: " + err.message);
      toast.error('Ayarlar kaydedilemedi!');
      console.error("Gizlilik ayarları kaydetme hatası:", err);
    } finally {
      setSaving(false);
    }
  };

  // Gizli hesap değiştirme işleyicisi
  const handlePrivateAccountChange = (checked) => {
    setIsPrivateAccount(checked);
  };

  const handleUnblockUser = (userId) => {
    // Backend'e engellenmeyi kaldırma isteği
    console.log('Engel kaldırıldı, kullanıcı ID:', userId);
    // Gerekirse API çağrısı ve state güncellemesi burada yapılacak
    toast.info('Engelleme kaldırma işlemi henüz uygulanmadı.');
  };

  const handleUnmuteUser = (userId) => {
    // Backend'e sessize almayı kaldırma isteği
    console.log('Sessize alma kaldırıldı, kullanıcı ID:', userId);
    // Gerekirse API çağrısı ve state güncellemesi burada yapılacak
    toast.info('Sessize alma kaldırma işlemi henüz uygulanmadı.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 text-[#0affd9] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Lock className="mr-2 text-[#0affd9]" />
          Gizlilik Ayarları
        </h2>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2">
          <AlertTriangle size={18}/>
          <span>{error}</span>
        </div>
      )}

        {/* Hesap Gizliliği */}
      <SettingsSection title="Hesap Gizliliği" icon={EyeOff}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Gizli Hesap</p>
                <p className="text-xs text-gray-400">
                  Hesabınız gizli olduğunda, yalnızca onayladığınız takipçiler gönderilerinizi görebilir.
                </p>
              </div>
          <ToggleSwitch 
                  checked={isPrivateAccount}
            onChange={handlePrivateAccountChange}
                  disabled={saving}
                />
        </div>
      </SettingsSection>

      {/* Engellenen Kullanıcılar */}
      <SettingsSection title="Engellenen Kullanıcılar" icon={UserX}>
            <p className="text-xs text-gray-400">
              Engellediğiniz kullanıcılar profilinizi, gönderilerinizi veya hikayelerinizi göremez, size mesaj gönderemez.
            </p>
            {blockedUsers.length > 0 ? (
          <ul className="divide-y divide-[#0affd9]/10">
            {blockedUsers.map(user => (
              <li key={user.id} className="py-2 flex items-center justify-between">
                <span className="text-sm text-gray-300">{user.username}</span>
                <StyledButton variant="secondary" onClick={() => handleUnblockUser(user.id)}>Engeli Kaldır</StyledButton>
              </li>
            ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 py-2">Henüz kimseyi engellemediniz.</p>
            )}
      </SettingsSection>

      {/* Sessize Alınan Hesaplar */}
      <SettingsSection title="Sessize Alınan Hesaplar" icon={MicOff}>
            <p className="text-xs text-gray-400">
              Sessize aldığınız kullanıcıların gönderileri ve hikayeleri akışınızda görünmez, ancak onlar sizinkini görebilir.
            </p>
            {mutedUsers.length > 0 ? (
          <ul className="divide-y divide-[#0affd9]/10">
            {mutedUsers.map(user => (
              <li key={user.id} className="py-2 flex items-center justify-between">
                <span className="text-sm text-gray-300">{user.username}</span>
                <StyledButton variant="secondary" onClick={() => handleUnmuteUser(user.id)}>Sesi Aç</StyledButton>
              </li>
            ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 py-2">Henüz kimseyi sessize almadınız.</p>
            )}
      </SettingsSection>

        {/* Yorum ve Etiket Kontrolü */}
      <SettingsSection title="Yorum ve Etiket Kontrolü" icon={MessageCircle}>
          <div className="space-y-6">
          {/* Yorum İzinleri */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Kimler yorum yapabilir?</p>
              <div className="space-y-2">
              <StyledRadio 
                name="commentPermission"
                value="all"
                checked={commentPermission === 'all'}
                onChange={(e) => setCommentPermission(e.target.value)}
                disabled={saving}
                label="Herkes"
              />
              <StyledRadio 
                name="commentPermission"
                value="followers"
                checked={commentPermission === 'followers'}
                onChange={(e) => setCommentPermission(e.target.value)}
                disabled={saving}
                label="Takipçiler"
              />
              <StyledRadio 
                      name="commentPermission"
                value="none"
                checked={commentPermission === 'none'}
                      onChange={(e) => setCommentPermission(e.target.value)}
                      disabled={saving}
                label="Kimse"
              />
              </div>
            </div>

          {/* Etiket İzinleri */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Kimler sizi etiketleyebilir?</p>
              <div className="space-y-2">
              <StyledRadio 
                name="tagPermission"
                value="all"
                checked={tagPermission === 'all'}
                onChange={(e) => setTagPermission(e.target.value)}
                disabled={saving}
                label="Herkes"
              />
              <StyledRadio 
                name="tagPermission"
                value="followers"
                checked={tagPermission === 'followers'}
                onChange={(e) => setTagPermission(e.target.value)}
                disabled={saving}
                label="Takipçiler"
              />
              <StyledRadio 
                      name="tagPermission"
                value="none"
                checked={tagPermission === 'none'}
                      onChange={(e) => setTagPermission(e.target.value)}
                      disabled={saving}
                label="Kimse"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

        {/* Kaydet Butonu */}
      <div className="pt-6 border-t border-[#0affd9]/10 flex justify-end">
        <StyledButton onClick={handleSaveChanges} disabled={saving} loading={saving}>
          Değişiklikleri Kaydet
        </StyledButton>
        </div>
    </div>
  );
};

export default PrivacySettings; 