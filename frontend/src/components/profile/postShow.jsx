import React, { useState, useEffect, useRef } from 'react';
import './postShow.css';
import { Heart, MessageCircle, Share2, Bookmark, Send, MoreHorizontal, UserPlus, X, ChevronDown, Smile, ChevronLeft, ChevronRight, Trash2, AlertCircle } from 'lucide-react';
import { API_BASE_URL, DEFAULT_PLACEHOLDER_IMAGE, DEFAULT_AVATAR_URL } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const PostShow = ({ post, onClose, isOpen, profileUser, onNext, onPrevious, onPostDelete }) => {
  const { user: currentUser } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  
  const commentInputRef = useRef(null);
  
  // Yorum yükleme fonksiyonu - useEffect'in üstüne taşındı
  const loadComments = async () => {
    if (!post || !post.id) return;
    
    setCommentsLoading(true);
    try {
      // Yorum yükleme işlemini API servisi üzerinden yapalım
      const response = await api.posts.getComments(post.id);
      console.log("Yorumlar yanıtı:", response);
      
      if (response.success) {
        // Ham yorum verilerini konsola yazdır
        console.log("Ham yorum verileri:", JSON.stringify(response.data, null, 2));
        
        // Her yorum için veri yapısını kontrol et ve normalize et
        const processedComments = (response.data || []).map(comment => {
          // Tüm yorum verisini konsola yazdır
          console.log("İşlenen ham yorum verisi:", JSON.stringify(comment, null, 2));
          
          // Kullanıcı bilgilerini çıkar
          let username = "";
          let userId = null;
          let userProfileImage = null;
          
          // Büyük/küçük harf duyarlılığı olmadan alanları kontrol et
          const commentKeys = Object.keys(comment).map(k => k.toLowerCase());
          
          // username alanını bul (büyük/küçük harf duyarlılığı olmadan)
          const usernameKey = Object.keys(comment).find(k => k.toLowerCase() === 'username');
          if (usernameKey) {
            username = comment[usernameKey];
            console.log(`${usernameKey} alanından username alındı: ${username}`);
          }
          
          // user/User objesi kontrolü
          const userKey = Object.keys(comment).find(k => k.toLowerCase() === 'user');
          const userObj = userKey ? comment[userKey] : null;
          
          if (userObj) {
            console.log("User objesi bulundu:", userObj);
            
            // User objesinde username yoksa bul
            if (!username) {
              const userUsernameKey = Object.keys(userObj).find(k => k.toLowerCase() === 'username');
              if (userUsernameKey) {
                username = userObj[userUsernameKey];
                console.log(`userObj.${userUsernameKey} kullanıldı: ${username}`);
              }
            }
            
            // User ID'sini bul
            const userIdKey = Object.keys(userObj).find(k => 
              ['id', 'userid', 'user_id'].includes(k.toLowerCase())
            );
            if (userIdKey) {
              userId = userObj[userIdKey];
            }
            
            // Profil resmini bul
            const profileImageKey = Object.keys(userObj).find(k => 
              ['profile_picture', 'profileimage', 'avatar', 'profilepicture'].includes(k.toLowerCase())
            );
            if (profileImageKey) {
              userProfileImage = userObj[profileImageKey];
              // via.placeholder.com kontrolü
              if (userProfileImage && userProfileImage.includes('via.placeholder.com')) {
                userProfileImage = DEFAULT_AVATAR_URL;
              }
            }
          } else {
            console.log("User objesi bulunamadı");
          }
          
          // User ID alternatif kontrol
          if (!userId) {
            const userIdKey = Object.keys(comment).find(k => 
              ['user_id', 'userid', 'id'].includes(k.toLowerCase())
            );
            if (userIdKey) {
              userId = comment[userIdKey];
            }
          }
          
          // Eğer hala username yoksa, alternatif alanları kontrol et
          if (!username) {
            // Alternatif alanlar
            const authorKey = Object.keys(comment).find(k => k.toLowerCase() === 'author');
            if (authorKey) {
              const author = comment[authorKey];
              if (typeof author === 'string') {
                username = author;
              } else if (author) {
                const authorUsernameKey = Object.keys(author).find(k => k.toLowerCase() === 'username');
                if (authorUsernameKey) {
                  username = author[authorUsernameKey];
                }
              }
              console.log(`Author alanından username alındı: ${username}`);
            } else {
              const userNameKey = Object.keys(comment).find(k => 
                ['user_name', 'name', 'displayname'].includes(k.toLowerCase())
              );
              if (userNameKey) {
                username = comment[userNameKey];
                console.log(`${userNameKey} alanından username alındı: ${username}`);
              } else if (userId) {
                username = `Kullanıcı #${userId}`;
                console.log(`ID'den username oluşturuldu: ${username}`);
              } else {
                username = "İsimsiz Kullanıcı";
                console.log("Kullanıcı adı bulunamadı, varsayılan kullanılıyor");
              }
            }
          }
          
          // İçerik alanını bul
          const contentKey = Object.keys(comment).find(k => 
            ['content', 'text', 'body', 'message'].includes(k.toLowerCase())
          );
          const content = contentKey ? comment[contentKey] : "";
          
          // Tarih alanını bul
          const dateKey = Object.keys(comment).find(k => 
            ['created_at', 'createdat', 'date', 'timestamp'].includes(k.toLowerCase())
          );
          const createdAt = dateKey ? comment[dateKey] : new Date().toISOString();
          
          // Normalize edilmiş yorum objesi
          const normalizedComment = {
            id: comment.id || comment.ID || Math.random().toString(36).substr(2, 9), // ID yoksa geçici ID oluştur
            username: username,
            userId: userId,
            userProfileImage: userProfileImage,
            user: userObj || { username, id: userId, profile_picture: userProfileImage },
            content: content,
            created_at: createdAt
          };
          
          console.log("Normalize edilmiş yorum:", normalizedComment);
          return normalizedComment;
        });
        
        console.log("İşlenmiş yorumlar:", processedComments);
        setComments(processedComments);
      } else {
        console.error("Yorumlar yüklenemedi:", response.message);
        setComments([]);
      }
    } catch (error) {
      console.error("Yorumlar yüklenirken hata:", error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };
  
  // Reset states whenever the post changes
  useEffect(() => {
    if (post) {
      setCurrentImageIndex(0);
      
      // Beğeni durumunu belirle
      const liked = post.isLiked || post.liked || false;
      setIsLiked(liked);
      
      // Beğeni sayısını ayarlarken farklı API formatlarını destekle
      // Sayı olmayan değerleri filtrele ve default 0 olarak ayarla
      let likeCountValue = 0;
      const possibleLikeCountValues = [
        post.likeCount, 
        post.likes, 
        post.like_count, 
        post.LikeCount
      ];
      
      // İlk geçerli sayı değerini bul
      for (const value of possibleLikeCountValues) {
        if (typeof value === 'number' && !isNaN(value)) {
          likeCountValue = value;
          break;
        } else if (typeof value === 'string' && !isNaN(parseInt(value))) {
          likeCountValue = parseInt(value);
          break;
        }
      }
      
      console.log('Post için bulunan beğeni sayısı:', likeCountValue, 'Post veri yapısı:', {
        id: post.id, 
        isLiked: liked,
        likes: post.likes, 
        likeCount: post.likeCount
      });

      // Eğer post beğenilmiş ancak beğeni sayısı sıfırsa, beğeni sayısını 1 olarak ayarla
      if (liked && likeCountValue === 0) {
        console.log("Beğenilmiş post için beğeni sayısı sıfır! En az 1 olarak ayarlanıyor");
        likeCountValue = 1;
        
        // Post nesnesini de güncelle, böylece diğer bileşenler de doğru sayıyı görebilir
        if (post) {
          post.likes = likeCountValue;
          post.likeCount = likeCountValue;
        }
      }
      
      setLikesCount(likeCountValue);
      setIsSaved(post.isSaved || post.saved || false);
      
      // Yorumları temizle (önceki post'tan kalan yorumları gösterme)
      setComments([]);
      
      // post.id kontrolü eklenerek loadComments yalnızca
      // post ve post.id varsa çağrılacak
      if (post.id) {
        // post ID değiştiğinde yorumları yükle
        loadComments();
      }
    }
  }, [post]);
  
  // Post modal açıldığında yorumları otomatik yükle
  useEffect(() => {
    if (isOpen && post && post.id) {
      loadComments();
    }
  }, [isOpen]);
  
  if (!isOpen || !post) return null;

  // Yorum ekleme fonksiyonu
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    setLoading(true);
    try {
      // Yorumu gönderme öncesi logla
      console.log(`Yorum gönderiliyor: Post ID ${post.id}, içerik: ${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}`);
      
      // API servisi üzerinden yorum ekleyelim
      const response = await api.posts.addComment(post.id, commentText);
      
      console.log("Yorum gönderme yanıtı:", response);
      
      if (response.success) {
        // Beğeni sayısını artır
        const newCommentsCount = comments.length + 1;
        console.log(`Yorum sayısı güncellendi: ${comments.length} -> ${newCommentsCount}`);
        
        // Post objesini güncelle
        if (post) {
          post.comment_count = newCommentsCount;
          post.comments_count = newCommentsCount;
          post.comments = newCommentsCount;
        }
        
        // Başarılı olursa yorumu ekle ve input'u temizle
        let newComment;
        
        // Yanıt formatını kontrol et
        if (response.data && response.data.comment) {
          newComment = response.data.comment;
        } else if (response.data) {
          newComment = response.data;
        } else {
          // API'den doğru veri gelmezse kendi yorum nesnemizi oluşturalım
          newComment = {
            id: Math.random().toString(36).substr(2, 9),
            content: commentText,
            username: currentUser?.username || "Sen",
            userId: currentUser?.id,
            user: {
              id: currentUser?.id,
              username: currentUser?.username || "Sen",
              profileImage: currentUser?.profileImage || currentUser?.profile_picture
            },
            created_at: new Date().toISOString()
          };
        }
        
        // Yorumu normalize et
        const normalizedComment = {
          id: newComment.id || Math.random().toString(36).substr(2, 9),
          content: newComment.content || newComment.text || commentText,
          username: newComment.username || (newComment.user ? newComment.user.username : currentUser?.username) || "Sen",
          userId: newComment.userId || newComment.user_id || (newComment.user ? newComment.user.id : currentUser?.id),
          userProfileImage: (newComment.user ? newComment.user.profile_picture || newComment.user.profileImage : null) || currentUser?.profileImage || currentUser?.profile_picture,
          user: newComment.user || {
            id: currentUser?.id,
            username: currentUser?.username || "Sen",
            profile_picture: currentUser?.profileImage || currentUser?.profile_picture
          },
          created_at: newComment.created_at || newComment.createdAt || new Date().toISOString()
        };
        
        console.log("Eklenecek yeni yorum:", normalizedComment);
        
        // prev değerinin dizi olmama ihtimaline karşı kontrol eklendi
        setComments(prev => Array.isArray(prev) ? [normalizedComment, ...prev] : [normalizedComment]);
        setCommentText('');
        toast.success('Yorumunuz eklendi!');
      } else {
        toast.error(response.message || 'Yorum eklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error("Yorum gönderilirken hata:", error);
      toast.error('Yorum eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  // Beğenme fonksiyonu
  const handleLike = async () => {
    if (!post || !post.id) {
      toast.error('Gönderi bilgisi bulunamadı');
      return;
    }

    try {
      // API isteği öncesi UI'ı optimistik olarak güncelle
      const previousLikedState = isLiked;
      const previousLikeCount = likesCount;
      
      // Yeni durumları ayarla - beğeni çekme durumunda 0'a düşmemeli, 1 azalmalı
      const newLikeCount = previousLikedState ? Math.max(1, previousLikeCount) - 1 : previousLikeCount + 1;
      setIsLiked(!previousLikedState);
      setLikesCount(newLikeCount);
      
      // Post nesnesinin kendisini de güncelle (eğer referans olarak kullanılıyorsa)
      if (post) {
        // Tüm olası field isimlerini güncelle ki diğer bileşenlerde doğru görünsün
        post.liked = !previousLikedState;
        post.isLiked = !previousLikedState;
        post.likes = newLikeCount;
        post.likeCount = newLikeCount;
        post.like_count = newLikeCount;
        post.LikeCount = newLikeCount;
      }
      
      // API isteği - api.posts.like ve api.posts.unlike kullan
      const response = isLiked 
        ? await api.posts.unlike(post.id) 
        : await api.posts.like(post.id);
      
      console.log(`Beğeni API yanıtı (${post.id}):`, response);
      
      let serverLikedStatus = null;
      let serverLikeCount = null;
      
      if (!response.success) {
        // Özel durum: Eğer bir 500 hatası var ancak mesaj "Beğeni kaydedilirken hata oluştu" ise
        if (response.status === 500 && response.message?.includes('Beğeni kaydedilirken hata oluştu')) {
          console.log("Beğeni işlemi başarılı görünüyor ama API hata döndürdü. UI durumunu koruyoruz.");
          // Optimistik güncellememizi koru
          serverLikedStatus = !previousLikedState;
          serverLikeCount = newLikeCount; // Optimistik olarak hesapladığımız değeri kullan
        }
        // "Zaten beğenilmiş" mesajları için
        else if (response.message?.toLowerCase().includes('zaten beğen')) {
          console.log("Gönderi zaten beğenilmiş, beğenilmiş durumunu koruyoruz.");
          serverLikedStatus = true;
          // API'den gelen sayı varsa onu kullan, yoksa mevcut değeri koru
          if (typeof response.data === 'number' && response.data > 0) {
            serverLikeCount = response.data;
          } else {
            serverLikeCount = previousLikeCount;
          }
        } 
        // "Beğenilmemiş" mesajları için
        else if (response.message?.toLowerCase().includes('beğenilmemiş')) {
          console.log("Gönderi beğenilmemiş bilgisi alındı, beğenilmemiş durumunu koruyoruz.");
          serverLikedStatus = false;
          // API'den gelen sayı varsa ve makul bir değerse onu kullan, yoksa mevcut değeri koru
          if (typeof response.data === 'number' && response.data >= 0) {
            serverLikeCount = response.data;
          } else {
            serverLikeCount = previousLikeCount > 0 ? previousLikeCount - 1 : 0;
          }
        }
        else {
          // Gerçek bir hata durumunda önceki duruma geri dön
          setIsLiked(previousLikedState);
          setLikesCount(previousLikeCount);
          
          // Post nesnesini de eski haline getir
          if (post) {
            post.liked = previousLikedState;
            post.likes = previousLikeCount;
            if (post.isLiked !== undefined) post.isLiked = previousLikedState;
            if (post.likeCount !== undefined) post.likeCount = previousLikedState;
          }
          
          throw new Error(response.message || 'Beğenme işlemi başarısız oldu');
        }
      } else {
        // Başarılı yanıt - API'den gelen değerleri kullan
        serverLikedStatus = !previousLikedState;
        
        // API'den dönen beğeni sayısını kontrol et - değer 0 olsa bile kabul et
        if (response.data !== undefined && response.data !== null) {
          if (typeof response.data.likeCount === 'number') {
            serverLikeCount = response.data.likeCount;
          } else if (typeof response.data.likes === 'number') {
            serverLikeCount = response.data.likes;
          } else if (typeof response.data === 'number') {
            serverLikeCount = response.data;
          }
        }
      }
      
      // Sunucudan dönüş değerlerini uygula
      if (serverLikedStatus !== null) {
        if (post) {
          post.liked = serverLikedStatus;
          post.isLiked = serverLikedStatus;
        }
        console.log(`PostShow - Beğeni durumu güncellendi: ${serverLikedStatus}`);
      }
      
      if (serverLikeCount !== null) {
        if (post) {
          post.likes = serverLikeCount;
          post.likeCount = serverLikeCount;
          post.like_count = serverLikeCount;
          post.LikeCount = serverLikeCount;
        }
      }
      
    } catch (error) {
      // Hata durumunda önceki değerlere geri dön ve post nesnesini de eski haline getir
      if (post) {
        post.liked = previousLikedState;
        post.isLiked = previousLikedState;
        post.likes = previousLikeCount;
        post.likeCount = previousLikeCount;
        post.like_count = previousLikeCount;
        post.LikeCount = previousLikeCount;
      }
      
      // Özel durum kontrolü
      if (error.message?.includes('Beğeni kaydedilirken hata oluştu')) {
        console.log("Beğeni işlemi muhtemelen başarılı oldu ancak API hata döndürdü. UI durumunu koruyoruz.");
        // UI'yi geri alma - optimistik güncelleme doğru görünüyor
        return; // Hata mesajı gösterme
      }
      
      console.error('Beğenme işlemi hatası:', error);
      toast.error('Beğenme işlemi başarısız oldu');
    }
  };
  
  // Kaydetme fonksiyonu
  const handleSave = async () => {
    if (!post || !post.id) {
      toast.error('Gönderi bilgisi bulunamadı');
      return;
    }

    try {
      // API isteği öncesi UI'ı optimistik olarak güncelle
      const previousSavedState = isSaved;
      setIsSaved(!isSaved);
      
      // API isteği - api.posts.save ve api.posts.unsave kullan
      const response = isSaved 
        ? await api.posts.unsave(post.id) 
        : await api.posts.save(post.id);
      
      console.log(`Kaydetme API yanıtı (${post.id}):`, response);
      
      if (!response.success) {
        // Bu mesajlar aslında hata değil, bilgi mesajları
        const infoMessages = ['unique constraint', 'zaten kayded', 'kaydedilmemiş'];
        
        const messageIsInfo = infoMessages.some(infoMsg => 
          response.message && response.message.toLowerCase().includes(infoMsg)
        );
        
        if (messageIsInfo) {
          // Bu bir hata değil, sadece bilgi mesajı
          console.log(`Bilgi mesajı alındı: ${response.message}`);
          // UI'yi güncel tut, hata gösterme
        } else {
          // Gerçek bir hata durumunda önceki duruma geri dön
          setIsSaved(previousSavedState);
          throw new Error(response.message || 'Kaydetme işlemi başarısız oldu');
        }
      }
    } catch (error) {
      // Sadece gerçek hataları göster
      if (!error.message.toLowerCase().includes('unique constraint') && 
          !error.message.toLowerCase().includes('zaten kayded')) {
        console.error('Kaydetme işlemi hatası:', error);
        toast.error('Kaydetme işlemi başarısız oldu');
      }
    }
  };
  
  // Görsel yükleme hatası durumunda çağrılacak fonksiyon
  const handleImageError = (e) => {
    console.error("Görsel yükleme hatası:", e.target.src);
    e.target.onerror = null; // Sonsuz hata döngüsünü önle
    e.target.src = DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
  };

  // Görsel URL'sini tam URL'ye dönüştürme
  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    // URL boş ise null döndür
    if (imageUrl === "") return null;
    
    // Konsola URL'yi logla
    console.log("İşlenecek görsel URL'si:", imageUrl);
    
    // Cloudinary URL'leri ve diğer tam URL'leri olduğu gibi kullan
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.includes('cloudinary.com')) {
      console.log("Tam URL kullanılıyor:", imageUrl);
      return imageUrl;
    }
    
    // API_BASE_URL ile birleştir
    const fullUrl = imageUrl.startsWith("/") 
      ? `${API_BASE_URL}${imageUrl}` 
      : `${API_BASE_URL}/${imageUrl}`;
      
    console.log("Oluşturulan tam URL:", fullUrl);
    return fullUrl;
  };

  // Process images from different possible formats
  const getPostImages = () => {
    if (!post.images) {
      console.log("Post'ta resim yok!");
      return [];
    }
    
    console.log("Orijinal post.images:", post.images);
    
    try {
      let imageData = post.images;
      
      // Kontrol 1: Karakterlere bölünmüş URL durumu
      // Bu durumda URL'yi birleştirmemiz gerekiyor
      if (
        typeof imageData === 'object' && 
        imageData !== null && 
        !Array.isArray(imageData) &&
        Object.keys(imageData).some(key => !isNaN(parseInt(key))) && // Sayısal anahtarlar
        Object.values(imageData).some(val => typeof val === 'string' && val.length === 1) // Tek karakterli değerler
      ) {
        // Karakterleri birleştir
        console.log("Karakterlere bölünmüş URL tespit edildi, birleştiriliyor...");
        let url = '';
        let keys = Object.keys(imageData).filter(key => !isNaN(parseInt(key))).sort((a, b) => parseInt(a) - parseInt(b));
        
        for (let key of keys) {
          url += imageData[key];
        }
        
        console.log("Birleştirilmiş URL:", url);
        
        // URL'yi doğrula ve döndür
        if (url.includes('cloudinary.com') || 
            url.startsWith('http://') || 
            url.startsWith('https://')) {
          return [url];
        }
      }
      
      // Kontrol 2: String URL durumu
      if (typeof post.images === "string") {
        if (post.images.includes('cloudinary.com') || 
            post.images.startsWith('http://') || 
            post.images.startsWith('https://') ||
            post.images.startswith('/')) {
          console.log("Tek URL olarak işleniyor:", post.images);
          return [post.images];
        }
        
        try {
          imageData = JSON.parse(post.images);
          console.log("JSON parse edilen veri:", imageData);
        } catch (e) {
          console.warn("Images JSON parse edilemedi:", e);
          return [post.images];
        }
      }
      
      // Kontrol 3: Parse edilmiş veri analizi
      if (typeof imageData === "string") {
        console.log("String tip veri:", imageData);
        return [imageData];
      } 
      
      // Kontrol 4: Array durumu
      else if (Array.isArray(imageData)) {
        console.log("Dizi tip veri:", imageData);
        const urls = imageData.map(img => {
          if (typeof img === 'string') return img;
          if (img && img.url) return img.url;
          if (img && img.path) return img.path;
          
          // Nested object kontrolü
          if (typeof img === 'object' && img !== null) {
            // Karakterlere bölünmüş URL olabilir
            if (Object.keys(img).some(key => !isNaN(parseInt(key)))) {
              let url = '';
              let keys = Object.keys(img)
                .filter(key => !isNaN(parseInt(key)))
                .sort((a, b) => parseInt(a) - parseInt(b));
              
              for (let key of keys) {
                url += img[key];
              }
              
              if (url) {
                console.log("Dizi içinde birleştirilmiş URL:", url);
                return url;
              }
            }
          }
          
          console.warn("Anlaşılamayan resim formatı:", img);
          return null;
        }).filter(img => img !== null);
        
        console.log("İşlenmiş görsel URL'leri:", urls);
        return urls;
      }
      
      // Kontrol 5: Nesne durumu
      else if (typeof imageData === "object" && imageData !== null) {
        console.log("Obje tip veri:", imageData);
        
        // Direct URL özelliği var mı?
        if (imageData.url) return [imageData.url];
        if (imageData.path) return [imageData.path];
        
        // Nesne array benzeri mi?
        if (Object.keys(imageData).every(key => !isNaN(parseInt(key)))) {
          // Karakter dizisi ise birleştir
          if (Object.values(imageData).every(val => typeof val === 'string' && val.length === 1)) {
            let url = '';
            let keys = Object.keys(imageData)
              .filter(key => !isNaN(parseInt(key)))
              .sort((a, b) => parseInt(a) - parseInt(b));
            
            for (let key of keys) {
              url += imageData[key];
            }
            
            console.log("Objeden birleştirilen URL:", url);
            if (url) return [url];
          }
          
          // Dizi gibi işle
          const values = Object.values(imageData);
          console.log("Obje dizi gibi işleniyor:", values);
          
          const urls = values
            .filter(val => val !== null && val !== undefined)
            .map(img => {
              if (typeof img === 'string') return img;
              if (img && img.url) return img.url;
              if (img && img.path) return img.path;
              return null;
            })
            .filter(url => url !== null);
            
          console.log("Objeden çıkarılan URL'ler:", urls);
          return urls;
        }
        
        // Diğer nesne durumları
        const urls = [];
        for (const key in imageData) {
          const img = imageData[key];
          if (typeof img === 'string') {
            urls.push(img);
          } else if (img && typeof img === 'object') {
            if (img.url) urls.push(img.url);
            else if (img.path) urls.push(img.path);
          }
        }
        
        console.log("Objeden alternatif yolla çıkarılan URL'ler:", urls);
        return urls.length > 0 ? urls : [];
      }
      
      // Hiçbir koşula uymadı
      console.warn("İşlenemeyen resim formatı:", imageData);
      return [];
    } catch (error) {
      console.error("Error processing images:", error, post.images);
      return [];
    }
  };
  
  const postImages = getPostImages();
  const hasImages = postImages.length > 0;
  
  console.log("İşlenen son görsel listesi:", postImages);
  
  // Create a function to render the user profile image
  const renderUserProfileImage = () => {
    // Use profileUser information if available
    if (profileUser && profileUser.profileImage) {
      return <img 
        src={profileUser.profileImage} 
        alt={profileUser.username}
        className="w-10 h-10 rounded-full object-cover border border-gray-200"
        onError={handleImageError}
      />;
    }
    
    // Fallback to post.user if needed
    if (post.user && post.user.profile_picture) {
      return <img 
        src={getFullImageUrl(post.user.profile_picture)} 
        alt={post.user.username}
        className="w-10 h-10 rounded-full object-cover border border-gray-200"
        onError={handleImageError}
      />;
    }
    
    // Default avatar if no profile image is available
    return <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#0affd9] to-blue-500 flex items-center justify-center text-white font-bold">
      {(profileUser?.username || post.user?.username || "?").charAt(0).toUpperCase()}
    </div>;
  };
  
  // Get the username from profileUser or post.user
  const username = profileUser?.username || (post.user && post.user.username) || "Unknown User";
  
  // Yorumu formatlama işlevi
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec} sn`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} dk`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} sa`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} g`;
    
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'short'
    });
  };
  
  // Yorumu gönder kısayolu (Enter tuşuyla)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };
  
  // Gönderi silme fonksiyonu
  const handleDeletePost = async () => {
    if (!post || !post.id) {
      toast.error('Gönderi bilgisi bulunamadı');
      return;
    }
    
    setDeletingPost(true);
    
    try {
      const response = await api.delete(`/posts/${post.id}`);
      console.log('Gönderi silme yanıtı:', response);
      
      if (response.success) {
        toast.success('Gönderi başarıyla silindi');
        // Modal'ı kapat ve varsa onPostDelete callback'ini çağır
        onClose();
        if (typeof onPostDelete === 'function') {
          onPostDelete(post.id);
        }
      } else {
        toast.error(response.message || 'Gönderi silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Gönderi silme hatası:', error);
      toast.error('Gönderi silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setDeletingPost(false);
      setShowDeleteConfirm(false);
    }
  };
  
  // Yorum silme fonksiyonu
  const handleDeleteComment = async (commentId) => {
    if (!commentId) {
      toast.error('Yorum ID bilgisi bulunamadı');
      return;
    }
    
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      console.log(`Yorum siliniyor, ID: ${commentId}`);
      const response = await api.comments.delete(commentId);
      console.log('Yorum silme yanıtı:', response);
      
      if (response.success) {
        // Yorumu listeden kaldır
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        toast.success('Yorum başarıyla silindi');
      } else {
        // Özel hata durumlarını kontrol et
        if (response.message && response.message.toLowerCase().includes('bulunamadı')) {
          // Yorum zaten silinmiş olabilir, UI'dan kaldır
          setComments(prev => prev.filter(comment => comment.id !== commentId));
          toast.success('Yorum silindi');
        } else {
          toast.error(response.message || 'Yorum silinirken bir hata oluştu');
        }
      }
    } catch (error) {
      console.error('Yorum silme hatası:', error);
      toast.error('Yorum silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };
  
  // Kullanıcının yorumu silebilme yetkisi var mı kontrol et
  const canDeleteComment = (comment) => {
    if (!currentUser || !currentUser.id) return false;
    
    try {
      // Kullanıcı kendi yorumunu silebilir
      // Farklı ID formatlarını kontrol et (string/number)
      const commentUserId = String(comment.userId || comment.user_id || (comment.user && comment.user.id) || '');
      const currentUserId = String(currentUser.id);
      
      if (commentUserId && commentUserId === currentUserId) {
        return true;
      }
      
      // Gönderinin sahibi, gönderiye yapılan tüm yorumları silebilir
      if (post.user || post.userId) {
        const postUserId = String(post.userId || (post.user && post.user.id) || '');
        if (postUserId && postUserId === currentUserId) {
          return true;
        }
      }
      
      // Admin kullanıcılar tüm yorumları silebilir
      if (currentUser.isAdmin === true) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Yorum silme yetkisi kontrolünde hata:", error);
      return false;
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-black text-white rounded-lg overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl border border-[#0affd9]/20 relative" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 text-white bg-black bg-opacity-70 rounded-full p-1.5 z-50 hover:bg-opacity-100 transition-all" 
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Gezinme butonları - Önceki gönderi */}
        {onPrevious && (
          <button 
            className="post-nav-button post-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrevious();
            }}
            aria-label="Önceki gönderi"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Gezinme butonları - Sonraki gönderi */}
        {onNext && (
          <button 
            className="post-nav-button post-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Sonraki gönderi"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
        
        <div className="flex-1 min-h-0 relative flex flex-col">
          <div className="flex-1 min-h-0">
            {hasImages ? (
              <div className="relative h-full bg-black">
                  <div 
                  className="flex transition-transform duration-300 h-full"
                    style={{
                      transform: `translateX(-${currentImageIndex * 100}%)`,
                    width: `${postImages.length * 100}%`
                  }}
                >
                  {postImages.map((image, index) => {
                    // URL işleme
                    const imageUrl = getFullImageUrl(typeof image === 'object' ? image.url : image);
                    console.log(`Resim ${index} URL:`, imageUrl);
                    
                    return (
                      <div key={index} className="flex-shrink-0" style={{ width: `${100 / postImages.length}%` }}>
                        <div className="w-full h-full flex items-center justify-center bg-black">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                          alt={`Post content ${index + 1}`} 
                          onError={handleImageError}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                              <p>Görsel bulunamadı</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Image navigation dots */}
                {postImages.length > 1 && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {postImages.map((_, index) => (
                      <button 
                        key={index}
                        className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-[#0affd9]' : 'bg-gray-500'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                      />
                    ))}
                  </div>
                )}
                  
                  {/* Left navigation button */}
                  {currentImageIndex > 0 && (
                    <button
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev - 1);
                      }}
                    >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Right navigation button */}
                  {postImages.length > 1 && currentImageIndex < postImages.length - 1 && (
                    <button
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => prev + 1);
                      }}
                    >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-black">
                <div className="text-center text-2xl font-medium text-white p-6 rounded-lg">
                  {post.content}
                </div>
              </div>
            )}
          </div>
          
          {/* Etkileşim butonları - her zaman alt kısımda */}
          <div className="absolute right-4 bottom-4 flex flex-col items-center gap-4 z-10">
            <button 
              onClick={handleLike}
              className="flex flex-col items-center" 
            >
              <div className={`p-3 rounded-full bg-black/70 backdrop-blur-sm border ${isLiked ? 'border-red-500' : 'border-gray-600'} transition-all hover:scale-110`}>
                <Heart className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
              </div>
              <span className="text-xs mt-1 text-white font-medium bg-black/50 px-1 rounded">{likesCount}</span>
            </button>
            
            <button 
              onClick={() => commentInputRef.current?.focus()} 
              className="flex flex-col items-center"
            >
              <div className="p-3 rounded-full bg-black/70 backdrop-blur-sm border border-gray-600 transition-all hover:scale-110">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs mt-1 text-white font-medium bg-black/50 px-1 rounded">{comments.length}</span>
            </button>
            
            <button 
              onClick={handleSave} 
              className="flex flex-col items-center"
            >
              <div className={`p-3 rounded-full bg-black/70 backdrop-blur-sm border ${isSaved ? 'border-yellow-500' : 'border-gray-600'} transition-all hover:scale-110`}>
                <Bookmark className={`w-6 h-6 ${isSaved ? 'text-yellow-500 fill-yellow-500' : 'text-white'}`} />
              </div>
              <span className="text-xs mt-1 text-white font-medium bg-black/50 px-1 rounded">Kaydet</span>
            </button>
            
            <button className="flex flex-col items-center">
              <div className="p-3 rounded-full bg-black/70 backdrop-blur-sm border border-gray-600 transition-all hover:scale-110">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs mt-1 text-white font-medium bg-black/50 px-1 rounded">Paylaş</span>
            </button>
          </div>
        </div>
        
        <div className="w-full md:w-96 flex-shrink-0 border-t md:border-l md:border-t-0 border-gray-800 flex flex-col max-h-[90vh] md:max-h-full">
          {/* Kullanıcı başlığı */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                  {renderUserProfileImage()}
              <div>
                <div className="font-medium text-white">{username}</div>
                <div className="text-xs text-gray-400">
                  {formatTimestamp(post.created_at || post.createdAt)}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {currentUser && currentUser.username !== username && (
                <button className="p-2 rounded-full hover:bg-gray-800">
                  <UserPlus className="w-5 h-5 text-[#0affd9]" />
                </button>
              )}
              
              {/* Gönderi sahibiyse veya admin ise silme düğmesi göster */}
              {currentUser && (currentUser.id === post.user?.id || currentUser.id === post.userId || currentUser.isAdmin) && (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-full text-red-500 hover:bg-red-900/30 hover:text-red-400"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              
              <button className="p-2 rounded-full hover:bg-gray-800">
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* İçerik alanı */}
          <div className="p-4 border-b border-gray-800">
            <p className="text-white whitespace-pre-wrap break-words">
              {post.content}
            </p>
          </div>
          
          {/* Yorumlar bölümü */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center">
              <MessageCircle className="w-4 h-4 mr-1" /> Yorumlar
            </h3>
            
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#0affd9]"></div>
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => {
                  console.log("Render edilen yorum:", comment);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#0affd9] to-blue-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        {comment.userProfileImage ? (
                          <img 
                            src={getFullImageUrl(comment.userProfileImage)} 
                            alt={comment.username || "Kullanıcı"}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          (comment.username || "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="font-medium text-white text-sm mr-2">
                            {comment.username || (comment.user && comment.user.username) || "İsimsiz Kullanıcı"}
                            {comment.userId === currentUser?.id && <span className="ml-1 text-xs text-[#0affd9]">(Sen)</span>}
                          </span>
                          <span className="text-xs text-gray-500">{formatTimestamp(comment.created_at)}</span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <button className="hover:text-[#0affd9]">Yanıtla</button>
                          <button className="hover:text-[#0affd9]">Beğen</button>
                          
                          {/* Silme butonunu koşullu olarak göster */}
                          {canDeleteComment(comment) && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)} 
                              className="text-red-500 hover:text-red-400"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                      <button className="text-gray-500 hover:text-white">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Henüz yorum yok</p>
                <p className="text-sm mt-1">İlk yorumu sen yap!</p>
              </div>
            )}
          </div>
          
          {/* Yorum ekleme alanı */}
          <div className="p-3 border-t border-gray-800 flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#0affd9] to-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {currentUser?.username?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={commentInputRef}
                className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#0affd9] resize-none"
                placeholder="Bir yorum ekle..."
                rows={1}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#0affd9] p-1 rounded-full"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={handleAddComment}
              disabled={!commentText.trim() || loading}
              className={`p-2 text-white rounded-full ${
                commentText.trim() && !loading 
                ? 'bg-[#0affd9] hover:bg-[#0affd9]/80 text-black' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Gönderi silme onay modalı */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
        >
          <div 
            className="bg-gray-900 p-6 rounded-xl border border-red-500/20 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <h3 className="text-xl text-white font-bold mb-3">Gönderiyi Sil</h3>
            <p className="text-gray-300 mb-6">
              Bu gönderiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex space-x-3">
              <button
                className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setShowDeleteConfirm(false)}
              >
                İptal
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                onClick={handleDeletePost}
                disabled={deletingPost}
              >
                {deletingPost ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostShow