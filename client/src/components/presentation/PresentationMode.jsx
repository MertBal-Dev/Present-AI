import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SlideImage from './SlideImage';
import { ChevronLeft, ChevronRight, X } from '../common/Icons';


function PresentationMode({ slides, theme, currentIndex, onExit, onNext, onPrev }) {
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"

      style={{ background: `linear-gradient(135deg, ${theme.secondary}, ${theme.primary})` }}
    >
      <div className="fixed top-0 left-0 w-full h-1.5 bg-white/20">
        <div
          className="h-full"

          style={{
            width: `${((currentIndex + 1) / slides.length) * 100}%`,
            background: theme.accent,
            transition: 'width 0.4s ease-in-out',
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          variants={slideVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="w-full max-w-6xl h-[85vh]"
        >
          <div

            className="bg-white/90 dark:bg-dark-card/90 text-gray-900 dark:text-dark-text backdrop-blur-sm rounded-3xl p-6 md:p-12 shadow-2xl w-full h-full flex flex-col"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-hidden">
              <div className="flex flex-col h-full min-h-0">
                <h1
                  className="text-3xl lg:text-5xl font-bold mb-6 flex-shrink-0"

                  style={{ color: theme.primary }}
                >
                  {currentSlide.title}
                </h1>

                <div
                  className={`space-y-4 overflow-y-auto pr-4 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 ${charCount > 600 ? 'text-base lg:text-lg' : 'text-lg lg:text-xl'
                    }`}
                >
                  {currentSlide.content?.map((block, idx) => (
                    <div key={idx} className="space-y-3">
                      {block.type === 'paragraph' && <div dangerouslySetInnerHTML={{ __html: block.value }} className="leading-relaxed prose prose-lg max-w-none text-gray-800 dark:text-dark-text" />}
                      {block.type === 'bullet_list' && (
                        <ul className="space-y-3 list-inside pl-2">
                          {block.items.map((item, i) => (
                            <li key={i} className="flex items-start space-x-3">
                              <span
                                className="mt-1 text-2xl flex-shrink-0"
                                style={{ color: theme.primary }}
                              >◆</span>
                              <span className="flex-1" dangerouslySetInnerHTML={{ __html: item.citation || item }} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center bg-gray-100 dark:bg-dark-bg rounded-2xl overflow-hidden">
                <SlideImage keywords={currentSlide.imageKeywords} />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-black/50 backdrop-blur px-6 py-3 rounded-full">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="p-2 text-white disabled:opacity-30 hover:bg-white/20 rounded-full transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-white font-medium">
          {currentIndex + 1} / {slides.length}
        </span>
        <button
          onClick={onNext}
          disabled={currentIndex >= slides.length - 1}
          className="p-2 text-white disabled:opacity-30 hover:bg-white/20 rounded-full transition"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <button
        onClick={onExit}
        className="fixed top-4 right-4 md:top-8 md:right-8 p-3 bg-black/50 backdrop-blur text-white rounded-full hover:bg-black/70 transition"
      >
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}

export default PresentationMode;