import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  // Form geçiş animasyonları
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    in: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
    out: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99],
      },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.3,
        yoyo: Infinity,
      },
    },
    tap: {
      scale: 0.95,
    },
  };

  const inputVariants = {
    focus: {
      scale: 1.02,
      borderColor: '#3B82F6',
      transition: {
        duration: 0.2,
      },
    },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Giriş bilgileri:', { email, password, isLogin });
    // Burada MySQL veritabanına bağlantı ve kullanıcı doğrulama mantığınızı ekleyebilirsiniz
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-900 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden w-full max-w-md"
      >
        {/* Renkli üst şerit */}
        <div className="h-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"></div>
        
        {/* Logo ve başlık */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="text-center pt-10 pb-6"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 2, 
              ease: "easeInOut",
              times: [0, 0.2, 0.5, 0.8, 1],
              repeat: Infinity,
              repeatDelay: 5
            }}
            className="inline-block text-5xl mb-2"
          >
            🌐
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">SosyalApp</h1>
          <p className="text-blue-100">Sosyal dünyaya hoş geldiniz</p>
        </motion.div>
        
        {/* Form alanı */}
        <div className="px-8 py-6">
          <div className="flex mb-8 bg-white bg-opacity-20 rounded-lg p-1">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${
                isLogin 
                  ? 'bg-white text-blue-800 shadow-md' 
                  : 'text-white'
              }`}
            >
              Giriş Yap
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${
                !isLogin 
                  ? 'bg-white text-blue-800 shadow-md' 
                  : 'text-white'
              }`}
            >
              Kayıt Ol
            </motion.button>
          </div>
          
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-sm font-medium text-blue-100 mb-1">
                  Kullanıcı Adı
                </label>
                <motion.input
                  whileFocus="focus"
                  variants={inputVariants}
                  type="text"
                  className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 border border-transparent focus:border-blue-300 focus:bg-opacity-30 text-white placeholder-blue-200 outline-none transition-all"
                  placeholder="kullanici_adi"
                />
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-blue-100 mb-1">
                E-posta Adresi
              </label>
              <motion.input
                whileFocus="focus"
                variants={inputVariants}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 border border-transparent focus:border-blue-300 focus:bg-opacity-30 text-white placeholder-blue-200 outline-none transition-all"
                placeholder="ornek@email.com"
                required
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-blue-100">
                  Şifre
                </label>
                {isLogin && (
                  <a href="#" className="text-xs text-blue-200 hover:text-white transition-colors">
                    Şifremi unuttum
                  </a>
                )}
              </div>
              <motion.input
                whileFocus="focus"
                variants={inputVariants}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 border border-transparent focus:border-blue-300 focus:bg-opacity-30 text-white placeholder-blue-200 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </motion.div>
            
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-blue-100 mb-1">
                  Şifre Tekrar
                </label>
                <motion.input
                  whileFocus="focus"
                  variants={inputVariants}
                  type="password"
                  className="w-full px-4 py-3 rounded-lg bg-white bg-opacity-20 border border-transparent focus:border-blue-300 focus:bg-opacity-30 text-white placeholder-blue-200 outline-none transition-all"
                  placeholder="••••••••"
                />
              </motion.div>
            )}
            
            <motion.button
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all"
            >
              {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
            </motion.button>
          </motion.form>
          
          {/* Sosyal medya butonları */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 border-opacity-30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-opacity-30 bg-blue-800 text-blue-100">
                  Veya şununla devam et
                </span>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-3">
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ y: 0 }}
                className="w-full flex justify-center py-2 px-4 border border-white border-opacity-20 rounded-md shadow-sm bg-opacity-20 bg-white hover:bg-opacity-30 transition-all"
              >
                <span className="sr-only">Google ile giriş yap</span>
                <svg className="h-5 w-5" fill="#EA4335" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
              </motion.button>
              
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ y: 0 }}
                className="w-full flex justify-center py-2 px-4 border border-white border-opacity-20 rounded-md shadow-sm bg-opacity-20 bg-white hover:bg-opacity-30 transition-all"
              >
                <span className="sr-only">Facebook ile giriş yap</span>
                <svg className="h-5 w-5" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24,12.073c0,5.989-4.394,10.954-10.13,11.855v-8.363h2.789l0.531-3.46H13.87V9.86c0-0.947,0.464-1.869,1.95-1.869h1.509V5.045c0,0-1.37-0.234-2.679-0.234c-2.734,0-4.52,1.657-4.52,4.656v2.637H7.091v3.46h3.039v8.363C4.395,23.025,0,18.061,0,12.073c0-6.627,5.373-12,12-12S24,5.445,24,12.073z"/>
                </svg>
              </motion.button>
              
              <motion.button
                whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                whileTap={{ y: 0 }}
                className="w-full flex justify-center py-2 px-4 border border-white border-opacity-20 rounded-md shadow-sm bg-opacity-20 bg-white hover:bg-opacity-30 transition-all"
              >
                <span className="sr-only">Twitter ile giriş yap</span>
                <svg className="h-5 w-5" fill="#1DA1F2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.953,4.57a10,10,0,0,1-2.825.775,4.958,4.958,0,0,0,2.163-2.723,9.99,9.99,0,0,1-3.127,1.195A4.92,4.92,0,0,0,11.78,8.281,13.937,13.937,0,0,1,1.64,3.162,4.822,4.822,0,0,0,.974,5.708,4.9,4.9,0,0,0,3.195,9.644,4.936,4.936,0,0,1,.962,9.049v.06A4.923,4.923,0,0,0,4.9,13.934a4.963,4.963,0,0,1-2.224.084,4.935,4.935,0,0,0,4.6,3.419A9.861,9.861,0,0,1,0,19.544,13.87,13.87,0,0,0,7.548,22a13.818,13.818,0,0,0,13.9-14.546A10.02,10.02,0,0,0,23.953,4.57Z"/>
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Alt bilgi */}
        <div className="px-8 py-4 bg-black bg-opacity-20 text-center text-xs text-blue-100">
          <p>
            © 2025 SosyalApp. Tüm hakları saklıdır.
            {!isLogin ? (
              <span> Kayıt olarak <a href="#" className="text-white hover:underline">Kullanım Şartları</a>'nı kabul etmiş olursunuz.</span>
            ) : (
              <span> <a href="#" className="text-white hover:underline">Gizlilik Politikası</a></span>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;