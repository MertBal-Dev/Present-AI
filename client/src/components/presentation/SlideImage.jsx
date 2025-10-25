import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Code, RefreshCw } from '../common/Icons';

function SlideImage({ keywords, existingImageUrl, onImageChange }) {
  const [imageUrl, setImageUrl] = useState(existingImageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const isFetching = useRef(false);
  const hasInitialized = useRef(false);

  const API_BASE_URL = useMemo(() => (
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_BASE_URL
      : 'http://localhost:5001/api'
  ), []);

  // Sadece ilk mount'ta existingImageUrl varsa kullan
  useEffect(() => {
    if (!hasInitialized.current && existingImageUrl) {
      console.log(`ℹ️ [Mount] Using existing image`);
      setImageUrl(existingImageUrl);
      hasInitialized.current = true;
    } else if (!hasInitialized.current && !existingImageUrl) {
      // Eğer existing image yoksa ilk fetch yap
      hasInitialized.current = true;
      fetchNewImage();
    }
  }, []); // Boş dependency - sadece ilk mount'ta çalışır

  // Parent'tan gelen imageUrl değişirse güncelle
  useEffect(() => {
    if (existingImageUrl && existingImageUrl !== imageUrl) {
      setImageUrl(existingImageUrl);
    }
  }, [existingImageUrl]);

  // Image URL değiştiğinde parent'a bildir
  useEffect(() => {
    if (imageUrl && imageUrl !== existingImageUrl && onImageChange) {
      onImageChange(imageUrl);
    }
  }, [imageUrl]);

  // Görsel fetch fonksiyonu
  const fetchNewImage = async () => {
    const query = keywords?.query;
    if (!query || query.trim().length < 3) {
      setError(true);
      return;
    }

    if (isFetching.current) return;

    isFetching.current = true;
    setIsLoading(true);
    setError(false);

    console.log(`🔍 [Fetch] "${query}" için görsel aranıyor...`);

    try {
      const response = await fetch(`${API_BASE_URL}/search-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, nonce: Date.now() }),
      });

      if (!response.ok) throw new Error('Görsel alınamadı');
      const data = await response.json();
      
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        console.log(`✓ [Fetch] Görsel bulundu`);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('[Fetch] Error:', err);
      setError(true);
    } finally {
      isFetching.current = false;
      setIsLoading(false);
    }
  };

  // 🔥 Refresh butonu handler - SADECE buradan fetch yapılır
  const handleRefresh = async () => {
    const query = keywords?.query;
    if (!query) return;

    console.log(`🔄 [Refresh] Manuel yenileme başlatılıyor...`);
    
    // Cache'i temizle
    try {
      await fetch(`${API_BASE_URL}/clear-image-cache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      console.log('✓ [Refresh] Cache temizlendi');
    } catch (err) {
      console.warn('[Refresh] Cache clear failed:', err);
    }
    
    // Yeni görsel getir
    setImageUrl(null);
    fetchNewImage();
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500">Kaliteli görsel aranıyor...</p>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-center p-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <Code className="w-16 h-16 text-white" />
          </div>
          <p className="text-gray-500 text-sm mb-4">{keywords?.query || 'Görsel bulunamadı'}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden group">
      <img
        src={imageUrl}
        alt={keywords?.query || 'Slide image'}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <button
          onClick={handleRefresh}
          className="p-3 bg-white/90 rounded-full text-gray-800 hover:bg-white hover:scale-110 transform transition-all shadow-lg"
          title="Başka Görsel Bul"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-md backdrop-blur-sm">
        {keywords?.query}
      </div>
    </div>
  );
}

export default SlideImage;