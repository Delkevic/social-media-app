import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Database, HardDrive, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import DataStorageSettings from './DataStorageSettings';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';

// Yardımcı Bileşenler (Diğer ayarlardan)
const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false, className = '' }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const infoStyle = "bg-blue-800/30 border border-blue-600/50 text-blue-400 hover:bg-blue-700/40"; // Bilgi butonu stili
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;
  if (variant === 'info') variantStyle = infoStyle;

  const classList = [baseStyle, variantStyle, className].filter(Boolean).join(' ');

  return (
    <button onClick={onClick} disabled={disabled || loading} className={classList}>
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

const DataPrivacySettings = () => {
  const [activeTab, setActiveTab] = useState('storage');
  const [loadingAction, setLoadingAction] = useState(null); // null, 'download', 'delete'
  const [error, setError] = useState(null);

  // Gizlilik kontrol state'leri (Örnek - Gerçek API'den alınmalı)
  const [privacyControls, setPrivacyControls] = useState({
    analyticsEnabled: true,
    personalizedAds: false,
    locationData: false,
  });

  // Veri indirme işlemi
  const handleDownloadData = async () => {
    setLoadingAction('download');
    setError(null);
    try {
      const response = await api.data.requestDownload(); // Varsayımsal API çağrısı
      if (response.success) {
        toast.success('Veri indirme talebiniz alındı. Hazır olduğunda size bildireceğiz.');
      } else {
        setError(response.message || 'Veri indirme talebi başarısız oldu.');
        toast.error(response.message || 'Veri indirme talebi başarısız oldu.');
      }
    } catch (err) {
      setError('Veri indirme talebi sırasında bir hata oluştu.');
      toast.error('Veri indirme talebi sırasında bir hata oluştu.');
      console.error('Veri indirme hatası:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Veri silme talebi
  const handleDeleteDataRequest = async () => {
    if (window.confirm('Hesap verilerinizi silme talebinde bulunmak istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      setLoadingAction('delete');
      setError(null);
      try {
        const response = await api.data.requestDeletion(); // Varsayımsal API çağrısı
        if (response.success) {
          toast.success('Veri silme talebiniz alındı. İşlem tamamlandığında bilgilendirileceksiniz.');
        } else {
          setError(response.message || 'Veri silme talebi başarısız oldu.');
          toast.error(response.message || 'Veri silme talebi başarısız oldu.');
        }
      } catch (err) {
        setError('Veri silme talebi sırasında bir hata oluştu.');
        toast.error('Veri silme talebi sırasında bir hata oluştu.');
        console.error('Veri silme hatası:', err);
      } finally {
        setLoadingAction(null);
      }
    }
  };

  // Gizlilik kontrolü toggle
  const handlePrivacyToggle = (key, value) => {
    setPrivacyControls(prev => ({ ...prev, [key]: value }));
    // Normalde burada API'ye kaydetme işlemi de yapılır
    toast.info(`Ayarlar güncellendi: ${key} ${value ? 'açıldı' : 'kapatıldı'}. Kaydetme işlemi henüz uygulanmadı.`);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-200 flex items-center mb-6">
        <Database className="mr-2 text-[#0affd9]" />
        Veri ve Gizlilik Yönetimi
      </h2>

      {error && (
        <div className="p-3 mb-4 rounded-lg bg-red-500/20 text-red-400 flex items-center gap-2 border border-red-500/30">
          <AlertTriangle size={18}/>
          <span>{error}</span>
        </div>
      )}

      {/* Tabs component'i yeni stillerle */} 
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-black/50 border border-[#0affd9]/10 mb-8">
          <TabsTrigger 
            value="storage" 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors 
                       text-gray-400 hover:text-[#0affd9] data-[state=active]:bg-[#0affd9]/10 data-[state=active]:text-[#0affd9] data-[state=active]:shadow-sm"
          >
            <HardDrive size={16} />
            <span>Depolama</span>
          </TabsTrigger>
          <TabsTrigger 
            value="access" 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors 
                       text-gray-400 hover:text-[#0affd9] data-[state=active]:bg-[#0affd9]/10 data-[state=active]:text-[#0affd9] data-[state=active]:shadow-sm"
          >
            <Database size={16} />
            <span>Erişim</span>
          </TabsTrigger>
          <TabsTrigger 
            value="privacy" 
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors 
                       text-gray-400 hover:text-[#0affd9] data-[state=active]:bg-[#0affd9]/10 data-[state=active]:text-[#0affd9] data-[state=active]:shadow-sm"
          >
            <Shield size={16} />
            <span>Kontroller</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Veri Depolama İçeriği */}
        <TabsContent value="storage" className="outline-none focus:ring-0">
          <DataStorageSettings />
        </TabsContent>
        
        {/* Veri Erişimi İçeriği */} 
        <TabsContent value="access" className="outline-none focus:ring-0">
          <div className="mb-8 p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]">
            <h3 className="text-lg font-semibold text-[#0affd9] mb-4">Verilerinize Erişim</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Hesabınızdaki tüm verilere erişebilir, indirebilir veya silme talebinde bulunabilirsiniz.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <StyledButton 
                variant="info" 
                onClick={handleDownloadData}
                loading={loadingAction === 'download'}
                disabled={loadingAction !== null}
                className="py-3"
              >
                Verilerimi İndir
              </StyledButton>
              <StyledButton 
                variant="danger" 
                onClick={handleDeleteDataRequest}
                loading={loadingAction === 'delete'}
                disabled={loadingAction !== null}
                className="py-3"
              >
                Veri Silme Talebi
              </StyledButton>
            </div>
          </div>
        </TabsContent>
        
        {/* Gizlilik Kontrolleri İçeriği */}
        <TabsContent value="privacy" className="outline-none focus:ring-0">
          <div className="mb-8 p-6 rounded-xl bg-black/50 border border-[#0affd9]/10 backdrop-blur-sm shadow-[0_4px_14px_rgba(10,255,217,0.08)]">
            <h3 className="text-lg font-semibold text-[#0affd9] mb-4">Gizlilik Kontrolleri</h3>
            <p className="text-gray-300 mb-4 text-sm">
              Bilgilerinizin nasıl kullanıldığını ve paylaşıldığını kontrol edin.
            </p>
            
            <div className="space-y-4 divide-y divide-[#0affd9]/20">
              <div className="flex justify-between items-center py-4">
                <div>
                  <h4 className="text-gray-200 font-medium text-sm">Analitik Veri Toplama</h4>
                  <p className="text-xs text-gray-400">Uygulama kullanımınızla ilgili anonim veri toplama</p>
                </div>
                <ToggleSwitch 
                  checked={privacyControls.analyticsEnabled}
                  onChange={(value) => handlePrivacyToggle('analyticsEnabled', value)}
                />
              </div>
              
              <div className="flex justify-between items-center py-4">
                <div>
                  <h4 className="text-gray-200 font-medium text-sm">Kişiselleştirilmiş Reklamlar</h4>
                  <p className="text-xs text-gray-400">İlgi alanlarınıza göre reklamlar gösterme</p>
                </div>
                <ToggleSwitch 
                  checked={privacyControls.personalizedAds}
                  onChange={(value) => handlePrivacyToggle('personalizedAds', value)}
                />
              </div>
              
              <div className="flex justify-between items-center py-4">
                <div>
                  <h4 className="text-gray-200 font-medium text-sm">Konum Verisi</h4>
                  <p className="text-xs text-gray-400">Konum tabanlı özellikler için konum verinizi kullanma</p>
                </div>
                <ToggleSwitch 
                  checked={privacyControls.locationData}
                  onChange={(value) => handlePrivacyToggle('locationData', value)}
                />
              </div>
            </div>
             <div className="pt-6 mt-4 border-t border-[#0affd9]/10 flex justify-end">
              <StyledButton onClick={() => toast.info('Gizlilik ayarları kaydetme işlemi henüz uygulanmadı.')} variant="secondary">
                Gizlilik Ayarlarını Kaydet
              </StyledButton>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataPrivacySettings; 