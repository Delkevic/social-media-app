import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!identifier) {
      setError("E-posta adresi veya kullanıcı adı gereklidir");
      return false;
    }
    if (!password) {
      setError("Şifre gereklidir");
      return false;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
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
        const response = await fetch("http://localhost:8080/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.message);
          setLoading(false);
          return;
        }

        // Token'ı localStorage veya sessionStorage'a kaydet
        if (rememberMe) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.data.user));
        } else {
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("user", JSON.stringify(data.data.user));
        }

        // Kullanıcıyı ana sayfaya yönlendir
        setLoading(false);
        navigate("/");
      } catch (error) {
        setError("Sunucu bağlantısı sırasında bir hata oluştu");
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--background-gradient)" }}
    >
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute w-[200%] h-[200%] bg-gradient-45 from-white/20 to-transparent bg-[length:100px_100px] -rotate-45 animate-slowMove"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg px-4 py-8">
        <div
          className="rounded-2xl p-8"
          style={{
            backgroundColor: "var(--background-card)",
            backdropFilter: "var(--backdrop-blur)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold inline-block relative tracking-widest"
              style={{ color: "var(--text-primary)" }}
            >
              BUZZIFY
              <span
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 mt-2"
                style={{ background: "var(--accent-blue)" }}
              ></span>
            </h1>
            <p className="mt-4" style={{ color: "var(--text-tertiary)" }}>
              Hesabınıza Giriş Yapın
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                className="p-3 rounded-lg text-sm border text-center"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "var(--accent-red)",
                  borderColor: "var(--accent-red)",
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                E-posta Adresi veya Kullanıcı Adı
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }}
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
                  className="w-full pl-10 pr-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                  placeholder="ornek@email.com veya kullanıcı_adı"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Şifre
              </label>
              <div className="relative">
                <div
                  className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }}
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
                  className="w-full pl-10 pr-10 py-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  style={{ color: "var(--text-tertiary)" }}
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
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                        clipRule="evenodd"
                      ></path>
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{
                    borderColor: "var(--input-border)",
                    accentColor: "var(--accent-blue)",
                  }}
                />
                <label
                  htmlFor="remember"
                  className="ml-2 text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Beni Hatırla
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--accent-blue)" }}
              >
                Şifremi Unuttum
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-all relative overflow-hidden flex items-center justify-center"
              style={{
                background: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
                opacity: loading ? 0.7 : 1,
                height: "48px",
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
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>

            <div className="text-center mt-4">
              <p style={{ color: "var(--text-tertiary)" }}>
                Hesabınız yok mu?{" "}
                <Link
                  to="/register"
                  className="font-medium hover:underline"
                  style={{ color: "var(--accent-blue)" }}
                >
                  Kayıt Ol
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;