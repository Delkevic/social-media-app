import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SparklesCore } from "../components/ui/sparkles";
import { HoverButton } from "../components/ui/HoverButton";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL } from "../config/constants";
import { motion, AnimatePresence } from "framer-motion";

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

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    if (!identifier.trim()) {
      setError("Lütfen e-posta adresi veya kullanıcı adı girin");
      return false;
    }
    if (!password) {
      setError("Lütfen şifrenizi girin");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      setError("");

      try {
        // Axios ile API isteği gönderelim
        const response = await axios.post(`${API_URL}/login`, {
          identifier,
          password,
        });

        const data = response.data;

        if (!data.success) {
          setError(data.message || "Giriş başarısız oldu");
          setLoading(false);
          return;
        }

        // İki faktörlü doğrulama kontrol et
        if (data.data && data.data.twoFactorRequired) {
          // 2FA gerektiren yanıt aldık, doğrulama sayfasına yönlendir
          setLoading(false);
          console.log('İki faktörlü doğrulama gerekiyor, yönlendiriliyor...');
          navigate('/two-factor-verify', { 
            state: { 
              email: data.data.email,
              rememberMe: rememberMe 
            } 
          });
          return;
        }

        // Normal giriş işlemi (2FA yok)
        login(data.data.user, data.token, rememberMe);
        setLoading(false);
        toast.success("Giriş başarılı!");
        navigate("/");
        console.log("Giriş başarılı:", data);
      } catch (error) {
        console.error("Login hatası:", error);
        
        if (error.response) {
          // Sunucudan bir yanıt aldık ama başarısız
          setError(error.response.data.message || "Kullanıcı adı/şifre hatalı");
        } else if (error.request) {
          // İstek gönderildi ama yanıt alınamadı
          setError("Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.");
        } else {
          // İstek oluşturulurken bir şeyler ters gitti
          setError("Giriş işlemi sırasında bir hata oluştu");
        }
        
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Arkaplan - Sparkles */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="loginSparkles"
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
          {/* Turkuaz parlayan efekt */}
          <GlowingEffect
            color="#0affd9" // Rengi turkuaz yapıldı
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
              Hesabınıza Giriş Yapın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="p-3 rounded-lg text-sm border text-center bg-red-900/30 text-red-400 border-red-700/50"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-gray-300"
              >
                E-posta Adresi veya Kullanıcı Adı
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                  placeholder="ornek@email.com veya kullanıcı_adı"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-gray-300"
              >
                Şifre
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
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
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M13.477 14.89A6 6 0 015.11 6.523l8.367 8.367zm1.414-1.414L6.523 5.11A6 6 0 0114.89 13.477zM18.272 10C17.23 6.246 13.92 4 10 4a6.98 6.98 0 00-3.633.994L10 8.586l3.633 3.633A6.98 6.98 0 0018.272 10zM4.728 10a6.98 6.98 0 003.633 4.006L10 11.414 6.367 7.781A6.98 6.98 0 004.728 10z"
                        clipRule="evenodd"
                      ></path>
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-[#0affd9] focus:ring-[#0affd9]/50 bg-black/50"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-400"
                >
                  Beni Hatırla
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-[#0affd9] hover:text-[#0affd9]/80"
                >
                  Şifreni mi unuttun?
                </Link>
              </div>
            </div>

            {/* Giriş Yap Butonu Div'i */}
            <div className="flex justify-center">
              <HoverButton type="submit" disabled={loading}>
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </HoverButton>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Hesabınız yok mu?
              <Link 
                to="/register" 
                className="font-medium text-[#0affd9] hover:text-[#0affd9]/80 ml-1"
              >
                Kayıt Ol
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;