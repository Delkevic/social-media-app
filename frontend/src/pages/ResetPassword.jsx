import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparklesCore } from "../components/ui/sparkles";
import { HoverButton } from "../components/ui/HoverButton";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import { API_URL } from "../config/constants";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Eye, EyeOff } from 'lucide-react';

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

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Retrieve email and code from session storage
  useEffect(() => {
    const resetEmail = sessionStorage.getItem('resetEmail');
    const resetCode = sessionStorage.getItem('resetCode');
    
    if (!resetEmail || !resetCode) {
      // Redirect back if data is missing
      navigate('/forgot-password');
      return;
    }
    
    setEmail(resetEmail);
    setCode(resetCode);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword.trim()) {
      setError("Lütfen yeni şifre girin");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        email: email,
        code: code,
        newPassword: newPassword
      });
      
      if (response.data.success) {
        // Clear session storage data
        sessionStorage.removeItem('resetEmail');
        sessionStorage.removeItem('resetCode');
        
        toast.success("Şifreniz başarıyla değiştirildi!");
        // Redirect to login page
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(response.data.message || "Şifre sıfırlama başarısız oldu.");
      }
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      
      if (error.response) {
        setError(error.response.data.message || "Şifre sıfırlama başarısız oldu.");
      } else {
        setError("Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Arkaplan - Sparkles */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="resetPasswordSparkles"
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
          <GlowingEffect color="#0affd9" spread={40} glow={true} />
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold inline-block relative tracking-widest text-white">
              BUZZIFY
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 mt-1 bg-gradient-to-r from-transparent via-[#0affd9] to-transparent"></span>
            </h1>
            <p className="mt-6 text-gray-300 opacity-80">
              Yeni Şifre Oluştur
            </p>
          </div>

          {error && <p className="text-center text-red-400 mb-4">{error}</p>}
          {message && <p className="text-center text-green-400 mb-4">{message}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Yeni Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Yeni Şifreyi Doğrula</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path></svg>
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <HoverButton type="submit" disabled={loading}>
                {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
              </HoverButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
