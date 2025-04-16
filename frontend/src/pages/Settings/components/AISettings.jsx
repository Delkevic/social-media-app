import React, { useState } from 'react';
import { Brain, Target, ShieldAlert } from 'lucide-react';

const AISettings = () => {
  // State
  const [contentRecommendations, setContentRecommendations] = useState(true);
  const [interestBasedContent, setInterestBasedContent] = useState(true);
  const [adPersonalization, setAdPersonalization] = useState(false);
  const [locationBasedRecommendations, setLocationBasedRecommendations] = useState(false);
  
  // Interest categories (Örnek)
  const [interests, setInterests] = useState({
    music: true,
    technology: true,
    art: true,
    food: false,
    travel: true,
    sports: false,
  });

  const handleToggle = (key) => {
    switch (key) {
      case 'contentRecommendations':
        setContentRecommendations(!contentRecommendations);
        break;
      case 'interestBasedContent':
        setInterestBasedContent(!interestBasedContent);
        break;
      case 'adPersonalization':
        setAdPersonalization(!adPersonalization);
        break;
      case 'locationBasedRecommendations':
        setLocationBasedRecommendations(!locationBasedRecommendations);
        break;
      default:
        break;
    }
  };

  const handleInterestToggle = (interest) => {
    setInterests({
      ...interests,
      [interest]: !interests[interest],
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Brain className="mr-2 text-blue-400" />
          Yapay Zeka ve Öneri Ayarları
        </h2>
      </div>

      <section className="space-y-6">
        {/* Öneri Ayarları */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Target className="mr-2 h-4 w-4 text-blue-400" /> 
            İçerik Önerileri
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">İçerik Önerileri</p>
                <p className="text-xs text-gray-400">
                  Algoritma tarafından ilgi alanlarınıza göre özelleştirilmiş içerik önerilerini aktifleştirin.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={contentRecommendations}
                  onChange={() => handleToggle('contentRecommendations')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">İlgi Alanlarına Göre Kişiselleştirme</p>
                <p className="text-xs text-gray-400">
                  Beğenileriniz ve etkileşimlerinize göre içerik keşfini kişiselleştirin.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={interestBasedContent}
                  onChange={() => handleToggle('interestBasedContent')}
                  disabled={!contentRecommendations}
                />
                <div className={`w-11 h-6 ${!contentRecommendations ? 'bg-gray-600 opacity-50' : 'bg-gray-700'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Konuma Dayalı Öneriler</p>
                <p className="text-xs text-gray-400">
                  Konumunuza göre içerik ve etkinlik önerilerini etkinleştirin.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={locationBasedRecommendations}
                  onChange={() => handleToggle('locationBasedRecommendations')}
                  disabled={!contentRecommendations}
                />
                <div className={`w-11 h-6 ${!contentRecommendations ? 'bg-gray-600 opacity-50' : 'bg-gray-700'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* İlgi Alanları */}
        {interestBasedContent && contentRecommendations && (
          <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
            <h3 className="font-medium text-gray-200 mb-4">
              İlgi Alanları
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-3">
                Keşfet akışınızda görmek istediğiniz içerik kategorilerini seçin.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(interests).map(([interest, isSelected]) => (
                  <div key={interest} className="flex items-center">
                    <input
                      id={`interest-${interest}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleInterestToggle(interest)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <label
                      htmlFor={`interest-${interest}`}
                      className="ms-2 text-sm font-medium text-gray-300 capitalize"
                    >
                      {interest === 'art' ? 'Sanat' : 
                        interest === 'music' ? 'Müzik' : 
                        interest === 'technology' ? 'Teknoloji' : 
                        interest === 'sports' ? 'Spor' : 
                        interest === 'food' ? 'Yemek' : 
                        interest === 'travel' ? 'Seyahat' : interest}
                    </label>
                  </div>
                ))}
              </div>
              <button
                className="mt-4 px-4 py-2 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors rounded-lg inline-flex"
                onClick={() => console.log('İlgi alanlarını güncelle')}
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        )}

        {/* Veri Kullanımı */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <ShieldAlert className="mr-2 h-4 w-4 text-blue-400" /> 
            Veri Kullanımı
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Reklam ve Öneriler için Veri Kullanımı</p>
                <p className="text-xs text-gray-400">
                  Etkileşimlerinizin ve verilerinizin kişiselleştirilmiş reklamlar için kullanılmasına izin verin.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={adPersonalization}
                  onChange={() => handleToggle('adPersonalization')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 italic">
              Not: Bu ayar kapalı olsa bile temel reklam içeriğini görebilirsiniz, ancak bu reklamlar ilgi alanlarınıza göre kişiselleştirilmez.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AISettings; 