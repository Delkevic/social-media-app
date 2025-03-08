import React, { useState } from 'react';
import api from '../../../services/api';

const CreatePostForm = ({ onSubmit, onCancel }) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Gönderi içeriği boş olamaz");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Görsel URL'lerini al (eğer varsa)
      const imageUrls = images.map(img => img.url);
      
      // Gönderiyi oluştur
      await onSubmit({
        content: content.trim(),
        images: imageUrls
      });
      
      // Formu sıfırla
      setContent('');
      setImages([]);
      setUploadProgress(0);
    } catch (err) {
      setError('Gönderi oluşturulurken bir hata oluştu: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setError('');
    
    try {
      for (const file of files) {
        // Dosya boyutunu kontrol et (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
          continue;
        }
        
        // Yalnızca görsel dosyalarını kabul et
        if (!file.type.startsWith('image/')) {
          setError('Yalnızca görsel dosyaları yükleyebilirsiniz');
          continue;
        }
        
        // Görsel yükleme işlemi için API çağrısı
        const response = await api.uploadImage(file);
        
        if (response.success) {
          // Yüklenen görseli listeye ekle
          setImages(prevImages => [
            ...prevImages,
            {
              id: Date.now() + Math.random().toString(36),
              url: response.data.url,
              preview: URL.createObjectURL(file)
            }
          ]);
        }
      }
    } catch (err) {
      setError('Görsel yüklenirken bir hata oluştu: ' + err.message);
    }
  };

  const removeImage = (imageId) => {
    setImages(prevImages => prevImages.filter(image => image.id !== imageId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div 
          className="p-3 rounded-lg text-sm border text-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            borderColor: 'var(--accent-red)',
          }}
        >
          {error}
        </div>
      )}
      
      <textarea
        placeholder="Ne düşünüyorsun?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-24 p-3 rounded-lg resize-none"
        style={{
          backgroundColor: 'var(--background-secondary)',
          color: 'var(--text-primary)',
          border: 'none',
        }}
      />
      
      {/* Görsel önizleme */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map(image => (
            <div key={image.id} className="relative">
              <img 
                src={image.preview} 
                alt="Gönderi görseli" 
                className="rounded-md w-full h-32 object-cover"
              />
              <button
                type="button"
                className="absolute top-1 right-1 p-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                }}
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
          <label 
            className="p-2 rounded-full cursor-pointer"
            style={{
              backgroundColor: 'var(--background-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
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
            className="px-3 py-1.5 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--background-tertiary)',
              color: 'var(--text-primary)',
            }}
            onClick={onCancel}
          >
            İptal
          </button>
          
          <button 
            type="submit"
            className="px-3 py-1.5 rounded-lg font-medium"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
              opacity: (!content.trim() && images.length === 0) || isSubmitting ? 0.7 : 1,
            }}
            disabled={(!content.trim() && images.length === 0) || isSubmitting}
          >
            {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CreatePostForm;