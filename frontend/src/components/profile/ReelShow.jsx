import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Heart, MessageCircle, Share2, ChevronUp, ChevronDown, 
  VolumeX, Volume2, Music, User, Send 
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
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-100 flex items-center justify-center">
        <motion.div
          className="relative w-full h-full md:w-[500px] md:h-[90%] flex flex-col"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 30 }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[70] p-2 bg-black bg-opacity-50 rounded-full text-white"
          >
            <X size={20} />
          </button>

          <motion.div 
            className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 z-[70]"
            key={`counter-${currentReelIndex}`}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white text-xs">
              {currentReelIndex + 1} / {localReels.length}
            </p>
          </motion.div>

          <div 
            className="flex-1 relative flex items-center justify-center bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div className="absolute inset-0 overflow-hidden">
              <AnimatePresence mode="popLayout" custom={transitionDirection} initial={false}>
                <motion.div
                  key={`reel-${currentReelIndex}`}
                  className="absolute inset-0 flex items-center justify-center w-full h-full"
                  custom={transitionDirection}
                  variants={reelVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <video
                    ref={el => { videoRefs.current[currentReelIndex] = el }}
                    src={getFullVideoUrl(currentReel.videoURL)}
                    className="h-full w-full object-contain"
                    autoPlay
                    loop
                    muted={muted}
                    playsInline
                    onClick={() => {
                      const video = videoRefs.current[currentReelIndex];
                      if (video) {
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }
                    }}
                  />

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <motion.div 
                      className="flex items-center mb-3"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white/30">
                        <img
                          src={profileUser?.profileImage || "https://via.placeholder.com/40"}
                          alt={profileUser?.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://ui-avatars.com/api/?name=" + 
                              (profileUser?.username?.charAt(0) || "U") + "&background=random";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white">@{profileUser?.username}</p>
                        <p className="text-white/80 text-sm">{currentReel.caption}</p>
                      </div>
                    </motion.div>

                    {currentReel.music && (
                      <motion.div 
                        className="flex items-center mt-2 bg-black/30 rounded-full px-3 py-1.5 w-fit"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Music className="h-4 w-4 mr-2 text-white/80" />
                        <p className="text-white/80 text-xs truncate max-w-[150px]">
                          {currentReel.music}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              key={`flash-${currentReelIndex}`}
              className="absolute inset-0 bg-white pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.03, 0] }}
              transition={{ duration: 0.4 }}
            />

            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-[60]">
              <motion.div 
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div 
                  className={`rounded-full bg-black/30 p-3 backdrop-blur-sm cursor-pointer ${isLiking ? 'opacity-50' : ''}`}
                  onClick={handleLike}
                >
                  <Heart 
                    className={`h-6 w-6 ${currentReel?.isLiked ? "text-red-500 fill-red-500" : "text-white"}`}
                  />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatNumber(currentReel?.likeCount)}
                </span>
              </motion.div>
              
              <motion.div 
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div 
                  className="rounded-full bg-black/30 p-3 backdrop-blur-sm cursor-pointer"
                  onClick={toggleCommentForm}
                >
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatNumber(currentReel?.commentCount)}
                </span>
              </motion.div>
              
              <motion.div 
                className="flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="rounded-full bg-black/30 p-3 backdrop-blur-sm">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatNumber(currentReel?.shareCount)}
                </span>
              </motion.div>
            </div>

            <AnimatePresence>
              {showCommentForm && (
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg z-[65] rounded-t-2xl"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25 }}
                  style={{ maxHeight: "60%" }}
                >
                  <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-white font-semibold">Yorumlar</h3>
                    <button 
                      onClick={toggleCommentForm} 
                      className="text-white/70 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100% - 130px)" }}>
                    {loadingComments ? (
                      <div className="flex justify-center py-6">
                        <div className="animate-spin h-8 w-8 border-2 border-t-transparent border-white rounded-full"></div>
                      </div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-4">
                        {comments.map(comment => (
                          <div key={comment.id} className="flex space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-purple-500/20">
                              {comment.user.profileImage ? (
                                <img 
                                  src={comment.user.profileImage} 
                                  alt={comment.user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {comment.user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="bg-white/10 rounded-xl p-3">
                                <p className="text-white font-medium text-sm">{comment.user.username}</p>
                                <p className="text-white/90 text-sm mt-1">{comment.content}</p>
                              </div>
                              <div className="flex gap-4 mt-1 text-xs text-white/50">
                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                <button className="hover:text-white">Yanıtla</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-white/50">
                        <p>Henüz yorum yapılmamış</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-white/10">
                    <form onSubmit={submitComment} className="flex">
                      <input
                        type="text"
                        placeholder="Yorum yaz..."
                        className="flex-1 bg-white/10 text-white px-4 py-2 rounded-l-full outline-none"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={!comment.trim()}
                        className={`bg-blue-600 text-white px-4 rounded-r-full flex items-center justify-center ${
                          !comment.trim() ? 'opacity-50' : 'hover:bg-blue-700'
                        }`}
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              className="absolute bottom-4 right-4 p-2 bg-black/30 rounded-full text-white z-[60]"
              onClick={toggleMute}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </motion.button>

            {localReels.length > 1 && (
              <>
                {currentReelIndex > 0 && (
                  <motion.button
                    className="absolute top-1/4 left-1/2 transform -translate-x-1/2 p-3 bg-black/50 rounded-full text-white z-[60]"
                    onClick={goToPrevReel}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ 
                      scale: 1.3, 
                      boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)" 
                    }}
                  >
                    <ChevronUp size={28} />
                  </motion.button>
                )}

                {currentReelIndex < localReels.length - 1 && (
                  <motion.button
                    className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 p-3 bg-black/50 rounded-full text-white z-[60]"
                    onClick={goToNextReel}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ 
                      scale: 1.3, 
                      boxShadow: "0 0 20px rgba(255, 255, 255, 0.4)" 
                    }}
                  >
                    <ChevronDown size={28} />
                  </motion.button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReelShow;
