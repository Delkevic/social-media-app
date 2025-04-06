import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, MoreHorizontal, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

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

// Tek bir yorum komponenti
const CommentItem = ({ comment, onLikeComment }) => {
  const [liked, setLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const handleLike = () => {
    setLiked(!liked);
    if (onLikeComment) {
      onLikeComment(comment.id);
    }
  };
  
  return (
    <div className="flex items-start gap-3 p-4 hover:bg-slate-800/40 transition-colors duration-200">
      <img 
        src={comment.user.profileImage} 
        alt={comment.user.username} 
        className="w-9 h-9 rounded-full object-cover"
      />
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-white">
            {comment.user.username}
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
        
        <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{comment.timestamp}</span>
          <button 
            className="flex items-center gap-1 hover:text-white transition-colors"
            onClick={handleLike}
          >
            <Heart 
              className={`h-3 w-3 ${liked ? 'text-red-500 fill-red-500' : ''}`} 
            />
            <span>{comment.likeCount} beğeni</span>
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
  const [comments, setComments] = useState(initialComments.length > 0 ? initialComments : SAMPLE_COMMENTS);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const commentInputRef = useRef(null);
  
  // Panel görünür olduğunda input'a odaklan
  useEffect(() => {
    if (isVisible && commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current.focus();
      }, 300);
    }
  }, [isVisible]);
  
  // Yorum beğenme fonksiyonu
  const handleLikeComment = (commentId) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, likeCount: comment.likeCount + 1 } 
          : comment
      )
    );
  };
  
  // Yeni yorum ekleme
  const handleSubmitComment = (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      return;
    }
    
    if (!user) {
      toast.error('Yorum yapmak için giriş yapmalısınız');
      return;
    }
    
    const newComment = {
      id: Date.now(),
      user: {
        username: user.username || 'kullanıcı',
        profileImage: user.profileImage || 'https://randomuser.me/api/portraits/lego/1.jpg'
      },
      text: commentText.trim(),
      likeCount: 0,
      timestamp: 'Şimdi'
    };
    
    setComments(prevComments => [newComment, ...prevComments]);
    setCommentText('');
    
    // Burada gerçek API'ya yorum kaydedilecek
    toast.success('Yorumunuz eklendi!');
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
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-3"></div>
                <p>Yorumlar yükleniyor...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-center">Yorumlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
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
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Yorum formu */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900 px-4 py-3">
            <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
              <img 
                src={user?.profileImage || "https://randomuser.me/api/portraits/lego/1.jpg"} 
                alt="Profil" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <input
                ref={commentInputRef}
                type="text"
                placeholder="Yorum yaz..."
                className="flex-1 bg-slate-800 text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                className={`rounded-full p-2 ${
                  commentText.trim() 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!commentText.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommentsPanel; 