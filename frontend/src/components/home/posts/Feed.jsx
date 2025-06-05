import React, { useState, useEffect } from 'react';
import PostList from './PostList';
import api from '../../../services/api';
import { Heart, Bookmark, Search, TrendingUp, Clock, Users, Filter, X, MessageCircle } from 'lucide-react';
import PostShow from '../../profile/postShow';
import { API_BASE_URL, DEFAULT_PLACEHOLDER_IMAGE, DEFAULT_AVATAR_URL } from '../../../config/constants';

const Feed = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general, following, trending olabilir
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Görsel yükleme hatası durumunda çağrılacak fonksiyon
  const handleImageError = (e) => {
    console.error("Görsel yükleme hatası:", e.target.src);
    e.target.onerror = null; // Sonsuz hata döngüsünü önle
    e.target.src = DEFAULT_PLACEHOLDER_IMAGE; // Varsayılan resim
  };

  // Gönderi görselini bul - farklı API yanıt formatlarını destekler
  const getPostImage = (post) => {
    console.log("Post veri yapısı:", post);
    
    // Olası görsel alanlarını kontrol et
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      return post.media[0];
    }
    
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      return post.images[0];
    }
    
    if (post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0) {
      return post.imageUrls[0];
    }
    
    if (post.image) {
      return post.image;
    }
    
    if (post.coverImage) {
      return post.coverImage;
    }
    
    if (post.thumbnail) {
      return post.thumbnail;
    }
    
    // Farklı büyük/küçük harf kombinasyonlarını kontrol et
    if (post.Media && Array.isArray(post.Media) && post.Media.length > 0) {
      return post.Media[0];
    }
    
    if (post.Images && Array.isArray(post.Images) && post.Images.length > 0) {
      return post.Images[0];
    }
    
    if (post.ImageUrls && Array.isArray(post.ImageUrls) && post.ImageUrls.length > 0) {
      return post.ImageUrls[0];
    }
    
    if (post.Image) {
      return post.Image;
    }
    
    if (post.CoverImage) {
      return post.CoverImage;
    }
    
    // Eğer post.media bir string ise (JSON stringi olabilir)
    if (typeof post.media === 'string') {
      try {
        const parsedMedia = JSON.parse(post.media);
        if (Array.isArray(parsedMedia) && parsedMedia.length > 0) {
          return parsedMedia[0];
        }
      } catch (e) {
        // JSON parse hatası, media bir URL olabilir
        return post.media;
      }
    }
    
    // Eğer post.images bir string ise (JSON stringi olabilir)
    if (typeof post.images === 'string') {
      try {
        const parsedImages = JSON.parse(post.images);
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          return parsedImages[0];
        }
      } catch (e) {
        // JSON parse hatası, images bir URL olabilir
        return post.images;
      }
    }
    
    // Hiçbir görsel bulunamadı
    return null;
  };

  // Gönderi başlığını/açıklamasını bul - farklı API yanıt formatlarını destekler
  const getPostCaption = (post) => {
    // Olası başlık/açıklama alanlarını kontrol et
    if (post.caption) return post.caption;
    if (post.content) return post.content;
    if (post.description) return post.description;
    if (post.text) return post.text;
    
    // Farklı büyük/küçük harf kombinasyonlarını kontrol et
    if (post.Caption) return post.Caption;
    if (post.Content) return post.Content;
    if (post.Description) return post.Description;
    if (post.Text) return post.Text;
    
    // Hiçbir başlık/açıklama bulunamadı
    return 'Başlıksız gönderi';
  };

  // API'den gelen verileri normalize et
  const normalizePost = (post) => {
    const normalizedPost = { ...post };
    
    // Görsel bilgilerini normalize et
    const postImage = getPostImage(post);
    normalizedPost.images = postImage ? [postImage] : [];
    
    // Başlık/açıklama bilgilerini normalize et
    normalizedPost.caption = getPostCaption(post);
    normalizedPost.content = getPostCaption(post);
    
    // Beğeni ve yorum sayılarını normalize et
    normalizedPost.likes = post.likeCount || post.likes || post.like_count || post.LikeCount || 0;
    normalizedPost.comments = post.commentCount || post.comments || post.comment_count || post.CommentCount || 0;
    
    // Kullanıcı bilgilerini kontrol et
    if (!normalizedPost.user) {
      normalizedPost.user = {
        username: post.username || post.Username || post.userName || post.UserName || 'isimsiz',
        profileImage: post.profileImage || post.ProfileImage || post.profile_picture || post.ProfilePicture || DEFAULT_AVATAR_URL
      };
    }
    
    return normalizedPost;
  };

  useEffect(() => {
    // Gönderi verilerini çek
    fetchPosts();
  }, [activeTab]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Gönderiler çekiliyor. Feed tipi:', activeTab);
      const response = await api.posts.getFeeds(activeTab);
      
      if (response && response.success && response.data) {
        let postsData = [];
        
        // API yanıt formatını kontrol et
        if (Array.isArray(response.data)) {
          postsData = response.data;
        } else if (response.data.posts && Array.isArray(response.data.posts)) {
          postsData = response.data.posts;
        } else if (typeof response.data === 'object') {
          // Tek bir gönderi olabilir
          postsData = [response.data];
        }
        
        // Gönderileri normalize et
        const normalizedPosts = postsData.map(post => normalizePost(post));
        
        console.log('Normalize edilmiş gönderiler:', normalizedPosts);
        setPosts(normalizedPosts);
      } else {
        console.warn('API yanıtında data yok veya hata var:', response);
        setPosts([]);
        if (response && !response.success) {
          setError(response.message || 'Gönderiler alınırken bir hata oluştu');
        }
      }
    } catch (err) {
      console.error('Gönderiler yüklenirken hata:', err);
      setError('Gönderiler yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId) => {
    // Mevcut postu bul
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Şu anki beğeni durumunu kaydet
    const currentLikedState = post.liked;
    const currentLikeCount = post.likes || 0;

    // Beğeni durumunu optimistik olarak güncelle
    const updatedPosts = posts.map(p => 
      p.id === postId 
        ? {...p, liked: !p.liked, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1} 
        : p
    );
    setPosts(updatedPosts);

    try {
      // Log API isteğini
      console.log(`Beğeni isteği gönderiliyor: Post ID ${postId} - İşlem: ${post.liked ? 'unlike' : 'like'}`);
      
      // Sunucuya beğeni değişikliğini gönder
      const response = post.liked 
        ? await api.posts.unlike(postId) 
        : await api.posts.like(postId);
      
      console.log(`Beğeni API yanıtı (${postId}):`, response);
      
      if (response.success) {
        // API'den dönen beğeni sayısını kullan (varsa)
        let serverLikeCount = null;
        
        if (response.data) {
          if (typeof response.data.likeCount !== 'undefined') {
            serverLikeCount = response.data.likeCount;
            console.log(`API'den likeCount alındı: ${serverLikeCount}`);
          } else if (typeof response.data.likes !== 'undefined') {
            serverLikeCount = response.data.likes;
            console.log(`API'den likes alındı: ${serverLikeCount}`);
          } else if (typeof response.data === 'number') {
            // Bazen API doğrudan sayı dönebilir
            serverLikeCount = response.data;
            console.log(`API'den sayısal değer alındı: ${serverLikeCount}`);
          }
        }
        
        // API'den bir beğeni sayısı döndüyse kullan, yoksa optimistik güncellemede kal
        if (serverLikeCount !== null) {
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId ? {...p, likes: serverLikeCount, liked: !currentLikedState} : p
          ));
        }
      } else {
        // Özel durum: Eğer bir 500 hatası var ancak mesaj "Beğeni kaydedilirken hata oluştu" ise
        // bu durumda işlem muhtemelen başarılı oldu ancak API bir hata döndürdü
        if (response.status === 500 && response.message?.includes('Beğeni kaydedilirken hata oluştu')) {
          console.log("Beğeni işlemi başarılı görünüyor ama API hata döndürdü. UI durumunu koruyoruz.");
          // UI'yi güncellemeyi sürdür - optimistik güncellemeyi geri alma
        }
        // İnfo mesajları kontrol et
        else if (response.message?.toLowerCase().includes('zaten beğen') || 
                 response.message?.toLowerCase().includes('bu gönderi zaten')) {
          console.log(`Bilgi mesajı alındı: ${response.message}`);
          // UI'yi güncel tut
        }
        else if (response.message?.toLowerCase().includes('beğenilmemiş')) {
          console.log(`Bilgi mesajı alındı: ${response.message}`);
          // UI'yi güncel tut
        } 
        else {
          // Gerçek hata durumunda orijinal duruma geri dön
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId ? {
              ...p, 
              liked: currentLikedState,
              likes: currentLikeCount
            } : p
          ));
          console.error('Beğeni işlemi başarısız:', response.message);
        }
      }
    } catch (err) {
      // Özel durum: Eğer bir 500 hatası var ancak mesaj "Beğeni kaydedilirken hata oluştu" ise
      if (err.message?.includes('Beğeni kaydedilirken hata oluştu')) {
        console.log("Beğeni işlemi muhtemelen başarılı oldu ancak API hata döndürdü. UI durumunu koruyoruz.");
        // UI'yi geri alma - optimistik güncelleme doğru görünüyor
        return; // Hata mesajı gösterme
      }
      
      // Hata durumunda geri al
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId ? {
          ...p, 
          liked: currentLikedState,
          likes: currentLikeCount
        } : p
      ));
      console.error('Beğeni işlemi hatası:', err);
    }
  };

  const handleSave = async (postId) => {
    // Mevcut postu bul
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Kaydetme durumunu optimistik olarak güncelle
    const updatedPosts = posts.map(p => 
      p.id === postId ? {...p, saved: !p.saved} : p
    );
    setPosts(updatedPosts);

    try {
      // Sunucuya kaydetme değişikliğini gönder
      const response = post.saved 
        ? await api.posts.unsave(postId) 
        : await api.posts.save(postId);
      
      console.log(`Kaydetme API yanıtı (${postId}):`, response);
      
      if (!response.success) {
        // İnfo mesajları kontrol et
        const infoMessages = ['unique constraint', 'zaten kayded', 'kaydedilmemiş'];
        
        const messageIsInfo = infoMessages.some(infoMsg => 
          response.message && response.message.toLowerCase().includes(infoMsg)
        );
        
        if (messageIsInfo) {
          // Bu bir hata değil, sadece bilgi mesajı
          console.log(`Bilgi mesajı alındı: ${response.message}`);
          // UI'yi güncel tut
        } else {
          // Gerçek hata durumunda orijinal duruma geri dön
          setPosts(posts);
          console.error('Kaydetme işlemi başarısız:', response.message);
        }
      }
    } catch (err) {
      // Hata durumunda geri al
      setPosts(posts);
      console.error('Kaydetme işlemi hatası:', err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      const response = await api.posts.delete(postId);
      if (response.success) {
        // Başarıyla silinirse, listeden kaldır
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        console.error('Gönderi silme başarısız:', response.message);
      }
    } catch (err) {
      console.error('Gönderi silme hatası:', err);
    }
  };

  // Popüler etiketleri oluştur (normalde API'dan gelebilir)
  const popularTags = ['manzara', 'tatil', 'spor', 'müzik', 'teknoloji', 'yemek', 'sanat', 'moda', 'kitap', 'film'];

  // Kategoriler (normalde API'dan gelebilir)
  const categories = [
    { id: 'all', name: 'Tümü' },
    { id: 'photography', name: 'Fotoğrafçılık' },
    { id: 'travel', name: 'Seyahat' },
    { id: 'food', name: 'Yemek' },
    { id: 'art', name: 'Sanat' },
    { id: 'tech', name: 'Teknoloji' },
    { id: 'fashion', name: 'Moda' },
    { id: 'sport', name: 'Spor' },
  ];

  // Keşfet için grid görünümü
  const renderExploreGrid = () => {
    if (posts.length === 0) {
      return (
        <div className="rounded-xl p-8 text-center backdrop-blur-lg bg-black/50 border border-[#0affd9]/20">
          <div className="w-16 h-16 rounded-full bg-[#0affd9]/10 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[#0affd9]" />
          </div>
          <h3 className="text-lg font-medium text-white">Henüz gönderi yok</h3>
          <p className="mt-2 text-gray-400">Keşfedilecek gönderi bulunamadı</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Popüler etiketler */}
        <div className="overflow-x-auto pb-2">
          <div className="flex space-x-2">
            {popularTags.map(tag => (
              <div 
                key={tag}
                className="px-3 py-1.5 bg-[#0affd9]/10 text-[#0affd9] rounded-full text-sm whitespace-nowrap flex-shrink-0 cursor-pointer hover:bg-[#0affd9]/20 transition-colors"
              >
                #{tag}
              </div>
            ))}
          </div>
        </div>

        {/* Görünüm modu seçicisi */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <p className="text-sm text-gray-400 mr-3">Görünüm:</p>
            <div className="flex space-x-1 bg-black/60 rounded-lg p-1">
              <button 
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[#0affd9]/30 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setViewMode('grid')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[#0affd9]/30 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setViewMode('list')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <button className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4 mr-1" />
            Filtrele
          </button>
        </div>

        {/* Kategori seçimi */}
        <div className="overflow-x-auto pb-2">
          <div className="flex space-x-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                  selectedCategory === category.id 
                    ? 'bg-[#0affd9]/30 text-[#0affd9]' 
                    : 'bg-black/30 text-gray-300 hover:bg-black/50'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'grid' ? (
          // Grid görünümü
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
            {posts.map(post => {
              // Gönderi görselini bul
              let imageUrl = getPostImage(post);
              
              // via.placeholder.com kontrolü
              if (imageUrl && imageUrl.includes('via.placeholder.com')) {
                imageUrl = DEFAULT_PLACEHOLDER_IMAGE;
              }
              
              return (
                <div 
                  key={post.id} 
                  className="aspect-square relative overflow-hidden rounded-md cursor-pointer group"
                  onClick={() => handlePostClick(post)}
                >
                  <img 
                    src={imageUrl || DEFAULT_PLACEHOLDER_IMAGE} 
                    alt={post.caption || "Gönderi görseli"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={handleImageError}
                  />
                  
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center text-white">
                        <Heart size={18} className="mr-1" fill="white" />
                        <span>{post.likes || 0}</span>
                      </div>
                      <div 
                        className="flex items-center text-white cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCommentClick(post);
                        }}
                      >
                        <MessageCircle size={18} className="mr-1" />
                        <span>{post.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Liste görünümü - normal PostList kullan
          <PostList 
            posts={posts} 
            onLike={handleLike} 
            onSave={handleSave}
            onDelete={handleDelete}
            currentUser={user}
            onPostClick={handlePostClick}
          />
        )}
      </div>
    );
  };

  // Gönderi tıklama işleyicisi
  const handlePostClick = (post) => {
    // Fallback: modal aç
    setSelectedPost(post);
    setShowPostModal(true);
    console.log('Gönderi tıklandı');
  };

  // Yorum butonuna tıklandığında yorum paneli açılacak fonksiyon
  const handleCommentClick = (post) => {
    // Fallback: modal aç
    setSelectedPost(post);
    setShowPostModal(true);
    console.log('Yorum butonu tıklandı');
  };

  return (
    <div className="space-y-6">
      {/* Feed Sekmeleri */}
      <div className="flex overflow-x-auto space-x-2 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-[#0affd9] text-black'
              : 'bg-black/40 text-gray-300 hover:bg-black/60 border border-[#0affd9]/20'
          }`}
        >
          <TrendingUp className="h-4 w-4 mr-1.5" />
          Keşfet
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center whitespace-nowrap ${
            activeTab === 'following'
              ? 'bg-[#0affd9] text-black'
              : 'bg-black/40 text-gray-300 hover:bg-black/60 border border-[#0affd9]/20'
          }`}
        >
          <Users className="h-4 w-4 mr-1.5" />
          Takip Ettiklerim
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center whitespace-nowrap ${
            activeTab === 'recent'
              ? 'bg-[#0affd9] text-black'
              : 'bg-black/40 text-gray-300 hover:bg-black/60 border border-[#0affd9]/20'
          }`}
        >
          <Clock className="h-4 w-4 mr-1.5" />
          Son Eklenenler
        </button>
      </div>
      
      {/* Yükleme durumu */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-10 w-10 border-4 rounded-full border-t-[#0affd9] border-r-transparent border-b-transparent border-l-transparent"></div>
        </div>
      )}
      
      {/* Hata durumu */}
      {error && (
        <div className="rounded-xl p-6 backdrop-blur-lg bg-black/50 border border-red-500/20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-white">Bir hata oluştu</h3>
          <p className="mt-2 text-gray-400">{error}</p>
          <button 
            onClick={fetchPosts}
            className="mt-4 px-4 py-2 bg-[#0affd9] text-black rounded-lg font-medium transition-colors hover:bg-[#0affd9]/80"
          >
            Tekrar Dene
          </button>
        </div>
      )}
      
      {/* Gönderiler */}
      {!loading && !error && (
        <PostList 
          posts={posts} 
          onLike={handleLike} 
          onSave={handleSave} 
          onDelete={handleDelete}
          currentUser={user}
          onPostClick={handlePostClick}
        />
      )}
      
      {/* PostShow Modalı */}
      {selectedPost && (
        <PostShow 
          post={selectedPost}
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          profileUser={selectedPost.user}
          onPostDelete={(postId) => {
            handleDelete(postId);
            setShowPostModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Feed;