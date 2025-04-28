import React, { useState } from 'react';
import { Progress } from '../../../components/ui/progress';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Yardımcı Bileşenler (Diğer ayarlardan)
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

const StyledCheckbox = ({ label, checked, onChange, disabled }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <input 
      type="checkbox" 
      className="w-4 h-4 rounded bg-black/60 border-[#0affd9]/30 text-[#0affd9] focus:ring-[#0affd9]/50 focus:ring-offset-black/50"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="text-gray-300 text-sm">{label}</span>
  </label>
);

const DataStorageSettings = () => {
  const [currentStorage, setCurrentStorage] = useState(65); // MB cinsinden (Örnek veri)
  const maxStorage = 1024; // 1 GB = 1024 MB
  const storagePercentage = (currentStorage / maxStorage) * 100;

  // Otomatik temizleme state'leri
  const [autoClearCache, setAutoClearCache] = useState(false);
  const [autoClearMedia, setAutoClearMedia] = useState(false);
  const [autoArchiveMessages, setAutoArchiveMessages] = useState(false);

  // Manuel temizleme state'leri
  const [clearCache, setClearCache] = useState(false);
  const [clearMediaCache, setClearMediaCache] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Örnek veri kategorileri (Daha dinamik olabilir)
  const storageCategories = [
    { name: 'Fotoğraflar', size: 42, color: 'bg-[#0affd9]' },
    { name: 'Videolar', size: 15, color: 'bg-purple-500' }, // Farklı renkler eklenebilir
    { name: 'Mesajlar', size: 5, color: 'bg-pink-500' },
    { name: 'Diğer', size: 3, color: 'bg-yellow-500' },
  ];

  // Manuel temizleme işlemi
  const handleManualClear = () => {
    if (!clearCache && !clearMediaCache) {
      toast.error('Lütfen temizlenecek en az bir kategori seçin.');
      return;
    }
    if (window.confirm('Seçili kategorileri temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      setClearing(true);
      // Burada API çağrısı yapılacak
      console.log('Temizlenecekler:', { clearCache, clearMediaCache });
      setTimeout(() => { // Simülasyon
        toast.success('Seçili kategoriler başarıyla temizlendi.');
        setClearCache(false);
        setClearMediaCache(false);
        // Gerekirse `currentStorage` state'i güncellenir
        setClearing(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Depolama Kullanımı */} 
      <div className="p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-[#0affd9]">Depolama Kullanımı</h3>
          <span className="text-sm text-gray-400 font-medium">
            {currentStorage} MB / {maxStorage} MB
          </span>
        </div>
        
        {/* Progress bar için özel stil */}
        <Progress value={storagePercentage} className="h-2 mb-4 [&>div]:bg-[#0affd9]" />
        
        <div className="space-y-2 mt-4">
          {storageCategories.map((category, index) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${category.color}`}></div>
                <span className="text-gray-300">{category.name}</span>
              </div>
              <span className="text-gray-400">{category.size} MB</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Otomatik Temizleme */} 
        <motion.div 
          whileHover={{ scale: 1.01 }} // Hafif hover efekti
          className="p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]"
        >
          <div className="flex items-start gap-3 mb-4">
            <Info size={20} className="text-[#0affd9]/80 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-[#0affd9]">Otomatik Temizleme</h3>
              <p className="text-xs text-gray-400 mt-1">
                Belirlediğiniz süre sonunda eski içerikler otomatik olarak silinir.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <StyledCheckbox 
              label="30 gün sonra önbelleği temizle" 
              checked={autoClearCache}
              onChange={setAutoClearCache}
            />
            <StyledCheckbox 
              label="90 gün sonra medya dosyalarını temizle" 
              checked={autoClearMedia}
              onChange={setAutoClearMedia}
            />
            <StyledCheckbox 
              label="Okunmuş mesajları 1 yıl sonra arşivle" 
              checked={autoArchiveMessages}
              onChange={setAutoArchiveMessages}
            />
          </div>
          {/* Otomatik Temizleme Ayarlarını Kaydet Butonu (Gerekirse Eklenebilir) */} 
          {/* <StyledButton variant="secondary" className="mt-4 w-full">Ayarları Kaydet</StyledButton> */} 
        </motion.div>
        
        {/* Manuel Temizleme */} 
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]"
        >
          <div className="flex items-start gap-3 mb-4">
            <Trash2 size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-[#0affd9]">Manuel Temizleme</h3>
              <p className="text-xs text-gray-400 mt-1">
                Seçtiğiniz veri kategorilerini hemen temizleyin.
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <StyledCheckbox 
                label="Önbellek" 
                checked={clearCache}
                onChange={setClearCache}
                disabled={clearing}
              />
              <span className="text-xs bg-black/40 text-gray-400 px-2 py-1 rounded-md border border-[#0affd9]/10">~2.3 MB</span>
            </div>
            <div className="flex items-center justify-between">
              <StyledCheckbox 
                label="Medya Önbelleği" 
                checked={clearMediaCache}
                onChange={setClearMediaCache}
                disabled={clearing}
              />
              <span className="text-xs bg-black/40 text-gray-400 px-2 py-1 rounded-md border border-[#0affd9]/10">~18 MB</span>
            </div>
          </div>
            
          <StyledButton 
            variant="danger" 
            className="w-full mt-4"
            onClick={handleManualClear}
            disabled={clearing || (!clearCache && !clearMediaCache)}
            loading={clearing}
          >
            Seçilenleri Temizle
          </StyledButton>
        </motion.div>
      </div>
      
      {/* Uyarı Kutusu */} 
      <div className="p-4 rounded-lg bg-amber-900/30 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-amber-300 font-medium mb-1 text-sm">Uyarı</h4>
          <p className="text-amber-300/80 text-xs">
            Temizlenen veriler geri alınamaz. Önemli medya dosyalarınızı cihazınıza indirdiğinizden emin olun.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataStorageSettings; 