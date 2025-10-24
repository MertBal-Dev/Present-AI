import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Code, RefreshCw } from '../common/Icons';

function SlideImage({ keywords, existingImageUrl, onImageChange }) {
  const [imageUrl, setImageUrl] = useState(existingImageUrl || null);

  const [isLoading, setIsLoading] = useState(!existingImageUrl);

  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);

  const isFetching = useRef(false);
  const fetchedQueries = useRef(new Set());
  const prevQuery = useRef(keywords?.query);

  const API_BASE_URL = useMemo(() => (
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_API_BASE_URL
      : 'http://localhost:5001/api'
  ), []);

  useEffect(() => {
    if (imageUrl && imageUrl !== existingImageUrl && onImageChange) {
      onImageChange(imageUrl);
    }
  }, [imageUrl, existingImageUrl, onImageChange]);

  useEffect(() => {
    const query = keywords?.query;

    if (imageUrl || !query) {
      setIsLoading(false);
      return;
    }

    if (isFetching.current) return;

    const queryKey = `${query}-${page}`;
    if (fetchedQueries.current.has(queryKey)) return;

    const fetchImage = async () => {
      isFetching.current = true;
      setIsLoading(true);
      setError(false);
      
      console.log(`🔍 [Fetch] "${query}" için görsel aranıyor (page: ${page})...`);
      
      try {
        const response = await fetch(`${API_BASE_URL}/search-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query,
            page: page,
            nonce: Date.now(),
          }),
        });

        if (!response.ok) throw new Error('Görsel alınamadı');

        const data = await response.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          fetchedQueries.current.add(queryKey);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        isFetching.current = false;
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [keywords?.query, page, retryCount, API_BASE_URL, imageUrl]);

  useEffect(() => {
    if (keywords?.query !== prevQuery.current) {
      console.log(`🆕 [New Query] Sorgu değişti: "${prevQuery.current}" → "${keywords?.query}"`);
      prevQuery.current = keywords?.query;
      
      setImageUrl(null);
      setPage(1);
      setRetryCount(0);
      setError(false);
      setIsLoading(true); 
      fetchedQueries.current.clear();
    }
  }, [keywords?.query]);

  const handleRefresh = () => {
    console.log(`🔄 [Refresh] Manuel yenileme başlatılıyor...`);
    setIsLoading(true);
    setImageUrl(null); 
    
    
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
    } else {
      setPage(prevPage => prevPage + 1);
      setRetryCount(0);
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