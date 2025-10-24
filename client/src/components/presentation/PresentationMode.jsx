import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideImage from './SlideImage';
import { ChevronLeft, ChevronRight, X } from '../common/Icons';


function PresentationMode({ slides, theme, currentIndex, onExit, onNext, onPrev, onSlideUpdate }) {
  const currentSlide = slides[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'ArrowRight' || e.key === ' ') && currentIndex < slides.length - 1) {
        onNext();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onPrev();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onExit, currentIndex, slides.length]);

  const charCount =
    currentSlide.content?.reduce((acc, block) => {
      if (block.type === 'paragraph') return acc + block.value.length;
      if (block.type === 'bullet_list') return acc + block.items.join('').length;
      return acc;
    }, 0) || 0;

  const slideVariants = {
    hidden: { opacity: 0, x: 100, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -100, scale: 0.95 },
  };

  const isBibliographySlide = currentSlide.title && /kaynakça|bibliography/i.test(currentSlide.title);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{
        background: `linear-gradient(135deg, ${theme.secondary}dd, ${theme.primary}ee)`,
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite'
      }}
    >
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* İlerleme Çubuğu */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent">
        <div
          className="h-full relative overflow-hidden"
          style={{
            width: `${((currentIndex + 1) / slides.length) * 100}%`,
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 20px ${theme.accent}80`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          variants={slideVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="w-full max-w-[95vw] h-[92vh]"
        >
          <div
            className="bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-50 backdrop-blur-xl rounded-[2rem] p-8 md:p-16 w-full h-full flex flex-col relative overflow-hidden border border-white/20 dark:border-white/10"
            style={{
              boxShadow: `
                0 25px 50px -12px ${theme.primary}40,
                0 0 0 1px ${theme.primary}20,
                inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ background: theme.primary }} />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ background: theme.accent }} />

            {/* 3. GÜNCELLEME: Koşullu render etme mantığı */}
            <div className="flex-grow overflow-hidden relative z-10">
              {isBibliographySlide ? (
                <div className="flex flex-col h-full">
                  <div className="mb-6 flex-shrink-0">
                    <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold" style={{ color: theme.primary }}>
                      {currentSlide.title}
                    </h1>
                    <div className="h-0.5 w-16 mt-3 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />
                  </div>
                  <div className="overflow-y-auto pr-4 flex-1 scrollbar-thin scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
                    {currentSlide.content?.map((block, idx) => (
                      <div key={idx}>
                        {block.type === 'bullet_list' && (
                          <ul className="space-y-3 text-sm md:text-base text-gray-600 dark:text-gray-400">
                            {(block.items || []).map((item, i) => (
                              <li key={i} dangerouslySetInnerHTML={{ __html: (item.citation || item) }} />
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full">
                  {/* Sol Taraf - İçerik */}
                  <div className="flex flex-col h-full min-h-0">
                    <div className="mb-6 flex-shrink-0">
                      <div className="inline-block px-3 py-1 rounded-full text-[10px] font-semibold mb-3 tracking-wide uppercase" style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}20)`, color: theme.primary, border: `1px solid ${theme.primary}30` }}>
                        Slayt {currentIndex + 1}
                      </div>
                      <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight tracking-tight" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {currentSlide.title}
                      </h1>
                      <div className="h-0.5 w-16 mt-3 rounded-full" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.accent})` }} />
                    </div>
                    <div className={`space-y-5 overflow-y-auto pr-4 flex-1 min-h-0 scrollbar-thin scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500 ${charCount > 600 ? 'text-lg lg:text-xl' : 'text-xl lg:text-2xl'}`} style={{ scrollbarColor: `${theme.primary}60 transparent` }}>
                      {currentSlide.content?.map((block, idx) => (
                        <motion.div key={idx} className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 0.5 }}>
                          {block.type === 'paragraph' && <div dangerouslySetInnerHTML={{ __html: block.value }} className="leading-relaxed prose prose-xl max-w-none text-gray-700 dark:text-gray-300" />}
                          {block.type === 'bullet_list' && (
                            <ul className="space-y-4 pl-1">
                              {(block.items || []).map((item, i) => (
                                <li key={i} className="flex items-start space-x-4 group">
                                  <span className="mt-2 text-xl flex-shrink-0 transition-transform group-hover:scale-125 duration-300" style={{ color: theme.primary }}>●</span>
                                  <span className="flex-1 leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{ __html: (typeof item === 'object' ? item.citation : item) || '' }} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  {/* Sağ Taraf - Görsel */}
                  <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl overflow-hidden relative border border-gray-200 dark:border-gray-700" style={{ boxShadow: `inset 0 2px 20px ${theme.primary}10` }}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
                    <SlideImage
                      keywords={currentSlide.imageKeywords}
                      existingImageUrl={currentSlide.imageUrl}
                      onImageChange={(newUrl) => {
                        if (onSlideUpdate) {
                          onSlideUpdate(['slides', currentIndex, 'imageUrl'], newUrl);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigasyon ve Çıkış Butonları (değişiklik yok) */}
      <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 bg-gray-900/80 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10" style={{ boxShadow: `0 10px 40px ${theme.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.1)` }}>
        <button onClick={onPrev} disabled={currentIndex === 0} className="p-3 text-white disabled:opacity-20 hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110 disabled:hover:scale-100 group" style={{ background: currentIndex === 0 ? 'transparent' : `${theme.primary}20` }}>
          <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-white/60 text-xs font-medium uppercase tracking-wider mb-0.5">Slayt</span>
          <span className="text-white font-bold text-lg" style={{ color: theme.accent }}>{currentIndex + 1} <span className="text-white/40">/</span> {slides.length}</span>
        </div>
        <button onClick={onNext} disabled={currentIndex >= slides.length - 1} className="p-3 text-white disabled:opacity-20 hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110 disabled:hover:scale-100 group" style={{ background: currentIndex >= slides.length - 1 ? 'transparent' : `${theme.primary}20` }}>
          <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
      <button onClick={onExit} className="fixed top-6 right-6 md:top-10 md:right-10 p-4 bg-gray-900/80 backdrop-blur-xl text-white rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90 border border-white/10 group" style={{ boxShadow: `0 10px 40px ${theme.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.1)` }}>
        <X className="w-5 h-5 transition-transform" />
      </button>
    </div>
  );
}

export default PresentationMode;