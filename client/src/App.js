import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresentationState } from './hooks/usePresentationState'
import { themes } from './data/themes'
import { sampleTemplates } from './data/sampleTemplates'
import Navbar from './components/layout/Navbar'
import HeroSection from './components/sections/HeroSection'
import FeaturesSection from './components/sections/FeaturesSection'
import TemplatesSection from './components/sections/TemplatesSection'
import CTASection from './components/sections/CTASection'
import Footer from './components/layout/Footer'
import Editor from './components/editor/Editor'
import PresentationMode from './components/presentation/PresentationMode'
import { X, Sparkles } from './components/common/Icons'
import './styles/App.css'

function App() {
  const {
    topic, setTopic,
    presentationData, setPresentationData,
    isLoading,
    isDownloading,
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
    canUndo,
    canRedo,
  } = usePresentationState()

  const [theme, setTheme] = useState('gradient-blue')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [showTemplatePreview, setShowTemplatePreview] = useState(null)
  const [themeMode, setThemeMode] = useState('light');

  const toggleTheme = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(themeMode === 'light' ? 'dark' : 'light');
    root.classList.add(themeMode);
  }, [themeMode]);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const currentTheme = themes[theme] || themes['gradient-blue']

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

const loadTemplate = (template) => {
  const processedData = {
    ...template.data,
    slides: template.data.slides.map((slide) => ({
      ...slide,
      imageUrl: slide.imageUrl || null, 
      content: slide.content.map((block) => {
        if (block.type === 'bullet_list') {
          return {
            ...block,
            items: block.items.map((item) =>
              item.startsWith('<p>') ? item : `<p>${item}</p>`
            ),
          }
        }
        if (block.type === 'paragraph') {
          return {
            ...block,
            value: block.value.startsWith('<p>')
              ? block.value
              : `<p>${block.value}</p>`,
          }
        }
        return block
      }),
    })),
    bibliography: (template.data.bibliography || []).map(item => {
      return typeof item === 'string' ? { citation: item } : item;
    })
  }
  setPresentationData(processedData)
  setTheme(template.theme || 'gradient-blue')
  setError('')
  setShowTemplatePreview(null)
  setTimeout(() => {
    scrollToSection('editor')
  }, 100)
}

  if (isPresentationMode && presentationData) {
    let slidesForPresentation = [...(presentationData.slides || [])];

    const hasBibliographySlide = slidesForPresentation.some(s =>
      s.title && /kaynakça|bibliography/i.test(s.title)
    );

    if (!hasBibliographySlide && presentationData.bibliography && presentationData.bibliography.length > 0) {
      const bibliographySlide = {
        slideNumber: slidesForPresentation.length + 1,
        title: 'Kaynakça',
        content: [{
          type: 'bullet_list',
          items: presentationData.bibliography
        }],
      };
      slidesForPresentation.push(bibliographySlide);
    }

    return (
      <PresentationMode
        slides={slidesForPresentation}
        theme={currentTheme}
        currentIndex={currentSlideIndex}
        onExit={() => setIsPresentationMode(false)}
        onNext={() =>
          setCurrentSlideIndex((prev) =>
            Math.min(prev + 1, slidesForPresentation.length - 1)
          )
        }
        onPrev={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
        onSlideUpdate={(path, value) => {
          if (path[0] === 'slides' && path[1] < (presentationData.slides || []).length) {
            handlePresentationChange(path, value);
          }
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-dark-text">
      <Navbar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrollToSection={scrollToSection}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />

      <main>
        <HeroSection
          topic={topic}
          setTopic={setTopic}
          aiModel={aiModel}
          setAiModel={setAiModel}
          handleGeneratePresentation={handleGeneratePresentation}
          isLoading={isLoading}
          error={error}
        />

        <FeaturesSection />

        <TemplatesSection
          sampleTemplates={sampleTemplates}
          setShowTemplatePreview={setShowTemplatePreview}
        />

        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center space-y-4 shadow-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-lg font-medium text-gray-800 dark:text-dark-text">AI sunum hazırlıyor...</p>
            </div>
          </div>
        )}

        {isDownloading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 flex flex-col items-center space-y-4 shadow-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
              <p className="text-lg font-medium text-gray-800 dark:text-dark-text">Sunum dosyası hazırlanıyor...</p>
              <p className="text-sm text-gray-500">Bu işlem biraz sürebilir.</p>
            </div>
          </div>
        )}

        {presentationData && (
          <Editor
            presentationData={presentationData}
            handlePresentationChange={handlePresentationChange}
            theme={theme}
            setTheme={setTheme}
            setCurrentSlideIndex={setCurrentSlideIndex}
            setIsPresentationMode={setIsPresentationMode}
            handleDownload={handleDownload}
            currentTheme={currentTheme}
            handleDragEnd={handleDragEnd}
            handleDeleteSlide={handleDeleteSlide}
            handleAddSlide={handleAddSlide}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        )}

        <CTASection scrollToSection={scrollToSection} />
      </main>

      <Footer scrollToSection={scrollToSection} />

      <AnimatePresence>
        {showTemplatePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-white dark:bg-dark-card rounded-3xl max-w-5xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200 dark:border-dark-border flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-1 dark:text-dark-text">
                    {showTemplatePreview.title}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    {showTemplatePreview.description}
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplatePreview(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-grow grid md:grid-cols-2 overflow-hidden">
                <div className="p-8 flex flex-col">
                  <div
                    className={`flex-shrink-0 h-64 bg-gradient-to-br ${showTemplatePreview.preview.color} rounded-2xl flex items-center justify-center text-8xl mb-8`}
                  >
                    {showTemplatePreview.preview.icon}
                  </div>
                  <div className="flex-grow"></div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => loadTemplate(showTemplatePreview)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Bu Şablonu Kullan</span>
                    </button>
                    <button
                      onClick={() => setShowTemplatePreview(null)}
                      className="px-8 py-4 border-2 border-gray-200 dark:border-dark-border rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-dark-text"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
                <div className="p-8 bg-gray-50/70 dark:bg-dark-bg/70 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <h4 className="font-bold text-lg mb-4 dark:text-dark-text">Örnek Slaytlar:</h4>
                  <div className="space-y-4">
                    {showTemplatePreview.data.slides.map((slide, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm"
                      >
                        <h5 className="font-bold mb-2 text-blue-600 dark:text-blue-400">
                          Slayt {slide.slideNumber}: {slide.title}
                        </h5>
                        <div
                          className="text-sm text-gray-700 dark:text-dark-text-secondary space-y-2"
                          dangerouslySetInnerHTML={{
                            __html: slide.content
                              .map((b) =>
                                b.type === 'paragraph'
                                  ? b.value
                                  : `<ul>${(b.items || [])
                                    ?.map((i) => `<li>${i}</li>`)
                                    .join('')}</ul>`
                              )
                              .join(''),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App