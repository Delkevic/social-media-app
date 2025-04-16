import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserCheck, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/constants'; // API_BASE_URL ekliyoruz

const FollowListModal = ({ isOpen, onClose, title, users = [], onFollowToggle, currentUserId, loading, error }) => {
  const [searchTerm, setSearchTerm] = useState(''); // Arama state'i eklendi

  // URL işleme fonksiyonu
  const getFullImageUrl = (url) => {
    if (!url) return `https://ui-avatars.com/api/?name=N/A&background=random&color=fff&size=40`; // Varsayılan avatar
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const cleanUrl = url.replace(/\/+/g, '/');
    return `${API_BASE_URL}${cleanUrl.startsWith("/") ? cleanUrl : '/' + cleanUrl}`;
  };

  // Arama terimine göre kullanıcıları filtrele
  const filteredUsers = users.filter(user => 
    (user.Username?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (user.FullName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose} // Dışarı tıklayınca kapat
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-700/50 overflow-hidden"
          onClick={(e) => e.stopPropagation()} // İçeri tıklayınca kapanmasın
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:bg-slate-700 hover:text-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Arama Çubuğu */}
          <div className="p-3 border-b border-slate-700 flex-shrink-0">
            <div className="relative">
              <input 
                type="text"
                placeholder="Kullanıcı ara..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Kullanıcı Listesi (Kaydırılabilir Alan) */}
          <div className="overflow-y-auto p-4 flex-grow max-h-96">
             {/* Yüklenme durumu göstergesi */} 
            {loading && (
                <div className="flex justify-center items-center py-10">
                    <div className="animate-spin h-6 w-6 border-2 rounded-full border-blue-500 border-t-transparent"></div>
                    <span className="ml-2 text-gray-400">Yükleniyor...</span>
                </div>
            )}
            {/* Hata durumu göstergesi */} 
            {error && !loading && (
                <p className="text-center text-red-400 py-8">{error}</p>
            )}
            {/* Liste veya boş/bulunamadı mesajı */} 
            {!loading && !error && (
                filteredUsers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                    {searchTerm ? 'Arama kriterlerine uygun kullanıcı bulunamadı.' : 'Liste boş.'}
                </p>
                ) : (
                <ul className="space-y-3">
                    {filteredUsers.map((user) => (
                     <li key={user.ID} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                       <Link 
                         to={`/profile/${user.Username}`} 
                         className="flex items-center gap-3 flex-grow min-w-0" 
                         onClick={onClose} 
                       >
                         <img 
                           src={getFullImageUrl(user.ProfileImage)} 
                           alt={user.Username} 
                           className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-600"
                           onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user.Username || 'X'}&background=random&color=fff&size=40`; }}
                         />
                         <div className="min-w-0">
                           <p className="text-sm font-medium text-gray-200 truncate">{user.FullName || user.Username}</p> 
                           <p className="text-xs text-gray-400 truncate">@{user.Username}</p> 
                         </div>
                       </Link>
                        {onFollowToggle && currentUserId !== user.ID && (
                            <button 
                                onClick={() => onFollowToggle(user.ID, user.IsFollowing)} 
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${ 
                                user.IsFollowing 
                                ? 'bg-slate-600 hover:bg-slate-500 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white' 
                                }`}
                            >
                                {user.IsFollowing ? 'Takibi Bırak' : 'Takip Et'} 
                            </button>
                        )}
                     </li>
                    ))}
                </ul>
                )
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FollowListModal; 