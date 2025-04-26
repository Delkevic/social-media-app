import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SparklesCore } from "../components/ui/sparkles";
import { GlowingEffect } from "../components/ui/GlowingEffect";
import { HoverButton } from "../components/ui/HoverButton";
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config/constants';

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
  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Lütfen 6 haneli kodu tam olarak girin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/verify-2fa`, {
        email,
        code: fullCode
      });
      
      const data = response.data;
      
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
      
      if (error.response) {
        setError(error.response.data.message || 'Geçersiz doğrulama kodu');
      } else if (error.request) {
        setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        setError('Doğrulama sırasında bir hata oluştu');
      }
      
      setLoading(false);
    }
  };
  
  // Yeni kod gönder
  const resendCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/resend-2fa-code`, {
        email
      });
      
      const data = response.data;
      
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
      
      if (error.response) {
        setError(error.response.data.message || 'Kod gönderilirken bir hata oluştu');
      } else if (error.request) {
        setError('Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        setError('Kod gönderilirken bir hata oluştu');
      }
      
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Arkaplan - Sparkles */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="2faSparkles"
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

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div
          className="relative rounded-2xl p-8 backdrop-blur-lg"
          style={{
            backgroundColor: "rgba(20, 24, 36, 0.7)",
            boxShadow: "0 15px 25px -5px rgba(0, 0, 0, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          {/* Mavi parlayan efekt */}
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={2}
          />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold inline-block relative tracking-wider text-white">
              İki Faktörlü Doğrulama
              <span
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 mt-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              ></span>
            </h1>
            <p className="mt-4 text-blue-100 opacity-80">
              E-posta adresinize gönderilen 6 haneli kodu girin
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

          <div className="text-center mb-6">
            <p className="text-sm text-blue-100">
              Kod <span className="font-medium text-blue-400">{email}</span> adresine gönderildi
            </p>
            <p className="text-sm text-blue-300 mt-1">
              Kalan süre: <span className="font-medium">{formatTime(remainingTime)}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                type="text"
                ref={el => inputRefs.current[index] = el}
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 rounded-md text-center text-xl font-bold bg-slate-800/70 border border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="space-y-4">
            <HoverButton
              onClick={verifyCode}
              disabled={loading || code.join('').length !== 6}
              className="w-full py-3 px-4 text-white font-medium rounded-lg"
            >
              {loading ? "Doğrulanıyor..." : "Doğrula"}
            </HoverButton>

            <div className="text-center">
              <button
                onClick={resendCode}
                disabled={loading || remainingTime > 240} // 4 dakikadan fazla kaldıysa yeni kod istemeye izin verme
                className="text-blue-400 hover:text-blue-300 text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Yeni Kod Gönder {remainingTime > 240 && `(${formatTime(remainingTime - 240)} sonra)`}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium focus:outline-none"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerify; 