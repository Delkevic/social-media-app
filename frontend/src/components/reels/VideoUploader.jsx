import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Camera, ArrowRight, Music, Smile, Tag, Image as ImageIcon, Loader2 } from 'lucide-react';
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

// Yardımcı Bileşenler (Diğer ayarlardan)
const StyledButton = ({ children, onClick, disabled, variant = 'primary', loading = false, className = '', icon: Icon }) => {
  const baseStyle = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2";
  const primaryStyle = "bg-[#0affd9] text-black hover:bg-[#0affd9]/80";
  const secondaryStyle = "bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10";
  const dangerStyle = "bg-red-800/30 border border-red-600/50 text-red-400 hover:bg-red-700/40";
  
  let variantStyle = primaryStyle;
  if (variant === 'secondary') variantStyle = secondaryStyle;
  if (variant === 'danger') variantStyle = dangerStyle;

  const classList = [baseStyle, variantStyle, className].filter(Boolean).join(' ');

  return (
    <button onClick={onClick} disabled={disabled || loading} className={classList}>
      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (Icon && <Icon className="h-4 w-4" />)}
      {children}
    </button>
  );
};

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-black rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border border-[#0affd9]/20"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#0affd9]/10">
              <h3 className="text-lg font-semibold text-[#0affd9]">
                {uploadStep === 1 ? 'Yeni Reel Oluştur' : 
                 uploadStep === 2 ? 'Reel Detayları' : 
                 'Reel Yükleniyor'}
              </h3>
              
              {!isUploading && (
                <button 
                  className="p-2 rounded-full hover:bg-black/60 transition-colors"
                  onClick={handleClose}
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-white" />
                </button>
              )}
            </div>
            
            {/* Adım 1: Dosya seçimi */}
            {uploadStep === 1 && (
              <div className="p-6">
                <div className="flex flex-col items-center justify-center bg-black/50 border-2 border-dashed border-[#0affd9]/30 rounded-lg p-12 mb-6">
                  <Upload className="h-12 w-12 text-[#0affd9]/60 mb-4" />
                  
                  <h4 className="text-xl font-medium text-white mb-2">
                    Video Yükle
                  </h4>
                  
                  <p className="text-gray-400 text-sm text-center mb-6">
                    Videoyu buraya sürükleyin veya aşağıdaki seçeneklerden birini kullanın
                  </p>
                  
                  <div className="flex gap-4">
                    <StyledButton 
                      onClick={() => videoInputRef.current.click()}
                      icon={Video}
                    >
                      Dosya Seç
                    </StyledButton>
                    
                    <StyledButton 
                      variant="secondary" 
                      onClick={handleOpenCamera}
                      icon={Camera}
                    >
                      Kamera Kullan
                    </StyledButton>
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
                {/* Sol Taraf: Sadece Önizleme */}
                <div className="w-full md:w-1/2">
                  {/* Video Önizleme */}
                  <div className="aspect-[9/16] bg-black/70 rounded-lg overflow-hidden mb-4 border border-[#0affd9]/10">
                    {videoPreviewURL ? (
                      <video src={videoPreviewURL} controls className="w-full h-full object-contain"></video>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Video Önizleme
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Sağ Taraf: Açıklama, Müzik, Kapak Fotoğrafı vb. */}
                <div className="w-full md:w-1/2 flex flex-col">
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
                      className="w-full p-2 bg-black/60 border border-[#0affd9]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#0affd9]/50 focus:border-[#0affd9]"
                    ></textarea>
                    <div className="flex justify-end text-xs text-gray-400 mt-1">
                      {reelCaption.length} / 150
                    </div>
                  </div>
                  
                  {/* Müzik Seçimi */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Müzik
                    </label>
                    <div 
                      className="flex items-center p-2 bg-black/60 border border-[#0affd9]/30 rounded-lg cursor-pointer hover:bg-black/70 transition-colors"
                      onClick={() => toast('Müzik seçimi özelliği yakında!')}
                    >
                      <Music className="h-5 w-5 text-[#0affd9] mr-3" />
                      <span className="text-white flex-1 truncate">{reelMusic}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Diğer Ayarlar */}
                  <div className="mb-4 flex flex-col space-y-2">
                    <button 
                      className="flex items-center p-2 text-sm text-gray-300 hover:bg-black/60 rounded-lg transition-colors"
                      onClick={() => toast('Etiketleme özelliği yakında!')}
                    >
                      <Tag className="h-4 w-4 mr-2 text-[#0affd9]/80"/> Kişileri Etiketle
                    </button>
                    <button 
                      className="flex items-center p-2 text-sm text-gray-300 hover:bg-black/60 rounded-lg transition-colors"
                      onClick={() => toast('Emoji özelliği yakında!')}
                    >
                      <Smile className="h-4 w-4 mr-2 text-[#0affd9]/80"/> Emoji Ekle
                    </button>
                  </div>

                  {/* Kapak Fotoğrafı Önizleme ve Seçimi */}
                  <div className="mb-4 mt-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Kapak Fotoğrafı (Opsiyonel)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-black/50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#0affd9]/20">
                        {thumbnailPreviewURL ? (
                          <img src={thumbnailPreviewURL} alt="Kapak Önizleme" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-[#0affd9]/50" />
                        )}
                      </div>
                      <StyledButton 
                        type="button"
                        variant="secondary"
                        onClick={() => thumbnailInputRef.current.click()}
                      >
                        Değiştir
                      </StyledButton>
                      <input 
                        type="file" 
                        ref={thumbnailInputRef} 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/gif,image/webp" 
                        onChange={handleThumbnailFileChange} 
                      />
                    </div>
                  </div>
                  
                  {/* İleri ve Geri Butonları */}
                  <div className="mt-auto flex justify-between pt-4 border-t border-[#0affd9]/10">
                    <StyledButton 
                      variant="secondary"
                      onClick={() => setUploadStep(1)}
                      disabled={isUploading}
                    >
                      Geri
                    </StyledButton>
                    <StyledButton 
                      onClick={handleUpload}
                      disabled={isUploading}
                      loading={isUploading}
                    >
                      Paylaş
                    </StyledButton>
                  </div>
                </div>
              </div>
            )}
            
            {/* Adım 3: İşleniyor */}
            {uploadStep === 3 && (
              <div className="p-10 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 text-[#0affd9] animate-spin mb-6" />
                <p className="text-lg text-white mb-2">Reel Yükleniyor...</p>
                <p className="text-sm text-gray-400 mb-4">Bu işlem birkaç saniye sürebilir.</p>
                
                {/* Yükleme İlerleme Çubuğu */}
                <div className="w-full bg-black/50 rounded-full h-2.5 border border-[#0affd9]/20">
                  <div 
                    className="bg-[#0affd9] h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-[#0affd9] mt-2">{uploadProgress}% Tamamlandı</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoUploader; 