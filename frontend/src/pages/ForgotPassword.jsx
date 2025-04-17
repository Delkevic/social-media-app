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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Sparkles arkaplan */}
      <div className="absolute inset-0 w-full h-full">
        {convertBooleanProps({
          component: <SparklesCore
            id="forgotPasswordSparkles"
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
              Şifrenizi Sıfırlayın
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
                E-posta Adresi
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  required
                />
              </div>
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
                  İşleniyor...
                </>
              ) : (
                'Sıfırlama Kodu Gönder'
              )}
            </HoverButton>

            <div className="text-center mt-4">
              <p className="text-blue-100">
                Şifrenizi hatırladınız mı?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-400 hover:text-blue-300 hover:underline relative inline-block"
                >
                  Giriş Yapın
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></span>
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Alt kısımda güzelleştirme amaçlı gradyant çizgiler */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="w-full max-w-md relative h-10">
          {/* Gradients */}
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent h-px w-1/4" />
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
