import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const ReelsHeader = ({ 
  onOpenCamera, 
  onSearchToggle,
  showSearchInput = false 
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-between px-4 py-3 backdrop-blur-sm bg-black/30 z-30 border-b border-slate-800/50">
      <div className="flex items-center gap-4">
        <button 
          className="p-2 rounded-full hover:bg-slate-800/50 transition-colors"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        
        <motion.h2 
          className="text-xl font-bold text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Reels
        </motion.h2>
      </div>
      
      <div className="flex items-center gap-2">
        {showSearchInput ? (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '200px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="relative"
          >
            <input
              type="text"
              placeholder="Reels ara..."
              className="bg-slate-800/70 text-white text-sm rounded-full py-2 pl-9 pr-4 w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
              autoFocus
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          </motion.div>
        ) : (
          <button 
            className="p-2 rounded-full hover:bg-slate-800/50 transition-colors"
            onClick={onSearchToggle}
          >
            <Search className="h-5 w-5 text-white" />
          </button>
        )}
        
        <button 
          className="p-2 rounded-full hover:bg-slate-800/50 transition-colors"
          onClick={onOpenCamera || (() => toast.success('Kamera açılıyor...'))}
        >
          <Camera className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
};

export default ReelsHeader; 