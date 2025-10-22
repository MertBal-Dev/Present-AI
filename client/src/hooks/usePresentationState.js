import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import * as api from '../services/api';

export const usePresentationState = () => {
  const [topic, setTopic] = useState('');
  const [presentationData, setPresentationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.5-pro');
  const [isDownloading, setIsDownloading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPresentationData(history[newIndex]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPresentationData(history[newIndex]);
    }
  }, [history, historyIndex]);

  const updateStateAndHistory = useCallback((newData) => {
    
    
    
    const clonedData = JSON.parse(JSON.stringify(newData));
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(clonedData);
    
    const limitedHistory = newHistory.length > 150 
      ? newHistory.slice(-150) 
      : newHistory;
    
    setHistory(limitedHistory);
    setHistoryIndex(limitedHistory.length - 1);
    setPresentationData(newData);
    
    
  }, [history, historyIndex]);

  const handleGeneratePresentation = async () => {
    if (!topic) {
      setError("Lütfen bir sunum konusu girin.");
      return;
    }
    setIsLoading(true);
    setPresentationData(null);
    setError('');
    try {
      const data = await api.generateContent(topic, aiModel);
      
      
      if (data.slides) {
        data.slides = data.slides.map(slide => ({
          ...slide,
          imageUrl: slide.imageUrl || null, 
        }));
      }
      
      const initialData = JSON.parse(JSON.stringify(data));
      setHistory([initialData]);
      setHistoryIndex(0);
      setPresentationData(data);
    } catch (error) {
      
      setError(`Sunum oluşturulamadı: ${error.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  
  const handlePresentationChange = useCallback((path, value) => {
    
    
    setPresentationData(prevData => {
      if (!prevData) {
        
        return null;
      }

      
      const newData = JSON.parse(JSON.stringify(prevData));
      let current = newData;

      try {
        
        for (let i = 0; i < path.length - 1; i++) {
          const key = path[i];

          
          if (current[key] === undefined || current[key] === null) {
            current[key] = !isNaN(path[i + 1]) ? [] : {};
          }

          current = current[key];
        }

        
        const lastKey = path[path.length - 1];
        current[lastKey] = value;

        
        
        
        setTimeout(() => {
          setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(newData)));
            return newHistory.length > 150 ? newHistory.slice(-150) : newHistory;
          });
          setHistoryIndex(prev => prev + 1);
        }, 0);
        
        return newData;
        
      } catch (error) {

        alert("Bir hata oluştu. Bu alan şu anda düzenlenemiyor.");
        return prevData;
      }
    });
  }, [historyIndex]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
        const oldIndex = presentationData.slides.findIndex((s) => s.slideNumber === active.id);
        const newIndex = presentationData.slides.findIndex((s) => s.slideNumber === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reorderedSlides = arrayMove(presentationData.slides, oldIndex, newIndex);
        const updatedSlides = reorderedSlides.map((slide, index) => ({ ...slide, slideNumber: index + 1 }));

        const newData = { ...presentationData, slides: updatedSlides };
        updateStateAndHistory(newData);
    }
  }, [presentationData, updateStateAndHistory]);

  const handleDeleteSlide = useCallback((slideIndexToDelete) => {
    const newSlides = presentationData.slides
      .filter((_, index) => index !== slideIndexToDelete)
      .map((slide, index) => ({ ...slide, slideNumber: index + 1 }));
    
    const newData = { ...presentationData, slides: newSlides };
    updateStateAndHistory(newData);
  }, [presentationData, updateStateAndHistory]);

  const handleAddSlide = useCallback(() => {
    const newSlide = {
      slideNumber: presentationData.slides.length + 1,
      title: 'Yeni Slayt',
      layout: 'title-and-content',
      content: [{ type: 'paragraph', value: '<p>İçerik ekleyin...</p>' }],
      notes: '',
      imageKeywords: { query: 'abstract background' },
      imageUrl: null 
    };
    const newSlides = [...presentationData.slides, newSlide];
    const newData = { ...presentationData, slides: newSlides };
    updateStateAndHistory(newData);
  }, [presentationData, updateStateAndHistory]);

  const handleDownload = async (format, theme) => {
    if (!presentationData) return;
    setIsDownloading(true);
    setError('');
    try {
        await api.downloadPresentation(format, presentationData, theme);
    } catch(err) {
        
        setError(`İndirme başarısız: ${err.message}`);
    } finally {
        setIsDownloading(false);
    }
  };

  return {
    topic, setTopic,
    presentationData, setPresentationData,
    isLoading,
    error, setError,
    aiModel, setAiModel,
    handleGeneratePresentation,
    handlePresentationChange,
    handleDragEnd,
    handleDeleteSlide,
    handleAddSlide,
    handleDownload,
    isDownloading,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};