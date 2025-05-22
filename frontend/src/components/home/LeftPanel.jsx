import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Compass, Clapperboard, MessageCircle, Heart, User, Settings, LogOut, SquarePen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // AuthContext yolunu kontrol edin
import { useNotification } from '../../context/NotificationContext'; // useNotification hook'unu ekliyoruz
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import NavigationLinks from './navigation/NavigationLinks';
import CreatePostForm from './posts/CreatePostForm';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const LeftPanel = ({ showMessagesAndNotifications = true, onPostFormToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { togglePanel: toggleNotificationPanel } = useNotification(); // Notification hook'undan togglePanel'i alıyoruz
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [latestGeminiResponse, setLatestGeminiResponse] = useState(null);
  
  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { icon: Home, text: 'Ana Sayfa', path: '/' },
    { icon: Search, text: 'Ara', path: '/search' },
    { icon: Compass, text: 'Keşfet', path: '/explore' },
    { icon: Clapperboard, text: 'Reels', path: '/reels' },
    { icon: MessageCircle, text: 'Mesajlar', path: '/messages', show: showMessagesAndNotifications },
    { icon: Heart, text: 'Bildirimler', onClick: toggleNotificationPanel, show: showMessagesAndNotifications },
    { icon: User, text: 'Profil', path: `/profile/${user?.username}` }, // Kullanıcı adını dinamik olarak al
  ];

  const bottomMenuItems = [
    { icon: Settings, text: 'Ayarlar', path: '/settings' },
    { icon: LogOut, text: 'Çıkış Yap', onClick: logout }, // Çıkış yapma fonksiyonunu onClick ile bağla
  ];
  
  // Post oluşturma için tıklama işleyicisi
  const handleCreatePostClick = () => {
    // Ana Sayfa'da değilsek, Ana Sayfa'ya yönlendir
    if (location.pathname !== '/') {
      window.location.href = '/';
      // Local Storage'a bir flag koy, sayfa yüklendiğinde post formunu açmak için
      localStorage.setItem('openPostForm', 'true');
      return;
    }
    
    // Ana Sayfa'da isek, özel callback'i çağır
    if (onPostFormToggle) {
      onPostFormToggle(true);
    } else {
      // Callback yoksa, modal'ı göster
      setShowCreatePostModal(true);
    }
  };
  
  // Reel oluşturma için tıklama işleyicisi
  const handleCreateReelClick = () => {
    // Reels sayfasında değilsek, Reels sayfasına yönlendir
    if (location.pathname !== '/reels') {
      window.location.href = '/reels';
      // Local Storage'a bir flag koy, sayfa yüklendiğinde reel oluşturma modalını açmak için
      localStorage.setItem('openReelUploader', 'true');
      return;
    }
    
    // Reels sayfasında isek, Reel oluşturma modalını tetikle
    // Bu, Reels.jsx sayfasındaki video yükleme butonunu tetikler
    document.querySelector('#reels-upload-button')?.click();
  };
  
  // Post gönderme işlemi
  const handleSubmitPost = async (postData) => {
    try {
      setIsCreatingPost(true);
      
      console.log('Post oluşturma isteği gönderiliyor:', postData);
      // API'ye gönderi oluşturma isteği gönder
      const response = await api.posts.create(postData);
      console.log('Post oluşturma cevabı:', response);
      
      if (response.success) {
        // Formu kapat
        setShowCreatePostModal(false);
        
        // Gemini yanıtını sakla
        if (postData.geminiResponse) {
          setLatestGeminiResponse(postData.geminiResponse);
          // Yanıtı localStorage'a da kaydedelim
          localStorage.setItem('latestGeminiResponse', postData.geminiResponse);
          console.log("Gemini etiketleri kaydedildi:", postData.geminiResponse);
        }
        
        // Başarı mesajı göster
        toast.success('Gönderi başarıyla oluşturuldu!');
        
        // Sayfayı yenileyelim ki yeni post görünsün
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error('Gönderi oluşturulamadı: ' + (response.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('Post oluşturma hatası:', err);
      toast.error('Gönderi oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setIsCreatingPost(false);
    }
  };

  return (
    <div className="flex flex-col h-full justify-between text-white">
      <div>
        {/* Logo veya Başlık */}
        <div className="mb-8 p-2">
          <Link to="/" className="text-2xl font-bold text-[#0affd9]">
            BUZZİFY
          </Link>
      </div>

        {/* Ana Menü Öğeleri */}
        <nav className="flex flex-col space-y-2">
          {menuItems.map((item) => (
            item.show !== false && (
              item.onClick ? (
                // onClick prop'u varsa, Link yerine button kullan
                <button
                  key={item.text}
                  onClick={item.onClick}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors text-left w-full 
                    ${isActive(item.path) ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'hover:bg-black/70'}`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.text}</span>
                </button>
              ) : (
                // Normal Link kullan
                <Link
                  key={item.text}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-[#0affd9]/20 text-[#0affd9]'
                      : 'hover:bg-black/70'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.text}</span>
                </Link>
              )
            )
          ))}
        </nav>
        
        {/* Oluştur Butonları */}
        <div className="mt-6 pt-4 border-t border-[#0affd9]/20"> {/* Çizgi opaklığı artırıldı */}
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3 px-3">Oluştur</h4>
          <button 
            className="flex items-center w-full px-3 py-2 rounded-lg transition-colors hover:bg-black/70"
            onClick={handleCreatePostClick}
          >
            <SquarePen className="h-5 w-5 mr-3 text-[#0affd9]" />
            <span>Post Paylaş</span>
          </button>
          <button 
            onClick={handleCreateReelClick}
            className="flex items-center w-full px-3 py-2 rounded-lg transition-colors hover:bg-black/70 mt-1"
          >
            <Clapperboard className="h-5 w-5 mr-3 text-[#0affd9]" />
            <span>Reel Paylaş</span>
          </button>
        </div>
      </div>

      {/* Alt Menü Öğeleri (Ayarlar, Çıkış Yap) */}
      <div className="mt-auto pt-4 border-t border-[#0affd9]/20"> {/* Çizgi opaklığı artırıldı */}
        {bottomMenuItems.map((item) => (
          <Link
            key={item.text}
            to={item.onClick ? '#' : item.path} // onClick varsa path'i yok say
            onClick={item.onClick} // onClick olayını doğrudan elemana ata
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-[#0affd9]/20 text-[#0affd9]'
                : 'hover:bg-black/70'
            }`}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span>{item.text}</span>
          </Link>
        ))}
      </div>
      
      {/* Post Oluşturma Modalı */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div 
            className="bg-black/90 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#0affd9]/40 animate-fadeIn"
            style={{
              boxShadow: "0 0 30px rgba(10, 255, 217, 0.3)"
            }}
          >
            {/* Modal Başlık */}
            <div className="bg-gradient-to-r from-[#0affd9]/20 to-black border-b border-[#0affd9]/30 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#0affd9]">Gönderi Oluştur</h3>
              <button 
                onClick={() => setShowCreatePostModal(false)}
                className="text-gray-400 hover:text-[#0affd9] transition-colors p-1.5 rounded-full hover:bg-[#0affd9]/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Form İçeriği */}
            <div className="p-5">
              <CreatePostForm 
                onSubmit={handleSubmitPost} 
                onCancel={() => setShowCreatePostModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;