import React, { useState } from 'react';
import { ShieldCheck, LockKeyhole, BellRing, LogOut } from 'lucide-react';

const SecuritySettings = () => {
  // State değişkenleri
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [suspiciousLoginAlerts, setSuspiciousLoginAlerts] = useState(true);
  
  // Aktif oturumlar (örnek veri)
  const [activeSessions, setActiveSessions] = useState([
    { id: 1, device: 'iPhone 13 Pro', location: 'İstanbul, Türkiye', lastActive: '2 dakika önce', current: true },
    { id: 2, device: 'Chrome - Windows', location: 'Ankara, Türkiye', lastActive: '3 saat önce', current: false },
    { id: 3, device: 'Safari - MacBook', location: 'İzmir, Türkiye', lastActive: '2 gün önce', current: false },
  ]);

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
  const enableTwoFactor = () => {
    // Burada normalde iki faktörlü doğrulama akışı başlatılır
    // Bu örnek için sadece state değişimi yapıyoruz
    setTwoFactorEnabled(!twoFactorEnabled);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <ShieldCheck className="mr-2 text-blue-400" />
          Güvenlik Ayarları
        </h2>
      </div>

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
                className={`px-4 py-2 rounded-lg text-sm ${
                  twoFactorEnabled 
                    ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300' 
                    : 'bg-green-600/20 hover:bg-green-600/30 text-green-300'
                } transition-colors`}
              >
                {twoFactorEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir'}
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
                  checked={suspiciousLoginAlerts}
                  onChange={() => setSuspiciousLoginAlerts(!suspiciousLoginAlerts)}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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