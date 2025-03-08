import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

const PostItem = ({ post, onLike, onSave, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState(null);

  // Yorumlar gösterildiğinde yükleme yap
  useEffect(() => {
    if (showComments && comments.length === 0) {
      fetchComments();
    }
  }, [showComments]);

  const fetchComments = async () => {
    if (loadingComments) return;
    
    try {
      setLoadingComments(true);
      setError(null);
      
      // API'den yorumları getir
      // Gerçek implementasyon:
      /*
      const response = await api.posts.getComments(post.id);
      setComments(response.data.comments || []);
      */
      
      // Şimdilik örnek veriler:
      const dummyComments = [
        {
          id: 1,
          user: {
            id: 201,
            username: 'elifcan',
            profileImage: null
          },
          content: 'Harika bir gönderi!',
          createdAt: '1 saat önce',
          likes: 5
        },
        {
          id: 2,
          user: {
            id: 202,
            username: 'murat',
            profileImage: null
          },
          content: 'Bunu denemek istiyorum.',
          createdAt: '45 dakika önce',
          likes: 2
        }
      ];
      
      // Kısa bir gecikme ile yorumları yüklüyoruz
      setTimeout(() => {
        setComments(dummyComments);
        setLoadingComments(false);
      }, 500);
      
    } catch (err) {
      setError('Yorumlar yüklenirken bir hata oluştu: ' + err.message);
      setLoadingComments(false);
    }
  };

  const handleLike = () => {
    onLike(post.id);
  };

  const handleSave = () => {
    onSave(post.id);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      // Optimistik güncelleme için geçici yorum nesnesi
      const tempComment = {
        id: Date.now(),
        user: {
          id: currentUser.id,
          username: currentUser.username,
          profileImage: currentUser.profileImage
        },
        content: comment.trim(),
        createdAt: 'Şimdi',
        likes: 0
      };
      
      // Yorumu listede göster
      setComments(prevComments => [tempComment, ...prevComments]);
      
      // Formu sıfırla
      setComment('');
      
      // Gerçek API çağrısı
      // API'ye yorumu gönder
      // const response = await api.posts.addComment(post.id, comment.trim());
      
      // Gönderi yorum sayısını güncelle
      post.comments += 1;
      
    } catch (err) {
      setError('Yorum gönderilirken bir hata oluştu: ' + err.message);
      
      // Hata durumunda geçici yorumu kaldır
      setComments(prevComments => prevComments.filter(c => c.id !== tempComment.id));
    }
  };

  return (
    <div 
      className="rounded-2xl overflow-hidden backdrop-blur-lg mb-4"
      style={{
        backgroundColor: "rgba(20, 24, 36, 0.7)",
        boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}
    >
      {/* Gönderi başlığı */}
      <div className="p-4 flex items-center">
        <Link to={`/profile/${post.user.username}`} className="flex-shrink-0">
          {post.user.profileImage ? (
            <img 
              src={post.user.profileImage} 
              alt={post.user.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500"
            >
              <span className="text-white font-bold">
                {post.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>
        
        <div className="ml-3 min-w-0">
          <Link 
            to={`/profile/${post.user.username}`}
            className="font-medium hover:underline text-white"
          >
            {post.user.username}
          </Link>
          <p className="text-xs text-blue-200/70">
            {post.createdAt}
          </p>
        </div>
        
        <div className="ml-auto">
          <button 
            className="p-1 rounded-full text-blue-200 hover:bg-slate-700/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Gönderi içeriği */}
      <div className="px-4 pb-3">
        <p className="text-white">{post.content}</p>
      </div>
      
      {/* Gönderi görselleri (varsa) */}
      {post.images && post.images.length > 0 && (
        <div className="w-full">
          {post.images.map((image, index) => {
            // Görsel URL'sini işle (fullUrl varsa onu kullan)
            let imageUrl = typeof image === 'string' 
              ? image 
              : (image.fullUrl || image.url || '');
            
            // Eğer URL tam bir URL değilse (http ile başlamıyorsa) backend URL'sini ekle
            if (imageUrl && !imageUrl.startsWith('http')) {
              imageUrl = `http://localhost:8080${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            }
            
            return (
              <div key={index} className="relative">
                <img 
                  src={imageUrl}
                  alt={`Gönderi görseli ${index + 1}`}
                  className="w-full object-cover"
                  style={{ maxHeight: '300px' }}
                  onError={(e) => {
                    console.error(`Görsel yüklenemedi (${index}): ${e.target.src}`);
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23fff' text-anchor='middle' dominant-baseline='middle'%3EGörsel Yüklenemedi%3C/text%3E%3C/svg%3E";
                    e.target.onerror = null;
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      
      {/* Etkileşim bilgileri */}
      <div 
        className="px-4 py-2 flex justify-between text-sm text-blue-200"
      >
        <div>
          {post.likes > 0 && (
            <span>{post.likes} beğeni</span>
          )}
        </div>
        <div>
          {post.comments > 0 && (
            <button onClick={() => setShowComments(!showComments)}>
              {post.comments} yorum
            </button>
          )}
        </div>
      </div>
      
      {/* Etkileşim butonları */}
      <div 
        className="flex border-t border-b border-slate-700/50"
      >
        <button 
          className="flex-1 py-2 flex items-center justify-center transition-colors hover:bg-slate-800/30"
          style={{
            color: post.liked ? '#3b82f6' : 'white',
          }}
          onClick={handleLike}
        >
          <svg 
            className="w-5 h-5 mr-1" 
            fill={post.liked ? "currentColor" : "none"}
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={post.liked ? "0" : "2"} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            ></path>
          </svg>
          <span>Beğen</span>
        </button>
        
        <button 
          className="flex-1 py-2 flex items-center justify-center text-white hover:bg-slate-800/30 transition-colors"
          onClick={() => setShowComments(!showComments)}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            ></path>
          </svg>
          <span>Yorum</span>
        </button>
        
        <button 
          className="flex-1 py-2 flex items-center justify-center hover:bg-slate-800/30 transition-colors"
          style={{
            color: post.saved ? '#3b82f6' : 'white',
          }}
          onClick={handleSave}
        >
          <svg 
            className="w-5 h-5 mr-1" 
            fill={post.saved ? "currentColor" : "none"} 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={post.saved ? "0" : "2"} 
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            ></path>
          </svg>
          <span>Kaydet</span>
        </button>
      </div>
      
      {/* Yorumlar ve yorum formu */}
      {showComments && (
        <div className="p-4 space-y-4">
          {/* Yorum formu */}
          <form onSubmit={handleSubmitComment} className="flex">
            <input
              type="text"
              placeholder="Bir yorum yazın..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 p-2 rounded-l-lg bg-slate-800/50 border-none text-white"
            />
            <button
              type="submit"
              className="px-3 rounded-r-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              disabled={!comment.trim()}
              style={{
                opacity: !comment.trim() ? 0.7 : 1,
              }}
            >
              Gönder
            </button>
          </form>
          
          {/* Hata mesajı */}
          {error && (
            <div 
              className="p-2 rounded-lg text-sm text-center bg-red-500/10 text-red-400 border border-red-500/20"
            >
              {error}
            </div>
          )}
          
          {/* Yorumlar listesi */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 rounded-full border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center py-2 text-sm text-blue-200/70">
                  Henüz yorum yapılmamış. İlk yorumu siz yapın!
                </p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex space-x-2">
                    <div className="flex-shrink-0">
                      {comment.user.profileImage ? (
                        <img 
                          src={comment.user.profileImage} 
                          alt={comment.user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500"
                        >
                          <span className="text-white font-bold text-xs">
                            {comment.user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex-1 p-2 rounded-lg bg-slate-800/50"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm text-white">
                          {comment.user.username}
                        </span>
                        <span className="text-xs text-blue-200/70">
                          {comment.createdAt}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-blue-100">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem;