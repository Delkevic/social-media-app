import React, { useState } from 'react';
import { Settings, User, Lock, Bell, Smartphone, Brain, ShieldCheck, FileText, MessageSquare } from 'lucide-react';

// Kategori bileşenlerini import et
import AccountSettings from './components/AccountSettings';
import PrivacySettings from './components/PrivacySettings';
import NotificationSettings from './components/NotificationSettings';
import ApplicationSettings from './components/ApplicationSettings';
import AISettings from './components/AISettings';
import SecuritySettings from './components/SecuritySettings';
import DataPrivacySettings from './components/DataPrivacySettings';
import SupportFeedbackSettings from './components/SupportFeedbackSettings';

const settingsCategories = [
  { id: 'account', name: 'Hesap Ayarları', icon: User, component: AccountSettings },
  { id: 'privacy', name: 'Gizlilik Ayarları', icon: Lock, component: PrivacySettings },
  { id: 'notifications', name: 'Bildirim Ayarları', icon: Bell, component: NotificationSettings },
  { id: 'application', name: 'Uygulama Ayarları', icon: Smartphone, component: ApplicationSettings },
  { id: 'ai', name: 'Yapay Zeka & Öneri Ayarları', icon: Brain, component: AISettings },
  { id: 'security', name: 'Güvenlik Ayarları', icon: ShieldCheck, component: SecuritySettings },
  { id: 'data', name: 'Veri ve Gizlilik', icon: FileText, component: DataPrivacySettings },
  { id: 'support', name: 'Destek ve Geri Bildirim', icon: MessageSquare, component: SupportFeedbackSettings },
];

const SettingsPage = () => {
  const [activeCategory, setActiveCategory] = useState(settingsCategories[0].id);

  const ActiveComponent = settingsCategories.find(cat => cat.id === activeCategory)?.component;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Arkaplan efektleri (istenirse eklenebilir, Home.jsx'ten alınabilir) */}
      {/* <div className="absolute inset-0 w-full h-full z-0">
        <SparklesCore ... />
      </div>
      <div className="absolute inset-0 ... z-0"></div> */}

      <div className="container mx-auto px-4 py-8 flex-grow relative z-10">
        <h1 className="text-3xl font-bold mb-8 flex items-center text-white">
          <Settings className="mr-3 text-[#0affd9]" size={32} />
          Ayarlar
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sol Panel - Kategoriler */}
          <div className="w-full lg:w-1/4 flex-shrink-0">
            <div className="sticky top-8 bg-black/70 backdrop-blur-md border border-[#0affd9]/20 rounded-xl p-4 space-y-2">
              {settingsCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                    activeCategory === category.id
                      ? 'bg-[#0affd9]/10 text-[#0affd9] font-semibold'
                      : 'text-gray-300 hover:bg-black/50 hover:text-gray-100'
                  }`}
                >
                  <category.icon size={18} className="mr-3 flex-shrink-0 text-[#0affd9]/70 group-hover:text-[#0affd9]" /> 
                  <span className="text-sm">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sağ Panel - Kategori İçeriği */}
          <div className="w-full lg:w-3/4">
            <div className="bg-black/70 backdrop-blur-md border border-[#0affd9]/20 rounded-xl p-6 min-h-[400px]">
              {ActiveComponent ? <ActiveComponent /> : <div>Bilinmeyen Kategori</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 