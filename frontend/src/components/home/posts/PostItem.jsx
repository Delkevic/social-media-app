import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { API_BASE_URL } from '../../../config/constants';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, Trash2, AlertCircle } from 'lucide-react';

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
      
      // Post verisini kontrol et
      if (post && post.id) {
        console.log("Post görselleri:", {
          imageUrls: post.imageUrls,
          images: post.images, 
          media: post.media,
          image: post.image
        });
      }
      
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
      
      // Yorum içeriğini saklayıp formu temizle
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
      setIsDeleting(true);
      try {
      const response = await api.posts.delete(post.id);
      if (response.success) {
        setShowMenu(false);
        if (onDelete) onDelete(post.id);
      } else {
        throw new Error(response.message || 'Gönderi silinemedi');
      }
    } catch (err) {
      console.error('Gönderi silme hatası:', err);
      setError('Gönderi silinirken bir hata oluştu: ' + err.message);
      setShowMenu(false);
      } finally {
        setIsDeleting(false);
    }
  };

  const handleReport = async () => {
    try {
      const response = await api.posts.report(post.id);
      if (response.success) {
        alert('Gönderi bildirildi.');
        setShowMenu(false);
      } else {
        throw new Error(response.message || 'Gönderi bildirilemedi');
      }
    } catch (err) {
      console.error('Gönderi bildirme hatası:', err);
      setError('Gönderi bildirilirken bir hata oluştu: ' + err.message);
    setShowMenu(false);
    }
  };

  // Görsel URL'lerini tam adrese dönüştürme yardımcı fonksiyonu
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) {
      console.log("Boş görsel URL'i, varsayılan görüntü döndürülüyor");
      return `${API_BASE_URL}/uploads/images/no-image.jpg`; // Backend'deki varsayılan resim
    }
    
    try {
      // Eğer URL bir obje ise (API yanıtı bazen böyle olabilir)
      if (typeof imageUrl === 'object') {
        if (imageUrl.url) {
          imageUrl = imageUrl.url;
        } else if (imageUrl.path) {
          imageUrl = imageUrl.path;
        } else {
          console.error("Nesne türünde görsel URL'i beklenmeyen formatta:", imageUrl);
          return `${API_BASE_URL}/uploads/images/missing-image.jpg`; // Backend'deki yedek resim
        }
      }
      
      // URL string olmalı
      if (typeof imageUrl !== 'string') {
        console.error("Görsel URL'i string değil:", typeof imageUrl, imageUrl);
        return `${API_BASE_URL}/uploads/images/invalid-image.jpg`; // Backend'deki yedek resim
      }
      
      // URL zaten HTTP/HTTPS ile başlıyorsa doğrudan kullan
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      
      // Backend'in uploads klasörünü kontrol et
      if (imageUrl.includes('uploads/')) {
        // Eğer path zaten "uploads/" içeriyorsa, başındaki slash'ı kontrol et
        return imageUrl.startsWith('/') 
          ? `${API_BASE_URL}${imageUrl}`
          : `${API_BASE_URL}/${imageUrl}`;
      }
      
      // URL en başta slash ile başlıyorsa doğru şekilde birleştir
      if (imageUrl.startsWith('/')) {
        // Eğer URL /uploads/ ile başlamıyorsa, kontrol et
        if (!imageUrl.startsWith('/uploads/')) {
          // Uploads klasörünü ekle
          return `${API_BASE_URL}/uploads${imageUrl}`;
        }
        return `${API_BASE_URL}${imageUrl}`; 
      }
      
      // Diğer durumlar için /uploads/ klasörünü ekle
      if (!imageUrl.startsWith('uploads/')) {
        return `${API_BASE_URL}/uploads/${imageUrl}`;
      }
      
      // Son durum: URL uploads/ ile başlıyor
      return `${API_BASE_URL}/${imageUrl}`;
    } catch (error) {
      console.error("URL oluşturma hatası:", error, "Orijinal URL:", imageUrl);
      return `${API_BASE_URL}/uploads/images/error-image.jpg`; // Backend'deki hata resmi
    }
  };

  // Menüyü kapatmak için dışarı tıklama kontrolü
    useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Bilinmeyen tarih';
      
      // Özel durumlar: "şimdi" veya "biraz önce" gibi değerler için
      if (typeof dateString === 'string') {
        // Özel durumlar kontrolü
        if (dateString === 'şimdi' || dateString === 'biraz önce' || dateString === 'just now') {
          return 'biraz önce';
        }
        
        // Diğer zaten formatlanmış tarihler
        if (dateString.includes('önce') || 
            dateString.includes('sonra') || 
            dateString.includes('gün') || 
            dateString.includes('ay') || 
            dateString.includes('yıl') || 
            dateString.includes('saat') || 
            dateString.includes('dakika') || 
            dateString.includes('saniye')) {
          return dateString;
        }
      }
      
      // ISO string formatını kontrol et
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn("Geçersiz tarih formatı:", dateString, "biraz önce olarak gösteriliyor");
        return 'biraz önce';
      }
      
      return formatDistanceToNow(date, { addSuffix: true, locale: tr });
    } catch (error) {
      console.error("Tarih formatlama hatası:", error, "Tarih:", dateString);
      return 'biraz önce';
    }
  };

  const getImageArray = () => {
    if (post.imageUrls && post.imageUrls.length > 0) return post.imageUrls;
    if (post.images && post.images.length > 0) return post.images;
    if (post.media && post.media.length > 0) return post.media;
    if (post.image) return [post.image];
    return [];
  };

  const nextImage = () => {
    const images = getImageArray();
    if (images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    const images = getImageArray();
    if (images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const userProfileImageUrl = post.user?.profileImage 
    ? (post.user.profileImage.startsWith('http') ? post.user.profileImage : `${API_BASE_URL}/${post.user.profileImage}`)
    : null;

  const currentUserProfileImageUrl = currentUser?.profileImage 
    ? (currentUser.profileImage.startsWith('http') ? currentUser.profileImage : `${API_BASE_URL}/${currentUser.profileImage}`)
    : null;

  // ---- YORUM BİLEŞENİ ----
  const Comment = ({ comment, onReply, currentUser, setComments }) => {
    const [replyText, setReplyText] = useState('');
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [isReplying, setIsReplying] = useState(false); // Yanıt gönderirken yüklenme durumu
    const [replyError, setReplyError] = useState(null);
    const [isLikingComment, setIsLikingComment] = useState(false);
    const [isDeletingComment, setIsDeletingComment] = useState(false);
    const [commentMenuVisible, setCommentMenuVisible] = useState(false);
    const commentMenuRef = useRef(null);

    // Yorum menüsünü kapatmak için dışarı tıklama
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (commentMenuRef.current && !commentMenuRef.current.contains(event.target)) {
          setCommentMenuVisible(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const getInitial = (username) => {
      return username ? username[0].toUpperCase() : '?';
    };

    const commentUserProfileImageUrl = comment.user?.profileImage 
      ? (comment.user.profileImage.startsWith('http') ? comment.user.profileImage : `${API_BASE_URL}/${comment.user.profileImage}`)
      : null;

    const handleReplySubmit = async (e) => {
      e.preventDefault();
      if (!replyText.trim() || isReplying) return;

      setIsReplying(true);
      setReplyError(null);
      
      try {
        const response = await api.posts.addComment(post.id, replyText, comment.id); // parentId olarak yorumun ID'sini ver
        if (response.success) {
          setReplyText('');
          setShowReplyInput(false);
          fetchComments(); // Ana post yorumlarını yeniden çekerek yanıtı da göster
        } else {
          throw new Error(response.message || 'Yanıt gönderilemedi');
        }
      } catch (err) {
        console.error('Yanıt gönderme hatası:', err);
        setReplyError('Yanıt gönderilemedi: ' + err.message);
      } finally {
        setIsReplying(false);
      }
    };

    const handleCommentLike = async () => {
      if (isLikingComment) return;
      setIsLikingComment(true);

      const currentLikedState = comment.isLiked;
      const currentLikeCount = comment.likeCount || 0;
      
      // Optimistic UI
        const updateCommentLikeStatus = (commentList) => {
          return commentList.map(c => {
            if (c.id === comment.id) {
            return { ...c, isLiked: !currentLikedState, likeCount: currentLikedState ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1 };
          }
          if (c.replies) {
            return { ...c, replies: updateCommentLikeStatus(c.replies) };
          }
            return c;
        });
        };
      setComments(prevComments => updateCommentLikeStatus(prevComments));
      
      try {
        const response = currentLikedState
          ? await api.posts.unlikeComment(comment.id)
          : await api.posts.likeComment(comment.id);
        
        if (!response.success) {
          throw new Error(response.message || 'Yorum beğenme işlemi başarısız oldu');
        }
        
        // Sunucudan gelen güncel veriyi kullan (isteğe bağlı ama daha doğru)
        if (response.data && typeof response.data.likeCount !== 'undefined') {
            const updateWithServerData = (commentList) => {
              return commentList.map(c => {
                if (c.id === comment.id) {
                  return { ...c, isLiked: response.data.isLiked, likeCount: response.data.likeCount };
                }
                if (c.replies) {
                  return { ...c, replies: updateWithServerData(c.replies) };
                }
                return c;
              });
            };
             setComments(prevComments => updateWithServerData(prevComments));
        }

      } catch (error) {
        console.error('Yorum beğenme hatası:', error);
        // Hata durumunda geri al
          const revertCommentLikeStatus = (commentList) => {
            return commentList.map(c => {
              if (c.id === comment.id) {
                return { ...c, isLiked: currentLikedState, likeCount: currentLikeCount };
              }
              if (c.replies) {
                return { ...c, replies: revertCommentLikeStatus(c.replies) };
              }
              return c;
            });
          };
        setComments(prevComments => revertCommentLikeStatus(prevComments));
        setReplyError('Yorum beğenme işlemi başarısız oldu');
      } finally {
        setIsLikingComment(false);
      }
    };

     const handleDeleteComment = async () => {
      if (isDeletingComment) return;
      setIsDeletingComment(true);
      try {
        const response = await api.posts.deleteComment(comment.id);
          if (response.success) {
           fetchComments(); // Yorumları yeniden çek
        } else {
          throw new Error(response.message || 'Yorum silinemedi');
        }
      } catch (err) {
        console.error('Yorum silme hatası:', err);
        setReplyError('Yorum silinirken bir hata oluştu: ' + err.message);
        } finally {
        setIsDeletingComment(false);
        setCommentMenuVisible(false);
      }
    };

     const handleReportComment = async () => {
      try {
          const response = await api.posts.reportComment(comment.id);
        if (response.success) {
            alert('Yorum bildirildi.');
          } else {
            throw new Error(response.message || 'Yorum bildirilemedi');
          }
        } catch (err) {
          console.error('Yorum bildirme hatası:', err);
          setReplyError('Yorum bildirilirken bir hata oluştu: ' + err.message);
        } finally {
           setCommentMenuVisible(false);
        }
    };

    return (
      <div className="flex space-x-3 py-2">
        {/* Yorum Yapan Kullanıcı Avatarı */}
        <Link to={`/profile/${comment.user?.username}`} className="flex-shrink-0">
          {commentUserProfileImageUrl ? (
            <img src={commentUserProfileImageUrl} alt={comment.user?.username} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] font-bold">
              {getInitial(comment.user?.username)}
                </div>
              )}
            </Link>
        
        <div className="flex-1">
          {/* Kullanıcı Adı ve Yorum İçeriği */}
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="flex justify-between items-start">
              <div>
                <Link to={`/profile/${comment.user?.username}`} className="font-medium text-sm text-white hover:text-[#0affd9] transition-colors">
                  {comment.user?.username}
                  </Link>
                <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                </div>
              {/* Yorum Menüsü Butonu */}   
              {(currentUser?.id === comment.user?.id || currentUser?.isAdmin) && (
                 <div className="relative" ref={commentMenuRef}>
                    <button 
                      onClick={() => setCommentMenuVisible(!commentMenuVisible)} 
                      className="text-gray-500 hover:text-[#0affd9] p-1 rounded-full transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {commentMenuVisible && (
                      <div className="absolute right-0 mt-1 w-32 bg-gray-900 border border-[#0affd9]/20 rounded-lg shadow-lg z-20 py-1">
                         {currentUser?.id === comment.user?.id && (
                        <button
                              onClick={handleDeleteComment}
                              disabled={isDeletingComment}
                              className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-600/20 disabled:opacity-50 transition-colors flex items-center"
                            >
                               <Trash2 size={14} className="mr-2"/> Sil {isDeletingComment && '...'}
                             </button>
                          )}
                           <button 
                             onClick={handleReportComment}
                             className="w-full text-left px-3 py-1.5 text-sm text-yellow-400 hover:bg-yellow-600/20 transition-colors flex items-center"
                           >
                             <AlertCircle size={14} className="mr-2"/> Bildir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          {/* Yorum Alt Bilgisi (Tarih, Beğen, Yanıtla) */}
          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
            <span>{formatDate(comment.createdAt)}</span>
              <button 
                onClick={handleCommentLike}
               disabled={isLikingComment}
               className={`font-medium flex items-center transition-colors ${comment.isLiked ? 'text-[#0affd9]' : 'hover:text-gray-300'}`}
            >
               <Heart size={12} className={`mr-1 ${comment.isLiked ? 'fill-current' : ''}`} /> {comment.likeCount || 0} Beğen
              </button>
              <button 
              onClick={() => setShowReplyInput(!showReplyInput)} 
              className="font-medium hover:text-gray-300 transition-colors"
              >
                Yanıtla
              </button>
            </div>
            
          {/* Yanıt Yazma Alanı */}
          {showReplyInput && (
            <form onSubmit={handleReplySubmit} className="mt-2 flex space-x-2 items-start">
              <Link to={`/profile/${currentUser?.username}`} className="flex-shrink-0">
                 {currentUserProfileImageUrl ? (
                   <img src={currentUserProfileImageUrl} alt={currentUser?.username} className="w-6 h-6 rounded-full object-cover bg-gray-700" />
                 ) : (
                   <div className="w-6 h-6 rounded-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] text-xs font-bold">
                     {getInitial(currentUser?.username)}
                   </div>
                 )}
               </Link>
               <div className="flex-1 relative">
                <input
                  type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`${comment.user?.username || 'Kullanıcı'} adlı kişiye yanıt ver...`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-full py-1.5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9] pr-10"
                />
                <button
                  type="submit"
                     disabled={!replyText.trim() || isReplying}
                     className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#0affd9] disabled:text-gray-600 hover:text-white disabled:hover:text-gray-600 transition-colors p-1 rounded-full"
                   >
                     {isReplying ? <div className="w-4 h-4 border-2 border-t-[#0affd9] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div> : <Send size={16} />}
                </button>
               </div>
              </form>
            )}
           {replyError && <p className="text-xs text-red-400 mt-1">{replyError}</p>}
          
          {/* Yorumun Yanıtları */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 pl-6 border-l border-gray-700">
              {comment.replies.map(reply => (
                 <Comment key={reply.id} comment={reply} onReply={onReply} currentUser={currentUser} setComments={setComments} />
              ))}
          </div>
        )}
        </div>
      </div>
    );
  };
  // ---- YORUM BİLEŞENİ SONU ----

  return (
    <div className="rounded-2xl overflow-hidden bg-black/60 border border-[#0affd9]/20 backdrop-blur-lg shadow-lg mb-6">
      {/* Gönderi Başlığı */} 
      <div className="flex items-center justify-between p-3 border-b border-[#0affd9]/20">
        <Link to={`/profile/${post.user?.username}`} className="flex items-center space-x-3 group">
          {userProfileImageUrl ? (
            <img src={userProfileImageUrl} alt={post.user?.username} className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-[#0affd9] transition-colors" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] font-bold border-2 border-transparent group-hover:border-[#0affd9] transition-colors">
              {post.user?.username ? post.user.username[0].toUpperCase() : 'P'}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-white group-hover:text-[#0affd9] transition-colors">
              {post.user?.username || 'Bilinmeyen Kullanıcı'}
            </p>
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
              {formatDate(post.createdAt || post.CreatedAt)}
          </p>
        </div>
        </Link>
        
        {/* Seçenekler Menüsü */} 
        {(currentUser?.id === post.user?.id || currentUser?.isAdmin) && (
          <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-[#0affd9] p-1 rounded-full transition-colors"
          >
              <MoreHorizontal size={20} />
          </button>
          {showMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-[#0affd9]/20 rounded-lg shadow-lg z-10 py-1">
                {currentUser?.id === post.user?.id && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-600/20 disabled:opacity-50 transition-colors flex items-center"
                >
                    <Trash2 size={14} className="mr-2" /> Sil {isDeleting && '...'}
                </button>
              )}
              <button
                onClick={handleReport}
                  className="w-full text-left px-3 py-1.5 text-sm text-yellow-400 hover:bg-yellow-600/20 transition-colors flex items-center"
              >
                 <AlertCircle size={14} className="mr-2"/> Bildir
              </button>
            </div>
          )}
        </div>
        )}
      </div>
      
      {/* Gönderi İçeriği (Metin) */} 
      {post.content && (
        <p className="p-3 text-sm text-gray-300 whitespace-pre-wrap break-words">
          {post.content}
        </p>
      )}
      
      {/* Gönderi Medyası (Resim veya Video) */} 
      {(() => {
        // Görsel veya video içerik olup olmadığını kontrol et
        const hasImageUrls = post.imageUrls && post.imageUrls.length > 0;
        const hasImages = post.images && post.images.length > 0;
        const hasSingleImage = post.image; // Tekil image alanı
        const hasMedia = post.media && post.media.length > 0;
        const hasVideoUrl = post.videoUrl;
        
        // Kullanılacak resim dizisini belirle
        let imagesToUse = null;
        if (hasImageUrls) {
          imagesToUse = post.imageUrls;
        } else if (hasImages) {
          imagesToUse = post.images;
        } else if (hasMedia) {
          imagesToUse = post.media;
        } else if (hasSingleImage) {
          imagesToUse = [post.image];
        }
        
        // Herhangi bir medya içeriği yoksa, null döndür
        if (!imagesToUse && !hasVideoUrl) {
          return null;
                }
                
                return (
          <div className="relative bg-black">
            {imagesToUse && imagesToUse.length > 0 && (
              <img
                src={getFullImageUrl(imagesToUse[currentImageIndex])}
                alt={`Gönderi resmi ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain"
                      onError={(e) => {
                  console.error("Görsel yükleme hatası:", e.target.src);
                  e.target.src = `${API_BASE_URL}/uploads/images/image-error.jpg`; // Backend'deki hata resmi
                }}
              />
            )}
            
            {hasVideoUrl && (
              <video
                src={getFullImageUrl(post.videoUrl)} 
                controls
                className="w-full h-auto max-h-[70vh] object-contain"
                preload="metadata"
                onError={(e) => {
                  console.error("Video yükleme hatası:", e.target.src);
                }}
              >
                Tarayıcınız video etiketini desteklemiyor.
              </video>
            )}
            
            {/* Resimler arası geçiş butonları */} 
            {imagesToUse && imagesToUse.length > 1 && (
              <>
                  <button
                  onClick={prevImage} 
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/80 transition-opacity opacity-70 hover:opacity-100"
                  aria-label="Önceki resim"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>
                    <button
                  onClick={nextImage} 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/80 transition-opacity opacity-70 hover:opacity-100"
                  aria-label="Sonraki resim"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
                {/* Resim göstergesi */} 
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                  {imagesToUse.map((_, index) => (
                    <div 
                      key={index} 
                      className={`w-1.5 h-1.5 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}
      
      {/* Etkileşim Butonları */} 
      <div className="flex justify-between items-center p-3 border-t border-[#0affd9]/20">
        <div className="flex space-x-4 items-center">
          {/* Beğen Butonu */} 
        <button 
          onClick={handleLike}
          disabled={isLiking}
            className={`flex items-center space-x-1 transition-colors ${post.liked ? 'text-[#0affd9]' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}
            aria-label={post.liked ? 'Beğeniyi geri al' : 'Beğen'}
           >
             <Heart size={22} className={`${post.liked ? 'fill-current' : ''}`} />
             <span className="text-sm font-medium">{post.likeCount || post.likes || 0}</span>
        </button>
        
          {/* Yorum Butonu */} 
        <button 
          onClick={() => setShowComments(!showComments)}
             className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors"
             aria-label="Yorumları göster/gizle"
           >
             <MessageCircle size={22} />
             <span className="text-sm font-medium">{comments.length || post.commentCount || 0}</span>
        </button>
        
          {/* Gönder Butonu (Paylaşım için placeholder) */} 
        <button 
             className="text-gray-400 hover:text-white transition-colors"
             aria-label="Gönder"
           >
             <Send size={22} />
           </button>
         </div>
         
        {/* Kaydet Butonu */} 
         <button 
          onClick={handleSave}
           className={`transition-colors ${post.saved ? 'text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
           aria-label={post.saved ? 'Kaydedileni kaldır' : 'Kaydet'}
         >
           <Bookmark size={22} className={`${post.saved ? 'fill-current' : ''}`} />
        </button>
      </div>
      
      {/* Hata Mesajı Alanı */} 
       {error && (
         <div className="px-3 pb-2 text-xs text-red-400">
           {error}
         </div>
       )}
       
      {/* Yorumlar Bölümü */} 
      {showComments && (
         <div className="p-3 border-t border-[#0affd9]/20">
           {/* Yorum Yazma Alanı */} 
           <form onSubmit={handleSubmitComment} className="flex items-center space-x-2 mb-4">
             <Link to={`/profile/${currentUser?.username}`} className="flex-shrink-0">
               {currentUserProfileImageUrl ? (
                 <img src={currentUserProfileImageUrl} alt={currentUser?.username} className="w-8 h-8 rounded-full object-cover bg-gray-700" />
               ) : (
                 <div className="w-8 h-8 rounded-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] font-bold">
                   {currentUser?.username ? currentUser.username[0].toUpperCase() : 'U'}
                 </div>
               )}
             </Link>
             <div className="flex-1 relative">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
                 placeholder="Yorum ekle..."
                 className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9] pr-10"
            />
            <button
              type="submit"
              disabled={!comment.trim()}
                 className="absolute right-2 top-1/2 transform -translate-y-1/2 text-[#0affd9] disabled:text-gray-600 hover:text-white disabled:hover:text-gray-600 transition-colors p-1 rounded-full"
            >
                 <Send size={18} />
            </button>
             </div>
          </form>
          
           {/* Mevcut Yorumlar */} 
          {loadingComments ? (
             <div className="text-center py-4">
               <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-[#0affd9]"></div>
               <p className="mt-2 text-sm text-gray-400">Yorumlar yükleniyor...</p>
             </div>
           ) : comments.length > 0 ? (
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
               {comments.map(commentData => (
                 <Comment key={commentData.id} comment={commentData} onReply={handleSubmitComment} currentUser={currentUser} setComments={setComments} />
               ))}
            </div>
          ) : (
             <p className="text-center text-sm text-gray-500 py-4">Henüz yorum yok.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PostItem;