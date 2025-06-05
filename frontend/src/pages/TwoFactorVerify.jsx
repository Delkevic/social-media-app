import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SparklesCore } from "../components/ui/sparkles";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import { HoverButton } from "../components/ui/HoverButton";
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from "../config/constants";

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

const TwoFactorVerify = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Konum durumundan e-posta ve rememberMe'yi al
  const { email, rememberMe } = location.state || {};
  
  // Kodun her bir karakteri için state
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(300); // 5 dakika (saniye cinsinden)
  const [rememberDevice, setRememberDevice] = useState(false);
  
  // Her bir kod alanı için ref'ler
  const inputRefs = useRef([]);
  
  // Zamanlayıcıyı başlat
  useEffect(() => {
    if (!email) {
      // Eğer e-posta yoksa, kullanıcı doğrudan bu sayfaya gelmiş olabilir
      navigate('/login');
      return;
    }
    
    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Doğrulama kodunun süresi doldu. Lütfen tekrar giriş yapın.');
          setTimeout(() => navigate('/login'), 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [email, navigate]);
  
  // Kalan süreyi formatla
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Kod girildiğinde işle
  const handleCodeChange = (index, value) => {
    // Sadece rakam girişine izin ver
    if (value && !/^\d+$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    
    // Otomatik olarak bir sonraki alana geç
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };
  
  // Backspace tuşuna basıldığında bir önceki alana geç
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };
  
  // Kodu doğrula
  const verifyCode = async (e) => {
    if (e) e.preventDefault();
    
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Lütfen 6 haneli kodu tam olarak girin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: fullCode,
          rememberDevice
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Doğrulama başarısız oldu');
        setLoading(false);
        return;
      }
      
      // Başarılı doğrulama, kullanıcıyı giriş yap
      login(data.data.user, data.token, rememberMe);
      toast.success('Doğrulama başarılı! Giriş yapılıyor...');
      navigate('/');
      
    } catch (error) {
      console.error('2FA doğrulama hatası:', error);
      
      setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      setLoading(false);
    }
  };
  
  // Yeni kod gönder
  const resendCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/resend-2fa-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.message || 'Kod gönderilemedi');
        setLoading(false);
        return;
      }
      
      toast.success('Yeni doğrulama kodu gönderildi!');
      setRemainingTime(300); // Süreyi sıfırla
      setLoading(false);
      
    } catch (error) {
      console.error('Kod gönderme hatası:', error);
      setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      {/* Arkaplan - Sparkles */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="twoFactorSparkles"
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
              İki Faktörlü Doğrulama
            </p>
          </div>

          <p className="text-center text-gray-300 mb-6">
            Lütfen e-posta adresinize gönderilen 6 haneli doğrulama kodunu girin.
          </p>

          {error && <p className="text-center text-red-400 mb-4">{error}</p>}

          <form onSubmit={verifyCode} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Doğrulama Kodu</label>
              <input
                type="text"
                value={code.join('')}
                onChange={(e) => setCode(e.target.value.split(''))}
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg bg-black/50 border border-[#0affd9]/30 text-white text-center text-2xl tracking-[1em] focus:border-[#0affd9] focus:ring-2 focus:ring-[#0affd9]/50 outline-none"
                placeholder="------"
                required
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="remember-device"
                name="remember-device"
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 text-[#0affd9] focus:ring-[#0affd9]/50 bg-black/50"
              />
              <label
                htmlFor="remember-device"
                className="ml-2 block text-sm text-gray-400"
              >
                Bu cihazı 30 gün boyunca hatırla
              </label>
            </div>
            
            <div>
              <HoverButton type="submit" disabled={loading}>
                {loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
              </HoverButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify; 