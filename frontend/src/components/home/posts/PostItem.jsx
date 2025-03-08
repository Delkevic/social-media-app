import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';

const PostItem = ({ post, onLike, onSave, currentUser }) => {
  const navigate = useNavigate();
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
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--background-card)',
        backdropFilter: 'var(--backdrop-blur)',
        boxShadow: 'var(--shadow-lg)',
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
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-red)' }}
            >
              <span style={{ color: 'white', fontWeight: 'bold' }}>
                {post.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>
        
        <div className="ml-3 min-w-0">
          <Link 
            to={`/profile/${post.user.username}`}
            className="font-medium hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {post.user.username}
          </Link>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {post.createdAt}
          </p>
        </div>
        
        <div className="ml-auto">
          <button 
            className="p-1 rounded-full"
            style={{
              color: 'var(--text-tertiary)',
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Gönderi içeriği */}
      <div className="px-4 pb-3">
        <p style={{ color: 'var(--text-primary)' }}>{post.content}</p>
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
      
      console.log(`Yükleniyor: ${imageUrl}`);
      
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
        className="px-4 py-2 flex justify-between text-sm"
        style={{ color: 'var(--text-tertiary)' }}
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
        className="flex border-t border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <button 
          className="flex-1 py-2 flex items-center justify-center"
          style={{
            color: post.liked ? 'var(--accent-red)' : 'var(--text-secondary)',
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
          className="flex-1 py-2 flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
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
          className="flex-1 py-2 flex items-center justify-center"
          style={{
            color: post.saved ? 'var(--accent-red)' : 'var(--text-secondary)',
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
              className="flex-1 p-2 rounded-l-lg"
              style={{
                backgroundColor: 'var(--background-secondary)',
                color: 'var(--text-primary)',
                border: 'none',
              }}
            />
            <button
              type="submit"
              className="px-3 rounded-r-lg"
              style={{
                backgroundColor: 'var(--accent-red)',
                color: 'white',
                opacity: !comment.trim() ? 0.7 : 1,
              }}
              disabled={!comment.trim()}
            >
              Gönder
            </button>
          </form>
          
          {/* Hata mesajı */}
          {error && (
            <div 
              className="p-2 rounded-lg text-sm text-center"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-red)',
                borderColor: 'var(--accent-red)',
              }}
            >
              {error}
            </div>
          )}
          
          {/* Yorumlar listesi */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 rounded-full"
                style={{ borderColor: 'var(--accent-red) transparent transparent transparent' }}></div>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center py-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-red)' }}
                        >
                          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {comment.user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div 
                      className="flex-1 p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--background-secondary)' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {comment.user.username}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {comment.createdAt}
                        </span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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