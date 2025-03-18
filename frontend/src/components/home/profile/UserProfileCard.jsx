import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigate} from 'react-router-dom';

const UserProfileCard = ({ user, stats, loading }) => {
  // Arka plan resmini belirle
  const coverImage = user.coverImage || 'https://via.placeholder.com/500x200';
  const navigate = useNavigate();
  
  return (
    <div 
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--background-card)',
        backdropFilter: 'var(--backdrop-blur)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Profil kapak fotoğrafı */}
      <div 
        className="h-24 bg-cover bg-center"
        style={{ backgroundImage: `url(${coverImage})` }}
      ></div>
      
      {/* Kullanıcı bilgileri */}
      <div className="px-4 pb-4 pt-12 -mt-10 relative" onClick={()=>
                navigate("/profile/Delkevic")}> 
        {/* Profil fotoğrafı */}
        <div className="absolute -top-10 left-4">
          {user.profileImage ? (
            <img 
              src={user.profileImage}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover border-4"
              style={{ borderColor: 'var(--background-card)' }}
            />
          ) : (
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center border-4"
              style={{ 
                backgroundColor: 'var(--accent-red)',
                borderColor: 'var(--background-card)'
              }}
            >
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Kullanıcı adı ve diğer bilgiler */}
        <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
          {user.fullName || user.username}
        </h2>
        
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          @{user.username}
        </p>
        
        {user.bio && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {user.bio}
          </p>
        )}
        
        {/* Profil istatistikleri */}
        <div className="mt-4 flex justify-between">
          <div className="text-center">
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '-' : stats.postCount}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Gönderi</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '-' : stats.followerCount}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Takipçi</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {loading ? '-' : stats.followingCount}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Takip</p>
          </div>
        </div>
        
        {/* Profil düzenleme butonu */}
        <Link
          to="/profile/edit"
          className="mt-4 block py-2 text-center rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--background-tertiary)',
            color: 'var(--text-primary)',
          }}
        >
          Profili Düzenle
        </Link>
      </div>
    </div>
  );
};

export default UserProfileCard;