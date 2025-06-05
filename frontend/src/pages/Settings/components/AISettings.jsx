import React, { useState } from 'react';
import { Brain, Target, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Yardımcı Bileşenler (Diğer ayarlardan kopyalandı)
const SettingsSection = ({ title, icon: Icon, children, className = '' }) => (
  <div className={`mb-8 p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)] ${className}`}>
    {title && (
      <h3 className="text-lg font-semibold mb-4 flex items-center text-[#0affd9]">
        {Icon && <Icon size={20} className="mr-2 opacity-80" />} 
        {title}
      </h3>
    )}
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

const StyledCheckbox = ({ label, checked, onChange, disabled, id }) => (
  <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
    <input 
      type="checkbox" 
      id={id}
      className="w-4 h-4 rounded bg-black/60 border-[#0affd9]/30 text-[#0affd9] focus:ring-[#0affd9]/50 focus:ring-offset-black/50"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="text-gray-300 text-sm capitalize">{label}</span>
  </label>
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

const AISettings = () => {
  // State
  const [contentRecommendations, setContentRecommendations] = useState(true);
  const [interestBasedContent, setInterestBasedContent] = useState(true);
  const [adPersonalization, setAdPersonalization] = useState(false);
  const [locationBasedRecommendations, setLocationBasedRecommendations] = useState(false);
  const [isSavingInterests, setIsSavingInterests] = useState(false);
  const [isSavingAISettings, setIsSavingAISettings] = useState(false);
  
  // Interest categories (Örnek)
  const [interests, setInterests] = useState({
    music: true,
    technology: true,
    art: true,
    food: false,
    travel: true,
    sports: false,
  });

  // Genel AI ayarları için toggle
  const handleAIToggle = (key, value) => {
    switch (key) {
      case 'contentRecommendations':
        setContentRecommendations(value);
        // Eğer ana öneri kapatılırsa, alt seçenekleri de kapat
        if (!value) {
          setInterestBasedContent(false);
          setLocationBasedRecommendations(false);
        }
        break;
      case 'interestBasedContent':
        setInterestBasedContent(value);
        break;
      case 'adPersonalization':
        setAdPersonalization(value);
        break;
      case 'locationBasedRecommendations':
        setLocationBasedRecommendations(value);
        break;
      default:
        break;
    }
     toast.info(`Ayarlar güncellendi: ${key} ${value ? 'açıldı' : 'kapatıldı'}. Kaydetme işlemi henüz uygulanmadı.`);
  };

  // İlgi alanı toggle
  const handleInterestToggle = (interest, isSelected) => {
    setInterests(prev => ({
      ...prev,
      [interest]: isSelected,
    }));
  };

  // İlgi alanlarını kaydet (simülasyon)
  const handleSaveInterests = () => {
    setIsSavingInterests(true);
    console.log('Kaydedilen ilgi alanları:', interests);
    // API call here
    setTimeout(() => {
      setIsSavingInterests(false);
      toast.success('İlgi alanları kaydedildi!');
    }, 1000);
  };
  
  // AI Ayarlarını Kaydet (simülasyon)
  const handleSaveAISettings = () => {
    setIsSavingAISettings(true);
    const settingsToSave = { 
      contentRecommendations, 
      interestBasedContent, 
      adPersonalization, 
      locationBasedRecommendations 
    };
    console.log('Kaydedilen AI ayarları:', settingsToSave);
    // API call here
    setTimeout(() => {
      setIsSavingAISettings(false);
      toast.success('Yapay zeka ayarları kaydedildi!');
    }, 1000);
  };
  
  // Tek bir ayar seçeneği için yardımcı bileşen
  const SettingOption = ({ id, label, description, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
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
          <Brain className="mr-2 text-[#0affd9]" />
          Yapay Zeka ve Öneri Ayarları
        </h2>
      </div>

      {/* Öneri Ayarları */}
      <SettingsSection title="İçerik Önerileri" icon={Target}>
        <div className="divide-y divide-[#0affd9]/20">
          <SettingOption
            id="contentRecommendations"
            label="İçerik Önerileri"
            description="Algoritma tarafından ilgi alanlarınıza göre özelleştirilmiş içerik önerilerini aktifleştirin."
            checked={contentRecommendations}
            onChange={(value) => handleAIToggle('contentRecommendations', value)}
          />
          <SettingOption
            id="interestBasedContent"
            label="İlgi Alanlarına Göre Kişiselleştirme"
            description="Beğenileriniz ve etkileşimlerinize göre içerik keşfini kişiselleştirin."
            checked={interestBasedContent}
            onChange={(value) => handleAIToggle('interestBasedContent', value)}
            disabled={!contentRecommendations}
          />
          <SettingOption
            id="locationBasedRecommendations"
            label="Konuma Dayalı Öneriler"
            description="Konumunuza göre içerik ve etkinlik önerilerini etkinleştirin."
            checked={locationBasedRecommendations}
            onChange={(value) => handleAIToggle('locationBasedRecommendations', value)}
            disabled={!contentRecommendations}
          />
        </div>
      </SettingsSection>

      {/* İlgi Alanları */}
      {interestBasedContent && contentRecommendations && (
        <SettingsSection title="İlgi Alanları" className={(!interestBasedContent || !contentRecommendations) ? 'opacity-50' : ''}>
           <p className="text-xs text-gray-400 mb-3">
             Keşfet akışınızda görmek istediğiniz içerik kategorilerini seçin.
           </p>
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             {Object.entries(interests).map(([interest, isSelected]) => (
               <StyledCheckbox
                 key={interest}
                 id={`interest-${interest}`}
                 label={interest === 'art' ? 'Sanat' : 
                         interest === 'music' ? 'Müzik' : 
                         interest === 'technology' ? 'Teknoloji' : 
                         interest === 'sports' ? 'Spor' : 
                         interest === 'food' ? 'Yemek' : 
                         interest === 'travel' ? 'Seyahat' : interest}
                 checked={isSelected}
                 onChange={(value) => handleInterestToggle(interest, value)}
                 disabled={isSavingInterests}
               />
             ))}
           </div>
           <div className="pt-4 flex justify-end">
             <StyledButton
               variant="secondary"
               onClick={handleSaveInterests}
               disabled={isSavingInterests}
               loading={isSavingInterests}
             >
               İlgi Alanlarını Kaydet
             </StyledButton>
           </div>
        </SettingsSection>
      )}

      {/* Veri Kullanımı */}
      <SettingsSection title="Veri Kullanımı" icon={ShieldAlert}>
         <SettingOption
           id="adPersonalization"
           label="Kişiselleştirilmiş Reklamlar"
           description="Etkileşimlerinizin ve verilerinizin kişiselleştirilmiş reklamlar için kullanılmasına izin verin."
           checked={adPersonalization}
           onChange={(value) => handleAIToggle('adPersonalization', value)}
         />
         <p className="text-xs text-gray-500 pt-2">
           Not: Bu ayar kapalı olsa bile temel reklam içeriğini görebilirsiniz, ancak bu reklamlar ilgi alanlarınıza göre kişiselleştirilmez.
         </p>
      </SettingsSection>
      
      {/* Genel Kaydet Butonu */}
      <div className="pt-6 border-t border-[#0affd9]/10 flex justify-end">
        <StyledButton 
          onClick={handleSaveAISettings} 
          disabled={isSavingAISettings} 
          loading={isSavingAISettings}
        >
          Yapay Zeka Ayarlarını Kaydet
        </StyledButton>
      </div>
    </div>
  );
};

export default AISettings; 