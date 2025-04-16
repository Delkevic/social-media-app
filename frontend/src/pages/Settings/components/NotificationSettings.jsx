import React, { useState } from 'react';
import { Bell, UserPlus, Heart, MessageSquare, Mail, BellOff } from 'lucide-react';

const NotificationSettings = () => {
  // Bildirim ayarları state'leri
  const [notificationSettings, setNotificationSettings] = useState({
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
    
    // Push Bildirimleri
    pushEnabled: true
  });

  // Toggle handler
  const handleToggle = (key) => {
    setNotificationSettings({
      ...notificationSettings,
      [key]: !notificationSettings[key]
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-200 flex items-center">
          <Bell className="mr-2 text-blue-400" />
          Bildirim Ayarları
        </h2>
      </div>

      <section className="space-y-6">
        {/* Anlık Bildirimler */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Bell className="mr-2 h-4 w-4 text-blue-400" /> 
            Anlık Bildirimler
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserPlus className="h-5 w-5 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Takipçi geldiğinde</p>
                  <p className="text-xs text-gray-400">
                    Sizi takip eden yeni kullanıcılar olduğunda bildirim alın.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.newFollower}
                  onChange={() => handleToggle('newFollower')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="h-5 w-5 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Yorum/Beğeni alındığında</p>
                  <p className="text-xs text-gray-400">
                    Paylaşımlarınız beğenildiğinde veya yorum aldığında bildirim alın.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.newLike}
                  onChange={() => handleToggle('newLike')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-300">Yeni mesaj geldiğinde</p>
                  <p className="text-xs text-gray-400">
                    Size gelen direkt mesajlar için bildirim alın.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.newMessage}
                  onChange={() => handleToggle('newMessage')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* E-posta Bildirimleri */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <Mail className="mr-2 h-4 w-4 text-blue-400" /> 
            E-posta Bildirimleri
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Yeni takipçiler hakkında e-posta</p>
                <p className="text-xs text-gray-400">
                  Sizi takip eden yeni kullanıcılar hakkında e-posta bildirimleri alın.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.emailNewFollower}
                  onChange={() => handleToggle('emailNewFollower')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Beğeni ve yorumlar hakkında e-posta</p>
                <p className="text-xs text-gray-400">
                  Paylaşımlarınıza gelen beğeni ve yorumlar hakkında e-posta bildirimleri alın.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.emailNewLike}
                  onChange={() => handleToggle('emailNewLike')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Yeni mesajlar hakkında e-posta</p>
                <p className="text-xs text-gray-400">
                  Size gelen direkt mesajlar hakkında e-posta bildirimleri alın.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.emailNewMessage}
                  onChange={() => handleToggle('emailNewMessage')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Push Bildirimleri Aç/Kapat */}
        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
          <h3 className="font-medium text-gray-200 mb-4 flex items-center">
            <BellOff className="mr-2 h-4 w-4 text-blue-400" /> 
            Push Bildirimleri Aç/Kapat
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Push Bildirimleri</p>
                <p className="text-xs text-gray-400">
                  Tüm push bildirimlerini aç veya kapat.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationSettings.pushEnabled}
                  onChange={() => handleToggle('pushEnabled')}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-sm text-gray-400 italic">
              Not: Push bildirimleri, tarayıcı ayarlarınızdan da izin vermeniz gerekebilir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NotificationSettings; 