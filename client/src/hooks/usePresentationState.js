import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import * as api from '../services/api';

export const usePresentationState = () => {
  const [topic, setTopic] = useState('');
  const [presentationData, setPresentationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiModel, setAiModel] = useState('gemini-2.5-pro');

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
    
    const newHistory = history.slice(0, historyIndex + 1);
    
    
    newHistory.push(JSON.parse(JSON.stringify(newData))); 
    
    
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
      
      const initialData = JSON.parse(JSON.stringify(data));
      setHistory([initialData]);
      setHistoryIndex(0);
      setPresentationData(data);
    } catch (error) {
      console.error("Sunum oluşturulurken bir hata oluştu:", error);
      setError(`Sunum oluşturulamadı: ${error.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

const handlePresentationChange = useCallback((path, value) => {
  const applyChange = (data) => {
    if (!data) return null;

    const newData = JSON.parse(JSON.stringify(data));
    let current = newData;

    try {
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];

        
        if (current[key] === undefined || current[key] === null) {
        
          if (!isNaN(path[i + 1])) {
            current[key] = [];
          } else {
            current[key] = {};
          }
        }

        current = current[key];
      }

      const lastKey = path[path.length - 1];
      current[lastKey] = value;

      return newData;
    } catch (error) {
      console.error("⚠️ applyChange hatası:", error.message, "Path:", path, "Value:", value);
      alert("Bir hata oluştu. Bu alan şu anda düzenlenemiyor.");
      return null;
    }
  };

  const newData = applyChange(presentationData);
  if (newData) {
    updateStateAndHistory(newData);
  }
}, [presentationData, updateStateAndHistory]);


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
      imageKeywords: { query: 'abstract background' }
    };
    const newSlides = [...presentationData.slides, newSlide];
    const newData = { ...presentationData, slides: newSlides };
    updateStateAndHistory(newData);
  }, [presentationData, updateStateAndHistory]);

  const handleDownload = async (format, theme) => {
    if (!presentationData) return;
    try {
        await api.downloadPresentation(format, presentationData, theme);
    } catch(err) {
        console.error(`'${format}' formatında indirilirken hata oluştu:`, err);
        setError(err.message);
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
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};