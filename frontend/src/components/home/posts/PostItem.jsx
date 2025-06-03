import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { API_BASE_URL, DEFAULT_PLACEHOLDER_IMAGE, DEFAULT_AVATAR_URL } from '../../../config/constants';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, X, Trash2, AlertCircle, Bug } from 'lucide-react';
import { createTestPost } from '../../../services/api';
import PostShow from '../../profile/postShow';

const PostItem = ({ post, onLike, onSave, onDelete, currentUser, onPostClick }) => {
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
  const [showDebug, setShowDebug] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [isLiked, setIsLiked] = useState(post?.liked || false);
  const [commentCount, setCommentCount] = useState(post?.comment_count || post?.comments_count || post?.comments || 0);
  const [showGeminiResponse, setShowGeminiResponse] = useState(false);
  const geminiResponse = localStorage.getItem('latestGeminiResponse');

  // Debug mod için Shift tuş basımı dinleyicisi
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setShowDebug(true);
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setShowDebug(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Test post oluşturma fonksiyonu
  const handleCreateTestPost = async () => {
    try {
      const result = await createTestPost();
      if (result.success) {
        alert(`Test gönderi oluşturuldu! ID: ${result.data.id || result.data.ID}`);
        window.location.reload(); // Sayfayı yenile
      } else {
        alert(`Hata: ${result.message}`);
      }
    } catch (error) {
      alert(`İşlem hatası: ${error.message}`);
    }
  };

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
      
      // Post ID'yi güvenli şekilde işle
      let safePostId;
      if (typeof post.id === 'string') {
        if (/^\d+$/.test(post.id)) {
          safePostId = parseInt(post.id, 10);
        } else {
          safePostId = post.id;
        }
      } else {
        safePostId = post.id;
      }
      
      // API'den yorumları getir
      const response = await api.posts.getComments(safePostId);
      
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
    const currentLikedState = isLiked;
    const currentLikeCount = likeCount;
    
    // State'i optimistik olarak güncelle
    setIsLiked(!currentLikedState);
    const newLikeCount = currentLikedState ? Math.max(1, currentLikeCount) - 1 : currentLikeCount + 1;
    setLikeCount(newLikeCount);
    
    // Gönderi nesnesini hemen güncelle (üst bileşenler için)
    post.liked = !currentLikedState;
    post.isLiked = !currentLikedState; // İsim uyumluluğu için
    
    post.likes = newLikeCount;
    post.likeCount = newLikeCount;  // İsim uyumluluğu için
    
    // Eğer onLike prop'u varsa, parent bileşene değişikliği bildir
    if (onLike) {
      onLike(post.id);
    }
    
    try {
      // Sunucuya istek gönder
      const response = currentLikedState 
        ? await api.posts.unlike(post.id) 
        : await api.posts.like(post.id);
      
      console.log(`Post ${post.id} beğeni API yanıtı:`, response);
      
      let serverLikeCount = null;
      let serverLikedStatus = null;
      
      // API yanıt değerlendirmesi
      if (!response.success) {
        // Özel durum: Eğer bir 500 hatası var ancak mesaj "Beğeni kaydedilirken hata oluştu" ise
        if (response.status === 500 && response.message?.includes('Beğeni kaydedilirken hata oluştu')) {
          console.log("Beğeni işlemi başarılı görünüyor ama API hata döndürdü. UI durumunu koruyoruz.");
          // Optimistik güncellememizi koru
          serverLikedStatus = !currentLikedState;
          serverLikeCount = newLikeCount; // Optimistik olarak hesapladığımız değeri kullan
        }
        // "Zaten beğenilmiş" gibi mesajlar için
        else if (response.message?.toLowerCase().includes('zaten beğen')) {
          console.log("Gönderi zaten beğenilmiş, beğenilmiş durumunu koruyoruz.");
          serverLikedStatus = true;
          // API'den gelen sayı varsa onu kullan, yoksa mevcut değeri koru
          if (typeof response.data === 'number' && response.data > 0) {
            serverLikeCount = response.data;
          } else if (typeof response.data?.likeCount === 'number' && response.data.likeCount > 0) {
            serverLikeCount = response.data.likeCount;
          } else if (typeof response.data?.likes === 'number' && response.data.likes > 0) {
            serverLikeCount = response.data.likes;
          } else {
            // API'den geçerli bir değer gelmezse, optimistik değeri koru
            serverLikeCount = currentLikeCount;
          }
        } 
        // "Beğenilmemiş" mesajları için
        else if (response.message?.toLowerCase().includes('beğenilmemiş')) {
          console.log("Gönderi beğenilmemiş bilgisi alındı, beğenilmemiş durumunu koruyoruz.");
          serverLikedStatus = false;
          // API'den gelen sayı varsa ve makul bir değerse onu kullan, yoksa mevcut değeri koru
          if (typeof response.data === 'number' && response.data >= 0) {
            serverLikeCount = response.data;
          } else if (typeof response.data?.likeCount === 'number' && response.data.likeCount >= 0) {
            serverLikeCount = response.data.likeCount;
          } else if (typeof response.data?.likes === 'number' && response.data.likes >= 0) {
            serverLikeCount = response.data.likes;
          } else {
            // API'den geçerli bir değer gelmezse, optimistik değeri koru
            serverLikeCount = currentLikeCount > 0 ? currentLikeCount - 1 : 0;
          }
        }
        else {
          // Gerçek hata durumunda UI'yı geri al
          setIsLiked(currentLikedState);
          setLikeCount(currentLikeCount);
          // Post nesnesini de eski haline getir
          post.liked = currentLikedState;
          post.likes = currentLikeCount;
          throw new Error(response.message || 'Beğeni işlemi başarısız oldu');
        }
      } else {
        // Başarılı yanıt - API'den gelen değerleri kullan
        serverLikedStatus = !currentLikedState; // API başarılıysa beğeni durumu değişmiştir
        
        // API'den dönen beğeni sayısını kontrol et - önemli: değer 0 olsa bile kabul et
        if (response.data !== undefined && response.data !== null) {
          if (typeof response.data.likeCount === 'number') {
            serverLikeCount = response.data.likeCount;
            console.log(`API'den likeCount alındı: ${response.data.likeCount}`);
          } else if (typeof response.data.likes === 'number') {
            serverLikeCount = response.data.likes;
            console.log(`API'den likes alındı: ${response.data.likes}`);
          } else if (typeof response.data === 'number') {
            serverLikeCount = response.data;
            console.log(`API'den sayısal değer alındı: ${response.data}`);
          }
        }
      }
      
      // Eğer sunucudan beğeni sayısı veya durumu alındıysa, UI'yi güncelle
      if (serverLikedStatus !== null) {
        setIsLiked(serverLikedStatus);
        post.liked = serverLikedStatus;
        console.log(`Beğeni durumu güncellendi: ${serverLikedStatus}`);
      }
      
      // API'den geçerli bir sayı geldi mi kontrol et (0 da geçerli bir değerdir!)
      if (serverLikeCount !== null) {
        console.log(`Beğeni sayısı API'den alındı: ${serverLikeCount}`);
        setLikeCount(serverLikeCount);
        post.likes = serverLikeCount;
      } else {
        // API'den değer gelmezse, beğeni durumuna göre mantıklı bir değer ayarla
        const fallbackCount = post.liked ? Math.max(1, currentLikeCount) : Math.max(0, currentLikeCount - 1);
        console.log(`API'den beğeni sayısı alınamadı, düzeltilmiş değer kullanılıyor: ${fallbackCount}`);
        setLikeCount(fallbackCount);
        post.likes = fallbackCount;
      }
      
      // Diğer olası post alanlarını da güncelle (farklı isimler de kullanılabilir)
      if (post.likeCount !== undefined) post.likeCount = post.likes;
      if (post.isLiked !== undefined) post.isLiked = post.liked;
      
      console.log(`Post ${post.id} beğeni durumu güncellendi: ${post.liked ? 'beğenildi' : 'beğeni kaldırıldı'}, sayı: ${post.likes}`);
      
    } catch (error) {
      // Özel durum kontrolü - beğeni hatalarında UI'yi tutarlı tut
      if (error.message?.includes('Beğeni kaydedilirken hata oluştu')) {
        console.log("Beğeni işlemi muhtemelen başarılı oldu ancak API hata döndürdü. UI durumunu koruyoruz.");
        return; // Hata mesajı gösterme
      }
      
      console.error('Beğeni işlemi başarısız:', error);
      
      // Gerçek bir hata olduğunda kullanıcıya bildir
      setError('Beğeni işlemi başarısız oldu: ' + (error.message || 'Bilinmeyen hata'));
      setTimeout(() => setError(null), 3000);
      
      // Post nesnesini ve state'i eski haline getir
      setIsLiked(currentLikedState);
      setLikeCount(currentLikeCount);
      post.liked = currentLikedState;
      post.likes = currentLikeCount;
      if (post.likeCount !== undefined) post.likeCount = currentLikeCount;
      if (post.isLiked !== undefined) post.isLiked = currentLikedState;
      
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    // Şu anki kaydetme durumunu al
    const currentSavedState = post.saved;
    
    // Optimistik UI güncellemesi için bir kopya oluştur
    const updatedPost = {
      ...post,
      saved: !currentSavedState
    };
    
    // Parent bileşene bildir (varsa)
    if (onSave) {
      onSave(post.id);
    }
    
    try {
      // Sunucuya istek gönder
      const response = currentSavedState
        ? await api.posts.unsave(post.id)
        : await api.posts.save(post.id);
      
      // API yanıt değerlendirmesi  
      if (!response.success) {
        // UNIQUE constraint hatası veya "Zaten kaydedilmiş" mesajı işleniyor
        if (response.message?.toLowerCase().includes('unique constraint') || 
            response.message?.toLowerCase().includes('zaten kayded')) {
          // Bu bir hata değil, gönderi zaten kaydedilmiş
          console.log("Gönderi zaten kaydedilmiş, kullanıcı arayüzü güncellendi.");
          // Hata gösterme
        } else if (response.message?.toLowerCase().includes('kaydedilmemiş')) {
          // Bu bir hata değil, gönderi zaten kaydedilmemiş
          console.log("Gönderi zaten kaydedilmemiş, kullanıcı arayüzü güncellendi.");
          // Hata gösterme
        } else {
          throw new Error(response.message || 'Gönderi kaydetme işlemi başarısız oldu');
        }
      }
      
      console.log(`Post ${post.id} kaydetme durumu: ${updatedPost.saved ? 'kaydedildi' : 'kaydı kaldırıldı'}`);
      
    } catch (error) {
      console.error('Kaydetme işlemi başarısız:', error);
      
      // Gerçek bir hata durumunda kullanıcıya bildir
      setError('Kaydetme işlemi başarısız oldu: ' + (error.message || 'Bilinmeyen hata'));
      setTimeout(() => setError(null), 3000);
    }
  };

  // Yorum eklemeden önce post nesnesini kontrol etmek için yardımcı fonksiyon
  const debugPostObject = () => {
    // Post nesnesinin bir kopyasını oluştur (referans yerine)
    const postCopy = {...post};
    
    // Hassas veri içerebilecek büyük alanları temizle
    if (postCopy.content && postCopy.content.length > 100) {
      postCopy.content = postCopy.content.substring(0, 100) + '...';
    }
    
    // Döngüsel referansları ve büyük nesneleri temizle
    delete postCopy.user;
    delete postCopy.likes;
    delete postCopy.comments;
    
    console.log('Post nesnesi detayları:', {
      id: post.id,
      idType: typeof post.id,
      postKeys: Object.keys(post),
      postValues: postCopy
    });
    
    // ID'nin numerik olup olmadığını kontrol et
    const numericId = Number(post.id);
    console.log('ID Numerik mi?', {
      original: post.id,
      converted: numericId,
      isNaN: isNaN(numericId),
      isFinite: isFinite(numericId),
      isInteger: Number.isInteger(numericId)
    });
  };

  const handleSubmitComment = async (e, parentId = null) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    // Debug bilgisi
    debugPostObject();
    
    try {
      setError(null);
      setLoadingComments(true);
      
      // Postun ID formatını kontrol et ve düzelt
      let safePostId;
      if (typeof post.id === 'string') {
        // Eğer ID bir string ise ve sayısal görünüyorsa sayıya çevir
        if (/^\d+$/.test(post.id)) {
          safePostId = parseInt(post.id, 10);
        } else {
          // Sayı değilse string olarak bırak
          safePostId = post.id;
        }
      } else {
        // Zaten sayı ise aynen kullan
        safePostId = post.id;
      }
      
      console.log("Yorum gönderiliyor:", {
        content: comment.trim(),
        parentId: parentId,
        postId: post.id,
        postIdType: typeof post.id,
        safePostId: safePostId,
        safePostIdType: typeof safePostId
      });
      
      // Yorum içeriğini saklayıp formu temizle
      const commentText = comment.trim();
      setComment('');
      
      // Optimistik UI güncellemesi (yorum sayısını artır)
      setCommentCount(prev => prev + 1);
      
      // API'ye yorumu gönder
      const response = await api.posts.addComment(safePostId, commentText, parentId);
      
      console.log('Yorum gönderme yanıtı:', response);
      
      if (!response?.success) {
        // Başarısız olduysa optimistik güncellemeyi geri al
        setCommentCount(prev => Math.max(0, prev - 1));
        throw new Error(response?.message || 'Yorum gönderilirken bir hata oluştu');
      }
      
      // Gönderi yorum sayısını güncelle (post objesi için)
      post.comments = commentCount;
      post.comment_count = commentCount;
      post.comments_count = commentCount;
      
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
      return DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
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
          return DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
        }
      }
      
      // URL string olmalı
      if (typeof imageUrl !== 'string') {
        console.error("Görsel URL'i string değil:", typeof imageUrl, imageUrl);
        return DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
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
      return DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
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

  const handleImageError = (e) => {
    console.error("Görsel yükleme hatası:", e.target.src);
    e.target.onerror = null; // Sonsuz hata döngüsünü önle
    e.target.src = DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
  };

  const getImageArray = () => {
    // Tüm olası görsel dizisi alanlarını kontrol et
    if (post.imageUrls && post.imageUrls.length > 0) return post.imageUrls;
    if (post.images && post.images.length > 0) return post.images;
    if (post.media && post.media.length > 0) return post.media;
    
    // Büyük harfle başlayan alanları kontrol et
    if (post.ImageUrls && post.ImageUrls.length > 0) return post.ImageUrls;
    if (post.Images && post.Images.length > 0) return post.Images;
    if (post.Media && post.Media.length > 0) return post.Media;
    
    // Tekil görsel alanlarını kontrol et
    if (post.image) return [post.image];
    if (post.coverImage) return [post.coverImage];
    if (post.thumbnail) return [post.thumbnail];
    if (post.Image) return [post.Image];
    if (post.CoverImage) return [post.CoverImage];
    if (post.Thumbnail) return [post.Thumbnail];
    
    // String olarak saklanmış JSON dizilerini kontrol et
    if (typeof post.images === 'string') {
      try {
        const parsedImages = JSON.parse(post.images);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          return parsedImages;
        }
      } catch (e) {
        // JSON parse hatası, tek bir URL olabilir
        return [post.images];
      }
    }
    
    if (typeof post.media === 'string') {
      try {
        const parsedMedia = JSON.parse(post.media);
        if (Array.isArray(parsedMedia) && parsedMedia.length > 0) {
          return parsedMedia;
        }
      } catch (e) {
        // JSON parse hatası, tek bir URL olabilir
        return [post.media];
      }
    }
    
    // Hiçbir görsel bulunamadı
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

  // Gönderi modalını açma fonksiyonu
  const handlePostClick = () => {
    // Görsele tıklandığında modalı aç
    setShowPostModal(true);
    setSelectedPost(post);
    console.log('Gönderi tıklandı, modal açılıyor');
  };

  // Yorum butonuna tıklandığında modal açılacak fonksiyon
  const handleCommentClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Event propagation'ı durdur
    console.log('Yorum butonu tıklandı, modal açılıyor');
    setSelectedPost(post);
    setShowPostModal(true);
  };

  // Gönderi silme işleyicisi - hem normal silme hem de modal üzerinden silme için
  const handlePostDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    
    try {
      const response = await api.posts.delete(post.id);
      console.log('Gönderi silme yanıtı:', response);
      
      if (response.success) {
        // Modalı kapat
        setShowPostModal(false);
        
        // Parent bileşene silme işlemini bildir
        if (typeof onDelete === 'function') {
          onDelete(post.id);
        }
      } else {
        throw new Error(response.message || 'Gönderi silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Gönderi silme hatası:', error);
      alert('Gönderi silinirken bir hata oluştu: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Post değiştiğinde beğeni sayısını ve yorum sayısını güncelle
  useEffect(() => {
    if (post) {
      setLikeCount(post.likes || 0);
      setIsLiked(post.liked || false);
      setCommentCount(post.comment_count || post.comments_count || post.comments || 0);
    }
  }, [post?.id, post?.likes, post?.liked, post?.comment_count, post?.comments_count, post?.comments]);

  // ---- YORUM BİLEŞENİ ----
  const Comment = ({ comment, onReply, currentUser, setComments }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // Yorum menüsünü kapatmak için dışarı tıklma
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

    const getInitial = (username) => {
      return username ? username[0].toUpperCase() : '?';
    };

    const commentUserProfileImageUrl = comment.user?.profileImage 
      ? (comment.user.profileImage.startsWith('http') ? comment.user.profileImage : `${API_BASE_URL}/${comment.user.profileImage}`)
      : DEFAULT_AVATAR_URL;

    const handleReplySubmit = async (e) => {
      e.preventDefault();
      if (!replyContent.trim() || isReplying) return;

      setIsReplying(true);
      setReplyError(null);
      
      try {
        // Post ve Comment ID'lerini güvenli şekilde işle
        let safePostId;
        if (typeof post.id === 'string') {
          if (/^\d+$/.test(post.id)) {
            safePostId = parseInt(post.id, 10);
          } else {
            safePostId = post.id;
          }
        } else {
          safePostId = post.id;
        }
        
        let safeCommentId = comment.id;
        
        console.log("Yanıt gönderiliyor:", {
          postId: post.id, 
          postIdType: typeof post.id,
          safePostId: safePostId,
          commentId: comment.id,
          commentIdType: typeof comment.id,
          safeCommentId: safeCommentId
        });
        
        const response = await api.posts.addComment(safePostId, replyContent, safeCommentId); // parentId olarak yorumu ID'sini ver
        if (response.success) {
          setReplyContent('');
          setShowReplyForm(false);
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
        // Comment ID'sini güvenli şekilde işle
        let safeCommentId = comment.id;
        
        const response = currentLikedState
          ? await api.posts.unlikeComment(safeCommentId)
          : await api.posts.likeComment(safeCommentId);
        
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
        // Comment ID'sini güvenli şekilde işle
        let safeCommentId = comment.id;
        
        const response = await api.posts.deleteComment(safeCommentId);
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
          // Comment ID'sini güvenli şekilde işle
          let safeCommentId = comment.id;
          
          const response = await api.posts.reportComment(safeCommentId);
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
      <div className="mb-4 last:mb-0 group">
        <div className="flex">
          <Link to={`/profile/${comment.user?.username}`} className="flex-shrink-0 mr-3">
            <img 
              src={comment.user?.profile_picture || DEFAULT_AVATAR_URL} 
              alt={comment.user?.username || 'Kullanıcı'} 
              className="w-8 h-8 rounded-full object-cover border border-[#0affd9]/20"
              onError={handleImageError}
            />
          </Link>
          
          <div className="flex-1 bg-black/40 rounded-2xl px-4 py-3 border border-[#0affd9]/10">
            <div className="flex justify-between items-start mb-1">
              <Link to={`/profile/${comment.user?.username}`} className="font-medium text-[#0affd9]/90 text-sm hover:underline">
                {comment.user?.username || 'Kullanıcı'}
              </Link>
              <div className="flex items-center text-gray-400 text-xs">
                <span className="mr-2">{formatDate(comment.createdAt)}</span>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:text-white transition-colors rounded-full hover:bg-black/30"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-200 mb-2">{comment.content}</p>
            
            <div className="flex items-center text-xs text-gray-400 space-x-4">
              <button 
                onClick={handleCommentLike}
                className={`flex items-center hover:text-[#0affd9] transition-colors ${comment.isLiked ? 'text-[#0affd9]' : ''}`}
              >
                <Heart size={14} className={`${comment.isLiked ? 'fill-[#0affd9]' : ''} mr-1`} />
                <span>{comment.likeCount || 0}</span>
              </button>
              
              <button 
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center hover:text-[#0affd9] transition-colors"
              >
                <MessageCircle size={14} className="mr-1" />
                <span>Yanıtla</span>
              </button>
            </div>
          </div>
        </div>

        {/* ... existing code ... */}
      </div>
    );
  };
  // ---- YORUM BİLEŞENİ SONU ----

  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl overflow-hidden border border-[#0affd9]/20 hover:border-[#0affd9]/30 transition-all shadow-lg hover:shadow-xl hover:shadow-[#0affd9]/5">
      {/* Header - kullanıcı bilgileri */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.user?.username || post.username}`} className="flex items-center flex-1 min-w-0">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-[#0affd9]/30">
            <img 
              src={post.user?.profile_picture || post.user?.profileImage || post.profileImage || DEFAULT_AVATAR_URL}
              alt={post.user?.username || post.username || 'Kullanıcı'}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          
          <div className="ml-3 min-w-0">
            <div className="font-semibold text-white text-sm truncate">
              {post.user?.username || post.username || 'Kullanıcı'}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {formatDate(post.createdAt || post.created_at)}
            </div>
          </div>
        </Link>
        
        <div className="relative z-10">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-[#0affd9]/10 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} className="text-gray-400 hover:text-white" />
          </button>
          
          {/* Post menu dropdown */}
          {showMenu && (
            <div 
              ref={menuRef}
              className="absolute right-0 mt-1 w-48 py-2 bg-black/90 border border-[#0affd9]/20 rounded-xl shadow-lg backdrop-blur-md z-20"
            >
              {currentUser && (post.user_id === currentUser.id || post.userId === currentUser.id) && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[#0affd9]/10 transition-colors flex items-center"
                >
                  <Trash2 size={16} className="mr-2.5" />
                  {isDeleting ? 'Siliniyor...' : 'Gönderiyi Sil'}
                </button>
              )}
              
              <button
                onClick={handleReport}
                className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#0affd9]/10 transition-colors flex items-center"
              >
                <AlertCircle size={16} className="mr-2.5" />
                Gönderiyi Şikayet Et
              </button>
              
              {/* Debug mod için test butonu */}
              {showDebug && ( 
                <button
                  onClick={handleCreateTestPost}
                  className="w-full text-left px-4 py-2.5 text-sm text-yellow-500 hover:bg-[#0affd9]/10 transition-colors flex items-center"
                >
                  <Bug size={16} className="mr-2.5" />
                  Test Gönderi Oluştur
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Post içeriği */}
      <div onClick={handlePostClick} className="cursor-pointer">
        {/* Post resimleri */}
        {getImageArray().length > 0 ? (
          <div className="relative">
            <img 
              src={getImageArray()[currentImageIndex]} 
              alt="Gönderi" 
              className="w-full h-auto max-h-[600px] object-contain bg-black/60"
              onError={handleImageError}
            />
            
            {/* Çoklu resim navigasyonu */}
            {getImageArray().length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="flex space-x-1.5 px-2 py-1 bg-black/60 rounded-full">
                  {getImageArray().map((_, index) => (
                    <button 
                      key={index}
                      className={`w-2 h-2 rounded-full ${currentImageIndex === index ? 'bg-[#0affd9]' : 'bg-gray-400'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                    ></button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Önceki/sonraki resim butonları */}
            {getImageArray().length > 1 && (
              <>
                {/* Sol ok */}
                <button 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-75 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Sağ ok */}
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all opacity-75 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
      
      {/* Post metni */}
      <div className="px-5 py-3.5">
        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
          {post.caption || post.content || ''}
        </p>
      </div>
      
      {/* Post etkileşimleri */}
      <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#0affd9]/10">
        <div className="flex items-center space-x-5">
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1.5 group ${isLiked ? 'text-[#0affd9]' : 'text-gray-400 hover:text-[#0affd9]'}`}
          >
            <Heart size={20} className={`transition-all ${isLiked ? 'fill-[#0affd9] scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-sm font-medium">{likeCount || 0}</span>
          </button>
          
          <button 
            onClick={handleCommentClick}
            className="flex items-center space-x-1.5 text-gray-400 hover:text-[#0affd9] group"
          >
            <MessageCircle size={20} className="group-hover:scale-110 transition-all" />
            <span className="text-sm font-medium">{commentCount || 0}</span>
          </button>
          
          <button className="flex items-center space-x-1.5 text-gray-400 hover:text-[#0affd9] group">
            <Send size={20} className="group-hover:scale-110 transition-all" />
          </button>
        </div>
        
        <div>
          <button 
            onClick={handleSave}
            className={`flex items-center group ${post.saved ? 'text-[#0affd9]' : 'text-gray-400 hover:text-[#0affd9]'}`}
          >
            <Bookmark size={20} className={`transition-all group-hover:scale-110 ${post.saved ? 'fill-[#0affd9]' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Yorumlar bölümü */}
      {showComments && (
        <div className="border-t border-[#0affd9]/10 px-4 py-4">
          <h4 className="text-sm font-medium text-white mb-3">Yorumlar</h4>
          
          {error && (
            <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {loadingComments ? (
            <div className="py-6 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0affd9]"></div>
              <p className="mt-2 text-sm text-gray-400">Yorumlar yükleniyor...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-gray-400">Henüz yorum yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <Comment 
                  key={comment.id} 
                  comment={comment} 
                  onReply={fetchComments}
                  currentUser={currentUser}
                  setComments={setComments}
                />
              ))}
            </div>
          )}
          
          {/* Yorum formu */}
          <form onSubmit={handleSubmitComment} className="mt-4">
            <div className="flex items-start space-x-3">
              <img 
                src={currentUser?.profile_picture || DEFAULT_AVATAR_URL}
                alt={currentUser?.username || 'Kullanıcı'} 
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#0affd9]/20"
                onError={handleImageError}
              />
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Yorum ekle..."
                  className="w-full bg-black/40 border border-[#0affd9]/20 rounded-full py-2.5 px-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9]"
                />
                <button 
                  type="submit"
                  disabled={!comment.trim()}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    comment.trim() ? 'text-[#0affd9]' : 'text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      
      {/* Post modal */}
      {showPostModal && (
        <PostShow
          post={selectedPost}
          onClose={() => setShowPostModal(false)}
        />
      )}
    </div>
  );
};

export default PostItem;