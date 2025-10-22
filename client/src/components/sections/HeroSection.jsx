import React from 'react';
import { Zap, Sparkles } from '../common/Icons';

const HeroSection = ({ 
    topic, 
    setTopic, 
    aiModel, 
    setAiModel, 
    handleGeneratePresentation, 
    isLoading, 
    error 
}) => {
  return (
      <section id="generator" className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-dark-card text-blue-600 dark:text-dark-secondary px-4 py-2 rounded-full mb-6 animate-float-subtle">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">AI Destekli • Hızlı • Profesyonel</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            Yapay Zeka ile Sunum<br />Oluşturma Platformu
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-dark-text-secondary mb-12 max-w-3xl mx-auto">
            Sadece konunuzu yazın, yapay zeka sizin için profesyonel bir sunum oluştursun. Dakikalar içinde hazır!
          </p>
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Sunum konunuzu yazın... (örn: Yapay Zeka ve Gelecek)"
                className="w-full pl-6 pr-44 py-5 rounded-2xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card dark:text-dark-text focus:border-blue-500 dark:focus:border-dark-primary outline-none text-lg shadow-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topic) {
                    handleGeneratePresentation();
                  }
                }}
              />
              <button
                onClick={handleGeneratePresentation}
                disabled={!topic || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition flex items-center space-x-2 disabled:opacity-50 disabled:scale-100"
              >
                <Sparkles className="w-5 h-5" />
                <span>Oluştur</span>
              </button>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-dark-text-secondary">
            <span>AI Model:</span>
            <select 
              value={aiModel} 
              onChange={(e) => setAiModel(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-lg outline-none focus:border-blue-500 dark:focus:border-dark-primary"
            >
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </select>
          </div>
        </div>
      </section>
  );
}

export default HeroSection;