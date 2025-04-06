import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Camera, ArrowRight, Music, Smile, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../../config/constants';

// Video uzantısı için izin verilen dosya türleri
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
// Maksimum dosya boyutu (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const VideoUploader = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  secureApiRequest
}) => {
  const { user, token } = useAuth();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [reelCaption, setReelCaption] = useState("Yeni reel #video");
  const [reelMusic, setReelMusic] = useState('Kullanıcı seçimi');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(1); // 1: Dosya seçimi, 2: Detaylar, 3: İşleniyor
  
  // Dosya seçildiğinde
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Video boyutu çok büyük. Maksimum ${MAX_FILE_SIZE / (1024 * 1024)}MB izin veriliyor.`);
      return;
    }
    
    // Dosya türü kontrolü
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Geçersiz video formatı. Sadece MP4, WebM veya QuickTime kabul edilir.');
      return;
    }
    
    setSelectedFile(file);
    
    // Dosya önizleme URL'si oluştur
    if (previewURL) {
      URL.revokeObjectURL(previewURL); // Önceki URL'yi temizle
    }
    setPreviewURL(URL.createObjectURL(file));
    
    // Dosya seçildiğinde detay adımına geç
    setUploadStep(2);
  };
  
  // Kamera seçeneği
  const handleOpenCamera = () => {
    toast.error("Kamera özellikleri şu anda geliştiriliyor!");
  };
  
  // Formu sıfırla
  const resetForm = () => {
    setSelectedFile(null);
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      setPreviewURL(null);
    }
    setReelCaption("Yeni reel #video");
    setReelMusic('Kullanıcı seçimi');
    setUploadStep(1);
    setUploadProgress(0);
  };
  
  // Modali kapat
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Dosya yükleme işlemi
  const handleUpload = async () => {
    if (!selectedFile || !token) {
      toast.error('Video veya oturum bilgisi eksik');
      return;
    }
    
    setIsUploading(true);
    setUploadStep(3);
    setUploadProgress(0);
    
    try {
      toast.loading('Video yükleniyor...');
      
      // Form verisi oluştur
      const formData = new FormData();
      formData.append('video', selectedFile);
      
      // Videoyu upload API'sine yükle
      const uploadResponse = await secureApiRequest(() => 
        axios.post(`${API_URL}/upload/video`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }).catch(error => {
          console.error('Video yükleme hatası detayları:', error);
          console.log('API URL:', API_URL);
          console.log('Hata mesajı:', error.message);
          
          if (error.response) {
            // Sunucu cevabı
            console.log('Sunucu durum kodu:', error.response.status);
            console.log('Sunucu cevabı:', error.response.data);
          } else if (error.request) {
            // İstek yapıldı ama cevap alınamadı
            console.log('İstek yapıldı, cevap alınamadı:', error.request);
          }
          
          throw error;
        })
      );
      
      if (!uploadResponse) {
        toast.dismiss();
        toast.error('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        setIsUploading(false);
        return;
      }
      
      if (uploadResponse.data.success) {
        toast.dismiss();
        setUploadProgress(100);
        
        // Şimdi reel oluştur
        const reelData = {
          caption: reelCaption || "Yeni reel #video",
          videoURL: uploadResponse.data.data.videoUrl,
          music: reelMusic || 'Kullanıcı seçimi',
          duration: 15 // Örnek süre
        };
        
        toast.loading('Reel oluşturuluyor...');
        
        const reelResponse = await secureApiRequest(() => 
          axios.post(`${API_URL}/reels`, reelData, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        );
        
        toast.dismiss();
        
        if (reelResponse && reelResponse.data.success) {
          toast.success('Reel başarıyla oluşturuldu!');
          
          // Form verilerini temizle
          resetForm();
          
          // Başarı callback'ini çağır
          if (onSuccess) {
            onSuccess(reelResponse.data.data);
          }
          
          // Modalı kapat
          onClose();
        } else {
          toast.error('Reel oluşturulurken bir hata oluştu.');
        }
      } else {
        toast.dismiss();
        toast.error(uploadResponse.data.message || 'Video yüklenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Video yükleme hatası:', error);
      toast.dismiss();
      toast.error('Video yüklenirken bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
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
                    Drag & drop dosyayı buraya sürükleyin veya aşağıdaki seçeneklerden birini kullanın
                  </p>
                  
                  <div className="flex gap-4">
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <Video className="h-4 w-4" />
                      <span>Dosya Seç</span>
                    </button>
                    
                    <button 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      onClick={handleOpenCamera}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Kamera</span>
                    </button>
                  </div>
                  
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    accept={ALLOWED_VIDEO_TYPES.join(',')}
                    onChange={handleFileChange}
                  />
                  
                  <div className="mt-4 text-xs text-gray-500">
                    MP4, WebM, veya MOV formatı. Max 20MB.
                  </div>
                </div>
              </div>
            )}
            
            {/* Adım 2: Reel detayları */}
            {uploadStep === 2 && (
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  {/* Video önizleme */}
                  <div className="w-1/2 bg-black rounded-lg flex items-center justify-center overflow-hidden">
                    {previewURL && (
                      <video 
                        src={previewURL} 
                        className="max-h-60 w-auto" 
                        controls
                        autoPlay
                        muted
                        loop
                      />
                    )}
                  </div>
                  
                  {/* Form alanları */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">
                        Açıklama
                      </label>
                      <textarea
                        className="w-full bg-slate-800 text-white rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                        rows="3"
                        value={reelCaption}
                        onChange={(e) => setReelCaption(e.target.value)}
                        placeholder="Reel açıklaması..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">
                        Müzik
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 text-white rounded-lg p-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4 text-purple-500" />
                            <span className="truncate">{reelMusic}</span>
                          </div>
                        </div>
                        
                        <button 
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                          onClick={() => toast('Müzik seçimi yakında eklenecek')}
                        >
                          <Tag className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* İşlem butonları */}
                <div className="flex justify-between mt-6">
                  <button 
                    className="px-4 py-2 border border-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm"
                    onClick={() => {
                      setUploadStep(1);
                      if (previewURL) {
                        URL.revokeObjectURL(previewURL);
                        setPreviewURL(null);
                      }
                      setSelectedFile(null);
                    }}
                  >
                    Geri
                  </button>
                  
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                    onClick={handleUpload}
                  >
                    <span>Yükle</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            
            {/* Adım 3: Yükleme işlemi */}
            {uploadStep === 3 && (
              <div className="p-6 space-y-4">
                <div className="text-center py-6">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-900/20 mb-4">
                      <svg className="animate-spin h-10 w-10 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    
                    <h3 className="text-xl font-medium text-white mb-2">
                      Video İşleniyor
                    </h3>
                    
                    <p className="text-gray-400 mb-4">
                      Videonuz yükleniyor ve işleniyor. Bu işlem birkaç dakika sürebilir.
                    </p>
                  </div>
                  
                  {/* İlerleme çubuğu */}
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-blue-500 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    %{uploadProgress} tamamlandı
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoUploader; 