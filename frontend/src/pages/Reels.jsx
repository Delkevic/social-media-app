import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import LeftPanel from '../components/home/LeftPanel';
import { 
  ChevronUp, 
  ChevronDown, 
  Heart, 
  MessageCircle, 
  Share2,
  Plus, 
  User,
  ArrowLeft,
  Upload,
  X,
  Video,
  Camera,
  AlertCircle,
  VolumeX,
  Volume2,
  MoreVertical,
  Send,
  Trash,
  Copy,
  Link,
  Bookmark
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, DEFAULT_VIDEO_THUMBNAIL } from '../config/constants';
import { toast, Toaster } from 'react-hot-toast';

// Komponentleri içe aktar
import ReelsVideoPlayer from '../components/reels/ReelsVideoPlayer';
import VideoControls from '../components/reels/VideoControls';
import CommentsPanel from '../components/reels/CommentsPanel';
import ReelsHeader from '../components/reels/ReelsHeader';
import VideoUploader from '../components/reels/VideoUploader';

// Utility function to convert boolean attributes to strings
const convertBooleanProps = (props) => {
  const result = { ...props };
  const attributesToConvert = ['jsx', 'global'];
  
  attributesToConvert.forEach(attr => {
    if (attr in result && typeof result[attr] === 'boolean') {
      result[attr] = result[attr].toString();
    }
  });
  
  return result;
};

// Video uzantısı için izin verilen dosya türleri
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
// Maksimum dosya boyutu (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Yedek video verisi - API'den veri çekilemediğinde gösterilir
const FALLBACK_REELS = [
  {
    id: '1',
    user: {
      username: 'ahmetk',
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    caption: 'Yeni dans rutini #dans #müzik',
    likeCount: 1204,
    commentCount: 89,
    shareCount: 32,
    music: 'Şarkı - Sanatçı Adı',
    isLiked: false,
  },
  {
    id: '2',
    user: {
      username: 'melisaz',
      profileImage: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    caption: 'Yaz tatili başlasın #yaz #havuz #tatil',
    likeCount: 2530,
    commentCount: 112,
    shareCount: 45,
    music: 'Yaz Şarkısı - Pop Yıldızı',
    isLiked: false,
  },
];

// Örnek yorum verileri
const SAMPLE_COMMENTS = [
  {
    id: 1,
    user: {
      username: 'AhmetArslan-j5m',
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    text: 'Yanlışım varsa düzeltin ama manwa\'da da durum böyleydi parkta izleyip, yer değiş tekniği ile gidiyordu. Novel\'i okumadım bilmiyorum.',
    likeCount: 15,
    timestamp: '8 saat önce'
  },
  {
    id: 2,
    user: {
      username: 'ramiznifteliyev6083',
      profileImage: 'https://randomuser.me/api/portraits/men/43.jpg',
    },
    text: 'Benim bildiğim kadarıyla gölgeleri kamera gibi kullanma özelliğini sonradan kazanıyordu, hatta bu özelliği test ederken Cha Hae in\'i banyo yaparken yakalamıştı',
    likeCount: 13,
    timestamp: '8 saat önce (düzenlendi)'
  },
  {
    id: 3,
    user: {
      username: 'ahmetbro4890',
      profileImage: 'https://randomuser.me/api/portraits/men/55.jpg',
    },
    text: 'Animedeki çok daha mantıklı olmuş gerçekten',
    likeCount: 0,
    timestamp: '5 saat önce'
  }
];

// Mesaj çubuğu bileşeni
const AuthRequiredBanner = ({ onLogin }) => (
  <motion.div
    className="fixed top-0 left-0 right-0 p-4 bg-gradient-to-r from-[#0affd9] to-[#037c68] text-black z-50"
    initial={{ y: -100 }}
    animate={{ y: 0 }}
    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
  >
    <div className="flex items-center justify-between max-w-4xl mx-auto">
      <p className="text-sm md:text-base">
        Reels'i tam olarak deneyimlemek için giriş yapın
      </p>
      <motion.button
        className="px-4 py-2 bg-black text-[#0affd9] rounded-full text-sm font-medium"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLogin}
      >
        Giriş Yap
      </motion.button>
    </div>
  </motion.div>
);

// Sol panele eklenecek seçici bileşeni
const TabSelector = ({ activeTab, setActiveTab }) => {
  return (
    <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 mt-4 border border-[#0affd9]/20">
      <h3 className="text-sm font-medium mb-3 text-[#0affd9]">Reels İçerikleri</h3>
      <div className="flex flex-col space-y-2">
        <button
          onClick={() => setActiveTab('following')}
          className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'following'
              ? 'bg-[#0affd9]/20 text-[#0affd9] border-l-2 border-[#0affd9]'
              : 'text-white/70 hover:bg-black/70'
          }`}
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          <span>Takip Ettiklerim</span>
        </button>
        
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'explore'
              ? 'bg-[#0affd9]/20 text-[#0affd9] border-l-2 border-[#0affd9]'
              : 'text-white/70 hover:bg-black/70'
          }`}
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Keşfet</span>
        </button>
      </div>
    </div>
  );
};

// Reels İstatistikleri Bileşeni
const ReelsStats = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 mt-4">
      <h3 className="text-sm font-medium mb-3 text-white/70">Reels İstatistikleri</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
          <p className="text-purple-400 text-lg font-bold">2.5K</p>
          <p className="text-white/60 text-xs">İzlendi</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
          <p className="text-purple-400 text-lg font-bold">128</p>
          <p className="text-white/60 text-xs">Beğeni</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
          <p className="text-purple-400 text-lg font-bold">48</p>
          <p className="text-white/60 text-xs">Yorum</p>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
          <p className="text-purple-400 text-lg font-bold">12</p>
          <p className="text-white/60 text-xs">Paylaşım</p>
        </div>
      </div>
    </div>
  );
};

// Popüler Hesaplar Bileşeni
const PopularAccounts = () => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 mt-4">
      <h3 className="text-sm font-medium mb-3 text-white/70">Popüler Hesaplar</h3>
      <div className="flex flex-col space-y-3">
        {/* Hesap 1 */}
        <div className="flex items-center space-x-2">
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Melis" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">melisaz</p>
            <p className="text-white/60 text-xs">2.3M takipçi</p>
          </div>
          <button className="text-xs text-white px-2 py-1 rounded-full bg-purple-600">Takip Et</button>
        </div>
        
        {/* Hesap 2 */}
        <div className="flex items-center space-x-2">
          <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Ahmet" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">ahmetk</p>
            <p className="text-white/60 text-xs">1.5M takipçi</p>
          </div>
          <button className="text-xs text-white px-2 py-1 rounded-full bg-purple-600">Takip Et</button>
        </div>
        
        {/* Hesap 3 */}
        <div className="flex items-center space-x-2">
          <img src="https://randomuser.me/api/portraits/women/22.jpg" alt="Ayşe" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">aysegul_</p>
            <p className="text-white/60 text-xs">987K takipçi</p>
          </div>
          <button className="text-xs text-white px-2 py-1 rounded-full bg-purple-600">Takip Et</button>
        </div>
        
        {/* Tümünü Gör butonu */}
        <button className="text-purple-400 text-sm font-medium mt-2 hover:text-purple-300 transition-colors">
          Tümünü Gör →
        </button>
      </div>
    </div>
  );
};

const Reels = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('explore');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const reelsContainerRef = useRef(null);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [activeReelId, setActiveReelId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [likedReels, setLikedReels] = useState({});
  const [savedReels, setSavedReels] = useState({});
  const lastTouchY = useRef(null);
  const touchStartTime = useRef(null);
  const isScrolling = useRef(false);
  const lastScrollTime = useRef(0);
  
  // localStorage'dan openReelUploader bayrağını kontrol et
  useEffect(() => {
    const openReelUploader = localStorage.getItem('openReelUploader');
    if (openReelUploader === 'true') {
      setShowUploadModal(true); // Reel yükleme modalını aç
      // Bayrağı temizle
      localStorage.removeItem('openReelUploader');
    }
  }, []);

  // API isteği öncesi token kontrolü yapmak için yardımcı fonksiyon
  const secureApiRequest = useCallback(async (requestFn, fallbackValue = null) => {
    if (!token) {
      toast.error('Bu işlem için giriş yapmanız gerekiyor');
      return fallbackValue;
    }
    
    try {
      return await requestFn();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
        navigate('/login');
      }
      throw err;
    }
  }, [token, navigate]);

  // API'den reels verilerini getir
  const fetchReels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        console.info("👤 Kullanıcı oturum açmamış - Yedek Reels verileri gösteriliyor");
        setReels(FALLBACK_REELS);
        setLoading(false);
        return;
      }
      
      const feedType = activeTab === 'following' ? 'following' : 'explore';
      
      const response = await secureApiRequest(() => 
        axios.get(`${API_URL}/reels?feed=${feedType}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );
      
      if (!response) {
        setReels(FALLBACK_REELS);
        setLoading(false);
        return;
      }
      
      if (response.data.success && response.data.data.length > 0) {
        console.log('Kullanıcı videoları yüklendi:', response.data.data.length);
        
        const userReels = response.data.data.map(reel => ({
          ...reel,
          id: String(reel.id)
        }));
        
        setReels(userReels);
      } else {
        toast.error('Henüz reel içeriği bulunamadı');
        setReels(FALLBACK_REELS);
      }
    } catch (err) {
      console.error('Reels getirme hatası:', err);
      
      if (err.response && err.response.status === 401) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
      } else {
        setError('Reels yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
      setReels(FALLBACK_REELS);
    } finally {
      setLoading(false);
    }
  }, [activeTab, token, secureApiRequest]);

  // Sekme değiştiğinde reelsleri güncelle
  useEffect(() => {
    setCurrentReelIndex(0);
    fetchReels();
  }, [activeTab, token, fetchReels]);

  // Dokunma olaylarını işle
  const handleTouchStart = (e) => {
    lastTouchY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (!lastTouchY.current) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const touchDiff = lastTouchY.current - touchEndY;
    const touchDuration = Date.now() - touchStartTime.current;
    
    // İki kez tetiklenme durumunu önlemek için zaman kontrol ekleyelim
    const now = Date.now();
    if (now - lastScrollTime.current < 1000 || isScrolling.current) {
      lastTouchY.current = null;
      return;
    }
    
    // Kaydırma olayı başlatıldığında kilitleme yapalım
    isScrolling.current = true;
    lastScrollTime.current = now;
    
    // Hızlı dokunuşlar için daha yavaş tepki verelim, eşik değerini artıralım
    const speedFactor = Math.max(0.7, Math.min(1, touchDuration / 300));
    const threshold = 70 * speedFactor; // Eşik değerini artırdık
    
    if (Math.abs(touchDiff) > threshold) {
      if (touchDiff > 0 && currentReelIndex < reels.length - 1) {
        // Aşağı swipe
        setCurrentReelIndex(prevIndex => prevIndex + 1);
      } else if (touchDiff < 0 && currentReelIndex > 0) {
        // Yukarı swipe
        setCurrentReelIndex(prevIndex => prevIndex - 1);
      }
      
      // Kaydırma işlemi bittikten sonra 1 saniye daha beklet
      setTimeout(() => {
        isScrolling.current = false;
      }, 1000);
    } else {
      // Eşik değeri aşılmadıysa kilidi hemen kaldır
      isScrolling.current = false;
    }
    
    lastTouchY.current = null;
  };

  // Tekerlek olayı işleyicisi
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    // Zaman kontrolleriyle kaydırma olaylarının beklenmeyen davranışlarını önle
    const now = Date.now();
    if (now - lastScrollTime.current < 1000 || isScrolling.current) return;
    
    // Olayın şiddetini kontrol et
    const wheelDelta = Math.abs(e.deltaY);
    // Çok hafif kaydırmalar için işlem yapma (kazara tetiklenmeleri önle)
    if (wheelDelta < 20) return;
    
    isScrolling.current = true;
    lastScrollTime.current = now;
    
    // Mevcut kaydırma yönüne göre bir indeks değiştir
    if (e.deltaY > 0 && currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }
    
    // Kaydırma kilidini biraz daha uzun süre beklet
    setTimeout(() => {
      isScrolling.current = false;
    }, 1000);
  }, [currentReelIndex, reels.length]);

  // Tekerlek olaylarını dinle
  useEffect(() => {
    const container = reelsContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel]);
  
  // Klavye olaylarını dinle
  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 1000 || isScrolling.current) return;
      
      // Sadece yukarı/aşağı ok tuşları için işlem yap
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      
      isScrolling.current = true;
      lastScrollTime.current = now;
      
      if (e.key === 'ArrowUp' && currentReelIndex > 0) {
        setCurrentReelIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentReelIndex < reels.length - 1) {
        setCurrentReelIndex(prev => prev + 1);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 1000);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentReelIndex, reels.length]);

  // Küçültülmüş sayı formatı
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Beğeni işlevi
  const handleLike = async (reelId) => {
    if (!token) {
      toast.error('Beğenmek için giriş yapmanız gerekiyor');
      return;
    }
    
    // Optimistik UI güncelleme
    setLikedReels(prev => ({
      ...prev,
      [reelId]: !prev[reelId]
    }));
    
    setReels(prevReels => 
      prevReels.map(reel => 
        reel.id === reelId 
          ? { 
              ...reel, 
              likeCount: likedReels[reelId] ? reel.likeCount - 1 : reel.likeCount + 1,
              isLiked: !likedReels[reelId]
            } 
          : reel
      )
    );
    
    try {
      // API ile beğeni işlemi
      await secureApiRequest(() => 
        axios.post(`${API_URL}/reels/${reelId}/like`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    } catch (err) {
      console.error('Beğeni işlemi hatası:', err);
      
      // Hata durumunda UI'ı geri al
      setLikedReels(prev => ({
        ...prev,
        [reelId]: !prev[reelId]
      }));
      
      setReels(prevReels => 
        prevReels.map(reel => 
          reel.id === reelId 
            ? { 
                ...reel, 
                likeCount: likedReels[reelId] ? reel.likeCount + 1 : reel.likeCount - 1,
                isLiked: likedReels[reelId]
              } 
            : reel
        )
      );
      
      toast.error('Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  // Kaydetme işlevi
  const handleSave = async (reelId) => {
    if (!token) {
      toast.error('Kaydetmek için giriş yapmanız gerekiyor');
      return;
    }

    // Optimistik UI güncelleme
    const wasSaved = savedReels[reelId];
    setSavedReels(prev => ({
      ...prev,
      [reelId]: !wasSaved
    }));

    try {
      // API ile kaydetme/kaydı geri alma işlemi
      // TODO: Backend endpoint'i hazır olduğunda burayı güncelle
      // await secureApiRequest(() => 
      //   axios.post(`${API_URL}/reels/${reelId}/save`, {}, {
      //     headers: { Authorization: `Bearer ${token}` }
      //   })
      // );
      toast.success(wasSaved ? 'Kaydedilenlerden çıkarıldı!' : 'Kaydedildi!'); // Geçici bildirim
    } catch (err) {
      console.error('Kaydetme işlemi hatası:', err);

      // Hata durumunda UI'ı geri al
      setSavedReels(prev => ({
        ...prev,
        [reelId]: wasSaved // Önceki duruma döndür
      }));

      toast.error('Kaydetme işlemi sırasında bir hata oluştu');
    }
  };

  // Yorum panelini aç
  const handleComment = (reelId) => {
    setActiveReelId(reelId);
    setShowCommentsPanel(true);
  };

  // Paylaşma işlevi
  const handleShare = async (reelId) => {
    try {
      const shareUrl = `${window.location.origin}/reels/${reelId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Reel Paylaş',
          text: 'Bu reel hoşuma gitti, sence de güzel mi?',
          url: shareUrl
        });
        
        toast.success('Paylaşım başarılı!');
      } else {
        // Web Paylaşım API'si mevcut değilse, URL'yi kopyala
        navigator.clipboard.writeText(shareUrl)
          .then(() => toast.success('Bağlantı kopyalandı!'))
          .catch(() => toast.error('Bağlantı kopyalanamadı'));
      }
      
      // Paylaşım sayısını arttır (optimistik UI)
      setReels(prevReels => 
        prevReels.map(reel => 
          reel.id === reelId 
            ? { ...reel, shareCount: reel.shareCount + 1 } 
            : reel
        )
      );
      
      // API ile paylaşım kaydı (isteğe bağlı)
      await secureApiRequest(() => 
        axios.post(`${API_URL}/reels/${reelId}/share`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );
    } catch (err) {
      console.error('Paylaşım hatası:', err);
    }
  };

  // Yorum panelini kapat
  const closeCommentsPanel = () => {
    setShowCommentsPanel(false);
    setActiveReelId(null);
  };
  
  // Giriş sayfasına yönlendir
  const navigateToLogin = () => {
    navigate('/login');
  };
  
  // Video yükleme başarılı olduğunda
  const handleUploadSuccess = (newReel) => {
    setReels(prevReels => [newReel, ...prevReels]);
    setCurrentReelIndex(0); // İlk reele git
    toast.success('Yeni reel eklendi!');
  };

  return (
    <div 
      className="relative h-screen w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      id="reels-container" 
      ref={reelsContainerRef}
    >
      {/* Toast bildirimleri */}
      <Toaster position="top-center" />
      
      {/* Sparkles Arkaplanı - neon yeşil/turkuaz renge dönüştürülüyor */}
      <div className="w-full absolute inset-0 h-screen">
        {convertBooleanProps({
          component: <SparklesCore
            id="reelsBackgroundParticles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={70}
            className="w-full h-full"
            particleColor="#0affd9"
            speed={0.3}
            jsx="true"
            global="true"
          />
        }).component}
      </div>
      
      {/* Radyal gradient maskesi - rengi değiştiriliyor */}
      <div 
        className="absolute inset-0 w-full h-full bg-black opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>

      {/* Giriş gerektiren mesaj - rengi güncelleniyor */}
      {!user && (
        <motion.div
          className="fixed top-0 left-0 right-0 p-4 bg-gradient-to-r from-[#0affd9] to-[#037c68] text-black z-50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <p className="text-sm md:text-base">
              Reels'i tam olarak deneyimlemek için giriş yapın
            </p>
            <motion.button
              className="px-4 py-2 bg-black text-[#0affd9] rounded-full text-sm font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={navigateToLogin}
            >
              Giriş Yap
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Ana içerik */}
      <div className="relative flex h-screen z-20">
        {/* Sol Panel - sınır rengi değiştiriliyor */}
        <div className={`hidden md:block w-64 lg:w-72 h-full border-r border-[#0affd9]/20 p-4 ${showCommentsPanel ? 'animate-slide-left' : ''}`}>
          <LeftPanel showMessagesAndNotifications={false} />
          
          {/* Tab Seçici - zaten yukarıda güncellendi */}
          <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Reels İstatistikleri */}
          <ReelsStats />
          
          {/* Popüler Hesaplar - zaten yukarıda güncellendi */}
          <PopularAccounts />
          
          {/* Video Yükleme Butonu - rengi değiştiriliyor */}
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3 mt-4 border border-[#0affd9]/20">
            <h3 className="text-sm font-medium mb-3 text-[#0affd9]">Yeni İçerik</h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-[#0affd9] to-[#037c68] hover:from-[#0affd9]/90 hover:to-[#037c68]/90 text-black rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span>Reel Oluştur</span>
            </button>
          </div>
        </div>
        
        {/* Ana içerik alanı - navbar kaldırıldı ve içerik tam ekran yapıldı */}
        <div className={`flex-1 h-full ${showCommentsPanel ? 'animate-slide-left-main' : ''}`}>
          {/* Reels içeriği - h-screen ile tam ekran yapıldı ve py-4 ile dikey boşluk eklendi */}
          <div className="flex items-center justify-center h-screen py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="w-16 h-16 border-t-2 border-b-2 border-[#0affd9] rounded-full animate-spin mb-4"></div>
                <p className="text-lg">Reels yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
                <div className="text-red-500 text-6xl mb-4">😕</div>
                <h3 className="text-xl font-bold text-white mb-2">Bir hata oluştu</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <div className="flex gap-4">
                  <button 
                    className="px-4 py-2 bg-black/70 hover:bg-black text-white rounded-lg transition-colors border border-[#0affd9]/30"
                    onClick={() => navigate('/')}
                  >
                    Ana sayfaya dön
                  </button>
                  <button 
                    className="px-4 py-2 bg-[#0affd9] hover:bg-[#0affd9]/80 text-black rounded-lg transition-colors"
                    onClick={() => fetchReels()}
                  >
                    Tekrar dene
                  </button>
                </div>
              </div>
            ) : reels.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 max-w-md text-center">
                <div className="text-yellow-500 text-6xl mb-4">🤔</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {activeTab === 'following' 
                    ? 'Takip ettiğin kimsenin reeli yok' 
                    : 'Henüz keşfedilecek reel yok'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {activeTab === 'following'
                    ? 'Daha fazla kişiyi takip etmeyi veya keşfet bölümüne bakmayı deneyebilirsin.'
                    : 'İlk reeli oluşturmak ister misin?'}
                </p>
                <div className="flex gap-4">
                  {activeTab === 'following' ? (
                    <button 
                      className="px-4 py-2 bg-[#0affd9] hover:bg-[#0affd9]/80 text-black rounded-lg transition-colors"
                      onClick={() => setActiveTab('explore')}
                    >
                      Keşfete git
                    </button>
                  ) : (
                    <button 
                      className="px-4 py-2 bg-[#0affd9] hover:bg-[#0affd9]/80 text-black rounded-lg transition-colors"
                      onClick={() => setShowUploadModal(true)}
                    >
                      Reel oluştur
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {/* Reels alanı - Tam ekranı kaplayan bir container */}
                <div className="relative flex flex-row gap-8">
                  {/* Video container - daha büyük boyutta ve tam ekran - yüksekliği biraz azaltıldı (100vh - padding) */}
                  <div 
                    className="relative w-full max-w-[500px] aspect-[9/16] rounded-xl overflow-hidden bg-black md:h-[calc(100vh-32px)] shadow-2xl"
                    style={{ 
                      boxShadow: "0 0 25px rgba(10, 255, 217, 0.5)",
                      border: "1px solid rgba(10, 255, 217, 0.2)"
                    }}
                  >
                    {/* Yukarı kaydırma indikatörü - renkleri güncelleniyor */}
                    {currentReelIndex > 0 && (
                      <motion.div 
                        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center border border-[#0affd9]/30"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <ChevronUp className="h-4 w-4 text-[#0affd9] mr-1.5" />
                        <span className="text-[#0affd9] text-xs">Yukarı kaydır</span>
                      </motion.div>
                    )}
                    
                    {/* Reels */}
                    {reels.map((reel, index) => (
                      <div 
                        key={reel.id}
                        className={`absolute inset-0 transition-all duration-500 ${
                          index === currentReelIndex 
                            ? 'opacity-100 z-20 transform-none' 
                            : index < currentReelIndex 
                              ? 'opacity-0 z-10 transform -translate-y-full' 
                              : 'opacity-0 z-10 transform translate-y-full'
                        }`}
                      >
                        {/* Video oynatıcı */}
                        <ReelsVideoPlayer 
                          video={reel} 
                          isActive={index === currentReelIndex}
                        />
                        
                        {/* Video bilgileri (caption, username, vb.) - takip et butonu rengi değiştiriliyor */}
                        <div className="absolute bottom-24 left-4 right-16 z-30 bg-gradient-to-t from-black/70 to-transparent pt-16 pb-3 px-2 -mx-2 rounded-b-xl">
                          <h4 className="text-white font-bold flex items-center text-lg">
                            {reel.user.username}
                            <span className="ml-2 text-sm bg-[#0affd9] text-black px-1.5 py-0.5 rounded-full text-[10px] font-medium">Takip Et</span>
                          </h4>
                          <p className="text-white text-sm mt-1.5">{reel.caption}</p>
                          <div className="flex items-center mt-2 text-white/80 text-xs">
                            <div className="flex items-center">
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                              </svg>
                              <span className="truncate max-w-[200px]">{reel.music}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobil ekranlarda (md breakpoint altında) içerideki kontrol butonları */}
                        <div className="absolute bottom-4 right-3 z-30 md:hidden">
                          <VideoControls 
                            reel={reel} 
                            onLikeClick={handleLike}
                            onCommentClick={handleComment}
                            onShareClick={handleShare}
                            onSaveClick={handleSave}
                            isLiked={likedReels[reel.id] || reel.isLiked}
                            isSaved={savedReels[reel.id]}
                            formatNumber={formatNumber}
                          />
                        </div>
                      </div>
                    ))}
                    
                    {/* Aşağı kaydırma indikatörü - renkleri güncelleniyor */}
                    {currentReelIndex < reels.length - 1 && (
                      <motion.div 
                        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center border border-[#0affd9]/30"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <ChevronDown className="h-4 w-4 text-[#0affd9] mr-1.5" />
                        <span className="text-[#0affd9] text-xs">Aşağı kaydır</span>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Masaüstü ekranlarda (md breakpoint üstünde) dışarıdaki kontrol butonları */}
                  {reels.length > 0 && (
                    <div className="hidden md:flex items-center">
                      <VideoControls 
                        reel={reels[currentReelIndex]} 
                        onLikeClick={handleLike}
                        onCommentClick={handleComment}
                        onShareClick={handleShare}
                        onSaveClick={handleSave}
                        isLiked={likedReels[reels[currentReelIndex].id] || reels[currentReelIndex].isLiked}
                        isSaved={savedReels[reels[currentReelIndex].id]}
                        formatNumber={formatNumber}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Yorumlar paneli */}
        <CommentsPanel 
          isVisible={showCommentsPanel}
          reelId={activeReelId}
          onClose={closeCommentsPanel}
        />
      </div>
      
      {/* Video yükleme modali */}
      <VideoUploader 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        secureApiRequest={secureApiRequest}
      />
      
      {/* Gizli upload butonu - LeftPanel'den erişilebilir */}
      <button 
        id="reels-upload-button" 
        className="hidden"
        onClick={() => setShowUploadModal(true)}
      />
    </div>
  );
};

export default Reels;