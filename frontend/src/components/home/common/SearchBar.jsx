import React, { useState, useEffect, useRef } from 'react';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const isInitialMount = useRef(true);
  const lastSearchTerm = useRef('');

  // Tuşlama durduğunda arama yap
  useEffect(() => {
    // İlk render'da arama yapma
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Çok kısa arama terimlerini işleme
    const trimmedTerm = searchTerm.trim();
    
    // Aynı arama terimini tekrar arama (son aranan terim aynıysa)
    if (trimmedTerm === lastSearchTerm.current) {
      return;
    }
    
    // Minimum 2 karakter kontrolü
    if (trimmedTerm.length > 0 && trimmedTerm.length < 2) {
      return; // 2 karakterden azsa arama yapma
    }

    // Arama yapmadan önce bekleme süresi
    const timer = setTimeout(() => {
      console.log('Arama isteği yapılıyor:', trimmedTerm);
      lastSearchTerm.current = trimmedTerm;
      onSearch(trimmedTerm);
    }, 700);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm && trimmedTerm !== lastSearchTerm.current) {
      lastSearchTerm.current = trimmedTerm;
      onSearch(trimmedTerm);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Eğer input boşaltılırsa, sonuçları temizle
    if (!value.trim()) {
      lastSearchTerm.current = '';
      onSearch('');
    }
  };

  return (
    <div
      className="rounded-2xl p-2"
      style={{
        backgroundColor: 'var(--background-card)',
        backdropFilter: 'var(--backdrop-blur)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-color)'
      }}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          type="search"
          className="block w-full pl-10 pr-10 py-2 rounded-xl"
          placeholder="Arkadaşlar, gönderiler veya konular ara..."
          value={searchTerm}
          onChange={handleInputChange}
          style={{
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-primary)',
            border: 'none',
          }}
        />
        <button
          type="submit"
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          style={{ color: 'var(--accent-blue)' }}
        >
          <span className="sr-only">Ara</span>
          {searchTerm && (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;