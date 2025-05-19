import React, { useState } from 'react';
import { Smartphone, Languages, Moon, Sun, Image, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Yardımcı Bileşenler (Diğer ayarlardan kopyalandı)
const SettingsSection = ({ title, icon: Icon, children }) => (
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
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0affd9]/30 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
  </label>
);

const StyledSelect = ({ value, onChange, disabled, children }) => (
  <select
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={`w-full px-3 py-2 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </select>
);

const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false, className = '' }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;

  const classList = [baseStyle, variantStyle, className].filter(Boolean).join(' ');

  return (
    <button onClick={onClick} disabled={disabled || loading} className={classList}>
      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
      {children}
    </button>
  );
};

const ApplicationSettings = () => {
  // Dil seçenekleri
  const languages = [
    { code: 'tr', name: 'Türkçe' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
  ];

  // State
  const [language, setLanguage] = useState('tr');
  const [darkMode, setDarkMode] = useState(true);
  const [highQualityMedia, setHighQualityMedia] = useState(false);
  const [wifiHighQuality, setWifiHighQuality] = useState(true);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // App info (Gerçek uygulamada dinamik olabilir)
  const appVersion = 'v1.0.5';
  const lastUpdated = '15 Mayıs 2024';

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    // Burada dil değişikliğini API'ye kaydetme veya context güncelleme işlemleri yapılabilir.
    toast.success(`Dil değiştirildi: ${e.target.options[e.target.selectedIndex].text}. Kaydetme işlemi henüz uygulanmadı.`);
  };

  const handleDarkModeToggle = (checked) => {
    setDarkMode(checked);
    // Tema değişikliğini uygula (örneğin body class'ını değiştirerek)
    document.body.classList.toggle('dark', checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light'); // Tema tercihini sakla
    toast.success(`Tema değiştirildi: ${checked ? 'Karanlık' : 'Aydınlık'}.`);
  };

  const handleHighQualityMediaToggle = (checked) => {
    setHighQualityMedia(checked);
    if(checked) {
      // Yüksek kalite açıldığında Wi-Fi ayarını da aç (isteğe bağlı)
      setWifiHighQuality(true);
    }
    // API kaydetme işlemi...
    toast.success(`Yüksek kalite medya ${checked ? 'açıldı' : 'kapatıldı'}. Kaydetme işlemi henüz uygulanmadı.`);
  };

  const handleWifiHighQualityToggle = (checked) => {
    setWifiHighQuality(checked);
    // API kaydetme işlemi...
    toast.success(`Wi-Fi'de yüksek kalite ${checked ? 'açıldı' : 'kapatıldı'}. Kaydetme işlemi henüz uygulanmadı.`);
  };
  
  // Güncellemeleri kontrol etme (simülasyon)
  const handleCheckUpdates = () => {
    setCheckingUpdates(true);
    setTimeout(() => {
      setCheckingUpdates(false);
      toast.success('Uygulama güncel!');
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Smartphone className="mr-2 text-[#0affd9]" />
          Uygulama Ayarları
        </h2>
      </div>

      {/* Dil Seçimi */}
      <SettingsSection title="Dil Seçimi" icon={Languages}>
        <p className="text-xs text-gray-400 mb-3">
          Uygulama arayüzünde görüntülenecek dili seçin.
        </p>
        <StyledSelect
          value={language}
          onChange={handleLanguageChange}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </StyledSelect>
      </SettingsSection>

      {/* Tema Seçimi */}
      <SettingsSection title="Tema Seçimi" icon={darkMode ? Moon : Sun}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">{darkMode ? 'Karanlık Mod' : 'Aydınlık Mod'}</p>
            <p className="text-xs text-gray-400">
              {darkMode ? 'Göz yorgunluğunu azaltan koyu tema' : 'Klasik aydınlık tema'}
            </p>
          </div>
          <ToggleSwitch 
            checked={darkMode}
            onChange={handleDarkModeToggle}
          />
        </div>
      </SettingsSection>

      {/* Medya Kalitesi */}
      <SettingsSection title="Medya Kalitesi" icon={Image}>
        <div className="divide-y divide-[#0affd9]/20">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-300">Yüksek Kalite Medya</p>
              <p className="text-xs text-gray-400">
                Fotoğrafları ve videoları her zaman yüksek kalitede göster.
              </p>
            </div>
            <ToggleSwitch 
              checked={highQualityMedia}
              onChange={handleHighQualityMediaToggle}
            />
          </div>
          <div className={`flex items-center justify-between py-3 ${highQualityMedia ? 'opacity-50' : ''}`}>
            <div>
              <p className="text-sm font-medium text-gray-300">Sadece Wi-Fi'de Yüksek Kalite</p>
              <p className="text-xs text-gray-400">
                Mobil veri kullanımını azaltmak için sadece Wi-Fi'de etkinleştirin.
              </p>
            </div>
            <ToggleSwitch 
              checked={wifiHighQuality}
              onChange={handleWifiHighQualityToggle}
              disabled={highQualityMedia} // Eğer üstteki seçenek açıksa bunu devre dışı bırak
            />
          </div>
        </div>
         <p className="text-xs text-gray-500 pt-2">
           Not: Yüksek kalite medya daha fazla veri tüketebilir.
         </p>
      </SettingsSection>

      {/* Uygulama Versiyonu */}
      <SettingsSection title="Uygulama Bilgileri" icon={Info}>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Uygulama Versiyonu</p>
            <p className="font-medium text-gray-300">{appVersion}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Son Güncelleme Tarihi</p>
            <p className="font-medium text-gray-300">{lastUpdated}</p>
          </div>
        </div>
        <StyledButton 
          variant="secondary" 
          className="w-full"
          onClick={handleCheckUpdates}
          disabled={checkingUpdates}
          loading={checkingUpdates}
        >
          Güncellemeleri Kontrol Et
        </StyledButton>
      </SettingsSection>
      
      {/* Ayarları Kaydet Butonu (Gerekirse) */} 
      {/* 
      <div className="pt-6 border-t border-[#0affd9]/10 flex justify-end">
        <StyledButton onClick={() => toast.info('Uygulama ayarları kaydetme işlemi henüz uygulanmadı.')}>
          Uygulama Ayarlarını Kaydet
        </StyledButton>
      </div> 
      */}
    </div>
  );
};

export default ApplicationSettings; 