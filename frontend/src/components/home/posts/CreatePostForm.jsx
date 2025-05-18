import React, { useState } from 'react';
import api from '../../../services/api';

const CreatePostForm = ({ onSubmit, onCancel }) => {
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  // Cloudinary bilgileri
  const CLOUD_NAME = 'dol4b1lig';
  const UPLOAD_PRESET = 'unsigned_preset';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      setError("Gönderi içeriği veya görsel eklemelisiniz");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Görsel URL'lerini al
      const imageUrls = images.map(img => img.url);
      
      console.log('Post gönderiliyor:', { 
        content: content.trim(), 
        caption: caption.trim(),
        tags: tags.trim(),
        images: imageUrls 
      });
      
      // Gönderiyi oluştur
      await onSubmit({
        content: content.trim(),
        caption: caption.trim(),
        tags: tags.trim(),
        images: imageUrls
      });
      
      // Formu sıfırla
      setContent('');
      setCaption('');
      setTags('');
      setImages([]);
      setUploadProgress(0);
    } catch (err) {
      console.error('Post oluşturma hatası:', err);
      setError('Gönderi oluşturulurken bir hata oluştu: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cloudinary'ye resim yükleme fonksiyonu
  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      
      // Dönüşüm parametrelerini ekle - otomatik genişliği 800px ve kaliteyi %80 yap
      formData.append('transformation', 'c_scale,w_800,q_80');
      
      // Yükleme sırasında dönüşüm yapılmasını sağla
      formData.append('eager', 'c_scale,w_800,q_80');
      
      // Ayrıca mobil için bir versiyonu hazırla - küçük ekranlar için
      formData.append('eager_async', 'true');
      formData.append('eager_transformation', 'c_scale,w_500,q_70');
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Yükleme hatası: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Cloudinary yanıtı:', data);
      
      // Optimize edilmiş URL'yi veya eager URL'yi kullan
      const optimizedUrl = data.eager && data.eager[0] ? data.eager[0].secure_url : data.secure_url;
      return optimizedUrl;
    } catch (error) {
      console.error('Cloudinary yükleme hatası:', error);
      throw error;
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setError('');
    console.log('Yüklenecek dosyalar:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    try {
      for (const file of files) {
        // Dosya boyutunu kontrol et (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
          continue;
        }
        
        // Yalnızca görsel dosyalarını kabul et
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          setError('Yalnızca JPG, JPEG, PNG ve GIF formatındaki görseller yüklenebilir');
          continue;
        }
        
        // Görsel önizlemesi için
        const preview = URL.createObjectURL(file);
        
        // Yükleme başladı bildirimi
        const tempImageId = Date.now() + Math.random().toString(36);
        setImages(prev => [
          ...prev, 
          { 
            id: tempImageId, 
            preview, 
            url: null,
            isUploading: true 
          }
        ]);
        
        // Cloudinary'ye yükle
        try {
          const cloudinaryUrl = await uploadToCloudinary(file);
          
          // Başarılı yüklemeyi güncelle
          setImages(prev => prev.map(img => 
            img.id === tempImageId 
              ? { ...img, url: cloudinaryUrl, isUploading: false } 
              : img
          ));
          
        } catch (uploadError) {
          // Hata durumunda resmi kaldır
          setImages(prev => prev.filter(img => img.id !== tempImageId));
          setError('Görsel yüklenemedi: ' + uploadError.message);
        }
      }
    } catch (err) {
      console.error('Görsel yükleme hatası:', err);
      setError('Görsel yüklenirken bir hata oluştu: ' + (err.message || err));
    }
  };

  const removeImage = (imageId) => {
    setImages(prevImages => prevImages.filter(image => image.id !== imageId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg text-sm border border-red-600 bg-red-600/10 text-red-400 text-center">
          {error}
        </div>
      )}
      
      <input
        type="text"
        placeholder="Gönderi başlığı"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        className="w-full p-3 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none"
      />
      
      <input
        type="text"
        placeholder="Etiketler (virgülle ayırın, örn: manzara,tatil,deniz)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full p-3 rounded-lg bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none"
      />
      
      <textarea
        placeholder="Ne düşünüyorsun?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-24 p-3 rounded-lg resize-none bg-black/60 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-1 focus:ring-[#0affd9]/50 outline-none"
      />
      
      {/* Görsel önizleme */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map(image => (
            <div key={image.id} className="relative">
              <img 
                src={image.preview} 
                alt="Gönderi görseli" 
                className={`rounded-md w-full h-32 object-cover ${image.isUploading ? 'opacity-60' : ''}`}
                onError={(e) => {
                  console.error('Görsel yüklenemedi:', image);
                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='14' fill='%23fff' text-anchor='middle' dominant-baseline='middle'%3EGörsel Yüklenemedi%3C/text%3E%3C/svg%3E";
                }}
              />
              {image.isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0affd9]"></div>
                </div>
              )}
              <button
                type="button"
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                onClick={() => removeImage(image.id)}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    fillRule="evenodd" 
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                    clipRule="evenodd"
                  ></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Alt işlem butonları */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <label className="p-2 rounded-full cursor-pointer bg-black/70 text-[#0affd9] hover:bg-[#0affd9]/10 transition-all">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                clipRule="evenodd"
              ></path>
            </svg>
          </label>
        </div>
        
        <div className="flex space-x-2">
          <button 
            type="button"
            className="px-3 py-1.5 rounded-lg font-medium bg-black/60 border border-[#0affd9]/30 text-[#0affd9] hover:bg-[#0affd9]/10 transition-colors"
            onClick={onCancel}
          >
            İptal
          </button>
          
          <button 
            type="submit"
            className="px-3 py-1.5 rounded-lg font-medium bg-[#0affd9] text-black hover:bg-[#0affd9]/80 transition-colors disabled:opacity-50"
            disabled={(!content.trim() && images.length === 0) || isSubmitting || images.some(img => img.isUploading)}
          >
            {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreatePostForm;