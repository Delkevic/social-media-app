import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/constants';
import { X, Search } from 'lucide-react';
import { motion } from 'framer-motion';

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}/${url}`;
};

const NewConversation = ({ onClose, onSelectUser }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    const fetchFollowing = async () => {
      setFollowingLoading(true);
      try {
        // API'den takip edilen kullanıcıları getir
        const response = await fetch(`${API_BASE_URL}/api/profile/${getCurrentUsername()}/following`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Takip edilen kullanıcılar getirilemedi');
        }
        
        const data = await response.json();
        if (data.success) {
          setFollowingUsers(data.data || []);
        }
      } catch (error) {
        console.error("Takip edilen kullanıcılar yüklenemedi:", error);
      } finally {
        setFollowingLoading(false);
      }
    };
    
    fetchFollowing();
  }, []);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      // API'den kullanıcı arama
      const response = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Kullanıcı araması başarısız');
      }
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error("Kullanıcı arama hatası:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      handleSearch(value);
    }, 300);
    setSearchTimeout(timeout);
  };
  
  // Mevcut kullanıcının kullanıcı adını al
  const getCurrentUsername = () => {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    return user.username || '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-black/70 backdrop-blur-md rounded-xl shadow-2xl border border-[#0affd9]/30 w-full max-w-md overflow-hidden"
    >
      <div className="p-4 border-b border-[#0affd9]/20 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-[#0affd9]">Yeni Mesaj</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-[#0affd9] transition-colors p-1 rounded-full hover:bg-[#0affd9]/10"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Kullanıcı ara..."
            className="w-full py-2.5 px-4 pr-10 bg-black/50 border border-[#0affd9]/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9] focus:border-[#0affd9] transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {loading ? (
              <div className="w-5 h-5 border-t-2 border-[#0affd9] border-solid rounded-full animate-spin"></div>
            ) : (
              <Search size={18} />
            )}
          </div>
        </div>
        
        <div className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-[#0affd9]/50 scrollbar-track-transparent pr-1">
          {searchResults.length > 0 ? (
            <div className="mb-1">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Arama Sonuçları</h3>
              {searchResults.map(user => (
                <div 
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user.id);
                    onClose();
                  }}
                  className="flex items-center p-2.5 hover:bg-[#0affd9]/10 cursor-pointer rounded-lg transition-colors duration-150"
                >
                  <img 
                    src={getFullImageUrl(user.profileImage)} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#0affd9]/20"
                  />
                  <div className="ml-3 overflow-hidden">
                    <p className="text-gray-100 font-medium truncate text-sm">{user.fullName || user.username}</p>
                    <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : search.trim() !== '' && !loading ? (
            <div className="py-4 text-center text-gray-400 text-sm">
              <p>"<span className='font-medium text-gray-300'>{search}</span>" ile eşleşen kullanıcı bulunamadı.</p>
            </div>
          ) : (
             !search.trim() && !loading && followingUsers.length > 0 && (
              <div className="mb-1">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">Takip Edilenler</h3>
                {followingUsers.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user.id);
                      onClose();
                    }}
                    className="flex items-center p-2.5 hover:bg-[#0affd9]/10 cursor-pointer rounded-lg transition-colors duration-150"
                  >
                    <img 
                      src={getFullImageUrl(user.profileImage)} 
                      alt={user.username} 
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#0affd9]/20"
                    />
                    <div className="ml-3 overflow-hidden">
                      <p className="text-gray-100 font-medium truncate text-sm">{user.fullName || user.username}</p>
                      <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          
          {followingLoading && (
            <div className="py-8 text-center">
              <div className="w-8 h-8 border-t-2 border-[#0affd9] border-solid rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-400 mt-2">Takip edilen kullanıcılar yükleniyor...</p>
            </div>
          )}
          
          {!followingLoading && followingUsers.length === 0 && !search.trim() && (
            <div className="py-8 text-center text-gray-400">
              <p className="text-sm">Henüz hiç kullanıcı takip etmiyorsunuz.</p>
              <p className="text-xs mt-1">Mesajlaşmak için kullanıcı arayabilirsiniz.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default NewConversation; 