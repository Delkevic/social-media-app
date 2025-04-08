import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { API_BASE_URL } from '../../../config/constants';

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

  // Sayfa yüklendiğinde ve post değiştiğinde yorumları otomatik yükle
  useEffect(() => {
    // Sayfa yüklendiğinde yorumları otomatik olarak yükle
    if (post && post.id) {
      console.log('Yorumlar yükleniyor, post ID:', post.id);
      fetchComments();
    }
    
    // Komponent temizlendiğinde state'i sıfırla
    return () => {
      setComments([]);
      setLoadingComments(false);
      setError(null);
    };
  }, [post?.id]); // post.id değiştiğinde tetiklenecek

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
      
      console.log('Yorumlar API isteği başlatılıyor, post ID:', post.id);
      
      // API'den yorumları getir
      const response = await api.posts.getComments(post.id);
      
      console.log('Yorumlar API yanıtı:', response);
      
      if (response.success) {
        // Yorum verilerini normalize et
        const normalizedComments = (response.data.comments || []).map(comment => {
          // Ana yorumu normalize et
          const normalizedComment = {
            ...comment,
            id: comment.ID || comment.id,
            createdAt: comment.CreatedAt || comment.createdAt,
            updatedAt: comment.UpdatedAt || comment.updatedAt, 
            deletedAt: comment.DeletedAt || comment.deletedAt,
            content: comment.Content || comment.content,
            user: comment.User || comment.user,
            isLiked: comment.isLiked || false,
            likeCount: comment.likeCount || 0
          };
          
          // Yanıtları normalize et
          if (comment.replies && Array.isArray(comment.replies)) {
            normalizedComment.replies = comment.replies.map(reply => ({
              ...reply,
              id: reply.ID || reply.id,
              createdAt: reply.CreatedAt || reply.createdAt,
              updatedAt: reply.UpdatedAt || reply.updatedAt,
              deletedAt: reply.DeletedAt || reply.deletedAt,
              content: reply.Content || reply.content,
              user: reply.User || reply.user,
              isLiked: reply.isLiked || false,
              likeCount: reply.likeCount || 0
            }));
          } else {
            normalizedComment.replies = [];
          }
          
          return normalizedComment;
        });
        
        console.log('Normalize edilmiş yorumlar:', normalizedComments);
        setComments(normalizedComments);
      } else {
        throw new Error(response.message || 'Yorumlar alınamadı');
      }
      
      setLoadingComments(false);
    } catch (err) {
      console.error('Yorumlar yüklenirken hata:', err, 'Post ID:', post.id);
      setError('Yorumlar yüklenirken bir hata oluştu: ' + err.message);
      setLoadingComments(false);
      
      // Token hatası varsa oturumu temizle
      if (err.message?.includes('token') || err.message?.includes('oturum')) {
        console.error('Token hatası tespit edildi, yeniden giriş gerekebilir');
      }
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
    // Şu anki beğeni durumunu al
    const currentLikedState = post.liked;
    const currentLikeCount = post.likes || 0;
    
    // Optimistik UI güncellemesi (hemen güncelle, sonra doğrula)
    post.liked = !currentLikedState;
    post.likes = currentLikedState ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1;
    
    try {
      // Sunucuya istek gönder
      const response = currentLikedState 
        ? await api.posts.unlike(post.id) 
        : await api.posts.like(post.id);
      
      if (!response.success) {
        throw new Error(response.message || 'Beğeni işlemi başarısız oldu');
      }
      
      // Sunucudan dönen doğru like sayısını kullanıyoruz (varsa)
      if (response.data && typeof response.data.likeCount !== 'undefined') {
        post.likes = response.data.likeCount;
      }
      
      console.log(`Post ${post.id} beğeni durumu: ${post.liked ? 'beğenildi' : 'beğeni kaldırıldı'}, sayı: ${post.likes}`);
      
    } catch (error) {
      console.error('Beğeni işlemi başarısız:', error);
      
      // Hata durumunda orijinal duruma geri dön
      post.liked = currentLikedState;
      post.likes = currentLikeCount;
      
      // Kullanıcıya bildir
      setError('Beğeni işlemi başarısız oldu: ' + (error.message || 'Bilinmeyen hata'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    // Şu anki kaydetme durumunu al
    const currentSavedState = post.saved;
    
    // Optimistik UI güncellemesi
    post.saved = !currentSavedState;
    
    try {
      // Sunucuya istek gönder
      const response = currentSavedState
        ? await api.posts.unsave(post.id)
        : await api.posts.save(post.id);
      
      if (!response.success) {
        throw new Error(response.message || 'Gönderi kaydetme işlemi başarısız oldu');
      }
      
      console.log(`Post ${post.id} kaydetme durumu: ${post.saved ? 'kaydedildi' : 'kaydı kaldırıldı'}`);
      
    } catch (error) {
      console.error('Kaydetme işlemi başarısız:', error);
      
      // Hata durumunda orijinal duruma geri dön
      post.saved = currentSavedState;
      
      // Kullanıcıya bildir
      setError('Kaydetme işlemi başarısız oldu: ' + (error.message || 'Bilinmeyen hata'));
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmitComment = async (e, parentId = null) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      setError(null);
      setLoadingComments(true);
      
      console.log("Yorum gönderiliyor:", {
        content: comment.trim(),
        parentId: parentId,
        postId: post.id
      });
      
      // Formu hemen sıfırla, kullanıcı deneyimi için
      const commentText = comment.trim();
      setComment('');
      
      // API'ye yorumu gönder
      const response = await api.posts.addComment(post.id, commentText, parentId);
      
      console.log('Yorum gönderme yanıtı:', response);
      
      if (!response?.success) {
        throw new Error(response?.message || 'Yorum gönderilirken bir hata oluştu');
      }
      
      // Gönderi yorum sayısını güncelle
      post.comments = (post.comments || 0) + 1;
      
      // Yeni yorumu ekle (API yanıtı yorumu içeriyorsa)
      if (response.data && response.data.comment) {
        const newComment = response.data.comment;
        
        if (parentId) {
          // Eğer bir yanıt ise, ana yoruma ekle
          setComments(prevComments => 
            prevComments.map(c => 
              c.id === parentId 
                ? { ...c, replies: [...(c.replies || []), newComment] } 
                : c
            )
          );
        } else {
          // Yeni bir yorum ise, yorum listesine ekle
          setComments(prevComments => [...prevComments, newComment]);
        }
      } else {
        // API yorumu dönmüyorsa, tüm yorumları tekrar yükle
        await fetchComments();
      }
      
      console.log('Yorum başarıyla eklendi');
      
    } catch (err) {
      console.error('Yorum gönderme hatası:', err, 'Post ID:', post.id);
      setError('Yorum gönderilirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      
      // Token hatası varsa oturumu temizle
      if (err.message?.includes('token') || err.message?.includes('oturum')) {
        console.error('Token hatası tespit edildi, yeniden giriş gerekebilir');
      }
    } finally {
      setLoadingComments(false);
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

  // Görsel URL'lerini tam adrese dönüştürme yardımcı fonksiyonu
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // URL'de çift slash varsa düzelt
    const cleanUrl = imageUrl.replace(/\/+/g, '/');
    
    if (cleanUrl.startsWith("/")) {
      return `${API_BASE_URL}${cleanUrl}`;
    } else {
      return `${API_BASE_URL}/${cleanUrl}`;
    }
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

    // Bir ref olştur ve bunu yorumun kendine özgü bir ID'sine bagla
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
        setLoadingComments(true);
        
        console.log("Yanıt gönderiliyor:", {
          content: replyContent.trim(),
          parentId: comment.id,
          postId: post.id
        });
        
        // Yorum içeriğini saklayarak öncelikle formu temizle (UI daha iyi yanıt versin)
        const savedReplyContent = replyContent.trim();
        setReplyContent('');
        
        // UI durumunu güncelle - yanıtlar görüntülensin
        setShowReplyForm(false);
        setShowReplies(true);
        
        // API'ye yanıt gönder
        const response = await api.posts.addComment(post.id, savedReplyContent, comment.id);
        
        console.log('Yanıt gönderme yanıtı:', response);
        
        if (!response.success) {
          throw new Error(response.message || 'Yanıt gönderilirken bir hata oluştu');
        }
        
        // Gönderi yorum sayısını güncelle
        post.comments += 1;
        
        // Tüm yorumları yeniden yükle (en güvenilir yaklaşım)
        await fetchComments();
        
        console.log('Yanıt başarıyla eklendi ve yorumlar yeniden yüklendi');
        
      } catch (err) {
        console.error('Yanıt gönderilirken hata:', err, 'Post ID:', post.id, 'Comment ID:', comment.id);
        setError('Yanıt gönderilirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
        setTimeout(() => setError(null), 3000);
        
        // Yorum gönderme başarısız olursa formu geri getir
        setShowReplyForm(true);
        
        // Token hatası varsa oturumu temizle
        if (err.message?.includes('token') || err.message?.includes('oturum')) {
          console.error('Token hatası tespit edildi, yeniden giriş gerekebilir');
        }
      } finally {
        setLoadingComments(false);
      }
    };

    const handleCommentLike = async () => {
      if (isLiking || !comment?.id) {
        console.error('Beğeni işlemi yapılamıyor:', !comment?.id ? 'Geçersiz yorum ID\'si' : 'İşlem devam ediyor');
        return;
      }
      
      setIsLiking(true);
      
      // Mevcut beğeni durumunu ve sayısını sakla
      const isCurrentlyLiked = comment.isLiked;
      const currentLikeCount = comment.likeCount || 0;
      
      // Önce UI'ı güncelle (optimistik yaklaşım)
      setComments(prevComments => {
        const updateCommentLikeStatus = (commentList) => {
          if (!Array.isArray(commentList)) return [];
          
          return commentList.map(c => {
            if (!c) return null;
            
            if (c.id === comment.id) {
              return {
                ...c,
                isLiked: !isCurrentlyLiked,
                likeCount: isCurrentlyLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1
              };
            }
            
            if (c.replies && Array.isArray(c.replies)) {
              return {
                ...c, 
                replies: updateCommentLikeStatus(c.replies)
              };
            }
            
            return c;
          }).filter(Boolean);
        };
        
        return updateCommentLikeStatus(prevComments);
      });
      
      try {
        // API çağrısını yap
        const response = await api.comments.toggleLike(comment.id);
        
        // API yanıtında hata varsa
        if (!response?.success) {
          throw new Error(response?.message || 'Beğeni işlemi başarısız oldu');
        }
        
        // Başarılıysa, API'den dönen kesin değerleri kullan
        if (response?.success && response.data) {
          setComments(prevComments => {
            const updateWithServerData = (commentList) => {
              if (!Array.isArray(commentList)) return [];
              
              return commentList.map(c => {
                if (!c) return null;
                
                if (c.id === comment.id) {
                  return {
                    ...c,
                    isLiked: response.data.isLiked,
                    likeCount: response.data.likeCount
                  };
                }
                
                if (c.replies && Array.isArray(c.replies)) {
                  return {
                    ...c, 
                    replies: updateWithServerData(c.replies)
                  };
                }
                
                return c;
              }).filter(Boolean);
            };
            
            return updateWithServerData(prevComments);
          });
          
          console.log(`Yorum ${comment.id} beğeni durumu güncellendi:`, response.data);
        }
        
      } catch (err) {
        console.error('Yorum beğenirken hata:', err);
        
        // Hata durumunda orijinal beğeni durumunu geri yükle
        setComments(prevComments => {
          const revertCommentLikeStatus = (commentList) => {
            if (!Array.isArray(commentList)) return [];
            
            return commentList.map(c => {
              if (!c) return null;
              
              if (c.id === comment.id) {
                return {
                  ...c,
                  isLiked: isCurrentlyLiked,
                  likeCount: currentLikeCount
                };
              }
              
              if (c.replies && Array.isArray(c.replies)) {
                return {
                  ...c, 
                  replies: revertCommentLikeStatus(c.replies)
                };
              }
              
              return c;
            }).filter(Boolean);
          };
          
          return revertCommentLikeStatus(prevComments);
        });
        
        // UNIQUE constraint hatasını özel olarak ele al
        if (err.message?.includes('UNIQUE constraint failed')) {
          console.warn('Yorum zaten beğenilmiş, durumunu güncelliyorum');
        } else {
          // Diğer hataları kullanıcıya göster
          setError(`Beğeni işlemi başarısız oldu: ${err.message}`);
          setTimeout(() => setError(null), 3000);
        }
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
                console.error('setComments: prevComments bir dizi degil');
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
                  imageUrl = getFullImageUrl(imageUrl);
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
      
      {/* Etkilesim bilgileri */}
      <div 
        className="px-4 py-2 flex justify-between text-sm text-blue-200"
      >
        <div>
          {post.likes > 0 && (
            <span>{post.likes} begeni</span>
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
      
      {/* Etkilesim butonları */}
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
              <span>Begeni</span>
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