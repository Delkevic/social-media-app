import React, { useState, useEffect } from 'react';
import { ShieldCheck, LockKeyhole, BellRing, LogOut } from 'lucide-react';
import api from '../../../services/api';

const SecuritySettings = () => {
  // State değişkenleri
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [suspiciousLoginAlerts, setSuspiciousLoginAlerts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Aktif oturumlar (örnek veri)
  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'iPhone 13 Pro', location: 'İstanbul, Türkiye', lastActive: '2 dakika önce', current: true },
    { id: 2, device: 'Chrome - Windows', location: 'Ankara, Türkiye', lastActive: '3 saat önce', current: false },
    { id: 3, device: 'Safari - MacBook', location: 'İzmir, Türkiye', lastActive: '2 gün önce', current: false },
  ]);

  // Sayfa yüklendiğinde güvenlik ayarlarını getir
  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  // Güvenlik ayarlarını API'den getir
  const fetchSecuritySettings = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      const response = await api.security.getSettings();
      
      if (response.success) {
        // API'den gelen ayarları state'e yükle
        const settings = response.data;
        setTwoFactorEnabled(settings.twoFactorEnabled || false);
        setSuspiciousLoginAlerts(settings.loginAlerts !== undefined ? settings.loginAlerts : true);
        console.log('Güvenlik ayarları başarıyla yüklendi:', settings);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları yüklenemedi.');
      }
    } catch (error) {
      console.error('Güvenlik ayarları getirilirken hata:', error);
      setErrorMessage('Güvenlik ayarları yüklenemedi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Belirli bir oturumu sonlandırma
  const terminateSession = (sessionId) => {
    if (window.confirm('Bu oturumu sonlandırmak istediğinize emin misiniz?')) {
      // API isteği burada yapılacak
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
    }
  };

  // Diğer tüm oturumları sonlandırma
  const terminateAllOtherSessions = () => {
    if (window.confirm('Diğer tüm oturumları sonlandırmak istediğinize emin misiniz?')) {
      // API isteği burada yapılacak
      setActiveSessions(prev => prev.filter(session => session.current));
    }
  };
  
  // İki faktörlü doğrulamayı etkinleştirme işlemi
  const enableTwoFactor = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const newStatus = !twoFactorEnabled;
      
      const response = await api.security.updateSettings({ twoFactorEnabled: newStatus });
      
      if (response.success) {
        setTwoFactorEnabled(newStatus);
        setSuccessMessage(`İki faktörlü doğrulama başarıyla ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
        console.log('2FA durumu güncellendi:', newStatus);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları güncellenemedi.');
      }
    } catch (error) {
      console.error('2FA güncelleme hatası:', error);
      setErrorMessage('Güvenlik ayarları güncellenemedi: ' + (error.response?.data?.message || error.message));
      // State'i backend durumuyla senkronize etmek için tekrar ayarları getir
      fetchSecuritySettings();
    } finally {
      setLoading(false);
    }
  };

  // Şüpheli giriş uyarılarını değiştirme
  const toggleLoginAlerts = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const newStatus = !suspiciousLoginAlerts;
      
      const response = await api.security.updateSettings({ loginAlerts: newStatus });
      
      if (response.success) {
        setSuspiciousLoginAlerts(newStatus);
        setSuccessMessage(`Şüpheli giriş uyarıları ${newStatus ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`);
      } else {
        setErrorMessage(response.message || 'Güvenlik ayarları güncellenemedi.');
      }
    } catch (error) {
      console.error('Giriş uyarıları güncelleme hatası:', error);
      setErrorMessage('Güvenlik ayarları güncellenemedi: ' + (error.response?.data?.message || error.message));
      // State'i backend durumuyla senkronize etmek için tekrar ayarları getir
      fetchSecuritySettings();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <ShieldCheck className="mr-2 text-blue-400" />
          Güvenlik Ayarları
        </h2>
      </div>

      {/* Mesajlar */}
      {errorMessage && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-300 rounded-md text-sm">
          {errorMessage}
        </div>
      )}
      
      {successMessage && (
        <div className="p-3 bg-green-900/30 border border-green-500/50 text-green-300 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      <section className="space-y-6">
        {/* İki Faktörlü Kimlik Doğrulama */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <LockKeyhole className="mr-2 h-4 w-4 text-blue-400" /> 
            İki Faktörlü Kimlik Doğrulama
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              İki faktörlü kimlik doğrulama, hesabınıza giriş yaparken ek bir güvenlik katmanı ekler. Giriş yapmak için 
              şifrenize ek olarak SMS ile size gönderilen bir kodu da girmeniz istenecektir.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">İki Faktörlü Doğrulama</p>
                <p className="text-xs text-gray-400">
                  {twoFactorEnabled 
                    ? 'İki faktörlü doğrulama etkin.' 
                    : 'İki faktörlü doğrulama devre dışı.'}
                </p>
              </div>
              <button
                onClick={enableTwoFactor}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm ${
                  loading 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : twoFactorEnabled 
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300' 
                      : 'bg-green-600/20 hover:bg-green-600/30 text-green-300'
                } transition-colors`}
              >
                {loading ? 'İşleniyor...' : (twoFactorEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir')}
              </button>
            </div>
          </div>
        </div>

        {/* Şüpheli Giriş Uyarıları */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <BellRing className="mr-2 h-4 w-4 text-blue-400" /> 
            Şüpheli Giriş Uyarıları
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Hesabınıza alışılmadık bir konum veya cihazdan giriş yapıldığında size bildirim göndeririz.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Şüpheli Giriş Uyarıları</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={suspiciousLoginAlerts === undefined ? true : suspiciousLoginAlerts}
                  disabled={loading}
                  onChange={toggleLoginAlerts}
                />
                <div className={`w-11 h-6 ${loading ? 'bg-gray-700' : 'bg-gray-700'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Aktif Oturumlar */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <LogOut className="mr-2 h-4 w-4 text-blue-400" /> 
            Aktif Oturumlar
          </h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Hesabınızda oturum açılan tüm cihazları görüntüleyin ve yönetin.
            </p>

            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex justify-between items-center py-3 px-4 bg-gray-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{session.device}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400">{session.location}</p>
                      <span className="text-xs text-gray-500">•</span>
                      <p className="text-xs text-gray-400">{session.lastActive}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.current && (
                      <span className="px-2 py-1 text-xs text-green-400 bg-green-500/10 rounded-full">
                        Şu anki oturum
                      </span>
                    )}
                    {!session.current && (
                      <button
                        onClick={() => terminateSession(session.id)}
                        className="px-3 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors"
                      >
                        Oturumu Kapat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {activeSessions.length > 1 && (
              <button
                onClick={terminateAllOtherSessions}
                className="mt-4 w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm transition-colors"
              >
                Diğer Tüm Oturumları Sonlandır
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SecuritySettings; 