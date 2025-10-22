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


  const fetchNewImage = async () => {
    const query = keywords?.query;
    if (!query || query.trim().length < 3) {
      
      setError(true);
      return;
    }

    if (isFetching.current) {
      
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(false);

    

    try {
      const response = await fetch(`${API_BASE_URL}/search-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, nonce: Date.now() }),
      });

      const data = await response.json();

      if (!response.ok || !data.imageUrl) {
        
        setError(true);
        setImageUrl(null);
      } else {
        setImageUrl(data.imageUrl);
        setError(false);
        
      }
    } catch (err) {
      
      setError(true);
    } finally {
      isFetching.current = false;
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      if (existingImageUrl) {
        
        setImageUrl(existingImageUrl);
      } else {
        fetchNewImage();
      }
    }
  }, []);


useEffect(() => {
  if (existingImageUrl) {
    setImageUrl(existingImageUrl);
    setError(false);
  }
}, [existingImageUrl]);



  useEffect(() => {
    if (imageUrl && imageUrl !== existingImageUrl && onImageChange) {
      onImageChange(imageUrl);
    }
  }, [imageUrl]);


  useEffect(() => {
    const query = keywords?.query;
    if (!imageUrl && query && query.trim().length >= 3 && !isLoading && !isFetching.current) {
      
      fetchNewImage();
    }
  }, [keywords?.query]);


const handleRefresh = async () => {
  const query = keywords?.query;
  if (!query) return;

  
  setIsLoading(true);
  setError(false);

  try {
    
    const response = await fetch(`${API_BASE_URL}/search-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, nonce: Date.now() }),
    });

    const data = await response.json();

    if (!response.ok || !data.imageUrl) {
      setError(true);
      setImageUrl(null);
    } else {
      setImageUrl(data.imageUrl);
      setError(false);
    }
  } catch (err) {
    console.error('[SlideImage] Refresh error:', err.message);
    setError(true);
  } finally {
    setIsLoading(false);
  }
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
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow">
            <Code className="w-8 h-8 text-white" />
          </div>
          <p
            className="text-gray-500 text-xs mb-3 line-clamp-2"
            title={keywords?.query || 'Görsel bulunamadı'}
          >
            {keywords?.query || 'Görsel bulunamadı'}
          </p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors inline-flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
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
        onError={() => {
          
          setError(true);
          setImageUrl(null);
        }}
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
