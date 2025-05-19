import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Heart, MessageCircle, Share2, ChevronUp, ChevronDown, 
  VolumeX, Volume2, Music, User, Send, Bookmark
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";

const ReelShow = ({ reel, reels = [], isOpen, onClose, profileUser }) => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null);
  const videoRefs = useRef({});
  const touchStartY = useRef(null);
  
  const [comment, setComment] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localReels, setLocalReels] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (reels.length > 0) {
      setLocalReels([...reels]);
    } else if (reel) {
      setLocalReels([reel]);
    }
  }, [reels, reel]);

  useEffect(() => {
    if (reel && reels.length > 0) {
      const index = reels.findIndex((r) => r.id === reel.id);
      if (index !== -1) {
        setCurrentReelIndex(index);
      }
    }
  }, [reel, reels]);

  useEffect(() => {
    if (isOpen && videoRefs.current[currentReelIndex]) {
      const videoElement = videoRefs.current[currentReelIndex];
      if (videoElement) {
        videoElement.pause();
        videoElement.load();
        videoElement.play().catch(err => {
          console.log("Autoplay prevented:", err);
        });
      }
      
      Object.entries(videoRefs.current).forEach(([idx, video]) => {
        if (parseInt(idx) !== currentReelIndex && video) {
          video.pause();
          video.currentTime = 0;
        }
      });
    }
    
    return () => {
      Object.values(videoRefs.current).forEach(video => {
        if (video) video.pause();
      });
    };
  }, [isOpen, currentReelIndex]);

  const currentReel = localReels[currentReelIndex];

  const handleLike = async () => {
    if (isLiking || !currentReel) return;
    
    setIsLiking(true);
    
    try {
      const newLikeState = !currentReel.isLiked;
      
      setLocalReels(prevReels => 
        prevReels.map((r, idx) => 
          idx === currentReelIndex 
            ? {
                ...r,
                isLiked: newLikeState,
                likeCount: newLikeState ? r.likeCount + 1 : r.likeCount - 1
              }
            : r
        )
      );
      
      if (newLikeState) {
        await api.reels.like(currentReel.id);
        toast.success("Reels beğenildi");
      } else {
        await api.reels.unlike(currentReel.id);
        toast.success("Beğeni kaldırıldı");
      }
    } catch (error) {
      console.error("Beğenme işlemi başarısız:", error);
      toast.error("İşlem başarısız oldu, lütfen tekrar deneyin.");
      
      setLocalReels(prevReels => 
        prevReels.map((r, idx) => 
          idx === currentReelIndex 
            ? {
                ...r,
                isLiked: !r.isLiked,
                likeCount: !r.isLiked ? r.likeCount + 1 : r.likeCount - 1
              }
            : r
        )
      );
    } finally {
      setIsLiking(false);
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Kaydedilenlerden kaldırıldı" : "Kaydedilenlere eklendi");
  };

  const toggleCommentForm = async () => {
    setShowCommentForm(!showCommentForm);
    
    if (!showCommentForm && !comments.length) {
      await loadComments();
    }
  };

  const loadComments = async () => {
    if (!currentReel || loadingComments) return;
    
    setLoadingComments(true);
    
    try {
      const response = await api.reels.getComments(currentReel.id);
      if (response.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error("Yorumlar yüklenirken hata:", error);
      toast.error("Yorumlar yüklenemedi");
    } finally {
      setLoadingComments(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    
    if (!comment.trim() || !currentReel) return;
    
    try {
      const response = await api.reels.addComment(currentReel.id, comment.trim());
      
      if (response.success) {
        toast.success("Yorum eklendi");
        setComment("");
        
        setComments(prev => [response.data.comment, ...prev]);
        
        setLocalReels(prevReels => 
          prevReels.map((r, idx) => 
            idx === currentReelIndex 
              ? {...r, commentCount: r.commentCount + 1}
              : r
          )
        );
      }
    } catch (error) {
      console.error("Yorum gönderilirken hata:", error);
      toast.error("Yorum gönderilemedi");
    }
  };

  const goToNextReel = () => {
    if (scrollLocked || currentReelIndex >= localReels.length - 1) return;
    
    setScrollLocked(true);
    setTransitionDirection("up");
    setCurrentReelIndex(currentReelIndex + 1);
    
    const feedbackElement = document.createElement("div");
    feedbackElement.className = "fixed inset-0 bg-white/5 pointer-events-none z-[60]";
    document.body.appendChild(feedbackElement);
    
    setTimeout(() => {
      document.body.removeChild(feedbackElement);
      setScrollLocked(false);
    }, 500);
  };

  const goToPrevReel = () => {
    if (scrollLocked || currentReelIndex <= 0) return;
    
    setScrollLocked(true);
    setTransitionDirection("down");
    setCurrentReelIndex(currentReelIndex - 1);
    
    const feedbackElement = document.createElement("div");
    feedbackElement.className = "fixed inset-0 bg-white/5 pointer-events-none z-[60]";
    document.body.appendChild(feedbackElement);
    
    setTimeout(() => {
      document.body.removeChild(feedbackElement);
      setScrollLocked(false);
    }, 500);
  };

  const toggleMute = () => {
    const videoElement = videoRefs.current[currentReelIndex];
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setMuted(!muted);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || "0";
  };

  const getFullVideoUrl = (videoUrl) => {
    if (!videoUrl) return null;

    if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
      return videoUrl;
    }

    if (videoUrl.startsWith("/")) {
      return `http://localhost:8080${videoUrl}`;
    } else {
      return `http://localhost:8080/${videoUrl}`;
    }
  };

  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    if (imageUrl.includes('ui-avatars.com')) return imageUrl;

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    if (imageUrl.startsWith("/")) {
      return `http://localhost:8080${imageUrl}`;
    } else {
      return `http://localhost:8080/${imageUrl}`;
    }
  };

  const reelVariants = {
    enter: (direction) => ({
      y: direction === "up" ? "120%" : "-120%",
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 25 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }
    },
    exit: (direction) => ({
      y: direction === "up" ? "-120%" : "120%",
      opacity: 0,
      scale: 0.9,
      transition: {
        y: { type: "spring", stiffness: 300, damping: 25 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }
    })
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartY.current || scrollLocked) return;

    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNextReel();
      } else {
        goToPrevReel();
      }
    }

    touchStartY.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    if (scrollLocked) return;
    
    if (e.deltaY > 20) {
      goToNextReel();
    } else if (e.deltaY < -20) {
      goToPrevReel();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (scrollLocked) return;
      
      if (e.key === 'ArrowUp') {
        goToPrevReel();
      } else if (e.key === 'ArrowDown') {
        goToNextReel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentReelIndex, scrollLocked]);

  if (!isOpen || !currentReel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden" onClick={onClose}>
      <div className="relative h-full w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button 
          className="absolute top-5 right-5 z-50 text-white bg-black/40 p-2 rounded-full"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        
        {/* Volume control */}
        <button 
          className="absolute top-5 left-5 z-50 text-white bg-black/40 p-2 rounded-full"
          onClick={toggleMute}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        
        {/* Previous/Next indicators */}
        {currentReelIndex > 0 && (
          <div className="absolute top-1/4 left-8 z-40 text-white opacity-70">
            <ChevronUp size={28} />
            <div className="text-xs mt-1">Önceki</div>
          </div>
        )}
        
        {currentReelIndex < localReels.length - 1 && (
          <div className="absolute bottom-1/4 left-8 z-40 text-white opacity-70">
            <div className="text-xs mb-1">Sonraki</div>
            <ChevronDown size={28} />
          </div>
        )}
        
        {/* Main video content */}
        <AnimatePresence initial={false} custom={transitionDirection}>
          <motion.div
            key={currentReelIndex}
            initial="enter"
            animate="center"
            exit="exit"
            variants={reelVariants}
            custom={transitionDirection}
            className="absolute inset-0 w-full h-full flex justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div className="max-w-[480px] w-full h-full relative bg-black">
              <video
                ref={(el) => (videoRefs.current[currentReelIndex] = el)}
                src={getFullVideoUrl(currentReel.videoUrl)}
                className="w-full h-full object-contain"
                loop
                playsInline
                autoPlay
                muted={muted}
                controls={false}
                onClick={toggleMute}
              />
              
              {/* Overlay gradient for better readability */}
              <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
              
              {/* Reel info overlay */}
              <div className="absolute bottom-8 left-4 right-20 text-white">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white">
                    {currentReel.user?.profileImage ? (
                      <img 
                        src={getFullImageUrl(currentReel.user.profileImage)} 
                        className="w-full h-full object-cover"
                        alt={currentReel.user.username}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{currentReel.user?.username || 'Anonim'}</div>
                    <div className="text-xs opacity-80">{currentReel.createdAt ? new Date(currentReel.createdAt).toLocaleDateString('tr-TR') : ''}</div>
                  </div>
                </div>
                
                {currentReel.description && (
                  <p className="mb-3 text-white/90 text-sm">{currentReel.description}</p>
                )}
                
                {currentReel.music && (
                  <div className="flex items-center mb-3 text-xs">
                    <Music size={14} className="mr-1" />
                    <div className="truncate">{currentReel.music}</div>
                  </div>
                )}
              </div>
              
              {/* Interaction buttons */}
              <div className="absolute right-4 bottom-24 flex flex-col items-center space-y-6">
                <div className="flex flex-col items-center">
                  <button 
                    className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center ${currentReel.isLiked ? 'text-red-500' : 'text-white'}`}
                    onClick={handleLike}
                  >
                    <Heart size={28} className={currentReel.isLiked ? 'fill-red-500' : ''} />
                  </button>
                  <span className="text-white text-xs mt-1">{formatNumber(currentReel.likeCount || 0)}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button 
                    className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white"
                    onClick={toggleCommentForm}
                  >
                    <MessageCircle size={28} />
                  </button>
                  <span className="text-white text-xs mt-1">{formatNumber(currentReel.commentCount || 0)}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button 
                    className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center ${isBookmarked ? 'text-blue-400' : 'text-white'}`}
                    onClick={toggleBookmark}
                  >
                    <Bookmark size={28} className={isBookmarked ? 'fill-blue-400' : ''} />
                  </button>
                  <span className="text-white text-xs mt-1">Kaydet</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <Share2 size={28} />
                  </button>
                  <span className="text-white text-xs mt-1">Paylaş</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        {/* Comments panel */}
        <AnimatePresence>
          {showCommentForm && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[70vh] overflow-y-auto z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-900 flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-lg dark:text-white">Yorumlar</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                  onClick={toggleCommentForm}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 space-y-4 min-h-[200px]">
                {loadingComments ? (
                  <div className="flex justify-center items-center h-20">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {comment.user?.profileImage ? (
                          <img 
                            src={getFullImageUrl(comment.user.profileImage)} 
                            className="w-full h-full object-cover"
                            alt={comment.user.username}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {comment.user?.username?.charAt(0).toUpperCase() || 'A'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm dark:text-white">{comment.user?.username || 'Anonim'}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('tr-TR') : ''}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-gray-800 dark:text-gray-200">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Henüz yorum yok. İlk yorumu sen yap!
                  </div>
                )}
              </div>
              
              <form 
                onSubmit={submitComment}
                className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Bir yorum yaz..."
                  className="flex-1 h-10 px-4 rounded-full bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim()}
                  className={`w-10 h-10 flex items-center justify-center rounded-full ${
                    comment.trim() 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-700'
                  }`}
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReelShow;
