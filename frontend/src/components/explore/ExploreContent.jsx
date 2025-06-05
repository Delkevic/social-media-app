import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Grid, List, Filter, Sparkles, Hash, Heart, MessageCircle, Compass } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import PostShow from '../profile/postShow';
import { API_BASE_URL, DEFAULT_PLACEHOLDER_IMAGE } from '../../config/constants';

// Örnek gönderiler (API çağrısı yapılmadan önce gösterilen örnek içerik)
const MOCK_POSTS = [
  {
    id: 1,
    caption: 'Yaz tatilinde muhteşem manzaralar 🌊',
    media: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    tags: ['yaz', 'tatil', 'deniz'],
    author: {
      id: 101,
      username: 'gezgin',
      profileImage: 'https://randomuser.me/api/portraits/men/32.jpg'
    },
    likeCount: 124,
    commentCount: 14,
    createdAt: '2023-05-18T14:30:00.000Z'
  },
  {
    id: 2,
    caption: 'Bugün teknoloji konferansındayım. Yapay zeka sunumları çok etkileyici! #tech #ai',
    media: ['https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    tags: ['teknoloji', 'ai', 'konferans'],
    author: {
      id: 102,
      username: 'techmeraklisi',
      profileImage: 'https://randomuser.me/api/portraits/women/44.jpg'
    },
    likeCount: 89,
    commentCount: 7,
    createdAt: '2023-05-17T10:15:00.000Z'
  },
  {
    id: 3,
    caption: 'Yeni kitaplık köşemi nasıl buldunuz? 📚',
    media: ['https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80',
    tags: ['kitap', 'okuma', 'tasarım'],
    author: {
      id: 103,
      username: 'kitapkurdu',
      profileImage: 'https://randomuser.me/api/portraits/women/65.jpg'
    },
    likeCount: 211,
    commentCount: 23,
    createdAt: '2023-05-16T19:45:00.000Z'
  },
  {
    id: 4,
    caption: 'Spor sonrası smoothie tam ihtiyacım olan şey 🥝🍓',
    media: ['https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=800&q=80',
    tags: ['sağlık', 'spor', 'beslenme'],
    author: {
      id: 104,
      username: 'saglikli_yasam',
      profileImage: 'https://randomuser.me/api/portraits/men/76.jpg'
    },
    likeCount: 156,
    commentCount: 11,
    createdAt: '2023-05-15T08:20:00.000Z'
  },
  {
    id: 5,
    caption: 'Yeni fotoğraf ekipmanımla çektiğim ilk doğa fotoğrafı',
    media: ['https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    tags: ['fotoğrafçılık', 'doğa', 'sanat'],
    author: {
      id: 105,
      username: 'fotografci',
      profileImage: 'https://randomuser.me/api/portraits/men/22.jpg'
    },
    likeCount: 189,
    commentCount: 19,
    createdAt: '2023-05-14T16:10:00.000Z'
  },
  {
    id: 6,
    caption: 'Berlin gezisinden kareler. Bu şehrin mimarisi büyüleyici!',
    media: ['https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=800&q=80'],
    coverImage: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?w=800&q=80',
    tags: ['seyahat', 'mimari', 'şehir'],
    author: {
      id: 106,
      username: 'dunyagezgini',
      profileImage: 'https://randomuser.me/api/portraits/women/28.jpg'
    },
    likeCount: 234,
    commentCount: 27,
    createdAt: '2023-05-13T11:30:00.000Z'
  }
];

const ExploreContent = ({ user }) => {
  const [activeView, setActiveView] = useState('grid');
  const [activeFilter, setActiveFilter] = useState('all');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popularTags, setPopularTags] = useState([
    'teknoloji', 'spor', 'moda', 'seyahat', 'sanat', 'müzik', 'kitap', 'film', 'yemek', 'fotoğrafçılık'
  ]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Kategori filtreleri
  const categories = [
    { id: 'all', name: 'Tümü' },
    { id: 'popular', name: 'Popüler' },
    { id: 'recent', name: 'Son Eklenenler' },
    { id: 'following', name: 'Takip Ettiklerim' },
  ];

  // Görsel yükleme hatası durumunda çağrılacak fonksiyon
  const handleImageError = (e) => {
    console.error("Görsel yükleme hatası:", e.target.src);
    e.target.onerror = null; // Sonsuz hata döngüsünü önle
    e.target.src = DEFAULT_PLACEHOLDER_IMAGE; // constants.js'den varsayılan resim
  };

  // Gönderi için mobil boyutlarda optimize edilmiş görsel URL'i
  const getOptimizedImageUrl = (imageUrl) => {
    if (!imageUrl) return DEFAULT_PLACEHOLDER_IMAGE;
    
    // via.placeholder.com kontrolü
    if (imageUrl.includes('via.placeholder.com')) {
      return DEFAULT_PLACEHOLDER_IMAGE;
    }
    
    // Cloudinary URL'i optimize et
    if (imageUrl.includes('cloudinary.com')) {
      // Zaten dönüşümler varsa
      if (imageUrl.includes('/upload/')) {
        return imageUrl.replace('/upload/', '/upload/w_800,c_limit,q_80/');
      }
    }
    
    return imageUrl;
  };

  // Mobil için daha fazla optimize edilmiş görsel URL'i
  const getMobileOptimizedUrl = (imageUrl) => {
    if (!imageUrl) return DEFAULT_PLACEHOLDER_IMAGE;
    
    // via.placeholder.com kontrolü
    if (imageUrl.includes('via.placeholder.com')) {
      return DEFAULT_PLACEHOLDER_IMAGE;
    }
    
    // Cloudinary URL'i mobil için optimize et
    if (imageUrl.includes('cloudinary.com')) {
      // Zaten dönüşümler varsa
      if (imageUrl.includes('/upload/')) {
        return imageUrl.replace('/upload/', '/upload/w_500,c_limit,q_70/');
      }
    }
    
    return imageUrl;
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

  // Kullanıcı bilgilerini bul - farklı API yanıt formatlarını destekler
  const getPostAuthor = (post) => {
    // Olası kullanıcı alanlarını kontrol et
    if (post.author) return post.author;
    if (post.user) return post.user;
    if (post.User) return post.User;
    if (post.Author) return post.Author;
    
    // Kullanıcı adı ve profil resmi alanlarını kontrol et
    const author = {
      username: post.username || post.Username || post.userName || post.UserName || 'isimsiz',
      profileImage: post.profileImage || post.ProfileImage || post.profile_picture || post.ProfilePicture || DEFAULT_PLACEHOLDER_IMAGE
    };
    
    return author;
  };

  // API'den gelen verileri normalize et
  const normalizePost = (post) => {
    const normalizedPost = { ...post };
    
    // Görsel bilgilerini normalize et
    const postImage = getPostImage(post);
    normalizedPost.coverImage = postImage;
    normalizedPost.media = postImage ? [postImage] : [];
    
    // Başlık/açıklama bilgilerini normalize et
    normalizedPost.caption = getPostCaption(post);
    
    // Kullanıcı bilgilerini normalize et
    normalizedPost.author = getPostAuthor(post);
    
    // Beğeni ve yorum sayılarını normalize et
    normalizedPost.likeCount = post.likeCount || post.likes || post.like_count || post.LikeCount || 0;
    normalizedPost.commentCount = post.commentCount || post.comments || post.comment_count || post.CommentCount || 0;
    
    return normalizedPost;
  };

  useEffect(() => {
    // Keşfet için gönderileri çek
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let endpoint = '/api/v1/posts';
        let apiMethod;
        
        // Filter parametrelerine göre API metodu seç
        if (activeFilter === 'popular') {
          apiMethod = api.posts.getFeeds('popular');
        } else if (activeFilter === 'recent') {
          apiMethod = api.posts.getFeeds('recent');
        } else if (activeFilter === 'following') {
          apiMethod = api.posts.getFeeds('following');
        } else {
          apiMethod = api.posts.getFeeds('general');
        }
        
        // API'den gerçek verileri çek
        const response = await apiMethod;
        
        console.log('API yanıtı:', response);
        
        if (response.success) {
          let postsData = [];
          
          // API yanıt formatını kontrol et
          if (Array.isArray(response.data)) {
            postsData = response.data;
          } else if (response.data && Array.isArray(response.data.posts)) {
            postsData = response.data.posts;
          } else if (response.data && typeof response.data === 'object') {
            // Tek bir gönderi olabilir
            postsData = [response.data];
          }
          
          // Gönderileri normalize et
          const normalizedPosts = postsData.map(post => normalizePost(post));
          
          console.log('Normalize edilmiş gönderiler:', normalizedPosts);
          setPosts(normalizedPosts);
        } else {
          console.warn('API yanıtı başarısız:', response.message);
          toast.error('Gönderiler yüklenirken bir hata oluştu.');
          // Hata durumunda boş dizi göster
          setPosts([]);
        }
      } catch (err) {
        console.error('Gönderi yükleme hatası:', err);
        toast.error('Gönderiler yüklenirken bir hata oluştu.');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [activeFilter]);

  // Görünüm tipini değiştir
  const toggleView = (view) => {
    setActiveView(view);
  };

  // Filtreyi değiştir
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // Etiket tıklama
  const handleTagClick = (tag) => {
    toast.success(`"${tag}" etiketine ait gönderiler yükleniyor...`);
    // Burada etiket filtreleme API'si çağrılabilir
  };

  // Gönderi tıklama işleyicisi
  const handlePostClick = (post, e) => {
    setSelectedPost(post);
    setShowPostModal(true);
    console.log('Gönderi tıklandı, modal açılıyor');
  };

  // Yorum butonuna tıklandığında modal açılacak yeni fonksiyon
  const handleCommentClick = (post, e) => {
    e.stopPropagation(); // Event propagation'ı durdur
    setSelectedPost(post);
    setShowPostModal(true);
    console.log('Yorum butonu tıklandı, modal açılıyor');
  };

  // Gönderi silme işleyicisi
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    toast.success('Gönderi başarıyla silindi');
  };

  // Yükleme durumunu göster
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[50vh]">
        <div className="animate-spin h-12 w-12 border-4 rounded-full border-t-[#0affd9] border-r-transparent border-b-transparent border-l-transparent mb-4"></div>
        <p className="text-[#0affd9] font-medium">Keşfedecek içerikler yükleniyor...</p>
      </div>
    );
  }

  // Hata durumunu göster
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[50vh] text-center">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 className="text-xl font-semibold mb-2">Bir hata oluştu</h3>
        <p className="mb-4 text-gray-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#0affd9] text-black rounded-lg font-medium transition-colors hover:bg-[#0affd9]/80"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  // Gönderi olmama durumu
  if (posts.length === 0) {
    return (
      <div className="bg-black/30 border border-[#0affd9]/10 rounded-2xl p-8 text-center">
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Compass className="h-16 w-16 text-[#0affd9]/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Henüz gönderi yok</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Bu kategoride henüz gönderi bulunmuyor. Farklı bir kategori seçebilir veya daha sonra tekrar kontrol edebilirsiniz.
          </p>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="px-4 py-2 bg-[#0affd9] text-black rounded-lg font-medium transition-colors hover:bg-[#0affd9]/80"
            >
              Tüm Gönderileri Göster
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 border border-[#0affd9]/10 rounded-2xl p-4 md:p-6 overflow-hidden">
      {/* Başlık ve Görünüm Seçenekleri */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-[#0affd9]" />
            Keşfet
          </h1>
          <p className="text-gray-400 mt-1">Trendleri keşfet ve ilham al</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="p-1 bg-black/40 rounded-lg border border-[#0affd9]/20 flex">
            <button 
              onClick={() => toggleView('grid')}
              className={`p-2 rounded-md ${activeView === 'grid' ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => toggleView('list')}
              className={`p-2 rounded-md ${activeView === 'list' ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          
          <button className="p-2 bg-black/40 rounded-lg border border-[#0affd9]/20 text-gray-400 hover:text-white">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Kategori Filtreleri */}
      <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#0affd9]/10">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => handleFilterChange(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === category.id
                ? 'bg-[#0affd9] text-black'
                : 'bg-black/40 text-gray-300 hover:bg-black/60 border border-[#0affd9]/20'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Popüler Etiketler */}
      <div className="mb-6 overflow-x-auto pb-2">
        <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
          <Hash className="h-4 w-4 mr-1 text-[#0affd9]" />
          Popüler Etiketler
        </h3>
        <div className="flex space-x-2">
          {popularTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className="px-3 py-1 bg-black/40 text-[#0affd9] rounded-full text-sm whitespace-nowrap border border-[#0affd9]/20 hover:bg-[#0affd9]/10 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>
      
      {/* Grid/List görünümü */}
      {activeView === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.id} className="group relative overflow-hidden rounded-xl aspect-square cursor-pointer" onClick={(e) => handlePostClick(post, e)}>
              <div>
                <img 
                  src={getOptimizedImageUrl(post.media?.[0] || post.coverImage || DEFAULT_PLACEHOLDER_IMAGE)} 
                  alt={post.caption || 'Post görseli'}
                  srcSet={`${getMobileOptimizedUrl(post.media?.[0] || post.coverImage || DEFAULT_PLACEHOLDER_IMAGE)} 500w, ${getOptimizedImageUrl(post.media?.[0] || post.coverImage || DEFAULT_PLACEHOLDER_IMAGE)} 800w`}
                  sizes="(max-width: 640px) 500px, 800px"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={handleImageError}
                />
                
                {/* Detay overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="text-white line-clamp-2 font-medium mb-2">
                    {post.caption || 'Başlıksız gönderi'}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Kullanıcı bilgisi */}
                    <div className="flex items-center">
                      <img 
                        src={post.author?.profileImage || DEFAULT_PLACEHOLDER_IMAGE} 
                        alt={post.author?.username || 'Kullanıcı'} 
                        className="w-6 h-6 rounded-full object-cover mr-2 border border-white/30"
                        onError={handleImageError}
                      />
                      <span className="text-sm text-white/90 truncate">
                        {post.author?.username || 'isimsiz'}
                      </span>
                    </div>
                    
                    {/* Etkileşim */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center text-white/90">
                        <Heart className="h-4 w-4 mr-1" />
                        <span className="text-xs">{post.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center text-white/90 cursor-pointer" onClick={(e) => handleCommentClick(post, e)}>
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span className="text-xs">{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-black/40 rounded-xl overflow-hidden border border-[#0affd9]/10 hover:border-[#0affd9]/30 transition-colors cursor-pointer" onClick={(e) => handlePostClick(post, e)}>
              <div className="p-4 flex items-start gap-3">
                {/* Kullanıcı profil resmi */}
                <div>
                  <Link to={`/profile/${post.author?.username}`}>
                    <img 
                      src={post.author?.profileImage || DEFAULT_PLACEHOLDER_IMAGE} 
                      alt={post.author?.username || 'Kullanıcı'} 
                      className="w-10 h-10 rounded-full object-cover border border-[#0affd9]/30"
                      onError={handleImageError}
                    />
                  </Link>
                </div>
                
                {/* İçerik */}
                <div className="flex-1">
                  {/* Kullanıcı bilgisi ve zaman */}
                  <div className="flex justify-between items-center mb-2">
                    <Link to={`/profile/${post.author?.username}`} className="font-medium text-white hover:text-[#0affd9] transition-colors">
                      {post.author?.username || 'isimsiz'}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  
                  {/* Gönderi metni */}
                  <p className="mb-3 text-gray-300">{post.caption || 'Başlıksız gönderi'}</p>
                  
                  {/* Etiketler */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs bg-black/30 text-[#0affd9] px-2 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Gönderi görseli */}
                  {(post.media?.length > 0 || post.coverImage) && (
                    <div className="block mb-3">
                      <img 
                        src={getOptimizedImageUrl(post.media?.[0] || post.coverImage)} 
                        alt={post.caption || 'Post görseli'}
                        srcSet={`${getMobileOptimizedUrl(post.media?.[0] || post.coverImage)} 500w, ${getOptimizedImageUrl(post.media?.[0] || post.coverImage)} 800w`}
                        sizes="(max-width: 640px) 500px, 800px"
                        className="w-full rounded-lg object-cover max-h-[300px]"
                        onError={handleImageError}
                      />
                    </div>
                  )}
                  
                  {/* Etkileşim butonları */}
                  <div className="flex items-center gap-4 text-gray-400">
                    <button className="flex items-center gap-1 hover:text-[#0affd9] transition-colors">
                      <Heart className="h-5 w-5" />
                      <span>{post.likeCount || 0}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-[#0affd9] transition-colors" onClick={(e) => handleCommentClick(post, e)}>
                      <MessageCircle className="h-5 w-5" />
                      <span>{post.commentCount || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* PostShow Modalı */}
      {selectedPost && (
        <PostShow 
          post={selectedPost}
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          profileUser={selectedPost.author}
          onPostDelete={handlePostDelete}
        />
      )}
    </div>
  );
};

export default ExploreContent; 