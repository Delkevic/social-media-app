import React, { useState } from 'react';
import { Smartphone, Languages, Moon, Sun, Image, Info } from 'lucide-react';

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

  // App info
  const appVersion = 'v1.0.5';
  const lastUpdated = '15 Mayıs 2024';

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleDarkModeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleHighQualityMediaToggle = () => {
    setHighQualityMedia(!highQualityMedia);
  };

  const handleWifiHighQualityToggle = () => {
    setWifiHighQuality(!wifiHighQuality);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Smartphone className="mr-2 text-blue-400" />
          Uygulama Ayarları
        </h2>
      </div>

      <section className="space-y-6">
        {/* Dil Seçimi */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Languages className="mr-2 h-4 w-4 text-blue-400" /> 
            Dil Seçimi
          </h3>
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-2">
              Uygulama arayüzünde görüntülenecek dili seçin.
            </p>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="w-full py-2.5 px-3 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:ring-blue-500 focus:border-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tema Seçimi */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            {darkMode ? <Moon className="mr-2 h-4 w-4 text-blue-400" /> : <Sun className="mr-2 h-4 w-4 text-orange-400" />}
            Tema Seçimi
          </h3>
          <div className="space-y-4">
            <p className="text-xs text-gray-400">
              Uygulamanın renk temasını kişiselleştirin.
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {darkMode ? (
                  <Moon className="h-5 w-5 text-blue-400" />
                ) : (
                  <Sun className="h-5 w-5 text-orange-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-300">
                    {darkMode ? 'Karanlık Mod' : 'Aydınlık Mod'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {darkMode ? 'Koyu arka plan, açık içerik' : 'Açık arka plan, koyu içerik'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={darkMode}
                  onChange={handleDarkModeToggle}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Medya Kalitesi */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Image className="mr-2 h-4 w-4 text-blue-400" /> 
            Yüksek Kalite Medya Ayarları
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Yüksek Kalite Medya</p>
                <p className="text-xs text-gray-400">
                  Fotoğraf ve videoları her zaman yüksek kalitede göster. Bu seçenek daha fazla veri kullanımına neden olabilir.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={highQualityMedia}
                  onChange={handleHighQualityMediaToggle}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Wi-Fi'de Yüksek Kalite</p>
                <p className="text-xs text-gray-400">
                  Sadece Wi-Fi bağlantısında yüksek kaliteli medya göster. Mobil veride kapatarak veri tasarrufu sağlayabilirsiniz.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={wifiHighQuality}
                  onChange={handleWifiHighQualityToggle}
                  disabled={highQualityMedia}
                />
                <div className={`w-11 h-6 ${highQualityMedia ? 'bg-gray-600 opacity-50' : 'bg-gray-700'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Uygulama Versiyonu */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Info className="mr-2 h-4 w-4 text-blue-400" /> 
            Uygulama Versiyonu & Güncellemeler
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Uygulama Versiyonu</p>
                <p className="text-sm font-medium text-gray-300">{appVersion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Son Güncelleme</p>
                <p className="text-sm font-medium text-gray-300">{lastUpdated}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <button
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                onClick={() => console.log('Güncellemeleri kontrol et')}
              >
                Güncellemeleri Kontrol Et
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ApplicationSettings; 