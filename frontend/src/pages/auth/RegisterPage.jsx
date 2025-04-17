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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
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
            particleColor="#FFFFFF"
            speed={0.3}
            jsx="true"
            global="true"
          />
        }).component}
      </div>

      {/* Radyal gradient maskesi */}
      <div 
        className="absolute inset-0 w-full h-full bg-slate-950 opacity-90 [mask-image:radial-gradient(circle_at_center,transparent_25%,black)]"
        style={{ backdropFilter: "blur(3px)" }}
      ></div>

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        <div
          className="relative rounded-2xl p-8 backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          {/* Parlayan efekt */}
          <GlowingEffect
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
              BUZZIFY
              <span
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 mt-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              ></span>
            </h1>
            <p className="mt-6 text-blue-100 opacity-80">
              {step === 1 ? 'Yeni Hesap Oluşturun' : 'E-posta Doğrulama'}
            </p>
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm border text-center mb-6"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                borderColor: "rgba(239, 68, 68, 0.5)",
              }}
            >
              {error}
            </div>
          )}

          {step === 1 ? (
            // Step 1: Registration Form
            <form onSubmit={handleInitiateRegister} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
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
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                    placeholder="kullanici_adi"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                    placeholder="ornek@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">
                  Şifre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
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
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-blue-100"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        ></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                          clipRule="evenodd"
                        ></path>
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"></path>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
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
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5 mt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500"
                    required
                  />
                </div>
                <label
                  htmlFor="terms"
                  className="ml-2 text-sm text-blue-100"
                >
                  <a
                    href="#"
                    className="font-medium text-blue-400 hover:text-blue-300 hover:underline relative inline-block"
                  >
                    Kullanım Şartları
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></span>
                  </a>
                  'nı ve{' '}
                  <a
                    href="#"
                    className="font-medium text-blue-400 hover:text-blue-300 hover:underline relative inline-block"
                  >
                    Gizlilik Politikası
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></span>
                  </a>
                  'nı kabul ediyorum
                </label>
              </div>

              <HoverButton
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center"
                style={{
                  "--circle-start": "#3b82f6", 
                  "--circle-end": "#1e40af"
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Kayıt Yapılıyor...
                  </>
                ) : (
                  'Kayıt Ol'
                )}
              </HoverButton>

              <div className="text-center mt-4">
                <p className="text-blue-100">
                  Zaten hesabınız var mı?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-blue-400 hover:text-blue-300 hover:underline relative inline-block"
                  >
                    Giriş Yap
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></span>
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            // Step 2: Verification Form
            <form onSubmit={handleCompleteRegistration} className="space-y-6">
              <div className="text-center mb-6 text-gray-300">
                <p>Lütfen <span className="text-blue-400">{email}</span> adresine gönderilen doğrulama kodunu girin.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-100">
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white text-center tracking-widest font-mono text-lg"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <HoverButton
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center"
                style={{
                  "--circle-start": "#3b82f6", 
                  "--circle-end": "#1e40af"
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Doğrulanıyor...
                  </>
                ) : (
                  'Doğrula ve Kayıt Ol'
                )}
              </HoverButton>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Kayıt bilgilerini düzenle
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Alt kısımda güzelleştirme amaçlı gradyant çizgiler */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="w-full max-w-md relative h-10">
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent h-px w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
