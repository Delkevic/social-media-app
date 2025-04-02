import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesCore } from '../components/ui/sparkles';
import { GlowingEffect } from '../components/ui/GlowingEffect';
import { 
  ChevronUp, 
  ChevronDown, 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Music, 
  User,
  ArrowLeft,
  Upload,
  X,
  Video,
  Camera,
  AlertCircle,
  VolumeX,
  Volume2
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/constants';
import { toast, Toaster } from 'react-hot-toast';

// Utility function to convert boolean attributes to strings
// This prevents React warnings about non-boolean attributes
const convertBooleanProps = (props) => {
  const result = { ...props };
  // List of attributes that might be passed as booleans but need to be strings
  const attributesToConvert = ['jsx', 'global'];
  
  attributesToConvert.forEach(attr => {
    if (attr in result && typeof result[attr] === 'boolean') {
      result[attr] = result[attr].toString();
    }
  });
  
  return result;
};

// Video uzantısı için izin verilen dosya türleri
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
// Maksimum dosya boyutu (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Yedek video verisi - API'den veri çekilemediğinde gösterilir
const FALLBACK_REELS = [
  {
    id: 1,
    user: {
      username: 'ahmetk',
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Güvenilir ve açık kaynak test videosu
    caption: 'Yeni dans rutini #dans #müzik',
    likeCount: 1204,
    commentCount: 89,
    shareCount: 32,
    music: 'Şarkı - Sanatçı Adı',
    isLiked: false,
  },
  {
    id: 2,
    user: {
      username: 'melisaz',
      profileImage: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', // Başka bir test videosu
    caption: 'Yaz tatili başlasın #yaz #havuz #tatil',
    likeCount: 2530,
    commentCount: 112,
    shareCount: 45,
    music: 'Yaz Şarkısı - Pop Yıldızı',
    isLiked: false,
  },
];

// Mesaj çubuğu bileşeni
const AuthRequiredBanner = ({ onLogin }) => (
  <motion.div
    className="fixed top-0 left-0 right-0 p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white z-50"
    initial={{ y: -100 }}
    animate={{ y: 0 }}
    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
  >
    <div className="flex items-center justify-between max-w-4xl mx-auto">
      <p className="text-sm md:text-base">
        Reels'i tam olarak deneyimlemek için giriş yapın
      </p>
      <motion.button
        className="px-4 py-2 bg-white text-purple-600 rounded-full text-sm font-medium"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLogin}
      >
        Giriş Yap
      </motion.button>
    </div>
  </motion.div>
);

const Reels = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('explore'); // 'following' veya 'explore'
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRefs = useRef([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [reelCaption, setReelCaption] = useState("Yeni reel #video");
  const [reelMusic, setReelMusic] = useState('Kullanıcı seçimi');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [muted, setMuted] = useState({});
  const [videoErrors, setVideoErrors] = useState({});
  const reelsContainerRef = useRef(null);

  // Token durumunu debug için console'a yazdır
  useEffect(() => {
    console.log('Reels - Oturum durumu:', { 
      userExists: !!user, 
      tokenValue: token, 
      tokenType: typeof token 
    });
  }, [user, token]);

  // API isteği öncesi token kontrolü yapmak için yardımcı fonksiyon
  const secureApiRequest = async (requestFn, fallbackValue = null) => {
    if (!token) {
      toast.error('Bu işlem için giriş yapmanız gerekiyor');
      return fallbackValue;
    }
    
    try {
      return await requestFn();
    } catch (err) {
      if (err.response && err.response.status === 401) {
        toast.error('Oturum süreniz doldu, lütfen tekrar giriş yapın');
        // AuthContext'ten logout fonksiyonunu çağırabilirsiniz
        // logout();
        navigate('/login');
      }
      throw err; // Hata işleme için yeniden fırlat
    }
  };

  // API'den reels verilerini getir
  const fetchReels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('fetchReels - token durumu:', !!token);
      
      // Burada token kontrolü yap
      if (!token) {
        // Token yoksa API çağrısı yapma, yedek verileri göster
        console.info("👤 Kullanıcı oturum açmamış - Yedek Reels verileri gösteriliyor");
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
        // secureApiRequest tarafından hata durumunda null dönebilir
        setReels(FALLBACK_REELS);
        setLoading(false);
        return;
      }
      
      if (response.data.success && response.data.data.length > 0) {
        // Kullanıcının kendi videolarını göster
        console.log('Kullanıcı videoları yüklendi:', response.data.data.length);
        
        // API'den gelen videolar için id'leri string'e dönüştür
        const userReels = response.data.data.map(reel => ({
          ...reel,
          id: String(reel.id)
        }));
        
        // Sadece kullanıcının kendi videolarını göster (fallback videolar olmadan)
        setReels(userReels);
      } else {
        // API başarılı ancak veri yoksa yedek verileri göster
        toast.error('Henüz reel içeriği bulunamadı');
        setReels(FALLBACK_REELS);
      }
    } catch (err) {
      console.error('Reels getirme hatası:', err);
      
      // 401 hatasını özellikle kontrol et
      if (err.response && err.response.status === 401) {
        toast.error('Oturum süresi doldu, lütfen tekrar giriş yapın');
        // Burada ilave aksiyon olarak logout çağrılabilir
      } else {
        setError('Reels yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
      
      setReels(FALLBACK_REELS); // Hata durumunda yedek verileri göster
    } finally {
      setLoading(false);
    }
  };

  // Sekme değiştiğinde reelsleri güncelle
  useEffect(() => {
    setCurrentReelIndex(0); // Sekme değiştiğinde ilk reele git
    fetchReels();
  }, [activeTab, token]);

  // Geçerli videonun referansını ayarla
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, reels.length);
  }, [reels]);

  // Video değiştiğinde oynatma/durdurma
  useEffect(() => {
    const playCurrentVideo = async () => {
      for (let i = 0; i < videoRefs.current.length; i++) {
        if (videoRefs.current[i]) {
          if (i === currentReelIndex) {
            try {
              // Oynatmadan önce video hazır mı kontrol et
              if (videoRefs.current[i].readyState >= 2) { // HAVE_CURRENT_DATA veya daha yüksek
                await videoRefs.current[i].play();
              } else {
                // Video hazır değilse, canplay olayını dinle
                videoRefs.current[i].addEventListener('canplay', async () => {
                  try {
                    await videoRefs.current[i]?.play();
                  } catch (innerErr) {
                    console.warn('Video oynatma iç hatası:', innerErr);
                  }
                }, { once: true }); // Olay bir kez tetiklensin
              }
            } catch (err) {
              console.error('Video oynatma hatası:', err);
              
              // Kullanıcıya bilgi ver
              if (err.name === 'NotSupportedError') {
                toast.error('Video formatı desteklenmiyor. Farklı bir video deneyin.');
              } else if (err.name === 'NotAllowedError') {
                toast.info('Otomatik oynatma engellendi. Videoyu başlatmak için tıklayın.');
              }
            }
          } else {
            videoRefs.current[i].pause();
            videoRefs.current[i].currentTime = 0;
          }
        }
      }
    };

    playCurrentVideo();
  }, [currentReelIndex]);

  // Reels kaydırma işlevi
  const handleScroll = (direction) => {
    if (direction === 'up' && currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1);
    } else if (direction === 'down' && currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(currentReelIndex + 1);
    }
  };

  // Like işlevi
  const handleLike = async (reelId) => {
    // Token kontrolü
    if (!token) {
      toast.error('Bu işlem için giriş yapmanız gerekiyor');
      return;
    }
    
    const reel = reels.find(r => r.id === reelId);
    if (!reel) return;
    
    try {
      if (!reel.isLiked) {
        await secureApiRequest(() => 
          axios.post(`${API_URL}/reels/${reelId}/like`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        );
        
        // UI'ı güncelle
        setReels(reels.map(r => 
          r.id === reelId 
            ? { ...r, isLiked: true, likeCount: r.likeCount + 1 } 
            : r
        ));
      } else {
        await secureApiRequest(() => 
          axios.delete(`${API_URL}/reels/${reelId}/like`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        );
        
        // UI'ı güncelle
        setReels(reels.map(r => 
          r.id === reelId 
            ? { ...r, isLiked: false, likeCount: r.likeCount - 1 } 
            : r
        ));
      }
    } catch (err) {
      console.error('Beğeni işlemi sırasında hata:', err);
      toast.error('Beğeni işlemi sırasında bir hata oluştu');
    }
  };

  // Paylaşım işlevi
  const handleShare = async (reelId) => {
    try {
      await secureApiRequest(() => 
        axios.post(`${API_URL}/reels/${reelId}/share`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );
      
      // UI'ı güncelle
      setReels(reels.map(r => 
        r.id === reelId 
          ? { ...r, shareCount: r.shareCount + 1 } 
          : r
      ));
      
      toast.success('Reel paylaşıldı!');
    } catch (err) {
      console.error('Paylaşım sırasında hata:', err);
      toast.error('Paylaşım sırasında bir hata oluştu');
    }
  };

  // Dokunmatik kaydırma işlevselliği
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartY.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) { // Minimum kaydırma mesafesi
      if (diff > 0) {
        // Aşağı kaydır
        handleScroll('down');
      } else {
        // Yukarı kaydır
        handleScroll('up');
      }
    }

    touchStartY.current = null;
  };

  // Touchpad ve fare tekerleği ile kaydırma işlevselliği
  const handleWheel = (e) => {
    // Doğal kaydırma davranışını engelle
    e.preventDefault();
    
    // Touchpad veya fare tekerleği ile yukarı/aşağı kaydırma
    if (e.deltaY > 20) {
      // Aşağı kaydırma - bir sonraki reel'e geç
      handleScroll('down');
    } else if (e.deltaY < -20) {
      // Yukarı kaydırma - bir önceki reel'e geç
      handleScroll('up');
    }
  };

  // Fare ve touchpad kaydırma işlevselliğini etkinleştir
  useEffect(() => {
    // Reels konteynerini al
    const reelsContainer = document.getElementById('reels-container');
    
    if (reelsContainer) {
      // Wheel (kaydırma) olayını dinlemeye başla
      reelsContainer.addEventListener('wheel', handleWheel, { passive: false });
      
      // Temizleme fonksiyonu
      return () => {
        reelsContainer.removeEventListener('wheel', handleWheel);
      };
    }
  }, [currentReelIndex, reels.length]);

  // handleVideoLoad fonksiyonunu düzenliyorum
  const handleVideoLoad = (index) => {
    console.log(`Video ${index} yüklendi`);
    
    // Video yükleme başarılı olduğunda hata durumunu temizle
    setVideoErrors(prev => ({
      ...prev,
      [index]: false
    }));
    
    // Otomatik oynatmayı başlat
    if (index === currentReelIndex && videoRefs.current[index]) {
      videoRefs.current[index].play().catch(err => {
        console.warn('Otomatik oynatma başlatılamadı:', err);
        
        // Hata durumunda sessiz modda oynatmayı dene
        if (err.name === 'NotAllowedError') {
          setMuted(prev => ({ ...prev, [index]: true }));
          videoRefs.current[index].muted = true;
          videoRefs.current[index].play().catch(e => 
            console.error('Sessiz modda da oynatılamadı:', e)
          );
        }
      });
    }
  };

  // Video oynatma/duraklatma işlevi
  const togglePlay = (index) => {
    if (!videoRefs.current[index]) return;
    
    if (videoRefs.current[index].paused) {
      videoRefs.current[index].play()
        .then(() => {
          console.log(`Video ${index} başlatıldı`);
        })
        .catch(err => {
          console.error(`Video ${index} başlatılamadı:`, err);
          toast.error('Video oynatılırken bir hata oluştu');
        });
    } else {
      videoRefs.current[index].pause();
      console.log(`Video ${index} duraklatıldı`);
    }
  };

  // Ses açma/kapatma fonksiyonu
  const toggleMute = (index) => {
    setMuted(prev => ({ 
      ...prev, 
      [index]: !prev[index] 
    }));
    
    // Video referansını güncelle
    if (videoRefs.current[index]) {
      videoRefs.current[index].muted = !videoRefs.current[index].muted;
    }
  };

  // Klavye tuşlarıyla gezinme
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        handleScroll('up');
      } else if (e.key === 'ArrowDown') {
        handleScroll('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentReelIndex]);

  // Küçültülmüş sayı formatı
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Tab geçiş varyantları
  const tabVariants = {
    inactive: { 
      opacity: 0.5,
      scale: 0.95,
      y: 0,
      transition: { duration: 0.2 }
    },
    active: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.2 }
    }
  };

  // Sekme altı çizgi varyantları
  const underlineVariants = {
    inactive: { 
      opacity: 0,
      width: '0%',
      transition: { duration: 0.2 }
    },
    active: { 
      opacity: 1,
      width: '70%',
      transition: { duration: 0.2 }
    }
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Dosya türü kontrolü
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error(`Desteklenmeyen dosya türü. Desteklenen türler: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
      return;
    }
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Dosya boyutu çok büyük. Maksimum boyut: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    try {
      // Önce modal'ı kapat
      setShowShareModal(false);
      
      // Geçici bir URL oluştur ve önizleme modalı göster
      setShowPreviewModal(true);
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
      
      // Kullanıcıya geliştirme durumu hakkında bilgi ver
      toast.success('Video başarıyla seçildi! Önizleme modunu kullanabilirsiniz.');
      
    } catch (err) {
      console.error('Dosya işleme hatası:', err);
      toast.error('Dosya işlenirken bir hata oluştu.');
    }
  };
  
  // Video seçme fonksiyonu
  const handleSelectVideo = () => {
    fileInputRef.current.click();
  };

  // Kamera açma fonksiyonu
  const handleOpenCamera = () => {
    toast.error("Kamera özelliği şu anda geliştiriliyor!");
  };

  // Video yükleme ve reel oluşturma
  const submitReel = async () => {
    if (!selectedFile) return;
    
    toast.loading('Video yükleniyor...');
    setShowPreviewModal(false);
    
    try {
      // Form verisi oluştur
      const formData = new FormData();
      formData.append('video', selectedFile);
      
      // Videoyu upload API'sine yükle
      const uploadResponse = await secureApiRequest(() => 
        axios.post(`${API_URL}/upload/video`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        })
      );
      
      if (!uploadResponse) {
        toast.dismiss();
        toast.error('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        return;
      }
      
      if (uploadResponse.data.success) {
        toast.dismiss();
        toast.success('Video başarıyla yüklendi! Reel oluşturuluyor...');
        
        // Şimdi reel oluştur
        const reelData = {
          caption: reelCaption || "Yeni reel #video",
          videoURL: uploadResponse.data.data.videoUrl,
          music: reelMusic || 'Kullanıcı seçimi',
          duration: 15
        };
        
        const reelResponse = await secureApiRequest(() => 
          axios.post(`${API_URL}/reels`, reelData, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        );
        
        if (reelResponse && reelResponse.data.success) {
          toast.success('Reel başarıyla oluşturuldu!');
          
          // Form verilerini temizle
          setSelectedFile(null);
          if (previewURL) {
            URL.revokeObjectURL(previewURL);
            setPreviewURL(null);
          }
          setReelCaption("Yeni reel #video");
          setReelMusic('Kullanıcı seçimi');
          
          // Reelleri yeniden yükle
          fetchReels();
        } else {
          toast.error('Reel oluşturulurken bir hata oluştu.');
        }
      } else {
        toast.dismiss();
        toast.error(uploadResponse.data.message || 'Video yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error("Video upload hatası:", error);
      toast.dismiss();
      toast.error('Bir hata oluştu: ' + (error.response?.data?.message || error.message || 'Bilinmeyen bir hata'));
      
      // Form verilerini temizle
      setSelectedFile(null);
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
        setPreviewURL(null);
      }
    }
  };

  // Dosya seçildiğinde
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setPreviewURL(URL.createObjectURL(file));
    setShowPreviewModal(true);
  };

  // URL yardımcı fonksiyonu
  const getProperVideoURL = (url) => {
    if (!url) return "https://www.w3schools.com/html/mov_bbb.mp4";
    
    // Debug için URL'yi konsola yazdır
    console.log('Orijinal video URL:', url);
    
    // URL http(s): ile başlıyorsa dış kaynak olarak doğrudan kullan
    if (url.startsWith('http')) {
      console.log('Dış kaynak video kullanılıyor:', url);
      return url;
    }
    
    // URL'yi analiz et - backend'deki video servis edilme yöntemine göre düzeltme yap
    if (url.startsWith('/uploads/videos/')) {
      // Dosya adını yoldan çıkar
      const fileName = url.split('/').pop();
      const fullUrl = `${API_URL.replace('/api', '')}/uploads/videos/${fileName}`;
      console.log('Static dosya sunucusu URL oluşturuldu:', fullUrl);
      return fullUrl;
    }
    
    // API URL'sini videos endpoint'i ile kullan
    if (url.startsWith('/') && url.includes('videos/')) {
      const fileName = url.split('/').pop();
      const fullUrl = `${API_URL}/videos/${fileName}`;
      console.log('API videos endpoint URL oluşturuldu:', fullUrl);
      return fullUrl;
    }
    
    // Diğer durumlarda API_URL ile birleştir
    const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;
    console.log('Genel URL oluşturuldu:', fullUrl);
    return fullUrl;
  };

  // Başlangıçta videoların sesini kapatma
  useEffect(() => {
    // Kullanıcı tercihi varsa kullan, yoksa varsayılan olarak ses kapalı
    setMuted(reels.reduce((acc, _, index) => {
      acc[index] = true; // Varsayılan olarak sessiz başlat
      return acc;
    }, {}));
  }, [reels.length]);

  return (
    <div 
      className="relative h-screen w-full overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      id="reels-container" // Wheel olayı için ID ekleme
      ref={reelsContainerRef}
    >
      {/* Toast bildirimlerini ekleyelim */}
      <Toaster position="bottom-center" />

      {/* Oturum açmamış kullanıcılar için bilgi banner'ı - sadece token yoksa gösterilmeli */}
      {!token && (
        <AuthRequiredBanner onLogin={() => navigate('/login')} />
      )}
      
      {/* Arka plan efekti */}
      <div className="absolute inset-0 z-0">
        <SparklesCore
          id="reelsSparkles"
          background="transparent"
          minSize={0.4}
          maxSize={1.4}
          particleColor="#FFF"
          particleDensity={30}
          speed={0.6}
          className="w-full h-full"
        />
        <GlowingEffect className="h-full w-full" />
      </div>

      {/* Üst Başlık ve Sekmeler */}
      <div className="absolute top-0 left-0 right-0 z-30">
        {/* Başlık */}
        <div className="p-4 flex items-center justify-between">
          <motion.button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-black/30 backdrop-blur-md"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </motion.button>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Reels
          </h1>
          <div className="w-10" /> {/* Boşluk için */}
        </div>

        {/* Sekmeler */}
        <div className="flex justify-center mb-2">
          <div className="flex space-x-10">
            {/* Takip Ettiklerim Sekmesi */}
            <div className="flex flex-col items-center">
              <motion.button
                onClick={() => setActiveTab('following')}
                variants={tabVariants}
                animate={activeTab === 'following' ? 'active' : 'inactive'}
                className="text-white font-medium px-2 py-1"
              >
                Takip Ettiklerim
              </motion.button>
              <motion.div 
                variants={underlineVariants}
                animate={activeTab === 'following' ? 'active' : 'inactive'}
                className="h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 mt-1 rounded-full"
              />
            </div>

            {/* Keşfet Sekmesi */}
            <div className="flex flex-col items-center">
              <motion.button
                onClick={() => setActiveTab('explore')}
                variants={tabVariants}
                animate={activeTab === 'explore' ? 'active' : 'inactive'}
                className="text-white font-medium px-2 py-1"
              >
                Keşfet
              </motion.button>
              <motion.div 
                variants={underlineVariants}
                animate={activeTab === 'explore' ? 'active' : 'inactive'}
                className="h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 mt-1 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Reels Ana İçerik */}
      <div className="relative z-10 h-full w-full pt-24"> {/* pt-24 üst başlık ve sekmeler için yer açar */}
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div 
              className="h-12 w-12 rounded-full border-4 border-t-purple-500 border-r-purple-300 border-b-transparent border-l-transparent"
              animate={{ 
                rotate: 360,
                transition: { 
                  duration: 1, 
                  ease: "linear",
                  repeat: Infinity
                }
              }}
            />
            <p className="mt-4 text-white/70">Reels yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center p-5">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-3 text-center">Bir Hata Oluştu</h3>
            <p className="text-white/70 text-center mb-4">{error}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/')} 
                className="px-4 py-2 bg-slate-800 rounded-full text-white/80 font-medium"
              >
                Ana Sayfaya Dön
              </button>
              <button 
                onClick={fetchReels}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-white font-medium"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        ) : reels.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-5">
              <User className="h-16 w-16 mx-auto mb-4" style={{ color: "rgba(149, 76, 233, 0.7)" }} />
              <h3 className="text-xl font-medium text-white mb-2">
                {activeTab === 'following' ? 'Takip Ettiğin İçerik Yok' : 'Keşfet İçeriği Yok'}
              </h3>
              <p className="text-white/70">
                {activeTab === 'following' 
                  ? 'Henüz takip ettiğin kişilerin Reels içeriği bulunmuyor.'
                  : 'Henüz keşfedilecek Reels içeriği bulunmuyor.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {/* Video Görüntüleyici - TikTok Tarzı Dikey Kaydırma */}
            <div className="h-full relative flex justify-center overflow-hidden">
              {/* Video konteyneri */}
              <div 
                className="h-full aspect-[9/16] max-w-[500px] relative" 
                style={{
                  transition: 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)'
                }}
              >
                {/* Videolar */}
                {reels.map((reel, index) => (
                  <div 
                    key={reel.id}
                    className={`absolute inset-0 w-full h-full bg-black transition-all duration-500 ${
                      index === currentReelIndex 
                        ? 'opacity-100 z-20 transform-none' 
                        : index < currentReelIndex 
                          ? 'opacity-0 z-10 transform -translate-y-full' 
                          : 'opacity-0 z-10 transform translate-y-full'
                    }`}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Video yüklenene kadar gösterilecek yükleme ekranı */}
                      {videoRefs.current[index]?.readyState < 3 && !videoErrors[index] && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-60 backdrop-blur-sm">
                          <div className="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-white text-sm">Video yükleniyor...</p>
                        </div>
                      )}
                      
                      {/* Video oynatma hatası durumunda gösterilecek ekran */}
                      {videoErrors[index] && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black bg-opacity-60 backdrop-blur-sm">
                          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                          <p className="text-white text-lg font-medium mb-2">Video yüklenemedi</p>
                          <p className="text-white/70 text-sm text-center max-w-xs mb-4">
                            Video yüklenirken bir sorun oluştu. Yedek video otomatik olarak yükleniyor.
                          </p>
                        </div>
                      )}
                      
                      {/* Video elementi */}
                      <video
                        ref={el => { videoRefs.current[index] = el; }}
                        className="h-full w-full object-contain bg-black"
                        src={getProperVideoURL(reel.videoURL)}
                        loop
                        playsInline
                        muted={muted[index] ?? true}
                        onClick={() => togglePlay(index)}
                        onLoadedData={() => handleVideoLoad(index)}
                        onError={(e) => {
                          console.error('Video yüklenirken hata:', e);
                          setVideoErrors(prev => ({
                            ...prev,
                            [index]: true
                          }));
                          
                          toast.error('Video yüklenemedi, yedek video yükleniyor');
                          
                          // Hata durumunda yedek video
                          if (videoRefs.current[index]) {
                            const fallbackUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                            videoRefs.current[index].src = fallbackUrl;
                            videoRefs.current[index].load();
                          }
                        }}
                      />
                      
                      {/* Ses açma/kapatma butonu */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute(index);
                        }}
                        className="absolute bottom-20 right-4 z-20 p-2 rounded-full bg-black/40 backdrop-blur-sm"
                      >
                        {muted[index] ? (
                          <VolumeX className="h-6 w-6 text-white" />
                        ) : (
                          <Volume2 className="h-6 w-6 text-white" />
                        )}
                      </button>
                      
                      {/* Video içerik katmanı */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-30">
                        {/* Bilgiler ve açıklama */}
                        <div className="mt-auto p-4 pointer-events-auto">
                          {/* Kullanıcı bilgileri ve video açıklaması */}
                          <div className="flex items-center mb-3">
                            <motion.div 
                              className="relative rounded-full overflow-hidden h-12 w-12 mr-3 border-2" 
                              style={{ borderColor: "rgba(149, 76, 233, 0.7)" }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <img 
                                src={reel.user?.profileImage} 
                                alt={reel.user?.username}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.target.src = "https://ui-avatars.com/api/?name=" + reel.user?.username + "&background=random";
                                }}
                              />
                            </motion.div>
                            <div className="flex-1">
                              <div className="flex items-center">
                                <h3 className="text-white font-semibold mr-2">@{reel.user?.username}</h3>
                                <motion.button
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    reel.isLiked 
                                      ? 'bg-white/20 text-white' 
                                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLike(reel.id);
                                  }}
                                >
                                  {reel.isLiked ? 'Beğendim' : 'Beğen'}
                                </motion.button>
                              </div>
                              <p className="text-white/80 text-sm line-clamp-2 mt-1">{reel.caption}</p>
                            </div>
                          </div>
                          
                          {/* Müzik bilgisi */}
                          <div className="flex items-center mt-2">
                            <div className="flex items-center bg-black/30 rounded-full px-3 py-1.5">
                              <Music className="h-4 w-4 mr-2 text-white/80" />
                              <p className="text-white/80 text-xs truncate max-w-[150px]">{reel.music || 'Original Sound'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Video kontrolleri ve işlevleri - sağ taraf */}
                      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 pointer-events-auto z-30">
                        {/* Beğen butonu */}
                        <motion.button 
                          className="flex flex-col items-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(reel.id);
                          }}
                        >
                          <div 
                            className="rounded-full bg-black/30 p-3 backdrop-blur-sm"
                            style={reel.isLiked ? { background: 'rgba(255, 55, 95, 0.3)' } : {}}
                          >
                            <Heart 
                              className={`h-7 w-7 ${reel.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                            />
                          </div>
                          <span className="text-white text-xs mt-1">{formatNumber(reel.likeCount)}</span>
                        </motion.button>
                        
                        {/* Yorum butonu */}
                        <motion.button 
                          className="flex flex-col items-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Yorum fonksiyonu buraya eklenecek
                          }}
                        >
                          <div className="rounded-full bg-black/30 p-3 backdrop-blur-sm">
                            <MessageCircle className="h-7 w-7 text-white" />
                          </div>
                          <span className="text-white text-xs mt-1">{formatNumber(reel.commentCount)}</span>
                        </motion.button>
                        
                        {/* Paylaş butonu */}
                        <motion.button 
                          className="flex flex-col items-center"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(reel.id);
                          }}
                        >
                          <div className="rounded-full bg-black/30 p-3 backdrop-blur-sm">
                            <Share2 className="h-7 w-7 text-white" />
                          </div>
                          <span className="text-white text-xs mt-1">{formatNumber(reel.shareCount)}</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Kaydırma ipucu animasyonu */}
              {currentReelIndex < reels.length - 1 && (
                <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 z-30">
                  <motion.div
                    initial={{ opacity: 0.5, y: 0 }}
                    animate={{ opacity: 1, y: 10 }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatType: "reverse", 
                      duration: 1.5 
                    }}
                  >
                    <ChevronDown className="h-6 w-6 text-white/70" />
                  </motion.div>
                </div>
              )}
              
              {/* Video sayacı */}
              <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 z-30">
                <p className="text-white text-xs">
                  {currentReelIndex + 1} / {reels.length}
                </p>
              </div>
              
              {/* Masaüstü için ekstra kontroller */}
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-30 hidden md:flex gap-4">
                <motion.button
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleScroll('up')}
                  disabled={currentReelIndex === 0}
                  style={{ opacity: currentReelIndex === 0 ? 0.5 : 1 }}
                >
                  <ChevronUp className="h-6 w-6 text-white" />
                </motion.button>
                
                <motion.button
                  className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleScroll('down')}
                  disabled={currentReelIndex === reels.length - 1}
                  style={{ opacity: currentReelIndex === reels.length - 1 ? 0.5 : 1 }}
                >
                  <ChevronDown className="h-6 w-6 text-white" />
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Yeni Reel Ekleme Butonu - Paylaş butonu */}
      <motion.button
        className="absolute bottom-24 right-8 z-30 p-4 rounded-full backdrop-blur-md bg-purple-500/30 border border-purple-500/50 text-white shadow-lg"
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 0 20px rgba(149, 76, 233, 0.7)"
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowShareModal(true)}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Modal Dialog */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Arkaplan overlay */}
            <motion.div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
            />
            
            {/* Modal içeriği */}
            <motion.div 
              className="bg-slate-900/70 backdrop-blur-md rounded-xl p-6 w-[90%] max-w-md z-10 border border-purple-500/30 shadow-[0_0_25px_rgba(149,76,233,0.3)]"
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  Reels Paylaş
                </h2>
                <motion.button 
                  className="p-2 rounded-full bg-slate-800/50 backdrop-blur-sm text-white/70"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowShareModal(false)}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              
              {/* Paylaşım seçenekleri */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.button
                  className="bg-slate-800/70 hover:bg-slate-700/70 backdrop-blur-md p-4 rounded-xl flex flex-col items-center gap-3 transition-colors duration-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSelectVideo}
                >
                  <div className="h-12 w-12 rounded-full bg-purple-500/40 backdrop-blur-md border border-purple-500/50 flex items-center justify-center">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white font-medium">Galeri</span>
                  <span className="text-white/60 text-xs text-center">Galeriden video seç</span>
                </motion.button>
                
                <motion.button
                  className="bg-slate-800/70 hover:bg-slate-700/70 backdrop-blur-md p-4 rounded-xl flex flex-col items-center gap-3 transition-colors duration-300"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleOpenCamera}
                >
                  <div className="h-12 w-12 rounded-full bg-purple-500/40 backdrop-blur-md border border-purple-500/50 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white font-medium">Kamera</span>
                  <span className="text-white/60 text-xs text-center">Yeni video çek</span>
                </motion.button>
              </div>
              
              {/* Dosya yükleme giriş alanı */}
              <input 
                type="file" 
                ref={fileInputRef}
                accept="video/*" 
                className="hidden"
                onChange={handleFileChange}
              />
              
              {/* İptal butonu */}
              <div className="flex justify-center">
                <motion.button
                  className="px-5 py-2.5 rounded-lg bg-slate-800/50 backdrop-blur-sm text-white/70 hover:bg-slate-700/50 transition-colors duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(false)}
                >
                  İptal
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Önizleme Modalı */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Arkaplan overlay */}
            <motion.div 
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
            />
            
            {/* Modal içeriği */}
            <motion.div 
              className="bg-slate-900/70 backdrop-blur-md rounded-xl p-6 w-[90%] max-w-md z-10 border border-purple-500/30 shadow-[0_0_25px_rgba(149,76,233,0.3)]"
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  Reel Önizleme
                </h2>
                <motion.button 
                  className="p-2 rounded-full bg-slate-800/50 backdrop-blur-sm text-white/70"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPreviewModal(false)}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              
              {/* Video önizleme */}
              <div className="h-80 w-full rounded-lg overflow-hidden mb-4">
                <video 
                  src={previewURL} 
                  className="h-full w-full object-cover" 
                  controls 
                  loop 
                  playsInline
                />
              </div>
              
              {/* Açıklama ve müzik */}
              <div className="flex flex-col gap-2 mb-4">
                <input 
                  type="text" 
                  value={reelCaption} 
                  onChange={(e) => setReelCaption(e.target.value)}
                  className="bg-slate-800/70 p-3 rounded-lg text-white placeholder:text-white/70"
                  placeholder="Reel açıklaması"
                />
                <input 
                  type="text" 
                  value={reelMusic} 
                  onChange={(e) => setReelMusic(e.target.value)}
                  className="bg-slate-800/70 p-3 rounded-lg text-white placeholder:text-white/70"
                  placeholder="Müzik"
                />
              </div>
              
              {/* Paylaş butonu */}
              <div className="flex justify-center">
                <motion.button
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={submitReel}
                >
                  Paylaş
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reels;