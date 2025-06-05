import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../config/constants';
import { SparklesCore } from "../../components/ui/sparkles";
import { HoverButton } from "../../components/ui/HoverButton";
import { GlowingEffect } from "../../components/ui/GlowingEffect";

// Utility function to convert boolean attributes to strings
const convertBooleanProps = (props) => {
  const result = { ...props };
  const attributesToConvert = ['jsx', 'global'];
  
  attributesToConvert.forEach(attr => {
    if (attr in result && typeof result[attr] === 'boolean') {
      result[attr] = result[attr].toString();
    }
  });
  
  return result;
};

function RegisterPage() {
  const navigate = useNavigate();
  
  // Step tracking (1: Form, 2: Verification)
  const [step, setStep] = useState(1);
  
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Verification code state
  const [verificationCode, setVerificationCode] = useState('');
  
  // Error state
  const [error, setError] = useState('');

  // Handle form submission (step 1)
  const handleInitiateRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!username || !email || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/initiate-register`, {
        username,
        email,
        password,
        confirmPassword: password
      });
      
      if (response.data.success) {
        toast.success('Doğrulama kodu e-posta adresinize gönderildi.');
        setStep(2); // Move to verification step
      } else {
        setError(response.data.message || 'Bir hata oluştu.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bir hata oluştu, lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification submission (step 2)
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!verificationCode) {
      setError('Lütfen doğrulama kodunu girin.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/complete-registration`, {
        email,
        code: verificationCode
      });
      
      if (response.data.success) {
        toast.success('Kayıt işlemi başarıyla tamamlandı!');
        
        // Save the token to localStorage
        localStorage.setItem('token', response.data.token);
        
        // Redirect to home page
        navigate('/');
      } else {
        setError(response.data.message || 'Doğrulama başarısız oldu.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Doğrulama başarısız oldu, lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Sparkles arkaplan */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="registerSparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor="#0affd9"
            speed={0.3}
            jsx="true"
            global="true"
          />
        }).component}
      </div>

      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-black opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        <div
          className="relative rounded-2xl p-8 backdrop-blur-lg bg-black/70 border border-[#0affd9]/20"
          style={{ boxShadow: "0 0 25px rgba(10, 255, 217, 0.2)" }}
        >
          {/* Parlayan efekt */}
          <GlowingEffect
            color="#0affd9"
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold inline-block relative tracking-widest text-white"
            >
              NEXORA
              <span
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 mt-1 bg-gradient-to-r from-transparent via-[#0affd9] to-transparent"
              ></span>
            </h1>
            <p className="mt-6 text-gray-300 opacity-80">
              {step === 1 ? 'Yeni Hesap Oluşturun' : 'E-posta Doğrulama'}
            </p>
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm border text-center mb-6 bg-red-900/30 text-red-400 border-red-700/50"
            >
              {error}
            </div>
          )}

          {step === 1 ? (
            // Step 1: Registration Form
            <form onSubmit={handleInitiateRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                    placeholder="kullanici_adi"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Şifre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                       <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Şifreyi Doğrula
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                       <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <HoverButton type="submit" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kayıt Olunuyor...
                    </div>
                  ) : (
                    "Kayıt Ol"
                  )}
                </HoverButton>
              </div>
            </form>
          ) : (
            // Step 2: Verification Form
            <form onSubmit={handleCompleteRegistration} className="space-y-6">
               <p className="text-center text-gray-300">
                Lütfen e-posta adresinize gönderilen 6 haneli doğrulama kodunu girin: {email}
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Doğrulama Kodu
                </label>
                 <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white text-center text-2xl tracking-[1em] focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                  placeholder="------"
                  required
                />
              </div>
              <div className="mt-6 flex justify-center">
                <HoverButton type="submit" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Doğrulanıyor...
                    </div>
                  ) : (
                    "Doğrula"
                  )}
                </HoverButton>
              </div>
              
               <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="text-sm text-gray-400 hover:text-gray-200"
                  disabled={loading}
                >
                  ← Geri dön
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Zaten hesabın var mı?
              <Link
                to="/login"
                className="font-medium text-[#0affd9] hover:text-[#0affd9]/80 ml-1"
              >
                Giriş Yap
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
