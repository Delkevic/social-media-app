import React from 'react';
import { motion } from 'framer-motion';
import { X, FileIcon, Search, Loader } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { tr } from 'date-fns/locale';

// Profil resmi URL'ini tam hale getiren yardımcı fonksiyon
export const getFullImageUrl = (url) => {
  if (!url) return `https://ui-avatars.com/api/?name=U&background=0D1117&color=0AFFD9`;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}/${url}`;
};

// Medya dosyası önizleme bileşeni
export const MediaPreview = ({ media, onCancel }) => {
  if (!media) return null;
  
  const mediaUrl = media.preview;
  
  return (
    <div className="relative mb-2 w-full">
      <div className="rounded-md overflow-hidden border border-[#0affd9]/30 bg-black/30">
        {media.fileType === 'image' ? (
          <img 
            src={mediaUrl} 
            alt="Upload preview" 
            className="max-h-64 max-w-full object-contain mx-auto"
          />
        ) : media.fileType === 'video' ? (
          <video 
            src={mediaUrl} 
            controls 
            className="max-h-64 max-w-full mx-auto"
          />
        ) : (
          <div className="flex items-center justify-center p-4 text-gray-300">
            <FileIcon className="mr-2 text-[#0affd9]" />
            <span>{media.name}</span>
          </div>
        )}
      </div>
      <button 
        className="absolute -top-2 -right-2 rounded-full bg-red-600 hover:bg-red-700 text-white p-1 transition-colors"
        onClick={onCancel}
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Yükleme ilerleme göstergesi
export const UploadProgress = ({ progress }) => {
  return (
    <div className="mb-2 w-full px-1">
      <div className="bg-gray-700/50 rounded-full h-2">
        <div 
          className="bg-[#0affd9] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">
        Yükleniyor... {progress}%
      </p>
    </div>
  );
};

// Yazıyor göstergesi bileşeni
export const TypingIndicator = React.memo(({ senderInfo }) => {
  const profileImageUrl = getFullImageUrl(senderInfo?.profileImage);

  return (
    <motion.div 
      className="flex mb-1 items-end justify-start pl-2 md:pl-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <img 
        src={profileImageUrl}
        alt={senderInfo?.username || 'avatar'}
        className="w-7 h-7 rounded-full object-cover mr-2 self-start border-2 border-transparent"
      />
      <div className="max-w-[70%] rounded-2xl rounded-bl-none px-3.5 py-3 bg-black/40 border border-[#0affd9]/20 shadow-md">
        <div className="flex space-x-1.5 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#0affd9]/70"
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}); 