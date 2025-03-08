import React, { useState, useEffect } from 'react';
import SearchBar from './common/SearchBar';
import PostList from './posts/PostList';
import CreatePostForm from './posts/CreatePostForm';
import api from '../../services/api';

const MainContent = ({ user }) => {
  const [activeTab, setActiveTab] = useState('following');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    // Gönderi verilerini çek
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.posts.getFeeds(activeTab);
        setPosts(response.data.posts || []);
      } catch (err) {
        setError('Gönderiler yüklenirken bir hata oluştu: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [activeTab]);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      
      // Backend API'nız arama özelliğini destekliyorsa burada çağrı yapabilirsiniz
      // const response = await api.posts.search(searchTerm);
      // setPosts(response.data.posts || []);
      
      // Şimdilik bilgilendirme amaçlı konsola yazalım
      console.log('Arama yapılıyor:', searchTerm);
      
      // Gerçek bir uygulamada, backend'e arama isteği gönderin
    } catch (err) {
      setError('Arama yapılırken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (newPost) => {
    try {
      // Optimistik güncelleme - gönderi hemen gösterilir
      const tempId = Date.now();
      const tempPost = {
        id: tempId,
        user: {
          id: user.id,
          username: user.username,
          profileImage: user.profileImage
        },
        content: newPost.content,
        images: newPost.images.map(url => ({ url })),
        likes: 0,
        comments: 0,
        createdAt: 'Şimdi',
        liked: false,
        saved: false
      };
      
      setPosts(prevPosts => [tempPost, ...prevPosts]);
      setShowCreateForm(false);
      
      // Gerçek API çağrısı
      const response = await api.posts.create(newPost);
      
      // Temp gönderiyi gerçek gönderi ile değiştir
      setPosts(prevPosts => prevPosts.map(post => 
        post.id === tempId ? { ...response.data.post, user: { ...post.user } } : post
      ));
    } catch (err) {
      setError('Gönderi oluşturulurken bir hata oluştu: ' + err.message);
      
      // Hata durumunda geçici gönderiyi kaldır
      setPosts(prevPosts => prevPosts.filter(post => post.id !== tempId));
    }
  };

  const toggleLike = async (postId) => {
    try {
      // Mevcut beğeni durumunu bul
      const post = posts.find(p => p.id === postId);
      const isLiked = post ? post.liked : false;
      
      // Optimistik güncelleme
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          };
        }
        return post;
      }));
      
      // API çağrısı
      if (isLiked) {
        await api.posts.unlike(postId);
      } else {
        await api.posts.like(postId);
      }
    } catch (err) {
      // Hata durumunda, değişiklikleri geri al
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likes: post.liked ? post.likes - 1 : post.likes + 1
          };
        }
        return post;
      }));
      
      setError('Beğeni işlemi sırasında bir hata oluştu: ' + err.message);
    }
  };

  const toggleSave = async (postId) => {
    try {
      // Mevcut kayıt durumunu bul
      const post = posts.find(p => p.id === postId);
      const isSaved = post ? post.saved : false;
      
      // Optimistik güncelleme
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return { ...post, saved: !post.saved };
        }
        return post;
      }));
      
      // API çağrısı
      if (isSaved) {
        await api.posts.unsave(postId);
      } else {
        await api.posts.save(postId);
      }
    } catch (err) {
      // Hata durumunda, değişiklikleri geri al
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return { ...post, saved: !post.saved };
        }
        return post;
      }));
      
      setError('Kaydetme işlemi sırasında bir hata oluştu: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Arama Çubuğu */}
      <SearchBar onSearch={handleSearch} />
      
      {/* Hata mesajı */}
      {error && (
        <div 
          className="p-3 rounded-lg text-sm border text-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            borderColor: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}
      
      {/* Gönderi Oluşturma (kaldırcam / profile eklencek */}
      <div 
        className="rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--background-card)',
          backdropFilter: 'var(--backdrop-blur)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {showCreateForm ? (
          <CreatePostForm 
            onSubmit={handleCreatePost} 
            onCancel={() => setShowCreateForm(false)} 
          />
        ) : (
          <div 
            className="flex items-center cursor-pointer p-2 rounded-lg"
            style={{ backgroundColor: 'var(--background-secondary)' }}
            onClick={() => setShowCreateForm(true)}
          >
            <div className="flex-shrink-0 mr-3">
              {user.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-red)' }}
                >
                  <span style={{ color: 'white', fontWeight: 'bold' }}>
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <p style={{ color: 'var(--text-tertiary)' }}>
                Post Atmak için deneme paneli, {user.username}?
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Sekme Menüsü */}
      <div 
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--background-card)',
          backdropFilter: 'var(--backdrop-blur)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'following' 
                ? 'border-b-2' 
                : 'opacity-70'
            }`}
            style={{ 
              borderColor: activeTab === 'following' ? 'var(--accent-red)' : 'transparent',
              color: 'var(--text-primary)' 
            }}
            onClick={() => setActiveTab('following')}
          >
            Takip Ettiklerim
          </button>
          
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'general' 
                ? 'border-b-2' 
                : 'opacity-70'
            }`}
            style={{ 
              borderColor: activeTab === 'general' ? 'var(--accent-red)' : 'transparent',
              color: 'var(--text-primary)' 
            }}
            onClick={() => setActiveTab('general')}
          >
            Genel
          </button>
          
          <button
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === 'trending' 
                ? 'border-b-2' 
                : 'opacity-70'
            }`}
            style={{ 
              borderColor: activeTab === 'trending' ? 'var(--accent-red)' : 'transparent',
              color: 'var(--text-primary)' 
            }}
            onClick={() => setActiveTab('trending')}
          >
            Trendler
          </button>
        </div>
      </div>
      
      {/* Gönderiler */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 rounded-full"
              style={{ borderColor: 'var(--accent-red) transparent transparent transparent' }}></div>
        </div>
      ) : (
        <PostList 
          posts={posts} 
          onLike={toggleLike}
          onSave={toggleSave}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default MainContent;