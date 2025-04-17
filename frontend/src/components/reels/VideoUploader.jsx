import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Camera, ArrowRight, Music, Smile, Tag, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config/constants';

// Video uzantısı için izin verilen dosya türleri
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
// Resim uzantısı için izin verilen dosya türleri (Thumbnail)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// Maksimum dosya boyutu (Video)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
// Maksimum dosya boyutu (Thumbnail)
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

const VideoUploader = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  secureApiRequest
}) => {
  const { user, token } = useAuth();
  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState(null);
  const [videoPreviewURL, setVideoPreviewURL] = useState(null);
  const [thumbnailPreviewURL, setThumbnailPreviewURL] = useState(null);
  const [reelCaption, setReelCaption] = useState("Yeni reel #video");
  const [reelMusic, setReelMusic] = useState('Kullanıcı seçimi');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(1); // 1: Dosya seçimi, 2: Detaylar, 3: İşleniyor
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Video dosyası seçildiğinde
  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(`Video boyutu çok büyük. Maksimum ${MAX_VIDEO_SIZE / (1024 * 1024)}MB izin veriliyor.`);
      return;
    }
    
    // Dosya türü kontrolü
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Geçersiz video formatı. Sadece MP4, WebM veya QuickTime kabul edilir.');
      return;
    }
    
    setSelectedVideoFile(file);
    
    // Video önizleme URL'si oluştur
    if (videoPreviewURL) {
      URL.revokeObjectURL(videoPreviewURL); // Önceki URL'yi temizle
    }
    const newPreviewURL = URL.createObjectURL(file);
    setVideoPreviewURL(newPreviewURL);

    // Video süresini al
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src); // URL'yi serbest bırak
      setVideoDuration(Math.round(videoElement.duration));
    };
    videoElement.src = newPreviewURL;
    
    // Dosya seçildiğinde detay adımına geç
    setUploadStep(2);
  };

  // Thumbnail dosyası seçildiğinde
  const handleThumbnailFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    // Dosya boyutu kontrolü
    if (file.size > MAX_THUMBNAIL_SIZE) {
      toast.error(`Kapak fotoğrafı boyutu çok büyük. Maksimum ${MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB izin veriliyor.`);
      return;
    }

    // Dosya türü kontrolü
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Geçersiz kapak fotoğrafı formatı. Sadece JPEG, PNG, GIF veya WebP kabul edilir.');
      return;
    }

    setSelectedThumbnailFile(file);

    // Thumbnail önizleme URL'si oluştur
    if (thumbnailPreviewURL) {
      URL.revokeObjectURL(thumbnailPreviewURL);
    }
    setThumbnailPreviewURL(URL.createObjectURL(file));
  };

  
  // Kamera seçeneği
  const handleOpenCamera = () => {
    toast.error("Kamera özellikleri şu anda geliştiriliyor!");
  };
  
  // Formu sıfırla
  const resetForm = () => {
    setSelectedVideoFile(null);
    setSelectedThumbnailFile(null);
    if (videoPreviewURL) {
      URL.revokeObjectURL(videoPreviewURL);
      setVideoPreviewURL(null);
    }
    if (thumbnailPreviewURL) {
      URL.revokeObjectURL(thumbnailPreviewURL);
      setThumbnailPreviewURL(null);
    }
    setReelCaption("Yeni reel #video");
    setReelMusic('Kullanıcı seçimi');
    setUploadStep(1);
    setUploadProgress(0);
    setVideoDuration(0);
  };
  
  // Modali kapat
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Dosya yükleme işlemi (Tek istek ile)
  const handleUpload = async () => {
    if (!selectedVideoFile || !token) {
      toast.error('Video veya oturum bilgisi eksik');
      return;
    }
    
    setIsUploading(true);
    setUploadStep(3);
    setUploadProgress(0);
    
    try {
      toast.loading('Reel yükleniyor...');
      
      // Form verisi oluştur
      const formData = new FormData();
      formData.append('video', selectedVideoFile);
      formData.append('caption', reelCaption || "Yeni reel #video");
      formData.append('music', reelMusic || 'Kullanıcı seçimi');
      formData.append('duration', videoDuration.toString());

      // Eğer thumbnail seçildiyse ekle
      if (selectedThumbnailFile) {
        formData.append('thumbnail', selectedThumbnailFile);
      }
      
      // Tek bir istek ile Reel oluştur ve dosyaları yükle
      const response = await axios.post(`${API_URL}/reels`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      toast.dismiss();

      if (response.data.success) {
        toast.success('Reel başarıyla oluşturuldu!');
        // Form verilerini temizle
        resetForm();
        // Başarı callback'ini çağır
        if (onSuccess) {
          onSuccess(response.data.data);
        }
        // Modalı kapat
        onClose();
      } else {
        toast.error(response.data.message || 'Reel oluşturulurken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Reel yükleme hatası:', error);
      toast.dismiss();
      const errorMessage = error.response?.data?.message || 'Reel oluşturulurken bir hata oluştu.';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">
                {uploadStep === 1 ? 'Yeni Reel Oluştur' : 
                 uploadStep === 2 ? 'Reel Detayları' : 
                 'Reel Yükleniyor'}
              </h3>
              
              {!isUploading && (
                <button 
                  className="p-2 rounded-full hover:bg-slate-800 transition-colors"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              )}
            </div>
            
            {/* Adım 1: Dosya seçimi */}
            {uploadStep === 1 && (
              <div className="p-6">
                <div className="flex flex-col items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-lg p-8 mb-4">
                  <Upload className="h-12 w-12 text-slate-500 mb-4" />
                  
                  <h4 className="text-lg font-medium text-white mb-2">
                    Video Yükle
                  </h4>
                  
                  <p className="text-gray-400 text-sm text-center mb-6">
                    Videoyu buraya sürükleyin veya aşağıdaki seçeneklerden birini kullanın
                  </p>
                  
                  <div className="flex gap-4">
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      onClick={() => videoInputRef.current.click()}
                    >
                      <Video className="h-4 w-4" />
                      <span>Dosya Seç</span>
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      onClick={handleOpenCamera}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Kamera Kullan</span>
                    </button>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={videoInputRef} 
                    className="hidden" 
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" 
                    onChange={handleVideoFileChange} 
                  />
                </div>
              </div>
            )}

            {/* Adım 2: Detaylar */}
            {uploadStep === 2 && (
              <div className="p-6 flex flex-col md:flex-row gap-6">
                {/* Sol Taraf: Önizleme ve Kapak Seçimi */}
                <div className="w-full md:w-1/2">
                  {/* Video Önizleme */}
                  <div className="aspect-w-9 aspect-h-16 bg-black rounded-lg overflow-hidden mb-4">
                    {videoPreviewURL ? (
                      <video src={videoPreviewURL} controls className="w-full h-full object-contain"></video>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500">
                        Video Önizleme
                      </div>
                    )}
                  </div>
                  
                  {/* Kapak Fotoğrafı Önizleme ve Seçimi */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Kapak Fotoğrafı (Opsiyonel)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {thumbnailPreviewURL ? (
                          <img src={thumbnailPreviewURL} alt="Kapak Önizleme" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-slate-500" />
                        )}
                      </div>
                      <button 
                        type="button"
                        className="text-sm px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
                        onClick={() => thumbnailInputRef.current.click()}
                      >
                        Değiştir
                      </button>
                      <input 
                        type="file" 
                        ref={thumbnailInputRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/gif,image/webp" 
                        onChange={handleThumbnailFileChange} 
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sağ Taraf: Açıklama, Müzik vb. */}
                <div className="w-full md:w-1/2">
                  {/* Açıklama */}
                  <div className="mb-4">
                    <label htmlFor="reelCaption" className="block text-sm font-medium text-gray-300 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      id="reelCaption"
                      rows="4"
                      value={reelCaption}
                      onChange={(e) => setReelCaption(e.target.value)}
                      placeholder="Reeliniz için bir açıklama yazın..."
                      className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                    ></textarea>
                    <div className="flex justify-end text-xs text-gray-400 mt-1">
                      {reelCaption.length} / 150
                    </div>
                  </div>
                  
                  {/* Müzik Seçimi (Basit hali) */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Müzik
                    </label>
                    <div className="flex items-center p-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => toast('Müzik seçimi özelliği yakında!')}>
                      <Music className="h-5 w-5 text-purple-400 mr-3" />
                      <span className="text-white flex-1 truncate">{reelMusic}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Diğer Ayarlar (Placeholder) */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between p-2 text-sm text-gray-400 border-b border-slate-800">
                      <span>Video Süresi:</span>
                      <span className='text-white'>{videoDuration} saniye</span>
                    </div>
                  </div>
                  
                  {/* Yükleme Butonu */}
                  <div className="mt-6">
                    <button 
                      className="w-full flex justify-center items-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Yükleniyor...' : "Reel'i Paylaş"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Adım 3: İşleniyor */}
            {uploadStep === 3 && (
              <div className="p-8 flex flex-col items-center">
                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-4">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  ></motion.div>
                </div>
                <p className="text-white text-center mb-2">Yükleniyor: {uploadProgress}%</p>
                <p className="text-gray-400 text-sm text-center">
                  Lütfen bekleyin, reeliniz işleniyor...
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoUploader; 