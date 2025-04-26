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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
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
          {/* Kırmızı parlayan efekt */}
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
              Hesabınıza Giriş Yapın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="p-3 rounded-lg text-sm border text-center"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.5)",
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-blue-100"
              >
                E-posta Adresi veya Kullanıcı Adı
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300"
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
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                  placeholder="ornek@email.com veya kullanıcı_adı"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium text-blue-100"
              >
                Şifre
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300"
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
                  className="w-full pl-10 pr-10 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-blue-100"
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
                      <path d="M10 2C5.03 2 1 6.03 1 11v4.33l3-2.88V11c0-3.31 2.69-6 6-6s6 2.69 6 6v1.45l3 2.88V11c0-4.97-4.03-9-9-9z"></path>
                      <path d="M18 15.46l-2-1.91V11c0-3.31-2.69-6-6-6S4 7.69 4 11v2.55l-2 1.91V18h16z"></path>
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
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-blue-100"
                >
                  Beni Hatırla
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  Şifremi Unuttum
                </Link>
              </div>
            </div>

            <div>
              <HoverButton
                type="submit"
                className="w-full py-3 px-4 text-white font-medium rounded-lg"
                disabled={loading}
              >
                {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </HoverButton>
            </div>

            <div className="text-center mt-4">
              <span className="text-blue-100 text-sm">
                Hesabınız yok mu?{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  Kayıt olun
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;