import React from 'react';
import { GlowingEffect } from '../../components/ui/GlowingEffect';
import NavigationLinks from './navigation/NavigationLinks';

const LeftPanel = ({ showMessagesAndNotifications = false }) => {
  return (
    <div className="space-y-4">
      {/* Kullanıcı Profil Kartı Bölümü Kaldırıldı */}
      {/* 
      <div className="relative rounded-2xl overflow-hidden">
        <GlowingEffect ... />
        <UserProfileCard
          user={user}
          stats={profileStats}
          loading={loading}
        />
      </div>
      */}
      
      {/* Hızlı Erişim Bölümü - NavigationLinks (Sticky kaldı) */}
      <div className="relative rounded-2xl overflow-hidden sticky top-4">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={2}
        />
        <div 
          className="rounded-2xl p-4 backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <NavigationLinks />
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;