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
  Music, 
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
  Send
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/constants';
import { toast, Toaster } from 'react-hot-toast';

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
    className="fixed top-0 left-0 right-0 p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white z-50"
    initial={{ y: -100 }}
    animate={{ y: 0 }}
    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
  >
    <div className="flex items-center justify-between max-w-4xl mx-auto">
      <p className="text-sm md:text-base">
        Reels'i tam olarak deneyimlemek için giriş yapın
      </p>
      <motion.button
        className="px-4 py-2 bg-white text-purple-600 rounded-full text-sm font-medium"
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
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 mt-4">
      <h3 className="text-sm font-medium mb-3 text-white/70">Reels İçerikleri</h3>
      <div className="flex flex-col space-y-2">
        <button
          onClick={() => setActiveTab('following')}
          className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'following'
              ? 'bg-purple-500/20 text-purple-400 border-l-2 border-purple-500'
              : 'text-white/70 hover:bg-slate-700/50'
          }`}
        >
          <User className="h-4 w-4 mr-2" />
          <span>Takip Ettiklerim</span>
        </button>
        
        <button
          onClick={() => setActiveTab('explore')}
          className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
            activeTab === 'explore'
              ? 'bg-purple-500/20 text-purple-400 border-l-2 border-purple-500'
              : 'text-white/70 hover:bg-slate-700/50'
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

const Reels = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('explore');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRefs = useRef({});
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
  const [isVideoVertical, setIsVideoVertical] = useState(true);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [comments, setComments] = useState(SAMPLE_COMMENTS);
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef(null);
  const [commentsPanelWidth, setCommentsPanelWidth] = useState('360px');

  // Token durumunu debug için console'a yazdır
  useEffect(() => {
    console.log('Reels - Oturum durumu:', { 
      userExists: !!user, 
      tokenValue: token, 
      tokenType: typeof token 
    });
  }, [user, token]);

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
      
      console.log('fetchReels - token durumu:', !!token);
      
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

  // Video değiştiğinde oynatma/durdurma
  useEffect(() => {
    const playCurrentVideo = async () => {
      // Tüm videoları durdur
      for (const index in videoRefs.current) {
        const videoRef = videoRefs.current[index];
        if (videoRef && parseInt(index) !== currentReelIndex) {
          try {
            videoRef.pause();
            videoRef.currentTime = 0;
          } catch (error) {
            console.warn(`Video ${index} durdurulamadı:`, error);
          }
        }
      }
      
      // Mevcut videoyu oynat
      const currentVideo = videoRefs.current[currentReelIndex];
      if (currentVideo) {
        try {
          if (currentVideo.readyState >= 2) {
            await currentVideo.play();
          } else {
            const playWhenReady = async () => {
              try {
                await currentVideo.play();
              } catch (err) {
                console.warn('Video oynatma hatası:', err);
                
                if (err.name === 'NotAllowedError') {
                  setMuted(prev => ({ ...prev, [currentReelIndex]: true }));
                  currentVideo.muted = true;
                  try {
                    await currentVideo.play();
                  } catch (innerErr) {
                    console.error('Sessiz modda da oynatılamadı:', innerErr);
                  }
                }
              }
            };
            
            currentVideo.addEventListener('canplay', playWhenReady, { once: true });
          }
        } catch (err) {
          console.error('Video oynatma hatası:', err);
          
          if (err.name === 'NotSupportedError') {
            toast.error('Video formatı desteklenmiyor. Farklı bir video deneyin.');
          } else if (err.name === 'NotAllowedError') {
            toast.info('Otomatik oynatma engellendi. Videoyu başlatmak için tıklayın.');
            
            setMuted(prev => ({ ...prev, [currentReelIndex]: true }));
            videoRefs.current[currentReelIndex].muted = true;
            try {
              await videoRefs.current[currentReelIndex].play();
            } catch (innerErr) {
              console.error('Sessiz modda da oynatılamadı:', innerErr);
            }
          }
        }
      }
    };

    if (!loading && reels.length > 0) {
      playCurrentVideo();
    }
  }, [currentReelIndex, loading, reels.length]);

  // Dokunmatik kaydırma işlevselliği
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const isScrolling = useRef(false);
  const lastScrollTime = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (!touchStartY.current || isScrolling.current) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = Date.now();
    const diff = touchStartY.current - touchEndY;
    const timeDiff = touchEndTime - touchStartTime.current;

    // Minimum zaman farkı kontrolü
    if (timeDiff < 50) return;

    // Son kaydırmadan bu yana geçen süre kontrolü
    const now = Date.now();
    if (now - lastScrollTime.current < 700) return;

    // Kaydırma hassasiyeti
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      isScrolling.current = true;
      lastScrollTime.current = now;
      
      if (diff > 0 && currentReelIndex < reels.length - 1) {
        // Yukarı kaydırma - sonraki video
        setCurrentReelIndex(prev => prev + 1);
      } else if (diff < 0 && currentReelIndex > 0) {
        // Aşağı kaydırma - önceki video
        setCurrentReelIndex(prev => prev - 1);
      }

      // Kaydırma işlemi bittikten sonra kilidi kaldır
      setTimeout(() => {
        isScrolling.current = false;
      }, 700);
    }

    touchStartY.current = null;
    touchStartTime.current = null;
  };

  // Fare tekerleği ile kaydırma
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    // Son kaydırmadan bu yana geçen süre kontrolü
    const now = Date.now();
    if (now - lastScrollTime.current < 700 || isScrolling.current) return;
    
    const threshold = 50;
    if (Math.abs(e.deltaY) > threshold) {
      isScrolling.current = true;
      lastScrollTime.current = now;
      
      if (e.deltaY > 0 && currentReelIndex < reels.length - 1) {
        // Yukarı kaydırma - sonraki video
        setCurrentReelIndex(prev => prev + 1);
      } else if (e.deltaY < 0 && currentReelIndex > 0) {
        // Aşağı kaydırma - önceki video
        setCurrentReelIndex(prev => prev - 1);
      }

      // Kaydırma işlemi bittikten sonra kilidi kaldır
      setTimeout(() => {
        isScrolling.current = false;
      }, 700);
    }
  }, [currentReelIndex, reels.length]);

  // Klavye ile gezinme
  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 700 || isScrolling.current) return;
      
      isScrolling.current = true;
      lastScrollTime.current = now;
      
      if (e.key === 'ArrowUp' && currentReelIndex > 0) {
        setCurrentReelIndex(prev => prev - 1);
      } else if (e.key === 'ArrowDown' && currentReelIndex < reels.length - 1) {
        setCurrentReelIndex(prev => prev + 1);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 700);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentReelIndex, reels.length]);

  // Video yükleme işleyicisi
  const handleVideoLoad = (index) => {
    console.log(`Video ${index} yüklendi`);
    
    if (videoRefs.current[index]) {
      const video = videoRefs.current[index];
      
      // Video boyutlarını kontrol et
      const videoRatio = video.videoWidth / video.videoHeight;
      const containerRatio = 360 / 640; // Container boyutları
      
      // Her durumda object-fit: contain kullan
      video.style.objectFit = 'contain';
      
      setVideoErrors(prev => ({
        ...prev,
        [index]: false
      }));
      
      // Video dikey mi yatay mı kontrol et
      setIsVideoVertical(videoRatio < 1);
      
      // Videoyu otomatik oynat
      if (index === currentReelIndex) {
        video.play().catch(err => {
          console.warn('Otomatik oynatma başlatılamadı:', err);
          
          if (err.name === 'NotAllowedError') {
            setMuted(prev => ({ ...prev, [index]: true }));
            video.muted = true;
            video.play().catch(e => 
              console.error('Sessiz modda da oynatılamadı:', e)
            );
          }
        });
      }
    }
  };

  // Video oynatma/duraklatma işlevi
  const togglePlay = (index) => {
    if (!videoRefs.current[index]) return;
    
    if (videoRefs.current[index].paused) {
      videoRefs.current[index].play()
        .then(() => {
          console.log(`Video ${index} başlatıldı`);
        })
        .catch(err => {
          console.error(`Video ${index} başlatılamadı:`, err);
          toast.error('Video oynatılırken bir hata oluştu');
        });
    } else {
      videoRefs.current[index].pause();
      console.log(`Video ${index} duraklatıldı`);
    }
  };

  // Ses açma/kapatma fonksiyonu
  const toggleMute = (index) => {
    setMuted(prev => ({ 
      ...prev, 
      [index]: !prev[index] 
    }));
    
    if (videoRefs.current[index]) {
      videoRefs.current[index].muted = !videoRefs.current[index].muted;
    }
  };

  // Küçültülmüş sayı formatı
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Tab geçiş varyantları
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

  // Sekme altı çizgi varyantları
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

  // Video seçme fonksiyonu
  const handleSelectVideo = () => {
    fileInputRef.current.click();
  };

  // Kamera açma fonksiyonu
  const handleOpenCamera = () => {
    toast.error("Kamera özellikleri şu anda geliştiriliyor!");
  };

  // Dosya seçildiğinde
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Dosya türü kontrolü
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error(`Desteklenmeyen dosya türü. Desteklenen türler: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
      return;
    }
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Dosya boyutu çok büyük. Maksimum boyut: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    setSelectedFile(file);
    setPreviewURL(URL.createObjectURL(file));
    setShowPreviewModal(true);
    setShowShareModal(false);
    
    toast.success('Video başarıyla seçildi! Önizleme modunu kullanabilirsiniz.');
  };

  // Video yükleme ve reel oluşturma
  const submitReel = async () => {
    if (!selectedFile) return;
    
    toast.loading('Video yükleniyor...');
    setShowPreviewModal(false);
    
    try {
      // Form verisi oluştur
      const formData = new FormData();
      formData.append('video', selectedFile);
      
      // Videoyu upload API'sine yükle
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
        toast.error('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        return;
      }
      
      if (uploadResponse.data.success) {
        toast.dismiss();
        toast.success('Video başarıyla yüklendi! Reel oluşturuluyor...');
        
        // Şimdi reel oluştur
        const reelData = {
          caption: reelCaption || "Yeni reel #video",
          videoURL: uploadResponse.data.data.videoUrl,
          music: reelMusic || 'Kullanıcı seçimi',
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
          toast.success('Reel başarıyla oluşturuldu!');
          
          // Form verilerini temizle
          setSelectedFile(null);
          if (previewURL) {
            URL.revokeObjectURL(previewURL);
            setPreviewURL(null);
          }
          setReelCaption("Yeni reel #video");
          setReelMusic('Kullanıcı seçimi');
          
          // Reelleri yeniden yükle
          fetchReels();
        } else {
          toast.error('Reel oluşturulurken bir hata oluştu.');
        }
      } else {
        toast.dismiss();
        toast.error(uploadResponse.data.message || 'Video yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error("Video upload hatası:", error);
      toast.dismiss();
      toast.error('Bir hata oluştu: ' + (error.response?.data?.message || error.message || 'Bilinmeyen bir hata'));
      
      // Form verilerini temizle
      setSelectedFile(null);
      if (previewURL) {
        URL.revokeObjectURL(previewURL);
        setPreviewURL(null);
      }
    }
  };

  // URL yardımcı fonksiyonu
  const getProperVideoURL = useCallback((url) => {
    if (!url) return "https://www.w3schools.com/html/mov_bbb.mp4";
    
    console.log('Orijinal video URL:', url);
    
    if (url.startsWith('http')) {
      console.log('Dış kaynak video kullanılıyor:', url);
      return url;
    }
    
    if (url.startsWith('/uploads/videos/')) {
      const fileName = url.split('/').pop();
      const fullUrl = `${API_URL.replace('/api', '')}/uploads/videos/${fileName}`;
      console.log('Static dosya sunucusu URL oluşturuldu:', fullUrl);
      return fullUrl;
    }
    
    if (url.startsWith('/') && url.includes('videos/')) {
      const fileName = url.split('/').pop();
      const fullUrl = `${API_URL}/videos/${fileName}`;
      console.log('API videos endpoint URL oluşturuldu:', fullUrl);
      return fullUrl;
    }
    
    const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : `${API_URL}/${url}`;
    console.log('Genel URL oluşturuldu:', fullUrl);
    return fullUrl;
  }, [API_URL]);

  // Başlangıçta videoların sesini kapatma
  useEffect(() => {
    setMuted(reels.reduce((acc, _, index) => {
      acc[index] = true;
      return acc;
    }, {}));
  }, [reels.length]);

  // Yorumları getir
  const fetchComments = async (reelId) => {
    setComments(SAMPLE_COMMENTS);
    setShowCommentsPanel(true);
    setCommentsPanelWidth('360px');
  };

  // Yorum panelini kapat
  const closeCommentsPanel = () => {
    setCommentsPanelWidth('0px');
    setTimeout(() => {
      setShowCommentsPanel(false);
    }, 300);
  };

  // Yorum gönderme fonksiyonu
  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now(),
      user: {
        username: user?.username || 'misafir',
        profileImage: user?.profileImage || 'https://ui-avatars.com/api/?name=misafir'
      },
      text: commentText,
      likeCount: 0,
      timestamp: 'Şimdi'
    };
    
    setComments([newComment, ...comments]);
    setCommentText('');
    
    if (commentInputRef.current) {
      commentInputRef.current.blur();
    }
  };

  return (
    <div 
      className="relative h-screen w-full overflow-hidden bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      id="reels-container" 
      ref={reelsContainerRef}
    >
      {/* Sparkles Arkaplanı */}
      <div className="fixed inset-0 w-full h-screen">
        <SparklesCore
          id="sparklesEffect"
          background="transparent"
          minSize={0.4}
          maxSize={1.0}
          particleDensity={40}
          className="w-full h-full"
          particleColor="#8B5CF6"
          speed={0.2}
          particleBlur={1}
        />
      </div>

      {/* Gradient Overlay - daha hafif */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/30 backdrop-blur-[1px] z-10" />

      {/* Ana içerik */}
      <div className="relative z-20">
        {/* Toast bildirimlerini ekleyelim */}
        <Toaster position="bottom-center" />

        {/* Oturum açmamış kullanıcılar için bilgi bannerı */}
        {!token && (
          <AuthRequiredBanner onLogin={() => navigate('/login')} />
        )}
        
        {/* Üst bilgi çubuğu */}
        <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="text-white p-2"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <button 
              onClick={() => {
                if (token) {
                  setShowShareModal(true);
                } else {
                  toast.error('Reel paylaşmak için giriş yapmanız gerekiyor');
                }
              }}
              className="text-white p-2"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Ana içerik alanı */}
        <div className="flex h-full">
          {/* Sol Panel - Sadece masaüstünde görünür */}
          <div className="hidden md:block w-1/4 max-w-xs p-4 z-20">
            <LeftPanel user={user} />
            <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* Video alanı - TikTok benzeri tam ekran */}
          <div className="flex-1 relative flex items-center justify-center bg-black"
            style={{ 
              marginRight: showCommentsPanel ? commentsPanelWidth : '0px',
              transition: 'margin-right 0.3s ease-in-out',
              minHeight: 'calc(100vh - 48px)', // Üst bar için 48px boşluk bırak
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {loading ? (
              <div className="h-[85vh] w-[380px] flex flex-col items-center justify-center bg-black/50 rounded-lg">
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
                <p className="mt-4 text-white/70">Reels yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="h-[85vh] w-[380px] flex flex-col items-center justify-center bg-black/50 rounded-lg p-5">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-medium text-white mb-3 text-center">Bir Hata Oluştu</h3>
                <p className="text-white/70 text-center mb-4">{error}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => navigate('/')} 
                    className="px-4 py-2 bg-slate-800 rounded-full text-white/80 font-medium"
                  >
                    Ana Sayfaya Dön
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
              <div className="h-[85vh] w-[380px] flex flex-col items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center p-5">
                  <User className="h-16 w-16 mx-auto mb-4" style={{ color: "rgba(149, 76, 233, 0.7)" }} />
                  <h3 className="text-xl font-medium text-white mb-2">
                    {activeTab === 'following' ? 'Takip Ettiğin İçerik Yok' : 'Keşfet İçeriği Yok'}
                  </h3>
                  <p className="text-white/70">
                    {activeTab === 'following' 
                      ? 'Henüz takip ettiğin kişilerin Reels içeriği bulunmuyor.'
                      : 'Henüz keşfedilecek Reels içeriği bulunmuyor.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8 h-full py-2">
                {/* Video container */}
                <div className="relative w-[420px] h-[calc(100vh-64px)] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  {reels.map((reel, index) => (
                    <div 
                      key={reel.id}
                      className={`absolute inset-0 bg-black transition-all duration-500 ${
                        index === currentReelIndex 
                          ? 'opacity-100 z-20 transform-none' 
                          : index < currentReelIndex 
                            ? 'opacity-0 z-10 transform -translate-y-full' 
                            : 'opacity-0 z-10 transform translate-y-full'
                      }`}
                    >
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Video */}
                        <video
                          ref={el => { videoRefs.current[index] = el; }}
                          className="max-h-full max-w-full h-auto w-auto object-contain" 
                          src={getProperVideoURL(reel.videoURL)}
                          loop
                          playsInline
                          muted={muted[index] ?? true}
                          onClick={() => togglePlay(index)}
                          onLoadedData={() => handleVideoLoad(index)}
                          style={{
                            backgroundColor: 'black'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kaydırma göstergesi */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
                  <motion.div
                    initial={{ opacity: 0.5, y: 0 }}
                    animate={{ opacity: 1, y: 5 }}
                    transition={{ 
                      repeat: Infinity, 
                      repeatType: "reverse", 
                      duration: 1.5 
                    }}
                  >
                    <ChevronDown className="h-5 w-5 text-white/70" />
                  </motion.div>
                </div>

                {/* Video sayacı */}
                <div className="absolute top-20 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 z-30">
                  <p className="text-white text-xs">
                    {currentReelIndex + 1} / {reels.length}
                  </p>
                </div>

                {/* Sağdaki etkileşim butonları */}
                <div className="flex flex-col items-center gap-6">
                  {/* Profil resmi */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                      <img
                        src={reels[currentReelIndex]?.user?.profileImage}
                        alt={reels[currentReelIndex]?.user?.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://ui-avatars.com/api/?name=" + reels[currentReelIndex]?.user?.username;
                        }}
                      />
                    </div>
                    <span className="bg-red-500 text-white text-xs rounded-full px-1 mt-1">+</span>
                  </div>
                  
                  {/* Beğen butonu */}
                  <div className="flex flex-col items-center">
                    <button 
                      className="bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(reels[currentReelIndex]?.id);
                      }}
                    >
                      <Heart
                        className={`h-8 w-8 ${reels[currentReelIndex]?.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
                      />
                    </button>
                    <span className="text-white text-xs mt-1">{formatNumber(reels[currentReelIndex]?.likeCount || 0)}</span>
                  </div>
                  
                  {/* Yorum butonu */}
                  <div className="flex flex-col items-center">
                    <button 
                      className="bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchComments(reels[currentReelIndex]?.id);
                      }}
                    >
                      <MessageCircle className="h-8 w-8 text-white" />
                    </button>
                    <span className="text-white text-xs mt-1">{formatNumber(reels[currentReelIndex]?.commentCount || 0)}</span>
                  </div>
                  
                  {/* Kaydet butonu */}
                  <div className="flex flex-col items-center">
                    <button className="bg-transparent">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                      </svg>
                    </button>
                    <span className="text-white text-xs mt-1">1725</span>
                  </div>
                  
                  {/* Paylaş butonu */}
                  <div className="flex flex-col items-center">
                    <button 
                      className="bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(reels[currentReelIndex]?.id);
                      }}
                    >
                      <Share2 className="h-8 w-8 text-white" />
                    </button>
                    <span className="text-white text-xs mt-1">{formatNumber(reels[currentReelIndex]?.shareCount || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Yorumlar Paneli - YouTube Shorts stilinde */}
          {showCommentsPanel && (
            <motion.div 
              className="fixed right-0 top-0 bottom-0 z-50 bg-black/95 border-l border-zinc-800 overflow-hidden"
              style={{ width: commentsPanelWidth }}
              initial={{ width: "0px" }}
              animate={{ width: commentsPanelWidth }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="flex flex-col h-full w-full">
                {/* Başlık ve kapat butonu */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h2 className="text-white text-lg font-semibold flex gap-2 items-center">
                    Yorumlar
                    <span className="text-base font-normal text-zinc-400">{comments.length}</span>
                  </h2>
                  <button 
                    onClick={closeCommentsPanel}
                    className="p-1 rounded-full text-white hover:bg-zinc-800"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Yorumlar listesi */}
                <div className="flex-1 overflow-y-auto py-2 px-4">
                  {comments.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-zinc-400 text-center">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3 py-2">
                          {/* Profil resmi */}
                          <img 
                            src={comment.user.profileImage}
                            alt={comment.user.username}
                            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.src = "https://ui-avatars.com/api/?name=" + comment.user.username;
                            }}
                          />
                          
                          {/* Yorum içeriği */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-white text-sm font-semibold">@{comment.user.username}</h4>
                                <p className="text-zinc-200 text-sm mt-1">{comment.text}</p>
                              </div>
                              <button className="text-zinc-500">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Yorum alt bilgileri */}
                            <div className="flex items-center text-xs text-zinc-400 mt-2 gap-3">
                              <span>{comment.timestamp}</span>
                              <button className="hover:text-zinc-200">Yanıtla</button>
                              <div className="flex items-center gap-1">
                                <button className="hover:text-zinc-200 flex items-center gap-1">
                                  <Heart className={`h-3 w-3 ${comment.likeCount > 0 ? 'text-red-500 fill-red-500' : ''}`} />
                                  {comment.likeCount > 0 && (
                                    <span className={comment.likeCount > 0 ? 'text-red-500' : ''}>{comment.likeCount}</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Yorum yazma alanı */}
                <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-zinc-600 flex-shrink-0 overflow-hidden">
                    <img 
                      src={user?.profileImage || "https://ui-avatars.com/api/?name=Y"}
                      alt="Profil"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-full px-4 py-2">
                    <input
                      type="text"
                      ref={commentInputRef}
                      placeholder="Yorum ekleyin..."
                      className="flex-1 bg-transparent text-white outline-none text-sm"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSubmitComment();
                        }
                      }}
                    />
                    <button 
                      className={`text-white ${!commentText.trim() ? 'opacity-50' : 'opacity-100'}`}
                      disabled={!commentText.trim()}
                      onClick={handleSubmitComment}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

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
              
              {/* Modal içeriği */}
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
                    Reels Paylaş
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
                
                {/* Paylaşım seçenekleri */}
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
                    <span className="text-white/60 text-xs text-center">Galeriden video seç</span>
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
                    <span className="text-white/60 text-xs text-center">Yeni video çek</span>
                  </motion.button>
                </div>
                
                {/* Dosya yükleme giriş alanı */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="video/*" 
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {/* İptal butonu */}
                <div className="flex justify-center">
                  <motion.button
                    className="px-5 py-2.5 rounded-lg bg-slate-800/50 backdrop-blur-sm text-white/70 hover:bg-slate-700/50 transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowShareModal(false)}
                  >
                    İptal
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Önizleme Modalı */}
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
              
              {/* Modal içeriği */}
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
                    Reel Önizleme
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
                
                {/* Video önizleme */}
                <div className="h-80 w-full rounded-lg overflow-hidden mb-4">
                  <video 
                    src={previewURL} 
                    className="h-full w-full object-cover" 
                    controls 
                    loop 
                    playsInline
                  />
                </div>
                
                {/* Açıklama ve müzik */}
                <div className="flex flex-col gap-2 mb-4">
                  <input 
                    type="text" 
                    value={reelCaption} 
                    onChange={(e) => setReelCaption(e.target.value)}
                    className="bg-slate-800/70 p-3 rounded-lg text-white placeholder:text-white/70"
                    placeholder="Reel açıklaması"
                  />
                  <input 
                    type="text" 
                    value={reelMusic} 
                    onChange={(e) => setReelMusic(e.target.value)}
                    className="bg-slate-800/70 p-3 rounded-lg text-white placeholder:text-white/70"
                    placeholder="Müzik"
                  />
                </div>
                
                {/* Paylaş butonu */}
                <div className="flex justify-center">
                  <motion.button
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={submitReel}
                  >
                    Paylaş
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Reels;