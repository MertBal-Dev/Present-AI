import React from 'react';
import { Sparkles, Github } from '../common/Icons';

const CTASection = ({ scrollToSection }) => {
    return (
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:bg-gradient-to-r dark:from-dark-card dark:to-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Açık Kaynak Proje</h2>
          <p className="text-xl md:text-2xl mb-8 opacity-90">AI destekli sunum oluşturma platformu - React & Gemini API ile geliştirildi</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => scrollToSection('generator')} className="bg-white text-blue-600 px-12 py-5 rounded-full font-bold text-lg hover:shadow-2xl transform hover:scale-105 transition inline-flex items-center space-x-3">
              <Sparkles className="w-6 h-6" />
              <span>Hemen Dene</span>
            </button>
            <a href="https://github.com/MertBal-Dev" target="_blank" rel="noopener noreferrer" className="bg-transparent border-2 border-white text-white px-12 py-5 rounded-full font-bold text-lg hover:bg-white hover:text-blue-600 transition inline-flex items-center space-x-3">
              <Github className="w-6 h-6" />
              <span>GitHub'da İncele</span>
            </a>
          </div>
        </div>
      </section>
    );
}

export default CTASection;