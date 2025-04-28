import React, { useState, useEffect } from 'react';
import SearchBar from './common/SearchBar';
import PostList from './posts/PostList';
import CreatePostForm from './posts/CreatePostForm';
import api from '../../services/api';

const MainContent = ({ user, showSearchOnly, hideSearch, showCreateForm, setShowCreateForm }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localShowCreateForm, localSetShowCreateForm] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const actualShowCreateForm = showCreateForm !== undefined ? showCreateForm : localShowCreateForm;
  const actualSetShowCreateForm = setShowCreateForm || localSetShowCreateForm;

  useEffect(() => {
    // Gönderi verilerini çek
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Gönderiler çekiliyor. Feed tipi:', activeTab);
        const response = await api.posts.getFeeds(activeTab);
        console.log('Tam API Yanıtı (getFeeds):', response);
        console.log('API Yanıtı Data kısmı (getFeeds):', response ? response.data : 'Yanıt yok');
        
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
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    try {
      setIsSearching(true);
      
      // Çok kısa sorgularda arama yapmaktan kaçın (minimum 2 karakter)
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log('Arama yapılıyor:', searchTerm);
      
      // Backend API'den kullanıcıları ara
      const response = await api.user.searchUsers(searchTerm);
      
      if (response.success) {
        setSearchResults(response.data || []);
        console.log('Arama sonuçları:', response.data);
      } else {
        setError('Arama yapılırken bir hata oluştu: ' + response.message);
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Arama hatası:', err);
      setError('Arama yapılırken bir hata oluştu: ' + err.message);
      setSearchResults([]);
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
        // Formu kapat - güncellenmiş state kullanımı
        actualSetShowCreateForm(false);
        
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
      {/* Arama Çubuğu */}
      {!hideSearch && (
        <div className="relative">
          <SearchBar onSearch={handleSearch} />
        </div>
      )}
      
      {/* Arama sonuçları */}
      {isSearching && (
        <div className="rounded-2xl p-4 backdrop-blur-lg bg-black/50 border border-[#0affd9]/20">
          <h3 className="text-[#0affd9] text-lg font-medium mb-4">Arama Sonuçları</h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#0affd9]"></div>
              <p className="mt-2 text-gray-400">Aranıyor...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center p-2 hover:bg-[#0affd9]/10 rounded-lg transition-all cursor-pointer"
                  onClick={() => window.location.href = `/profile/${user.username}`}
                >
                  {/* Profil resmi */}
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-3 bg-black/50">
                    {user.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Kullanıcı bilgileri */}
                  <div className="flex-1">
                    <p className="font-medium text-white">{user.username}</p>
                    {user.fullName && (
                      <p className="text-gray-300 text-sm">{user.fullName}</p>
                    )}
                    {user.bio && (
                      <p className="text-gray-400 text-xs truncate">{user.bio}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-400">Sonuç bulunamadı.</p>
          )}
        </div>
      )}
      
      {/* Sadece arama gösterilecekse, geri kalan içerik i gösterme */}
      {!showSearchOnly && !isSearching && (
        <>
          {/* Hata mesajı */}
          {error && (
            <div className="p-3 rounded-lg text-sm border border-red-600 bg-red-600/10 text-red-400 text-center">
              {error}
            </div>
          )}
          
          {/* Gönderi Oluşturma Kutusu - güncellenmiş state kullanımı */}
          <div className="rounded-2xl p-4 backdrop-blur-lg bg-black/50 border border-[#0affd9]/20">
            {actualShowCreateForm ? (
              <CreatePostForm 
                onSubmit={handleCreatePost} 
                onCancel={() => actualSetShowCreateForm(false)} 
              />
            ) : (
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => actualSetShowCreateForm(true)}
              >
                {/* Kullanıcı avatarı (varsa) */}
                {user && (
                  <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-black/50">
                    {user.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0affd9]/20 flex items-center justify-center text-[#0affd9] font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <span className="flex-1 text-gray-400 hover:text-gray-200 transition-colors">Bir şeyler paylaş...</span>
                <button 
                  className="px-3 py-1.5 rounded-lg font-medium bg-[#0affd9] text-black hover:bg-[#0affd9]/80 transition-colors"
                >
                  Paylaş
                </button>
              </div>
            )}
          </div>
          
          {/* Sekmeler */}
          <div className="border-b border-[#0affd9]/20 mb-4">
            <nav className="flex space-x-4">
              <button
                onClick={() => handleTabChange('general')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-[#0affd9] border-b-2 border-[#0affd9]' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Genel
              </button>
              <button
                onClick={() => handleTabChange('following')}
                className={`py-2 px-3 text-sm font-medium transition-colors ${activeTab === 'following' ? 'text-[#0affd9] border-b-2 border-[#0affd9]' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Takip Edilenler
              </button>
            </nav>
          </div>

          {/* Gönderi Listesi */}
          <PostList posts={posts} loading={loading} error={error} currentUser={user} />
        </>
      )}
    </div>
  );
};

export default MainContent;