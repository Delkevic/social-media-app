import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical, 
  Trash,
  Link,
  Bookmark,
  BadgeInfo,
  ShieldCheck,
  Flag,
  Download,
  User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const VideoControls = ({ 
  reel, 
  onCommentClick, 
  onLikeClick,
  onSaveClick,
  isLiked = false,
  isSaved = false,
  formatNumber
}) => {
  const { user } = useAuth();
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [activeReelId, setActiveReelId] = useState(null);
  const moreOptionsRef = useRef(null);
  
  // Lüks animasyon efekti için kalp durumu
  const [heartAnimation, setHeartAnimation] = useState(false);
  
  // Dışarıya tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target)) {
        setShowMoreOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reel bağlantısını kopyala
  const copyReelLink = (reelId) => {
    const reelUrl = `${window.location.origin}/reels/${reelId}`;
    navigator.clipboard.writeText(reelUrl)
      .then(() => {
        toast.success('Bağlantı kopyalandı!');
        setShowMoreOptions(false);
      })
      .catch(() => {
        toast.error('Bağlantı kopyalanamadı');
      });
  };
  
  // Beğeni işleyi efekti
  const handleLikeWithAnimation = () => {
    setHeartAnimation(true);
    setTimeout(() => setHeartAnimation(false), 1000);
    
    if (onLikeClick) {
      onLikeClick(reel.id);
    }
  };

  // Şikayet et fonksiyonu
  const reportReel = () => {
    toast.success('Reel şikayet edildi');
    setShowMoreOptions(false);
  };

  // Videoyu indir
  const downloadVideo = () => {
    toast('Video indirme özelliği yakında eklenecek');
    setShowMoreOptions(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Beğeni butonu */}
      <div className="flex flex-col items-center relative">
        <button 
          className="bg-transparent relative"
          onClick={handleLikeWithAnimation}
        >
          <Heart 
            className={`h-8 w-8 transition-colors duration-300 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} 
          />
          
          {/* Beğeni animasyonu */}
          <AnimatePresence>
            {heartAnimation && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.7 }}
              >
                <Heart className="h-8 w-8 text-red-500 fill-red-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <span className="text-white text-xs mt-3">{formatNumber(reel.likeCount || 0)}</span>
      </div>
      
      {/* Yorum butonu */}
      <div className="flex flex-col items-center">
        <button 
          className="bg-transparent"
          onClick={() => onCommentClick && onCommentClick(reel.id)}
        >
          <MessageCircle className="h-8 w-8 text-white" />
        </button>
        <span className="text-white text-xs mt-3">{formatNumber(reel.commentCount || 0)}</span>
      </div>
      
      {/* Kaydet butonu (Eski Paylaş) */}
      <div className="flex flex-col items-center">
        <button 
          className="bg-transparent"
          onClick={() => onSaveClick && onSaveClick(reel.id)}
        >
          <Bookmark 
            className={`h-8 w-8 transition-colors duration-300 ${isSaved ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} 
          />
        </button>
        <span className="text-white text-xs mt-3">Kaydet</span>
      </div>
      
      {/* Daha fazla seçenek butonu */}
      <div className="flex flex-col items-center relative" ref={moreOptionsRef}>
        <button 
          className="bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            setActiveReelId(reel.id);
            setShowMoreOptions(!showMoreOptions);
          }}
        >
          <MoreVertical className="h-8 w-8 text-white" />
        </button>
        <span className="text-white text-xs mt-3">Diğer</span>
        
        {/* Daha fazla seçenek menüsü */}
        {showMoreOptions && activeReelId && (
          <div className="absolute right-12 bottom-0 w-52 bg-slate-800 rounded-lg shadow-lg overflow-hidden z-50">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Kullanıcı profili */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-white text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`${reel.user.username} profili açıldı!`);
                  setShowMoreOptions(false);
                }}
              >
                <User className="h-5 w-5 text-blue-400" />
                <span>Profili Görüntüle</span>
              </button>
            
              {/* Bağlantıyı kopyala */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-white text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  copyReelLink(activeReelId);
                }}
              >
                <Link className="h-5 w-5 text-blue-400" />
                <span>Bağlantıyı Kopyala</span>
              </button>
              
              {/* Videoyu indir */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-white text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadVideo();
                }}
              >
                <Download className="h-5 w-5 text-green-400" />
                <span>Videoyu İndir</span>
              </button>
              
              {/* İçerik bilgisi */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-white text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success('İçerik bilgileri gösteriliyor');
                  setShowMoreOptions(false);
                }}
              >
                <BadgeInfo className="h-5 w-5 text-purple-400" />
                <span>İçerik Bilgisi</span>
              </button>
              
              {/* Şikayet et */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-white text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  reportReel();
                }}
              >
                <Flag className="h-5 w-5 text-yellow-400" />
                <span>Şikayet Et</span>
              </button>
              
              {/* Silme butonu - artık herkes silebilir */}
              <button 
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors duration-200 text-red-500 text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.error('Silme işlemi için gerekli yetkiler alınıyor...');
                  // Gerçekte silme işlemi burada yapılacak
                  setShowMoreOptions(false);
                }}
              >
                <Trash className="h-5 w-5" />
                <span>Sil</span>
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoControls; 