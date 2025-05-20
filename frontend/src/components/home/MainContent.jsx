import React, { useState, useEffect } from 'react';
import SearchBar from './common/SearchBar';
import Feed from './posts/Feed';
import CreatePostForm from './posts/CreatePostForm';
import api from '../../services/api';

const MainContent = ({ user, showSearchOnly, hideSearch, showCreateForm, setShowCreateForm }) => {
  const [localShowCreateForm, localSetShowCreateForm] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latestGeminiResponse, setLatestGeminiResponse] = useState(null);

  const actualShowCreateForm = showCreateForm !== undefined ? showCreateForm : localShowCreateForm;
  const actualSetShowCreateForm = setShowCreateForm || localSetShowCreateForm;

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
        
        // Gemini yanıtını sakla
        if (postData.geminiResponse) {
          setLatestGeminiResponse(postData.geminiResponse);
          // Yanıtı localStorage'a da kaydedelim
          localStorage.setItem('latestGeminiResponse', postData.geminiResponse);
        }
        
        // Başarı mesajı göster
        alert('Gönderi başarıyla oluşturuldu!');
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-2">Sonuç bulunamadı.</p>
          )}
        </div>
      )}
      
      {actualShowCreateForm ? (
        <div className="rounded-2xl p-4 backdrop-blur-lg bg-black/50 border border-[#0affd9]/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#0affd9] text-lg font-medium">Yeni Gönderi Oluştur</h3>
            <button 
              onClick={() => actualSetShowCreateForm(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-600/30 bg-red-600/10 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <CreatePostForm 
            onSubmit={handleCreatePost}
            onCancel={() => actualSetShowCreateForm(false)} 
          />
        </div>
      ) : null}
      
      {/* Gönderi Listesi - showSearchOnly durumunda gösterme */}
      {!showSearchOnly && !isSearching && !actualShowCreateForm && (
        <>
          {/* Gemini yanıtı varsa göster */}
          {latestGeminiResponse && (
            <div className="rounded-xl p-4 backdrop-blur-lg bg-black/50 border border-[#0affd9]/20 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-[#0affd9]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 16h2v-2h-2v2zm2.07-7.75-.9.92C11.45 11.9 11 12.5 11 14h2v-.5c0-1.1.45-1.67 1.17-2.42l.9-.92c.57-.58.83-1.17.83-1.66 0-1.1-.9-2-2-2s-2 .9-2 2h2c0-.55.45-1 1-1s1 .45 1 1c0 .48-.2.67-.73 1.22z"/>
                </svg>
                <span className="font-medium text-[#0affd9]">Yapay Zeka Düşünüyor ki:</span>
                <button 
                  onClick={() => setLatestGeminiResponse(null)} 
                  className="ml-auto text-gray-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-white">{latestGeminiResponse}</p>
            </div>
          )}
          
          <Feed user={user} />
        </>
      )}
    </div>
  );
};

export default MainContent;