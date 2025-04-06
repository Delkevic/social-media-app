import React, { useState, useEffect } from 'react';
import SearchBar from './common/SearchBar';
import PostList from './posts/PostList';
import CreatePostForm from './posts/CreatePostForm';
import api from '../../services/api';

const MainContent = ({ user, showSearchOnly, hideSearch }) => {
  const [activeTab, setActiveTab] = useState('general');
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
        
        console.log('Gönderiler çekiliyor. Feed tipi:', activeTab);
        const response = await api.posts.getFeeds(activeTab);
        console.log('API Yanıtı (getFeeds):', response);
        
        if (response && response.data) {
          // API yanıtının yapısını kontrol et
          if (Array.isArray(response.data)) {
            // Doğrudan dizi döndüyse
            setPosts(response.data);
            console.log('Post sayısı (dizi):', response.data.length);
          } else if (response.data.posts && Array.isArray(response.data.posts)) {
            // {success: true, data: { posts: [] }} formatında
            setPosts(response.data.posts);
            console.log('Post sayısı (posts array):', response.data.posts.length);
          } else {
            // Diğer format, boş array varsayalım
            console.warn('Beklenmeyen API yanıt formatı:', response.data);
            setPosts([]);
          }
        } else {
          console.warn('API yanıtında data yok:', response);
          setPosts([]);
        }
      } catch (err) {
        console.error('Gönderiler yüklenirken hata:', err);
        setError('Gönderiler yüklenirken bir hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Sadece arama çubuğunu göstereceksek, gönderileri yükleme
    if (!showSearchOnly) {
      fetchPosts();
    }
  }, [activeTab, showSearchOnly]);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      
      // Backend API'nız arama özelliğini destekliyorsa burada çagırı yapabilirsiniz
      // const response = await api.posts.search(searchTerm);
      // setPosts(response.data.posts || []);
      
      // Şimdilik bilgilendirme amacı için konsola yazalım
      console.log('Arama yapılıyor:', searchTerm);
      
      // Gerçek bir uygulamada, backend'e arama isteği gönderin
    } catch (err) {
      setError('Arama yapılırken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Post oluşturma isteği gönderiliyor:', postData);
      // API'ye gönderi oluşturma isteği gönder
      const response = await api.posts.create(postData);
      console.log('Post oluşturma cevabı:', response);
      
      if (response.success) {
        // Formu kapat
        setShowCreateForm(false);
        
        // Başarı mesajı göster
        alert('Gönderi başarıyla oluşturuldu!');
        
        // Gönderi listesini güncelle
        console.log('Güncel gönderileri çekiyorum...');
        const updatedPosts = await api.posts.getFeeds(activeTab);
        console.log('Güncel gönderiler API yanıtı:', updatedPosts);
        
        if (updatedPosts && updatedPosts.data) {
          if (Array.isArray(updatedPosts.data)) {
            setPosts(updatedPosts.data);
          } else if (updatedPosts.data.posts && Array.isArray(updatedPosts.data.posts)) {
            setPosts(updatedPosts.data.posts);
          } else {
            console.warn('Beklenmeyen API yanıt formatı:', updatedPosts.data);
          }
        } else {
          console.warn('API yanıtında data yok:', updatedPosts);
        }
      } else {
        setError('Gönderi oluşturulamadı: ' + (response.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      console.error('Post oluşturma hatası:', err);
      setError('Gönderi oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Arama Çubuğu - GlowingEffect kaldırıldı */}
      {!hideSearch && (
        <div className="relative">
          <SearchBar onSearch={handleSearch} />
        </div>
      )}
      
      {/* Sadece arama gösterilecekse, geri kalan içerik i gösterme */}
      {!showSearchOnly && (
        <>
          {/* Hata mesajı */}
          {error && (
            <div 
              className="p-3 rounded-lg text-sm border text-center"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderColor: '#ef4444',
              }}
            >
              {error}
            </div>
          )}
          
          {/* Gönderi Oluşturma - GlowingEffect kaldırıldı */}
          <div 
            className="rounded-2xl p-4 backdrop-blur-lg"
            style={{
              backgroundColor: "rgba(20, 24, 36, 0.7)",
              boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            {showCreateForm ? (
              <CreatePostForm 
                onSubmit={handleCreatePost} 
                onCancel={() => setShowCreateForm(false)} 
              />
            ) : (
              <div 
                className="flex items-center cursor-pointer p-2 rounded-lg transition-all hover:bg-slate-800/50"
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
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white"
                    >
                      <span className="font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-blue-100">
                    Post atmak için tıklayın, {user.username}?
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Sekme Menüsü - GlowingEffect kaldırıldı */}
          <div 
            className="rounded-2xl overflow-hidden backdrop-blur-lg"
            style={{
              backgroundColor: "rgba(20, 24, 36, 0.7)",
              boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}
          >
            <div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  activeTab === 'following' 
                    ? 'border-b-2' 
                    : 'opacity-70'
                }`}
                style={{ 
                  borderColor: activeTab === 'following' ? '#3b82f6' : 'transparent',
                  color: 'white' 
                }}
                onClick={() => handleTabChange('following')}
              >
                Takip Edilenler
              </button>
              
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  activeTab === 'general' 
                    ? 'border-b-2' 
                    : 'opacity-70'
                }`}
                style={{ 
                  borderColor: activeTab === 'general' ? '#3b82f6' : 'transparent',
                  color: 'white' 
                }}
                onClick={() => handleTabChange('general')}
              >
                Keşfet
              </button>
              
              <button
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  activeTab === 'popular' 
                    ? 'border-b-2' 
                    : 'opacity-70'
                }`}
                style={{ 
                  borderColor: activeTab === 'popular' ? '#3b82f6' : 'transparent',
                  color: 'white' 
                }}
                onClick={() => handleTabChange('popular')}
              >
                Popüler
              </button>
            </div>
            
            <div className="p-4">
              {/* İçerik */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 rounded-full border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <PostList 
                  posts={posts}
                  currentUser={user}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MainContent;