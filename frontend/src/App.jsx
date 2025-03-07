// React ve React Router gerekli bileşenlerini içe aktarıyoruz
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
 // Sistem tercihine göre temayı başlatıyoruz
 const [theme, setTheme] = useState(
   window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
 );
 
 // Sistem tema değişikliklerini dinliyoruz
 useEffect(() => {
   const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
   
   const handleThemeChange = (e) => {
     setTheme(e.matches ? 'dark' : 'light');
   };
   
   mediaQuery.addEventListener('change', handleThemeChange);
   
   // Bileşen kaldırıldığında dinleyiciyi temizliyoruz
   return () => {
     mediaQuery.removeEventListener('change', handleThemeChange);
   };
 }, []);
 
 // Temayı HTML kök elemanına uyguluyoruz
 useEffect(() => {
   document.documentElement.setAttribute('data-theme', theme);
 }, [theme]);
 
 return (
   <Router>
     <Routes>
       <Route path="/" element={<Login />} />
       <Route path="/login" element={<Login />} />
       <Route path="/register" element={<Register />} />
     </Routes>
   </Router>
 );
}

export default App;