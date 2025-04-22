import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage first, then sessionStorage
    const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Kullanıcı verisi ayrıştırılamadı:', error);
        // Handle invalid user data by logging out
        logout();
      }
    }
    
    setLoading(false);
  }, []);

  const login = (userData, authToken, rememberMe = false) => {
    setUser(userData);
    setToken(authToken);
    
    // Store in localStorage if rememberMe is true, otherwise in sessionStorage
    if (rememberMe) {
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('token', authToken);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Clear both storage locations to be safe
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  // Token güncelleme fonksiyonu
  const updateToken = (newToken) => {
    setToken(newToken);
    
    // Token'ı doğru depolama alanında güncelle
    if (localStorage.getItem('token')) {
      localStorage.setItem('token', newToken);
    } else if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', newToken);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    
    // Update the stored user data
    const userStr = JSON.stringify(updatedUserData);
    if (localStorage.getItem('token')) {
      localStorage.setItem('user', userStr);
      console.log("AuthContext: localStorage'da kullanıcı güncellendi");
    } else if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('user', userStr);
      console.log("AuthContext: sessionStorage'da kullanıcı güncellendi");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading,
      login, 
      logout,
      updateToken,
      updateUser,
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};