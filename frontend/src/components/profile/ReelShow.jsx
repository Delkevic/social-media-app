import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Heart, MessageCircle, Share2, ChevronLeft, ChevronRight, 
  VolumeX, Volume2, Music, User, Bookmark, Play, Pause, Send, MoreHorizontal
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { API_BASE_URL } from "../../config/constants";
import { useAuth } from "../../context/AuthContext";

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (imageUrl) => {
  if (!imageUrl) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (imageUrl.includes('ui-avatars.com')) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  if (imageUrl.startsWith("/")) {
    return `${API_BASE_URL}${imageUrl}`;
  } else {
    return `${API_BASE_URL}/${imageUrl}`;
  }
};

const getFullVideoUrl = (videoUrl) => {
  if (!videoUrl) return null;
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    return videoUrl;
  }
  if (videoUrl.startsWith("/")) {
    return `${API_BASE_URL}${videoUrl}`;
  } else {
    return `${API_BASE_URL}/${videoUrl}`;
  }
};

const ReelShow = ({ reel, reels = [], isOpen, onClose, profileUser, onNext, onPrevious }) => {
  const { user: currentUser } = useAuth();
  const [currentReel, setCurrentReel] = useState(reel);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingNewComment, setLoadingNewComment] = useState(false);
  const videoRef = useRef(null);
  const commentInputRef = useRef(null);
  
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (reel) {
      setCurrentReel(reel);
    }
  }, [reel]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      const videoElement = videoRef.current;
      if (videoElement) {
        videoElement.pause();
        videoElement.load();
        if (isPlaying) {
          videoElement.play().catch(err => {
            console.log("Autoplay prevented:", err);
            setIsPlaying(false);
          });
        }
      }
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, [isOpen, currentReel, isPlaying]);

  // Yorumları yükle
  const loadComments = async () => {
    if (!currentReel?.id || loadingComments) return;
    
    setLoadingComments(true);
    try {
      const response = await api.reels.getComments(currentReel.id);
      if (response.success) {
        const processedComments = (response.data.comments || []).map(comment => {
          let username = "İsimsiz Kullanıcı";
          let userId = null;
          let userProfileImage = null;
          
          if (comment.user && comment.user.username) {
            username = comment.user.username;
            userId = comment.user.id;
            userProfileImage = comment.user.profile_picture || comment.user.profileImage;
          } else if (comment.User && comment.User.username) {
            username = comment.User.username;
            userId = comment.User.id;
            userProfileImage = comment.User.profile_picture || comment.User.profileImage;
          } else if (comment.username) {
            username = comment.username;
            userId = comment.userId || comment.user_id;
          }
          
          return {
            id: comment.id || comment.ID || Math.random().toString(36).substr(2, 9),
            username: username,
            userId: userId,
            userProfileImage: userProfileImage,
            content: comment.content || comment.Content || "",
            created_at: comment.created_at || comment.CreatedAt || new Date().toISOString(),
            likeCount: comment.likeCount || comment.like_count || 0,
            isLiked: comment.isLiked || false
          };
        });
        setComments(processedComments);
      }
    } catch (error) {
      console.error('Yorumlar yüklenemedi:', error);
      toast.error('Yorumlar yüklenirken hata oluştu');
    } finally {
      setLoadingComments(false);
    }
  };

  // Yorum ekleme
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || loadingNewComment) return;
    
    setLoadingNewComment(true);
    try {
      const response = await api.reels.addComment(currentReel.id, commentText);
      if (response.success) {
        const newComment = response.data.comment || response.data;
        const normalizedNewComment = {
          id: newComment.id || newComment.ID || Math.random().toString(36).substr(2, 9),
          username: currentUser?.username || "Sen",
          userId: currentUser?.id,
          userProfileImage: currentUser?.profileImage || currentUser?.profile_picture,
          content: newComment.content || commentText,
          created_at: newComment.created_at || new Date().toISOString(),
          likeCount: newComment.likeCount || 0,
          isLiked: false
        };
        
        setComments(prevComments => [normalizedNewComment, ...prevComments]);
        setCommentText('');
        
        // Yorum sayısını güncelle
        setCurrentReel(prev => ({
          ...prev,
          commentCount: (prev.commentCount || 0) + 1
        }));
        
        toast.success('Yorum eklendi!');
      } else {
        toast.error('Yorum eklenemedi');
      }
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      toast.error('Yorum eklenirken hata oluştu');
    } finally {
      setLoadingNewComment(false);
    }
  };

  const handleLike = async () => {
    if (isLiking || !currentReel) return;
    
    setIsLiking(true);
    
    try {
      const newLikeState = !currentReel.isLiked;
      
      setCurrentReel(prev => ({
        ...prev,
        isLiked: newLikeState,
        likeCount: newLikeState ? (prev.likeCount || 0) + 1 : Math.max((prev.likeCount || 0) - 1, 0)
      }));
      
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
      
      setCurrentReel(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        likeCount: !prev.isLiked ? (prev.likeCount || 0) + 1 : Math.max((prev.likeCount || 0) - 1, 0)
      }));
    } finally {
      setIsLiking(false);
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Kaydedilenlerden kaldırıldı" : "Kaydedilenlere eklendi");
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      loadComments();
    }
  };

  const toggleMute = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.muted = !videoElement.muted;
      setMuted(!muted);
    }
  };

  const togglePlayPause = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (isPlaying) {
        videoElement.pause();
      } else {
        videoElement.play().catch(err => {
          console.log("Play failed:", err);
        });
      }
      setIsPlaying(!isPlaying);
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

  if (!isOpen || !currentReel) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'var(--backdrop-blur)'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-7xl h-full max-h-[95vh] rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--background-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full relative">
          {/* Sol Taraf - Video */}
          <div className="flex-1 relative flex items-center justify-center" style={{ backgroundColor: 'var(--background-tertiary)' }}>
            {/* Video Player */}
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <video
                ref={videoRef}
                src={getFullVideoUrl(currentReel.videoURL)}
                className="w-full h-full object-contain rounded-xl shadow-2xl"
                loop
                playsInline
                autoPlay={isPlaying}
                muted={muted}
                controls={false}
                onClick={togglePlayPause}
                style={{ 
                  maxHeight: 'calc(100vh - 120px)',
                  maxWidth: '100%',
                  aspectRatio: '9/16',
                  border: '2px solid var(--accent-primary)',
                  boxShadow: '0 0 30px rgba(10, 255, 217, 0.3)'
                }}
              />
              
              {/* Video Kontrolleri */}
              <div className="absolute bottom-8 left-8 flex items-center space-x-4 z-10">
                <button 
                  className="backdrop-blur-md p-4 rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    backgroundColor: 'var(--background-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-inverted)'
                  }}
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button 
                  className="backdrop-blur-md p-4 rounded-full transition-all duration-300 hover:scale-110"
                  style={{
                    backgroundColor: 'var(--background-glass)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-inverted)'
                  }}
                  onClick={toggleMute}
                >
                  {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
              </div>
            </div>

            {/* Navigasyon Okları */}
            {onPrevious && (
              <button 
                className="absolute left-6 top-1/2 -translate-y-1/2 backdrop-blur-md p-5 rounded-full transition-all duration-300 hover:scale-110 z-10"
                style={{
                  backgroundColor: 'var(--background-glass)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-inverted)'
                }}
                onClick={onPrevious}
              >
                <ChevronLeft size={32} />
              </button>
            )}
            
            {onNext && (
              <button 
                className="absolute right-6 top-1/2 -translate-y-1/2 backdrop-blur-md p-5 rounded-full transition-all duration-300 hover:scale-110 z-10"
                style={{
                  backgroundColor: 'var(--background-glass)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-inverted)'
                }}
                onClick={onNext}
              >
                <ChevronRight size={32} />
              </button>
            )}

            {/* Close Button */}
            <button 
              className="absolute top-6 right-6 backdrop-blur-md p-4 rounded-full transition-all duration-300 hover:scale-110 z-10"
              style={{
                backgroundColor: 'var(--background-glass)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-inverted)'
              }}
              onClick={onClose}
            >
              <X size={28} />
            </button>
          </div>

          {/* Sağ Taraf - Reel Bilgileri ve Yorumlar */}
          <div className="w-96 flex flex-col" style={{ backgroundColor: 'var(--background-secondary)', borderLeft: '1px solid var(--border-color)' }}>
            {/* Header */}
            <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg" style={{ border: '3px solid var(--accent-primary)' }}>
                    {profileUser?.profile_picture || currentReel.user?.profileImage ? (
                      <img 
                        src={getFullImageUrl(profileUser?.profile_picture || currentReel.user?.profileImage)} 
                        className="w-full h-full object-cover"
                        alt={profileUser?.username || currentReel.user?.username}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}>
                        <User size={28} />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--btn-primary-text)' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--btn-primary-text)' }}></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-xl" style={{ color: 'var(--accent-primary)' }}>
                    {profileUser?.username || currentReel.user?.username || 'Anonim'}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {currentReel.createdAt ? new Date(currentReel.createdAt).toLocaleDateString('tr-TR') : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Reel Açıklaması */}
            {(currentReel.caption || currentReel.description) && (
              <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{currentReel.caption || currentReel.description}</p>
                {currentReel.music && (
                  <div className="flex items-center mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <Music size={18} className="mr-2" style={{ color: 'var(--accent-primary)' }} />
                    <span>{currentReel.music}</span>
                  </div>
                )}
              </div>
            )}

            {/* Etkileşim Butonları */}
            <div className="p-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    currentReel.isLiked ? 'shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: currentReel.isLiked ? 'rgba(239, 68, 68, 0.1)' : 'var(--background-card)',
                    border: `1px solid ${currentReel.isLiked ? '#ef4444' : 'var(--border-color)'}`,
                    color: currentReel.isLiked ? '#ef4444' : 'var(--text-secondary)'
                  }}
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <Heart size={24} className={currentReel.isLiked ? 'fill-current' : ''} />
                  <span className="font-medium">{formatNumber(currentReel.likeCount || 0)}</span>
                </button>
                
                <button 
                  className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    showComments ? 'shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: showComments ? 'rgba(10, 255, 217, 0.1)' : 'var(--background-card)',
                    border: `1px solid ${showComments ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    color: showComments ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                  onClick={toggleComments}
                >
                  <MessageCircle size={24} />
                  <span className="font-medium">{formatNumber(currentReel.commentCount || 0)}</span>
                </button>
                
                <button 
                  className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105 ${
                    isBookmarked ? 'shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: isBookmarked ? 'rgba(59, 130, 246, 0.1)' : 'var(--background-card)',
                    border: `1px solid ${isBookmarked ? '#3b82f6' : 'var(--border-color)'}`,
                    color: isBookmarked ? '#3b82f6' : 'var(--text-secondary)'
                  }}
                  onClick={toggleBookmark}
                >
                  <Bookmark size={24} className={isBookmarked ? 'fill-current' : ''} />
                </button>
                
                <button 
                  className="flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: 'var(--background-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                  onClick={() => toast('Paylaşım özelliği yakında eklenecek')}
                >
                  <Share2 size={24} />
                </button>
              </div>
            </div>

            {/* Yorumlar Bölümü */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {showComments ? (
                <>
                  {/* Yorumlar Listesi */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--background-primary)', maxHeight: 'calc(100vh - 400px)' }}>
                    {loadingComments ? (
                      <div className="flex items-center justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}></div>
                        <span className="ml-3" style={{ color: 'var(--text-tertiary)' }}>Yorumlar yükleniyor...</span>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12" style={{ color: 'var(--text-tertiary)' }}>
                        <MessageCircle size={64} className="mb-6 opacity-30" />
                        <p className="text-center text-lg font-medium mb-2">Henüz yorum yapılmamış</p>
                        <p className="text-center text-sm">İlk yorumu sen yap ve konuşmayı başlat!</p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-6">
                        {comments.map(comment => (
                          <div key={comment.id} className="flex items-start space-x-4 p-4 rounded-lg transition-all duration-200 hover:shadow-md" style={{ backgroundColor: 'var(--background-card)' }}>
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid var(--border-color)' }}>
                              {comment.userProfileImage ? (
                                <img 
                                  src={getFullImageUrl(comment.userProfileImage)} 
                                  className="w-full h-full object-cover"
                                  alt={comment.username}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--background-tertiary)', color: 'var(--text-primary)' }}>
                                  {comment.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>
                                  {comment.username}
                                  {comment.userId === currentUser?.id && (
                                    <span className="ml-2 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--btn-primary-text)' }}>(Sen)</span>
                                  )}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                  {new Date(comment.created_at).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
                            </div>
                            
                            <button className="p-2 rounded-full transition-all duration-200 hover:scale-110" style={{ color: 'var(--text-tertiary)' }}>
                              <MoreHorizontal size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Yorum Ekleme Formu */}
                  <div className="flex-shrink-0 p-6" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--background-secondary)' }}>
                    <form onSubmit={handleSubmitComment} className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: '2px solid var(--accent-primary)' }}>
                        {currentUser?.profileImage ? (
                          <img 
                            src={getFullImageUrl(currentUser.profileImage)} 
                            alt="Profil" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--background-tertiary)', color: 'var(--text-primary)' }}>
                            {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <input
                        ref={commentInputRef}
                        type="text"
                        placeholder="Yorum yaz..."
                        className="flex-1 px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:scale-105 focus:outline-none"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          border: '1px solid var(--input-border)',
                          color: 'var(--input-text)'
                        }}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        disabled={loadingNewComment}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--accent-primary)';
                          e.target.style.boxShadow = '0 0 0 2px rgba(10, 255, 217, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--input-border)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button 
                        type="submit" 
                        className={`rounded-xl p-3 transition-all duration-300 hover:scale-110 ${
                          commentText.trim() && !loadingNewComment ? 'shadow-lg' : ''
                        }`}
                        style={{
                          backgroundColor: commentText.trim() && !loadingNewComment ? 'var(--accent-primary)' : 'var(--background-tertiary)',
                          color: commentText.trim() && !loadingNewComment ? 'var(--btn-primary-text)' : 'var(--text-tertiary)',
                          cursor: commentText.trim() && !loadingNewComment ? 'pointer' : 'not-allowed'
                        }}
                        disabled={!commentText.trim() || loadingNewComment}
                      >
                        {loadingNewComment ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}></div>
                        ) : (
                          <Send size={20} />
                        )}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--background-primary)' }}>
                  <div className="text-center p-12" style={{ color: 'var(--text-tertiary)' }}>
                    <MessageCircle size={64} className="mx-auto mb-6 opacity-30" />
                    <p className="text-xl font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Yorumları Keşfet</p>
                    <p className="text-sm">Bu reels hakkında ne düşünüyorsun?</p>
                    <p className="text-sm">Yorumları görmek için yukarıdaki butona tıkla!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReelShow; 