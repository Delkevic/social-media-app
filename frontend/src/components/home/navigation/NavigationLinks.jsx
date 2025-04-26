import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { Home, Globe, MessageSquare, Heart, Settings, User, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationLinks = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { togglePanel, unreadCount } = useNotification();
  
  // Navigasyon bağlantıları (Bildirimler hariç)
  const links = [
    {
      to: '/',
      icon: <Home className="w-5 h-5" />,
      label: 'Ana Sayfa'
    },
    {
      to: '/explore',
      icon: <Globe className="w-5 h-5" />,
      label: 'Keşfet'
    },
    {
      to: '/messages',
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'Mesajlar'
    },
    {
      to: '/favorites',
      icon: <Heart className="w-5 h-5" />,
      label: 'Favoriler'
    },
    {
      to: '/settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'Ayarlar'
    },
    {
      to: currentUser ? `/profile/${currentUser.username}` : '/login',
      icon: <User className="w-5 h-5" />,
      label: 'Profil'
    }
  ];

  return (
    <>
      {/* Hızlı Erişim Paneli */}
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--background-card)',
        backdropFilter: 'var(--backdrop-blur)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)'
      }}
    >
      <div className="p-4">
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Hızlı Erişim
        </h3>
        
        <div className="space-y-2">
            {/* İlk iki link (Ana Sayfa ve Keşfet) */}
            {links.slice(0, 2).map((link) => renderLink(link, location, currentUser))}
            
            {/* Bildirim butonu - context kullanıyor ve badge içeriyor */}
            <button 
              className="w-full flex items-center p-2 rounded-lg cursor-pointer transition-colors hover:bg-opacity-10 hover:bg-blue-500/10 text-left relative"
              onClick={togglePanel}
              style={{ color: 'var(--text-primary)' }}
            >
              <div className="w-9 h-9 flex items-center justify-center mr-3 relative">
                 <Bell className="w-5 h-5" />
                 <AnimatePresence>
                   {unreadCount > 0 && (
                     <motion.div
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       exit={{ scale: 0 }}
                       className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center"
                       style={{ 
                         minWidth: '18px', 
                         height: '18px',
                         padding: unreadCount > 9 ? '0 4px' : '0' 
                       }}
                     >
                       {unreadCount > 99 ? '99+' : unreadCount}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
              <span className="text-[15px] font-medium">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="ml-auto text-xs font-medium py-0.5 px-1.5 bg-red-500 text-white rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Kalan linkler */}
            {links.slice(2).map((link) => renderLink(link, location, currentUser))}
          </div>
        </div>
      </div>
    </>
  );
};

// Link render fonksiyonu
const renderLink = (link, location, currentUser) => {
  if (!currentUser && link.label === 'Profil') return null;
            
            const isActive = location.pathname === link.to || 
                           (link.label === 'Profil' && location.pathname.startsWith('/profile/') && location.pathname.endsWith(currentUser?.username || '###'));
            
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center p-2 rounded-lg transition-colors hover:bg-opacity-80"
                style={{
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)',
                  borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent'
                }}
              >
      <div className="w-9 h-9 flex items-center justify-center mr-3">
                  {link.icon}
      </div>
      <span className="text-[15px] font-medium">{link.label}</span>
    </Link>
  );
};

export default NavigationLinks;