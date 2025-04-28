import React, { useState, useEffect } from 'react';
import { Bell, UserPlus, Heart, MessageSquare, Mail, BellOff, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../../services/api'; // API servisini import et
import { toast } from 'react-hot-toast'; // Toast bildirimi için

// Yardımcı Bileşenler (Diğer ayarlardan kopyalandı)
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

const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false, className = '' }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;

  const classList = [baseStyle, variantStyle, className].filter(Boolean).join(' ');

  return (
    <button onClick={onClick} disabled={disabled || loading} className={classList}>
      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
      {children}
    </button>
  );
};

const NotificationSettings = () => {
  // Bildirim ayarları state'leri
  const [settings, setSettings] = useState({
    // Anlık Bildirimler
    newFollower: true,
    newLike: true,
    newComment: true,
    newMessage: true,
    // E-posta Bildirimleri
    emailNewFollower: false,
    emailNewLike: false,
    emailNewComment: false,
    emailNewMessage: true,
    // Push Bildirimleri (Tarayıcı bazlı, bu sadece genel kontrol)
    pushEnabled: true, // Backend'de bu ayar varsa kullanılabilir
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // API'den ayarları çekme
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.notifications.getSettings();
        if (response.success && response.data) {
          setSettings(prev => ({ ...prev, ...response.data })); // Gelen ayarları mevcutlarla birleştir
        } else {
          setError('Bildirim ayarları yüklenemedi.');
          toast.error(response.message || 'Bildirim ayarları yüklenemedi.');
        }
      } catch (err) {
        setError('Bildirim ayarları yüklenirken bir hata oluştu.');
        toast.error('Bildirim ayarları yüklenirken bir hata oluştu.');
        console.error('Bildirim ayarları fetch hatası:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Toggle handler
  const handleToggle = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Değişiklikleri kaydetme
  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await api.notifications.updateSettings(settings);
      if (response.success) {
        toast.success('Bildirim ayarları başarıyla kaydedildi!');
      } else {
        setError('Bildirim ayarları kaydedilemedi.');
        toast.error(response.message || 'Bildirim ayarları kaydedilemedi.');
      }
    } catch (err) {
      setError('Bildirim ayarları kaydedilirken bir hata oluştu.');
      toast.error('Bildirim ayarları kaydedilirken bir hata oluştu.');
      console.error('Bildirim ayarları save hatası:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-6 h-6 text-[#0affd9] animate-spin" />
      </div>
    );
  }

  // Tek bir bildirim ayarını render eden bileşen
  const NotificationOption = ({ id, label, description, icon: Icon, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center space-x-3">
        {Icon && <Icon size={20} className="text-[#0affd9]/80 flex-shrink-0" />}
        <div>
          <p className="text-sm font-medium text-gray-300">{label}</p>
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      </div>
      <ToggleSwitch 
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Bell className="mr-2 text-[#0affd9]" />
          Bildirim Ayarları
        </h2>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2 border border-red-500/30">
          <AlertTriangle size={18}/>
          <span>{error}</span>
        </div>
      )}

      {/* Anlık Bildirimler */}
      <SettingsSection title="Anlık Bildirimler" icon={Bell}>
        <div className="divide-y divide-[#0affd9]/20">
          <NotificationOption
            id="newFollower"
            label="Yeni Takipçi"
            description="Biri sizi takip ettiğinde bildirim alın."
            icon={UserPlus}
            checked={settings.newFollower}
            onChange={(value) => handleToggle('newFollower', value)}
            disabled={saving}
          />
          <NotificationOption
            id="newLike"
            label="Yeni Beğeni"
            description="Gönderiniz veya yorumunuz beğenildiğinde bildirim alın."
            icon={Heart}
            checked={settings.newLike}
            onChange={(value) => handleToggle('newLike', value)}
            disabled={saving}
          />
          <NotificationOption
            id="newComment"
            label="Yeni Yorum"
            description="Gönderinize yorum yapıldığında bildirim alın."
            icon={MessageSquare}
            checked={settings.newComment}
            onChange={(value) => handleToggle('newComment', value)}
            disabled={saving}
          />
          <NotificationOption
            id="newMessage"
            label="Yeni Mesaj"
            description="Direkt mesaj aldığınızda bildirim alın."
            icon={Mail}
            checked={settings.newMessage}
            onChange={(value) => handleToggle('newMessage', value)}
            disabled={saving}
          />
        </div>
      </SettingsSection>

      {/* E-posta Bildirimleri */}
      <SettingsSection title="E-posta Bildirimleri" icon={Mail}>
        <div className="divide-y divide-[#0affd9]/20">
          <NotificationOption
            id="emailNewFollower"
            label="Yeni Takipçiler Hakkında E-posta"
            description="Sizi takip eden yeni kullanıcılar hakkında e-posta alın."
            checked={settings.emailNewFollower}
            onChange={(value) => handleToggle('emailNewFollower', value)}
            disabled={saving}
          />
          <NotificationOption
            id="emailNewLike"
            label="Beğeniler Hakkında E-posta"
            description="Gönderileriniz veya yorumlarınız beğenildiğinde e-posta alın."
            checked={settings.emailNewLike}
            onChange={(value) => handleToggle('emailNewLike', value)}
            disabled={saving}
          />
          <NotificationOption
            id="emailNewComment"
            label="Yorumlar Hakkında E-posta"
            description="Gönderilerinize yorum yapıldığında e-posta alın."
            checked={settings.emailNewComment}
            onChange={(value) => handleToggle('emailNewComment', value)}
            disabled={saving}
          />
          <NotificationOption
            id="emailNewMessage"
            label="Mesajlar Hakkında E-posta"
            description="Direkt mesaj aldığınızda e-posta alın."
            checked={settings.emailNewMessage}
            onChange={(value) => handleToggle('emailNewMessage', value)}
            disabled={saving}
          />
        </div>
      </SettingsSection>

      {/* Push Bildirimleri Aç/Kapat (Genel kontrol) */}
      <SettingsSection title="Push Bildirimleri" icon={BellOff}>
        <NotificationOption
          id="pushEnabled"
          label="Tüm Push Bildirimleri"
          description="Tarayıcı/cihaz izinleri ayrıca gerekebilir."
          checked={settings.pushEnabled}
          onChange={(value) => handleToggle('pushEnabled', value)}
          disabled={saving}
        />
        <p className="text-xs text-gray-500 pt-2">
          Not: Bu ayar genel bir kontroldür. Bildirim almak için tarayıcınızdan veya cihazınızdan da izin vermeniz gerekebilir.
        </p>
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

export default NotificationSettings; 