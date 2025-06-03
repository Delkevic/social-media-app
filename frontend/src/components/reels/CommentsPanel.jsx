import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, MoreHorizontal, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import api from '../../services/api';

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
};

// Tek bir yorum komponenti
const CommentItem = ({ comment, onLikeComment, currentUser }) => {
  const [liked, setLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const handleLike = () => {
    setLiked(!liked);
    if (onLikeComment) {
      onLikeComment(comment.id);
    }
  };

  // Normalize edilmiş veri kullan
  const displayUsername = comment.username || "İsimsiz Kullanıcı";
  const userId = comment.userId;
  const profileImage = comment.userProfileImage;
  
  console.log('✅ Normalize edilmiş yorum kullanıldı:', {
    username: displayUsername,
    userId: userId,
    comment: comment
  });

  // Kendi yorumu mu kontrol et
  const isOwnComment = currentUser && userId && (
    userId === currentUser.id || 
    comment.userId === currentUser.id
  );
  
  return (
    <div className="flex items-start gap-3 p-4 hover:bg-slate-800/40 transition-colors duration-200">
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
        {profileImage ? (
          <img 
            src={getFullImageUrl(profileImage)} 
            className="w-full h-full object-cover"
            alt={displayUsername}
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-white">
            {displayUsername.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-[#0affd9]">
            {displayUsername}
            {isOwnComment && (
              <span className="ml-1 text-xs text-gray-400">(Sen)</span>
            )}
          </h4>
          
          <div className="relative">
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowOptions(!showOptions)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 top-6 bg-slate-800 rounded-lg shadow-lg z-10 w-36 overflow-hidden">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700"
                  onClick={() => {
                    toast.success('Yorum bildirimi gönderildi');
                    setShowOptions(false);
                  }}
                >
                  Yorumu Şikayet Et
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                  onClick={() => {
                    toast.success('Kullanıcı engellendi');
                    setShowOptions(false);
                  }}
                >
                  Kullanıcıyı Engelle
                </button>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>
            {comment.createdAt ? 
              new Date(comment.createdAt).toLocaleDateString('tr-TR') : 
              comment.created_at ? 
                new Date(comment.created_at).toLocaleDateString('tr-TR') : 
                'Şimdi'
            }
          </span>
          <button 
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={handleLike}
          >
            <Heart 
              className={`h-3 w-3 ${liked ? 'text-red-500 fill-red-500' : ''}`} 
            />
            <span>{comment.likeCount || 0} beğeni</span>
          </button>
          <button 
            className="hover:text-white transition-colors"
            onClick={() => toast('Yanıtlama özelliği yakında eklenecek')}
          >
            Yanıtla
          </button>
        </div>
      </div>
    </div>
  );
};

const CommentsPanel = ({ 
  isVisible, 
  reelId, 
  onClose,
  initialComments = []
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const commentInputRef = useRef(null);
  
  // Panel görünür olduğunda input'a odaklan ve yorumları yükle
  useEffect(() => {
    if (isVisible) {
      if (commentInputRef.current) {
        setTimeout(() => {
          commentInputRef.current.focus();
        }, 300);
      }
      
      // Yorumları yükle
      if (reelId) {
        loadComments();
      }
    }
  }, [isVisible, reelId]);

  // Yorumları API'den yükle
  const loadComments = async () => {
    if (!reelId || loadingComments) return;
    
    setLoadingComments(true);
    setError(null);
    
    try {
      const response = await api.reels.getComments(reelId);
      
      console.log('📋 Full API Response:', response);
      
      if (response.success) {
        // Ham yorum verilerini konsola yazdır
        console.log("📋 Ham yorum verileri:", JSON.stringify(response.data, null, 2));
        
        // Her yorum için veri yapısını kontrol et ve normalize et - PostShow mantığı
        const processedComments = (response.data.comments || []).map(comment => {
          // Tüm yorum verisini konsola yazdır
          console.log("📋 İşlenen ham yorum verisi:", JSON.stringify(comment, null, 2));
          
          // Direkt user objesinden username alınmaya çalışalım
          let username = "İsimsiz Kullanıcı";
          let userId = null;
          let userProfileImage = null;
          
          // 1. Öncelikle user objesi var mı kontrol et
          if (comment.user && comment.user.username) {
            username = comment.user.username;
            userId = comment.user.id;
            userProfileImage = comment.user.profile_picture || comment.user.profileImage;
            console.log("📋 comment.user.username kullanıldı:", username);
          }
          // 2. User objesi büyük harfle mi?
          else if (comment.User && comment.User.username) {
            username = comment.User.username;
            userId = comment.User.id;
            userProfileImage = comment.User.profile_picture || comment.User.profileImage;
            console.log("📋 comment.User.username kullanıldı:", username);
          }
          // 3. Direkt username field'ı var mı?
          else if (comment.username) {
            username = comment.username;
            userId = comment.userId || comment.user_id;
            console.log("📋 comment.username kullanıldı:", username);
          }
          // 4. Son çare olarak tüm objeden arama yap
          else {
            console.log("📋 Hiçbir standart alan bulunamadı, detaylı arama yapılıyor...");
            console.log("📋 Comment keys:", Object.keys(comment));
            if (comment.user) {
              console.log("📋 User keys:", Object.keys(comment.user));
            }
            
            // Büyük/küçük harf duyarsız arama
            const usernameKey = Object.keys(comment).find(k => k.toLowerCase() === 'username');
            if (usernameKey) {
              username = comment[usernameKey];
              console.log(`📋 ${usernameKey} alanından username alındı: ${username}`);
            }
            
            const userKey = Object.keys(comment).find(k => k.toLowerCase() === 'user');
            if (userKey && comment[userKey]) {
              const userObj = comment[userKey];
              const userUsernameKey = Object.keys(userObj).find(k => k.toLowerCase() === 'username');
              if (userUsernameKey) {
                username = userObj[userUsernameKey];
                console.log(`📋 userObj.${userUsernameKey} kullanıldı: ${username}`);
              }
            }
          }
          
          // Normalize edilmiş yorum objesi
          const normalizedComment = {
            id: comment.id || comment.ID || Math.random().toString(36).substr(2, 9),
            username: username,
            userId: userId,
            userProfileImage: userProfileImage,
            user: comment.user || comment.User || { username, id: userId },
            content: comment.content || comment.Content || "",
            created_at: comment.created_at || comment.CreatedAt || new Date().toISOString(),
            createdAt: comment.createdAt || comment.created_at || comment.CreatedAt || new Date().toISOString(),
            likeCount: comment.likeCount || comment.like_count || 0,
            isLiked: comment.isLiked || false
          };
          
          console.log("�� Final normalize edilmiş yorum:", normalizedComment);
          console.log("📋 Final username:", username);
          return normalizedComment;
        });
        
        console.log("📋 İşlenmiş yorumlar:", processedComments);
        setComments(processedComments);
      } else {
        setError('Yorumlar yüklenemedi');
      }
    } catch (error) {
      console.error('📋 Yorumları yükleme hatası:', error);
      setError('Yorumlar yüklenirken hata oluştu');
    } finally {
      setLoadingComments(false);
    }
  };
  
  // Yorum beğenme fonksiyonu
  const handleLikeComment = (commentId) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, likeCount: (comment.likeCount || 0) + 1 } 
          : comment
      )
    );
  };
  
  // Yeni yorum ekleme
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || loading) return;
    
    setLoading(true);
    try {
      const response = await api.reels.addComment(reelId, commentText);
      if (response.success) {
        // Yeni eklenen yorumu normalize et
        const newComment = response.data.comment || response.data;
        const normalizedNewComment = {
          id: newComment.id || newComment.ID || Math.random().toString(36).substr(2, 9),
          username: user?.username || "Sen",
          userId: user?.id,
          userProfileImage: user?.profileImage || user?.profile_picture,
          user: newComment.user || { 
            username: user?.username, 
            id: user?.id, 
            profile_picture: user?.profileImage || user?.profile_picture 
          },
          content: newComment.content || commentText,
          created_at: newComment.created_at || new Date().toISOString(),
          createdAt: newComment.createdAt || newComment.created_at || new Date().toISOString(),
          likeCount: newComment.likeCount || 0,
          isLiked: false
        };
        
        // Yeni yorumu listenin başına ekle
        setComments(prevComments => [normalizedNewComment, ...prevComments]);
        setCommentText('');
        toast.success('Yorum eklendi!');
      } else {
        toast.error('Yorum eklenemedi');
      }
    } catch (error) {
      console.error('Yorum ekleme hatası:', error);
      toast.error('Yorum eklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute top-0 right-0 h-full bg-slate-900 rounded-l-2xl shadow-xl z-40 overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '360px', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/90 backdrop-blur-sm">
            <h3 className="text-lg font-medium text-white">Yorumlar</h3>
            <button 
              className="p-2 rounded-full hover:bg-slate-800 transition-colors"
              onClick={onClose}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
          
          {/* Yorumlar listesi */}
          <div className="h-[calc(100%-120px)] overflow-y-auto">
            {loadingComments ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-[#0affd9] mb-3" />
                <p>Yorumlar yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-center">{error}</p>
                <button 
                  onClick={loadComments}
                  className="mt-2 px-4 py-2 bg-[#0affd9] text-black rounded-lg hover:bg-[#0affd9]/80 transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            ) : comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
                <p className="text-center">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {comments.map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onLikeComment={handleLikeComment}
                    currentUser={user}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Yorum formu */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900 px-4 py-3">
            <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {user?.profileImage ? (
                  <img 
                    src={getFullImageUrl(user.profileImage)} 
                    alt="Profil" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-white">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Yorum yaz..."
                className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0affd9] border border-slate-600"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={loading}
              />
              <button 
                type="submit" 
                className={`rounded-full p-2 ${
                  commentText.trim() && !loading
                    ? 'bg-[#0affd9] hover:bg-[#0affd9]/80 text-black' 
                    : 'bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!commentText.trim() || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentsPanel;