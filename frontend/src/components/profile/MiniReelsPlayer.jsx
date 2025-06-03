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
      // Tüm reels verilerini konsola yazdır (hata ayıklama)
      console.log("MiniReelsPlayer - Ham Reels Verileri:", reels);
      
      const processedReels = reels.map(reel => {
        // Kullanıcı bilgilerini ayıkla
        const userInfo = reel.user || {};
        
        // Kullanıcı bilgilerinin tüm olası kaynaklarını kontrol et
        const userId = reel.user?.id || reel.userId || reel.user_id || null;
        const username = reel.user?.username || reel.username || reel.user?.name || reel.user?.displayName || reel.displayName || null;
        const profileImage = reel.user?.profileImage || reel.user?.profile_picture || reel.user?.avatar || reel.profile_picture || reel.profileImage || null;
        const isFollowing = reel.user?.isFollowing || reel.isFollowing || false;
        
        // Normalize edilmiş kullanıcı nesnesi
        const normalizedUser = {
          ...userInfo,
          id: userId,
          username: username,
          profileImage: profileImage,
          isFollowing: isFollowing
        };
        
        // Normalize edilmiş kullanıcı bilgilerini log'la
        console.log(`Reel ${reel.id || 'Bilinmeyen'} için normalize edilen kullanıcı:`, normalizedUser);
        
        return {
          ...reel,
          user: normalizedUser
        };
      });
      
      setReelsData(processedReels);
    } else {
      setReelsData([]);
    }
  }, [reels]);

  // URL'den tam medya yolunu oluştur
  const getFullMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // UI Avatars URL'si kontrolü - zaten tam URL olduğu için direkt döndür
    if (url.includes('ui-avatars.com')) return url;
    // URL kontrolü - eğer URL başında slash yoksa ekle
    const formattedUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${formattedUrl}`;
  };

  // Yeni bir reel seçildiğinde videoyu yeniden oynat
  useEffect(() => {
    if (videoRef.current) {
      // Video kaynağının geçerli olduğundan emin ol
      const currentReel = reelsData[currentIndex];
      if (!currentReel || !currentReel.videoURL) {
        console.error('Geçerli bir video URL\'si bulunamadı:', currentReel);
        setIsPlaying(false);
        return;
      }

      videoRef.current.load();
      
      // Otomatik oynatma
      const playPromise = videoRef.current.play();
      
      // Otomatik oynatma hatalarını yönet
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Otomatik oynatma engellendi:', error);
          // Video kaynağını konsola yazdır (hata ayıklama)
          console.log('Video kaynağı:', getFullMediaUrl(currentReel.videoURL));
          setIsPlaying(false);
        });
      }
    }
  }, [currentIndex, reelsData]); // reelsData eklenmeli, liste değiştiğinde ilkini oynat

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
      console.error("Kullanıcı bilgisi bulunamadı:", currentUser);
      return;
    }
    
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    
    if (!token) {
      console.error("Takip etmek için giriş yapmalısınız");
      return;
    }
    
    try {
      const method = currentUser.isFollowing ? 'DELETE' : 'POST';
      // API endpoint'i user ID'sini kullanacak şekilde düzelt
      const endpoint = `${API_BASE_URL}/api/user/follow/${currentUser.id}`;
      
      console.log(`Takip isteği gönderiliyor: ${method} ${endpoint}`);
      console.log("Kullanıcı:", currentUser);
      
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
        console.log(`Takip durumu güncellendi: ${!currentUser.isFollowing ? 'Takip ediliyor' : 'Takip edilmiyor'}`);
      } else {
        const errorText = await response.text();
        console.error("Takip işlemi başarısız oldu:", errorText);
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
      <div className="rounded-2xl overflow-hidden bg-black/50 backdrop-blur-lg border border-[#0affd9]/20 p-4">
        <h3 className="text-[#0affd9] font-medium text-sm mb-2">
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
  
  // Reels sahibi bilgilerini log'la (hata ayıklama)
  console.log("ReelOwner:", reelOwner);
  // Alternatif kaynaklardan kullanıcı adını bul
  const ownerUsername = 
    reelOwner?.username || 
    reelOwner?.name || 
    reelOwner?.displayName || 
    currentReel?.username ||
    currentReel?.user_name ||
    "Bilinmeyen Kullanıcı";
  
  console.log("Görüntülenecek kullanıcı adı:", ownerUsername);

  return (
    <div className="rounded-2xl overflow-hidden bg-black/70 backdrop-blur-lg border border-[#0affd9]/20 p-4">
      <h3 className="text-[#0affd9] font-medium text-sm mb-2 flex items-center justify-between">
        <span>{isExploreMode ? "Keşfet - Reels" : "Mini Reels Oynatıcı"}</span>
        {isExploreMode && <span className="text-xs text-[#0affd9]/70">Tüm Reelsler</span>}
      </h3>
      <div 
        className="relative aspect-[9/16] w-full rounded-lg overflow-hidden cursor-pointer group"
        onClick={togglePlay}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-container rounded-xl"
          poster={currentReel.thumbnail ? getFullMediaUrl(currentReel.thumbnail) : null}
          muted={isMuted}
          loop
          preload="auto"
          playsInline
        >
          <source src={getFullMediaUrl(currentReel.videoURL)} type="video/mp4" />
          <source src={getFullMediaUrl(currentReel.videoURL)} type="video/webm" />
          <source src={getFullMediaUrl(currentReel.videoURL)} type="video/ogg" />
          Video formatı desteklenmiyor.
        </video>
        
        {/* Video Oynat/Duraklat Butonu */} 
        <div 
          className={`absolute inset-0 flex items-center justify-center bg-black/30 
                    transition-opacity duration-300 ${isHovering && !isPlaying ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100`} 
          >
          {!isPlaying && <FaPlay className="text-[#0affd9] text-3xl drop-shadow-lg" />}
        </div>
        
        {/* Ses Kontrolü */} 
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-[#0affd9] hover:bg-[#0affd9]/20 transition-all z-10"
        >
          {isMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
        </button>

        {/* Önceki/Sonraki Reel Butonları */}
        {reelsData.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevReel();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-[#0affd9] hover:bg-[#0affd9]/20 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
            >
              <IoChevronBack size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextReel();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-[#0affd9] hover:bg-[#0affd9]/20 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
            >
              <IoChevronForward size={16} />
            </button>
          </>
        )}
        
        {/* Kullanıcı ve Açıklama Bilgileri */} 
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
          <div className="flex items-center mb-1">
            {/* Kullanıcı profil resmi - farklı kaynaklardan alma */}
            <div className="w-6 h-6 rounded-full mr-2 border border-[#0affd9]/50 overflow-hidden flex-shrink-0">
              <img 
                src={reelOwner?.profileImage ? 
                  getFullMediaUrl(reelOwner.profileImage) : 
                  `https://ui-avatars.com/api/?name=${ownerUsername.charAt(0)}&background=0D1117&color=0AFFD9`
                } 
                alt={ownerUsername} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error("Profil resmi yüklenemedi:", e);
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${ownerUsername.charAt(0)}&background=0D1117&color=0AFFD9`;
                }}
              />
            </div>
            
            {/* Kullanıcı adı gösterimi */}
            <span className="text-white text-xs font-medium drop-shadow-md truncate max-w-[120px]">
              {ownerUsername}
            </span>
            
            {/* Keşfet modunda takip et butonu */}
            {isExploreMode && reelOwner && !isOwnProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow();
                }}
                className={`ml-auto text-xs px-2 py-0.5 rounded-md transition-colors 
                  ${reelOwner.isFollowing 
                    ? 'bg-black/50 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10' 
                    : 'bg-[#0affd9] text-black hover:bg-[#0affd9]/80'
                }`}
              >
                {reelOwner.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </button>
            )}
          </div>
          <p className="text-gray-300 text-[11px] line-clamp-2 drop-shadow-sm">
            {currentReel.description || ''}
          </p>
        </div>
        
        {/* Beğenme, Kaydetme gibi aksiyonlar (sağ alt köşede) */}
        <div className="absolute bottom-16 right-2 flex flex-col items-center space-y-3 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleLike(); }}
            className="flex flex-col items-center text-white transition-colors hover:text-[#0affd9]"
          >
            <FaHeart size={18} className={`${currentReel.isLiked ? 'text-[#0affd9]' : 'text-white'} drop-shadow-md`} />
            <span className="text-[10px] mt-0.5 drop-shadow-sm">{currentReel.likeCount || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleSave(); }}
            className="flex flex-col items-center text-white transition-colors hover:text-[#0affd9]"
          >
            <FaBookmark size={18} className={`${currentReel.isSaved ? 'text-[#0affd9]' : 'text-white'} drop-shadow-md`} />
            <span className="text-[10px] mt-0.5 drop-shadow-sm">Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniReelsPlayer; 