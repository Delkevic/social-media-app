import React, { useState, useEffect, useRef } from 'react';
import { VolumeX, Volume2, Pause, Play, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { DEFAULT_VIDEO_THUMBNAIL } from '../../config/constants';

// Video URL doğru formata çevirme fonksiyonu
const getProperVideoURL = (url) => {
  if (!url) {
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
  
  console.log('Orijinal URL:', url);
  
  // HTTP/HTTPS URL'leri doğrudan döndür
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // UUID formatındaki dosya adlarını kontrol et (e.g. "550e8400-e29b-41d4-a716-446655440000.mp4")
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|mov|webm)$/i;
  if (uuidRegex.test(url)) {
    return `http://localhost:8080/api/videos/${url}`;
  }
  
  // Dosya yolundan sadece dosya adını al ve API URL'sine ekle
  const filename = url.split('/').pop();
  if (filename) {
    return `http://localhost:8080/api/videos/${filename}`;
  }
  
  console.warn('Bilinmeyen video URL formatı:', url);
  return 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
};

const ReelsVideoPlayer = ({ 
  video, 
  isActive, 
  onVideoLoad, 
  onVideoError,
  onTogglePlay
}) => {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVideoVertical, setIsVideoVertical] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeout = useRef(null);

  // Video aktifse oynat, değilse durdur
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        playVideo();
      } else {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
          setIsPlaying(false);
        }
      }
    }
  }, [isActive]);

  // Video oynatma fonksiyonu
  const playVideo = () => {
    if (!videoRef.current) return;
    
    videoRef.current.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(err => {
        console.error('Video oynatma hatası:', err);
        
        if (err.name === 'NotAllowedError') {
          setMuted(true);
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => 
            console.error('Sessiz modda da oynatılamadı:', e)
          );
        }
      });
  };

  // Oynatma/durdurma geçişi
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      playVideo();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    if (onTogglePlay) onTogglePlay();
  };

  // Ses açma/kapatma
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    setMuted(!muted);
    videoRef.current.muted = !videoRef.current.muted;
  };

  // Video yüklendiğinde
  const handleVideoLoad = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    // Video boyutlarını kontrol et
    const videoRatio = video.videoWidth / video.videoHeight;
    setIsVideoVertical(videoRatio < 1);
    
    // Video object-fit ayarla
    video.style.objectFit = 'contain';
    
    setHasError(false);
    
    if (onVideoLoad) onVideoLoad();
    
    // Aktif video ise oynat
    if (isActive) {
      playVideo();
    }
  };

  // Video yükleme hatası
  const handleError = (e) => {
    console.error('Video yükleme hatası:', e);
    setHasError(true);
    
    if (onVideoError) onVideoError(e);
  };

  // Kontrol panelini göster/gizle
  const showVideoControls = () => {
    setShowControls(true);
    
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black" onClick={togglePlay}>
      {/* Video */}
      <video
        ref={videoRef}
        className="max-h-full max-w-full h-auto w-auto object-contain z-10" 
        src={getProperVideoURL(video.videoURL)}
        poster={DEFAULT_VIDEO_THUMBNAIL}
        loop
        playsInline
        muted={muted}
        onLoadedData={handleVideoLoad}
        onError={handleError}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onMouseMove={showVideoControls}
        style={{ backgroundColor: 'black' }}
      />
      
      {/* Hata göstergesi */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <p className="text-white text-lg font-medium">Video yüklenemedi</p>
          <p className="text-gray-300 text-sm mt-1">Lütfen daha sonra tekrar deneyin</p>
        </div>
      )}
      
      {/* Ses kontrol butonu */}
      <button 
        className="absolute bottom-6 right-6 p-2 bg-black/40 backdrop-blur-sm rounded-full z-30 opacity-70 hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
      >
        {muted ? (
          <VolumeX className="h-5 w-5 text-white" />
        ) : (
          <Volume2 className="h-5 w-5 text-white" />
        )}
      </button>
      
      {/* Oynatma kontrolü (hover ile görünür) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls ? 0.8 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-5 bg-black/30 backdrop-blur-sm rounded-full">
          {isPlaying ? (
            <Pause className="h-10 w-10 text-white" />
          ) : (
            <Play className="h-10 w-10 text-white" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ReelsVideoPlayer; 