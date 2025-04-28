import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import { HoverButton } from '../../components/ui/HoverButton';
import api from '../../services/api';
import MiniReelsPlayer from '../../components/profile/MiniReelsPlayer';

const RightPanel = ({ user, isProfilePage = false }) => {
  const navigate = useNavigate();
  const [exploreReels, setExploreReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Keşfet Reels verilerini getiren fonksiyon
  const fetchExploreReels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `http://localhost:8080/api/reels/explore`, 
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setExploreReels(data.data);
      } else {
        setError('Reels verileri yüklenirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Reels verileri yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchExploreReels();
  }, []);
  
  return (
    <div className="space-y-4">
      {/* Hata mesajı */}
      {error && (
        <div 
          className="p-3 rounded-lg text-sm border border-red-600 bg-red-600/10 text-red-400 text-center"
        >
          {error}
        </div>
      )}
      
      {/* Mini Reels Oynatıcı */}
      <div className="relative rounded-2xl overflow-hidden border border-[#0affd9]/20 bg-black/50 backdrop-blur-lg">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <MiniReelsPlayer 
          reels={exploreReels} 
          user={user} 
          isExploreMode={true}
        />
      </div>
      
      {/* Reels Bölümü - HoverButton ile güncellendi */}
      <div className="relative rounded-2xl overflow-hidden border border-[#0affd9]/20 bg-black/50 backdrop-blur-lg">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div className="p-4">
          <HoverButton
            onClick={() => navigate('/reels')}
            className="w-full flex items-center justify-center"
            color="#0affd9"
          >
            <span className="flex items-center justify-center text-white">
              <svg 
                className="w-5 h-5 mr-2 text-[#0affd9]"
                fill="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Reels
            </span>
          </HoverButton>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;