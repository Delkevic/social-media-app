import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SparklesCore } from "../components/ui/sparkles";
import { HoverButton } from "../components/ui/HoverButton";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import { API_URL } from "../config/constants";
import { toast } from "react-hot-toast";
import axios from "axios";

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

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Lütfen e-posta adresinizi girin");
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError("Geçerli bir e-posta adresi girin");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, {
        email: email
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Store email in session storage for the next pages
        sessionStorage.setItem('resetEmail', email);
        toast.success("Şifre sıfırlama kodu e-posta adresinize gönderildi.");
        navigate('/verify-code');
      } else {
        setError(response.data.message || "Şifre sıfırlama isteği başarısız oldu.");
      }
    } catch (error) {
      console.error("Şifre sıfırlama hatası:", error);
      
      if (error.response) {
        setError(error.response.data.message || "Şifre sıfırlama isteği başarısız oldu.");
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
            id="forgotPasswordSparkles"
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
              Şifreni Sıfırla
            </p>
          </div>

          {error && <p className="text-center text-red-400 mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">E-posta Adresi</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
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
            
            <div>
              <HoverButton type="submit" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Kodu Gönder'}
              </HoverButton>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              <Link to="/login" className="font-medium text-[#0affd9] hover:text-[#0affd9]/80 ml-1">
                Giriş Yap'a Geri Dön
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
