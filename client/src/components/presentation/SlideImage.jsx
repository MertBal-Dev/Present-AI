import React, { useState, useEffect } from 'react';
import { Code, RefreshCw } from '../common/Icons'; 

function SlideImage({ keywords }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0); 

  useEffect(() => {
    const fetchImage = async () => {
      if (!keywords?.query) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(false);
      if (page === 1 && retryCount === 0) setImageUrl(null);

      try {
        const response = await fetch('http://localhost:5001/api/search-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: keywords.query,
            page: page
          })
        });

        if (!response.ok) {
          throw new Error('Image fetch failed');
        }

        const data = await response.json();
        if (data.imageUrl) {
          setImageUrl(data.imageUrl);
          setError(false);
          setRetryCount(0);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Error fetching image:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [keywords?.query, page, retryCount]);

  const handleRefresh = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
    } else {
      setPage(prevPage => prevPage + 1);
      setRetryCount(0);
    }
  };

  
  useEffect(() => {
    setPage(1);
    setRetryCount(0);
    setError(false);
  }, [keywords?.query]);

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
      <div className="absolute top-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
        HD
      </div>
    </div>
  );
}

export default SlideImage;