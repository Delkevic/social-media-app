import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

const PostItem = ({ post, onLike, onSave, onDelete, currentUser }) => {
  // Prop kontrolleri
  if (!post) {
    console.error('PostItem: post prop\'u gerekli');
    return null;
  }

  if (!currentUser) {
    console.error('PostItem: currentUser prop\'u gerekli');
    return null;
  }

  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const response = await api.posts.getComments(post.id);
      if (response.success) {
        // Yorum verilerini normalize et
        const normalizedComments = (response.data.comments || []).map(comment => ({
          ...comment,
          id: comment.ID,
          createdAt: comment.CreatedAt,
          updatedAt: comment.UpdatedAt,
          deletedAt: comment.DeletedAt,
          content: comment.content,
          user: comment.user,
          isLiked: comment.isLiked || false,
          likeCount: comment.likeCount || 0,
          replies: Array.isArray(comment.replies) ? comment.replies.map(reply => ({
            ...reply,
            id: reply.ID,
            createdAt: reply.CreatedAt,
            updatedAt: reply.UpdatedAt,
            deletedAt: reply.DeletedAt,
            isLiked: reply.isLiked || false,
            likeCount: reply.likeCount || 0
          })) : []
        }));
        setComments(normalizedComments);
      }
      
      setLoadingComments(false);
    } catch (err) {
      setError('Yorumlar yüklenirken bir hata oluştu: ' + err.message);
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
    try {
      await onLike(post.id);
    } catch (error) {
      console.error('Beğeni işlemi başarısız:', error);
      setError('Beğeni işlemi başarısız oldu');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = () => {
    onSave(post.id);
  };

  const handleSubmitComment = async (e, parentId = null) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      // API'ye yorumu gönder
      const response = await api.posts.addComment(post.id, {
        content: comment.trim(),
        parentId: parentId
      });
      
      // Başarılı yanıt gelirse yorumu ekle
      if (response.success) {
        const newComment = {
          ...response.data.comment,
          id: response.data.comment.ID,
          createdAt: response.data.comment.CreatedAt,
          updatedAt: response.data.comment.UpdatedAt,
          deletedAt: response.data.comment.DeletedAt,
          replies: []
        };
        
        if (parentId) {
          setComments(prevComments => prevComments.map(c => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [newComment, ...(c.replies || [])]
              };
            }
            return c;
          }));
        } else {
          setComments(prevComments => [newComment, ...prevComments]);
        }
        
        // Formu sıfırla
        setComment('');
        
        // Gönderi yorum sayısını güncelle
        post.comments += 1;
      }
    } catch (err) {
      setError('Yorum gönderilirken bir hata oluştu: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    if (window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) {
      setIsDeleting(true);
      try {
        await onDelete(post.id);
        setShowMenu(false);
      } catch (error) {
        console.error('Gönderi silinirken bir hata oluştu:', error);
        setError('Gönderi silinirken bir hata oluştu');
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleReport = async () => {
    try {
      const response = await api.posts.report(post.id);
      if (response.success) {
        setError('Gönderi başarıyla şikayet edildi');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Gönderi şikayet edilirken bir hata oluştu:', error);
      setError('Gönderi şikayet edilirken bir hata oluştu');
      setTimeout(() => setError(null), 3000);
    }
    setShowMenu(false);
  };

  const Comment = ({ comment, onReply, currentUser, setComments }) => {
    // Prop kontrolleri
    if (!comment) {
      console.error('Comment: comment prop\'u gerekli');
      return null;
    }

    if (!currentUser) {
      console.error('Comment: currentUser prop\'u gerekli');
      return null;
    }

    if (!setComments) {
      console.error('Comment: setComments prop\'u gerekli');
      return null;
    }

    // Bir ref oluştur ve bunu yorumun kendine özgü bir ID'sine bağla
    // Bu şekilde component yeniden render edilse bile state korunacak
    const commentId = comment?.id?.toString() || Math.random().toString();
    const instanceKey = `comment-${commentId}`;
    
    // Her Comment instance'ının kendi benzersiz ID'si ile state'leri global olarak sakla
    if (!window.commentStates) {
      window.commentStates = {};
    }
    
    if (!window.commentStates[instanceKey]) {
      window.commentStates[instanceKey] = {
        showReplies: false,
        showReplyForm: false
      };
    }

    const [showReplyForm, setShowReplyForm] = useState(window.commentStates[instanceKey].showReplyForm);
    const [showReplies, setShowReplies] = useState(window.commentStates[instanceKey].showReplies);
    const [replyContent, setReplyContent] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // showReplies veya showReplyForm değiştiğinde, global state'i güncelle
    useEffect(() => {
      window.commentStates[instanceKey].showReplies = showReplies;
    }, [showReplies, instanceKey]);
    
    useEffect(() => {
      window.commentStates[instanceKey].showReplyForm = showReplyForm;
    }, [showReplyForm, instanceKey]);

    if (!comment || !comment.user) {
      return null;
    }

    const getInitial = (username) => {
      if (!username) return '?';
      return username.charAt(0).toUpperCase();
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60) return 'şimdi';
      if (minutes < 60) return `${minutes} dk önce`;
      if (hours < 24) return `${hours} saat önce`;
      if (days < 7) return `${days} gün önce`;
      if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} hafta önce`;
      }
      if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} ay önce`;
      }
      const years = Math.floor(days / 365);
      return `${years} yıl önce`;
    };

    const handleReplySubmit = async (e) => {
      e.preventDefault();
      if (!replyContent.trim()) return;
      
      try {
        const response = await api.posts.addComment(post.id, {
          content: replyContent.trim(),
          parentId: comment.id
        });
        
        if (response.success) {
          const newReply = {
            ...response.data.comment,
            id: response.data.comment.ID,
            createdAt: response.data.comment.CreatedAt,
            updatedAt: response.data.comment.UpdatedAt,
            deletedAt: response.data.comment.DeletedAt,
            likeCount: 0,
            isLiked: false,
            replies: []
          };
          
          setComments(prevComments => 
            prevComments.map(c => {
              if (c.id === comment.id) {
                return {
                  ...c,
                  replies: [newReply, ...(c.replies || [])]
                };
              }
              return c;
            })
          );
          
          setReplyContent('');
          setShowReplyForm(false);
          setShowReplies(true);
          post.comments += 1;
        }
      } catch (err) {
        console.error('Yanıt gönderilirken hata:', err);
      }
    };

    const handleCommentLike = async () => {
      if (isLiking || !comment?.id) {
        console.error('Beğeni işlemi yapılamıyor:', !comment?.id ? 'Geçersiz yorum ID\'si' : 'İşlem devam ediyor');
        return;
      }
      
      setIsLiking(true);
      
      // Halihazırda açık olan yorum yanıt durumlarını kaydet
      const openRepliesStates = {};
      const saveOpenStates = (comments) => {
        if (!Array.isArray(comments)) return;
        comments.forEach(c => {
          if (!c || !c.id) return;
          const key = `comment-${c.id}`;
          if (window.commentStates && window.commentStates[key]) {
            openRepliesStates[key] = { ...window.commentStates[key] };
          }
          if (c.replies && Array.isArray(c.replies)) {
            saveOpenStates(c.replies);
          }
        });
      };
      
      // Mevcut yorumların açık/kapalı durumlarını kaydet
      saveOpenStates(comments);
      
      try {
        const response = await api.comments.toggleLike(comment.id);
        
        if (!response?.success) {
          throw new Error(response?.message || 'Beğeni işlemi başarısız oldu');
        }
        
        // API yanıtına göre state'i güncelle
        setComments(prevComments => {
          if (!Array.isArray(prevComments)) {
            console.error('setComments: prevComments bir dizi değil');
            return prevComments;
          }
          
          return prevComments.map(c => {
            if (!c) return null;
            
            if (c.id === comment.id) {
              return {
                ...c,
                isLiked: response.data.isLiked,
                likeCount: response.data.likeCount
              };
            }
            
            if (c.replies && Array.isArray(c.replies)) {
              const updatedReplies = c.replies.map(r => {
                if (!r) return null;
                if (r.id === comment.id) {
                  return {
                    ...r,
                    isLiked: response.data.isLiked,
                    likeCount: response.data.likeCount
                  };
                }
                return r;
              }).filter(Boolean);
              
              return { ...c, replies: updatedReplies };
            }
            
            return c;
          }).filter(Boolean);
        });
        
        // İşlem bittikten sonra, kaydedilen açık durumları window.commentStates'e geri yükle
        Object.keys(openRepliesStates).forEach(key => {
          if (window.commentStates) {
            window.commentStates[key] = openRepliesStates[key];
          }
        });
      } catch (err) {
        console.error('Yorum beğenirken hata:', err);
        setError(`Beğeni işlemi başarısız oldu: ${err.message}`);
        setTimeout(() => setError(null), 3000);
      } finally {
        setIsLiking(false);
      }
    };

    const handleDelete = async () => {
      if (isDeleting) return;
      
      if (window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
        setIsDeleting(true);
        try {
          const response = await api.comments.delete(comment.id);
          if (response.success) {
            setComments(prevComments => {
              if (!Array.isArray(prevComments)) {
                console.error('setComments: prevComments bir dizi değil');
                return prevComments;
              }
              return prevComments.filter(c => c.id !== comment.id);
            });
          }
        } catch (error) {
          console.error('Yorum silinirken bir hata oluştu:', error);
          setError('Yorum silinirken bir hata oluştu');
          setTimeout(() => setError(null), 3000);
        } finally {
          setIsDeleting(false);
          setShowMenu(false);
        }
      }
    };

    const handleReport = async () => {
      try {
        const response = await api.comments.report(comment.id);
        if (response.success) {
          setError('Yorum başarıyla şikayet edildi');
          setTimeout(() => setError(null), 3000);
        }
      } catch (error) {
        console.error('Yorum şikayet edilirken bir hata oluştu:', error);
        setError('Yorum şikayet edilirken bir hata oluştu');
        setTimeout(() => setError(null), 3000);
      }
      setShowMenu(false);
    };

    return (
      <div className="space-y-3">
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <Link to={`/profile/${comment.user.username}`}>
              {comment.user.profileImage ? (
                <img 
                  src={comment.user.profileImage} 
                  alt={comment.user.username}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 ring-2 ring-blue-500/20">
                  <span className="text-white font-medium text-sm">
                    {getInitial(comment.user.username)}
                  </span>
                </div>
              )}
            </Link>
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="p-3 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-white/5">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                  <Link 
                    to={`/profile/${comment.user.username}`}
                    className="font-medium text-sm text-white hover:text-blue-400 transition-colors"
                  >
                    {comment.user.username}
                  </Link>
                  <span className="text-xs text-blue-300/50">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {comment.user.id === currentUser.id && (
                  <div className="relative">
                    <button 
                      className="p-1 rounded-full text-blue-200 hover:bg-slate-700/50 transition-colors"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </button>

                    {showMenu && (
                      <div 
                        ref={menuRef}
                        className="absolute right-0 mt-1 py-1 w-48 rounded-lg shadow-lg"
                        style={{
                          backgroundColor: "rgba(30, 34, 46, 0.95)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255, 255, 255, 0.1)"
                        }}
                      >
                        <button
                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center justify-between"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          <span>Yorumu Sil</span>
                          {isDeleting && (
                            <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full"></div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-blue-100/90 leading-relaxed">
                {comment.content}
              </p>
            </div>
            
            <div className="flex items-center space-x-4 px-1">
              <button 
                className={`flex items-center space-x-1 text-xs transition-colors ${
                  comment.isLiked ? 'text-blue-400' : 'text-blue-300/50 hover:text-blue-400'
                }`}
                onClick={handleCommentLike}
                disabled={isLiking}
              >
                <svg 
                  className="w-4 h-4" 
                  fill={comment.isLiked ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={comment.isLiked ? "0" : "2"} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>{comment.likeCount || 0}</span>
              </button>

              <button 
                className="text-xs text-blue-300/50 hover:text-blue-400 transition-colors"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                Yanıtla
              </button>

              {comment.replies?.length > 0 && (
                <button 
                  className="text-xs text-blue-300/50 hover:text-blue-400 transition-colors"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? 'Yanıtları Gizle' : `${comment.replies.length} yanıtı göster`}
                </button>
              )}
            </div>
            
            {showReplyForm && (
              <form onSubmit={handleReplySubmit} className="flex mt-2">
                <input
                  type="text"
                  placeholder="Yanıt yaz..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-l-xl bg-slate-800/50 border border-white/5 text-white text-sm placeholder-blue-300/30 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  type="submit"
                  className="px-4 rounded-r-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                  disabled={!replyContent.trim()}
                  style={{
                    opacity: !replyContent.trim() ? 0.5 : 1,
                  }}
                >
                  Gönder
                </button>
              </form>
            )}
          </div>
        </div>
        
        {showReplies && comment.replies?.length > 0 && (
          <div className="ml-11 space-y-3 border-l-2 border-blue-500/10 pl-4">
            {comment.replies.map(reply => {
              // ID kontrolü yap
              if (!reply?.id) {
                console.error('Geçersiz yanıt:', reply);
                return null;
              }
              
              return (
                <Comment 
                  key={`reply-${reply.id}-${Date.now()}`} 
                  comment={reply} 
                  onReply={(parentId, content) => handleSubmitComment({ 
                    preventDefault: () => {}, 
                    target: null 
                  }, parentId)}
                  currentUser={currentUser}
                  setComments={setComments}
                />
              );
            }).filter(Boolean)}
          </div>
        )}
      </div>
    );
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
        
        <div className="ml-auto relative">
          <button 
            className="p-1 rounded-full text-blue-200 hover:bg-slate-700/50 transition-colors"
            onClick={() => setShowMenu(!showMenu)}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 mt-1 py-1 w-48 rounded-lg shadow-lg"
              style={{
                backgroundColor: "rgba(30, 34, 46, 0.95)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.1)"
              }}
            >
              {post.user.id === currentUser.id && (
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 text-red-400 flex items-center justify-between"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <span>Gönderiyi Sil</span>
                  {isDeleting && (
                    <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full"></div>
                  )}
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700/50 text-blue-200"
                onClick={handleReport}
              >
                Gönderiyi Şikayet Et
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Gönderi içeriği */}
      <div className="px-4 pb-3">
        <p className="text-white">{post.content}</p>
      </div>
      
      {/* Gönderi görselleri (varsa) */}
      {post.images && post.images.length > 0 && (
        <div className="relative w-full flex justify-center bg-black">
          {/* Görsel slider */}
          <div className="relative w-full overflow-hidden" style={{ height: "calc(100vh - 400px)", minHeight: "400px", maxHeight: "600px" }}>
            <div 
              className="flex h-full transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(-${currentImageIndex * 100}%)`,
              }}
            >
              {post.images.map((image, index) => {
                // Görsel URL'sini işle
                let imageUrl = '';
                
                if (typeof image === 'string') {
                  imageUrl = image;
                } else if (image.url) {
                  imageUrl = image.url;
                }
                
                // URL'yi düzelt
                if (imageUrl && !imageUrl.startsWith('http')) {
                  imageUrl = `http://localhost:8080/api/images/${imageUrl}`;
                }
                
                return (
                  <div 
                    key={`image-${index}-${typeof image === 'string' ? image : (image.id || Date.now())}`}
                    className="flex-shrink-0 w-full h-full flex items-center justify-center bg-black"
                  >
                    <img 
                      src={imageUrl}
                      alt={`Gönderi görseli ${index + 1}`}
                      className="max-w-full max-h-full object-contain"
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

            {/* Kaydırma butonları */}
            {post.images.length > 1 && (
              <>
                {/* Sol buton */}
                {currentImageIndex > 0 && (
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    onClick={() => setCurrentImageIndex(prev => prev - 1)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Sağ buton */}
                {currentImageIndex < post.images.length - 1 && (
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    onClick={() => setCurrentImageIndex(prev => prev + 1)}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* Nokta göstergeleri */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                  {post.images.map((image, index) => (
                    <button
                      key={`dot-${index}`}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
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
          disabled={isLiking}
        >
          {isLiking ? (
            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <>
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
            </>
          )}
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
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center py-2 text-sm text-blue-200/70">
                  Henüz yorum yapılmamış. İlk yorumu siz yapın!
                </p>
              ) : (
                comments.map(comment => {
                  // ID kontrolü yap
                  if (!comment?.id) {
                    console.error('Geçersiz yorum:', comment);
                    return null;
                  }
                  
                  return (
                    <Comment 
                      key={`comment-${comment.id}-${Date.now()}`} 
                      comment={comment}
                      onReply={(parentId, content) => handleSubmitComment({ 
                        preventDefault: () => {}, 
                        target: null 
                      }, parentId)}
                      currentUser={currentUser}
                      setComments={setComments}
                    />
                  );
                }).filter(Boolean)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem;
