import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaHeart, FaBookmark } from 'react-icons/fa';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { AiOutlineUserAdd, AiOutlineUserDelete } from 'react-icons/ai';
import { API_BASE_URL } from '../../config/constants';

const MiniReelsPlayer = ({ reels, user, isExploreMode = false, isOwnProfile = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [reelsData, setReelsData] = useState([]);
  const videoRef = useRef(null);

  // Eğer videolar yoksa boş bir dizi olarak ayarla
  useEffect(() => {
    if (reels && reels.length > 0) {
      setReelsData(reels);
    } else {
      setReelsData([]);
    }
  }, [reels]);

  // URL'den tam medya yolunu oluştur
  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  // Yeni bir reel seçildiğinde videoyu yeniden oynat
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      
      // Otomatik oynatma
      const playPromise = videoRef.current.play();
      
      // Otomatik oynatma hatalarını yönet
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Otomatik oynatma engellendi:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentIndex]);

  // Oynat/durdur işlevi
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(error => {
          console.error('Oynatma hatası:', error);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Ses kapat/aç işlevi
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Sonraki reele geç
  const goToNextReel = () => {
    if (reelsData.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reelsData.length);
    }
  };

  // Önceki reele geç
  const goToPrevReel = () => {
    if (reelsData.length > 0) {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? reelsData.length - 1 : prevIndex - 1
      );
    }
  };

  // Reeli beğen/beğenme
  const toggleLike = async () => {
    if (!reelsData || reelsData.length === 0) return;
    
    const currentReel = reelsData[currentIndex];
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.error("Beğenmek için giriş yapmalısınız");
      return;
    }
    
    try {
      const method = currentReel.isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`${API_BASE_URL}/api/reels/${currentReel.id}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Yerel veri güncelleniyor
        const updatedReels = [...reelsData];
        updatedReels[currentIndex] = {
          ...currentReel,
          isLiked: !currentReel.isLiked,
          likeCount: currentReel.isLiked 
            ? (currentReel.likeCount > 0 ? currentReel.likeCount - 1 : 0) 
            : currentReel.likeCount + 1
        };
        setReelsData(updatedReels);
      } else {
        console.error("Beğeni işlemi başarısız oldu:", await response.text());
      }
    } catch (error) {
      console.error("Beğeni işlemi sırasında hata:", error);
    }
  };

  // Kullanıcıyı takip et/takibi bırak
  const toggleFollow = async () => {
    if (!reelsData || reelsData.length === 0 || !isExploreMode) return;
    
    const currentReel = reelsData[currentIndex];
    const currentUser = currentReel?.user;
    
    if (!currentUser || !currentUser.id) {
      console.error("Kullanıcı bilgisi bulunamadı");
      return;
    }
    
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.error("Takip etmek için giriş yapmalısınız");
      return;
    }
    
    try {
      const method = currentUser.isFollowing ? 'DELETE' : 'POST';
      const endpoint = `${API_BASE_URL}/api/user/follow/${currentUser.id}`;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Yerel veri güncelleniyor
        const updatedReels = [...reelsData];
        updatedReels[currentIndex] = {
          ...currentReel,
          user: {
            ...currentUser,
            isFollowing: !currentUser.isFollowing
          }
        };
        setReelsData(updatedReels);
      } else {
        console.error("Takip işlemi başarısız oldu:", await response.text());
      }
    } catch (error) {
      console.error("Takip işlemi sırasında hata:", error);
    }
  };

  // Reeli kaydet/kaydetmeyi geri al
  const toggleSave = async () => {
    if (!reelsData || reelsData.length === 0) return;
    
    const currentReel = reelsData[currentIndex];
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.error("Kaydetmek için giriş yapmalısınız");
      return;
    }
    
    try {
      const method = currentReel.isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`${API_BASE_URL}/api/reels/${currentReel.id}/save`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Yerel veri güncelleniyor
        const updatedReels = [...reelsData];
        updatedReels[currentIndex] = {
          ...currentReel,
          isSaved: !currentReel.isSaved
        };
        setReelsData(updatedReels);
      } else {
        console.error("Kaydetme işlemi başarısız oldu:", await response.text());
      }
    } catch (error) {
      console.error("Kaydetme işlemi sırasında hata:", error);
    }
  };

  // Kaydedilen Reels'leri görüntüle
  const navigateToSavedReels = () => {
    // Burada URL'yi değiştirmek yerine kişisel bir prop ile bunu uygulayabilirsiniz
    // Bu örnek için sadece konsola logluyoruz
    console.log("Kaydedilen Reels'lere git");
    // Gerçek projede burada bir redirect veya state değişikliği yapabilirsiniz
    window.location.href = '/saved-reels';
  };

  // Eğer reelsler yoksa
  if (reelsData.length === 0) {
    return (
      <div className="rounded-2xl overflow-hidden bg-[rgba(20,24,36,0.7)] backdrop-blur-lg border border-[rgba(255,255,255,0.1)] p-4">
        <h3 className="text-gray-300 font-medium text-sm mb-2">
          {isExploreMode ? "Keşfet - Reels" : "Mini Reels Oynatıcı"}
        </h3>
        <p className="text-gray-400 text-xs">
          {isExploreMode 
            ? "Keşfet modunda gösterilecek reels bulunamadı." 
            : "Bu kullanıcının henüz reels videosu bulunmuyor."}
        </p>
      </div>
    );
  }

  const currentReel = reelsData[currentIndex];
  
  // Şu anki reelin kullanıcı bilgilerini al
  const reelOwner = isExploreMode ? currentReel?.user : user;

  return (
    <div className="rounded-2xl overflow-hidden bg-[rgba(20,24,36,0.7)] backdrop-blur-lg border border-[rgba(255,255,255,0.1)] p-4">
      <h3 className="text-gray-300 font-medium text-sm mb-2 flex items-center justify-between">
        <span>{isExploreMode ? "Keşfet - Reels" : "Mini Reels Oynatıcı"}</span>
        {isExploreMode && <span className="text-xs text-blue-400">Tüm Reelsler</span>}
      </h3>
      
      <div 
        className="relative aspect-[9/16] rounded-lg overflow-hidden mb-3 bg-black" 
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Video Elementi */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain" 
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
        >
          <source src={getFullMediaUrl(currentReel?.media_url || currentReel?.videoURL)} type="video/mp4" />
          Tarayıcınız video etiketini desteklemiyor.
        </video>
        
        {/* Oynatma Kontrolleri - Hover durumunda görünür */}
        <div className={`absolute bottom-2 left-2 right-2 flex justify-between items-center transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={togglePlay}
            className="bg-black bg-opacity-50 rounded-full p-1.5 text-white hover:bg-opacity-70"
          >
            {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
          </button>
          
          <button 
            onClick={toggleMute}
            className="bg-black bg-opacity-50 rounded-full p-1.5 text-white hover:bg-opacity-70"
          >
            {isMuted ? <FaVolumeMute size={12} /> : <FaVolumeUp size={12} />}
          </button>
        </div>
        
        {/* İleri/Geri Butonları - Hover durumunda görünür */}
        {reelsData.length > 1 && (
          <>
            <button
              onClick={goToPrevReel}
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
            >
              <IoChevronBack size={16} />
            </button>
            <button
              onClick={goToNextReel}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70 transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
            >
              <IoChevronForward size={16} />
            </button>
          </>
        )}
        
        {/* Video üzerinde oynatma/durdurma göstergesi - Sadece tıklandığında kısa süre görünür */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-30 rounded-full p-3">
              <FaPlay size={24} className="text-white" />
            </div>
          </div>
        )}
      </div>
      
      {/* Reel Bilgileri */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <img 
            src={getFullMediaUrl(reelOwner?.profile_picture || reelOwner?.profileImage) || '/images/default-avatar.png'} 
            alt={reelOwner?.username} 
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-white text-xs font-medium">{reelOwner?.username}</span>
        </div>
        
        {/* Takip Et butonu - Sadece explore modunda ve takip edilebilir kullanıcılar için görünür */}
        {isExploreMode && reelOwner && reelOwner.id && (
          <button
            onClick={toggleFollow}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs ${
              reelOwner.isFollowing 
                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {reelOwner.isFollowing ? (
              <>
                <AiOutlineUserDelete size={12} />
                <span>Takibi Bırak</span>
              </>
            ) : (
              <>
                <AiOutlineUserAdd size={12} />
                <span>Takip Et</span>
              </>
            )}
          </button>
        )}
      </div>
      
      {/* Reel Açıklaması */}
      {(currentReel?.caption || currentReel?.description) && (
        <p className="text-gray-300 text-xs line-clamp-2">{currentReel?.caption || currentReel?.description}</p>
      )}
      
      {/* Reel Numarası, Beğeni ve Kaydetme */}
      <div className="mt-2 text-xs text-gray-400 flex justify-between items-center">
        <span>{currentIndex + 1} / {reelsData.length}</span>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={toggleLike} 
            className="flex items-center text-xs group focus:outline-none"
          >
            <FaHeart 
              className={`w-3.5 h-3.5 mr-1 transition-colors duration-200 ${currentReel?.isLiked ? 'text-red-500' : 'text-gray-300 group-hover:text-red-400'}`} 
            />
            <span className="text-gray-300">{currentReel?.likeCount || 0}</span>
          </button>
          
          <button 
            onClick={toggleSave} 
            className="flex items-center text-xs group focus:outline-none"
            title={currentReel?.isSaved ? "Kaydedildi" : "Kaydet"}
          >
            <FaBookmark 
              className={`w-3.5 h-3.5 transition-colors duration-200 ${currentReel?.isSaved ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'}`} 
            />
          </button>
        </div>
      </div>
      
      {/* Kaydedilen Reels butonu - Sadece kendi profilindeyken görünür */}
      {isOwnProfile && (
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <button 
            onClick={navigateToSavedReels}
            className="w-full flex items-center justify-center space-x-1 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 transition-colors text-blue-400 text-xs font-medium"
          >
            <FaBookmark size={12} />
            <span>Kaydedilen Reels'leri Göster</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MiniReelsPlayer; 