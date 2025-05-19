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
      
      // Görsel URL'lerini al - hata durumunda null değerler olabilir
      const imageUrls = images
        .filter(img => img.url && !img.hasError) // Sadece başarılı yüklenen görselleri al
        .map(img => img.url);
      
      // Hata ile işaretlenmiş görseller var mı kontrol et
      const hasFailedImages = images.some(img => img.hasError);
      
      console.log('Post gönderiliyor:', { 
        content: content.trim(),
        images: imageUrls,
        hasFailedImages
      });
      
      // Eğer hiç görsel yüklenemezse ve içerik varsa, sadece içerikle devam et
      if (hasFailedImages && imageUrls.length === 0 && content.trim()) {
        console.log('Görseller yüklenemedi, sadece içerikle devam ediliyor');
      }
      
      // Gönderiyi oluştur - caption ve tags boş string olarak gönderilecek
      await onSubmit({
        content: content.trim(),
        caption: '', // Boş caption
        tags: '', // Boş tags
        images: imageUrls
      });
      
      // Formu sıfırla
      setContent('');
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
      
      // Tüm diğer parametreleri kaldıralım, sadece file ve upload_preset kullanacağız
      
      console.log('Cloudinary isteği gönderiliyor:', { 
        cloud_name: CLOUD_NAME, 
        upload_preset: UPLOAD_PRESET,
        file_name: file.name,
        file_size: file.size + ' bytes',
        file_type: file.type
      });
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Cloudinary yanıt detayı:', errorData);
        throw new Error(`Yükleme hatası: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Cloudinary yanıtı:', data);
      
      return data.secure_url;
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
          console.error('Görsel yükleme başarısız:', uploadError);
          
          // Cloudinary hatası durumunda resmi tamamen kaldırmak yerine, 
          // hatayı gösterip devam edebilmek için isUploading'i false yapıp, hatayı işaretleyelim
          setImages(prev => prev.map(img => 
            img.id === tempImageId 
              ? { 
                  ...img, 
                  isUploading: false,
                  hasError: true,
                  // Cloudinary kullanamadığımız için preview URL'yi kullanacağız
                  // Bu durum gerçekte çalışmayacak, çünkü URL.createObjectURL tarayıcı özellidir,
                  // ama kullanıcıya görselin olduğunu göstermek için bırakıyoruz
                  url: preview
                } 
              : img
          ));
          
          // Genel bir hata mesajı göster ama forma devam et
          setError('Görsel yüklenemedi, ama gönderiyi paylaşmaya devam edebilirsiniz.');
        }
      }
    } catch (err) {
      console.error('Görsel yükleme hatası:', err);
      setError('Görsel yüklenirken bir hata oluştu. Sadece metin içeriğiyle paylaşım yapabilirsiniz.');
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
                className={`rounded-md w-full h-32 object-cover ${
                  image.isUploading ? 'opacity-60' : 
                  image.hasError ? 'border-2 border-red-500 opacity-70' : ''
                }`}
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
              {image.hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                  <div className="bg-red-500/80 text-white text-xs px-2 py-1 rounded">
                    Yükleme Hatası
                  </div>
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
              disabled={isSubmitting}
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
        
        <div className="flex space-x-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            İptal
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && images.length === 0)}
            className={`px-6 py-2 rounded-lg bg-[#0affd9] text-black font-medium flex items-center justify-center ${
              isSubmitting || (!content.trim() && images.length === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#0affd9]/80'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Paylaşılıyor...
              </>
            ) : (
              'Paylaş'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreatePostForm;