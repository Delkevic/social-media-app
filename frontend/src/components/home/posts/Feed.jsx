import React, { useState, useEffect } from 'react';
import PostList from './PostList';
import api from '../../../services/api';

const Feed = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // general, following, trending olabilir

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
        // API yanıtının yapısını kontrol et
        if (Array.isArray(response.data)) {
          // Doğrudan dizi döndüyse
          setPosts(response.data);
          console.log('Post sayısı:', response.data.length);
        } else if (response.data.posts && Array.isArray(response.data.posts)) {
          // {success: true, data: { posts: [] }} formatında
          setPosts(response.data.posts);
          console.log('Post sayısı:', response.data.posts.length);
        } else {
          // Diğer format, boş array varsayalım
          console.warn('Beklenmeyen API yanıt formatı:', response.data);
          setPosts([]);
        }
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

    // Beğeni durumunu optimistik olarak güncelle
    const updatedPosts = posts.map(p => 
      p.id === postId 
        ? {...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1} 
        : p
    );
    setPosts(updatedPosts);

    try {
      // Sunucuya beğeni değişikliğini gönder
      const response = post.liked 
        ? await api.posts.unlike(postId) 
        : await api.posts.like(postId);
      
      if (!response.success) {
        // Hata durumunda geri al
        setPosts(posts);
        console.error('Beğeni işlemi başarısız:', response.message);
      }
    } catch (err) {
      // Hata durumunda geri al
      setPosts(posts);
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
      
      if (!response.success) {
        // Hata durumunda geri al
        setPosts(posts);
        console.error('Kaydetme işlemi başarısız:', response.message);
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

  return (
    <div className="space-y-4">
      {/* Feed Türü Seçme Sekmeleri */}
      <div className="flex rounded-xl p-1 backdrop-blur-lg bg-black/50 border border-[#0affd9]/20">
        <button 
          className={`flex-1 py-2 rounded-lg text-center transition-colors ${activeTab === 'general' ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('general')}
        >
          Keşfet
        </button>
        <button 
          className={`flex-1 py-2 rounded-lg text-center transition-colors ${activeTab === 'following' ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('following')}
        >
          Takip Edilenler
        </button>
        <button 
          className={`flex-1 py-2 rounded-lg text-center transition-colors ${activeTab === 'trending' ? 'bg-[#0affd9]/20 text-[#0affd9]' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('trending')}
        >
          Popüler
        </button>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="p-4 rounded-lg text-red-400 border border-red-600/30 bg-red-600/10">
          <p>{error}</p>
          <button 
            onClick={fetchPosts}
            className="mt-2 px-3 py-1 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Yükleniyor */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0affd9]"></div>
          <p className="mt-4 text-gray-400">Gönderiler yükleniyor...</p>
        </div>
      ) : (
        /* Post Listesi */
        <PostList 
          posts={posts} 
          onLike={handleLike} 
          onSave={handleSave}
          onDelete={handleDelete}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default Feed; 