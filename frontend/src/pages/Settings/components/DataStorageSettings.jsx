import React, { useState } from 'react';
import { Progress } from '../../../components/ui/progress';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

const DataStorageSettings = () => {
  const [currentStorage, setCurrentStorage] = useState(65); // MB cinsinden
  const maxStorage = 1024; // 1 GB = 1024 MB
  const storagePercentage = (currentStorage / maxStorage) * 100;

  // Mock veri kategorileri
  const storageCategories = [
    { name: 'Fotoğraflar', size: 42, percentage: (42 / currentStorage) * 100, color: 'bg-blue-500' },
    { name: 'Videolar', size: 15, percentage: (15 / currentStorage) * 100, color: 'bg-purple-500' },
    { name: 'Mesajlar', size: 5, percentage: (5 / currentStorage) * 100, color: 'bg-green-500' },
    { name: 'Diğer', size: 3, percentage: (3 / currentStorage) * 100, color: 'bg-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gray-700/40 border border-gray-600/40 rounded-lg p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-medium text-gray-200">Depolama Kullanımı</h3>
          <span className="text-sm text-gray-400 font-medium">
            {currentStorage} MB / {maxStorage} MB
          </span>
        </div>
        
        <Progress value={storagePercentage} className="h-2 mb-4" />
        
        <div className="grid gap-4">
          {storageCategories.map((category, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                <span className="text-gray-300">{category.name}</span>
              </div>
              <span className="text-gray-400">{category.size} MB</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gray-700/40 border border-gray-600/40 rounded-lg p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <Info size={18} className="text-blue-400 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-200">Otomatik Temizleme</h3>
              <p className="text-sm text-gray-400">
                Belirlediğiniz süre sonunda eski içerikler otomatik olarak silinir
              </p>
            </div>
          </div>
          
          <div className="form-control">
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" />
              <span className="text-gray-300">30 gün sonra önbelleği temizle</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" />
              <span className="text-gray-300">90 gün sonra medya dosyalarını temizle</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" />
              <span className="text-gray-300">Okunmuş mesajları 1 yıl sonra arşivle</span>
            </label>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gray-700/40 border border-gray-600/40 rounded-lg p-5"
        >
          <div className="flex items-start gap-3 mb-3">
            <Trash2 size={18} className="text-red-400 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-200">Manuel Temizleme</h3>
              <p className="text-sm text-gray-400">
                Seçtiğiniz veri kategorilerini hemen temizleyin
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-sm checkbox-accent" />
                <span className="text-gray-300">Önbellek</span>
              </label>
              <span className="text-xs bg-gray-600/60 text-gray-300 px-2 py-1 rounded">~2.3 MB</span>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="checkbox checkbox-sm checkbox-accent" />
                <span className="text-gray-300">Medya Önbelleği</span>
              </label>
              <span className="text-xs bg-gray-600/60 text-gray-300 px-2 py-1 rounded">~18 MB</span>
            </div>
            
            <button className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 py-2 px-4 rounded-lg transition mt-2">
              Seçilenleri Temizle
            </button>
          </div>
        </motion.div>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-600/20 rounded-lg p-4 flex gap-3">
        <AlertTriangle size={20} className="text-amber-400 mt-1" />
        <div>
          <h4 className="text-amber-300 font-medium mb-1">Uyarı</h4>
          <p className="text-amber-200/80 text-sm">
            Temizlenen veriler geri alınamaz. Önemli medya dosyalarınızı cihazınıza indirdiğinizden emin olun.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataStorageSettings; 