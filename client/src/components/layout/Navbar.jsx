import React from 'react';
import { Sparkles, Github, Menu, Sun, Moon, X } from '../common/Icons'; 

const Navbar = ({ mobileMenuOpen, setMobileMenuOpen, scrollToSection, themeMode, toggleTheme }) => {
  
  const handleMobileNavClick = (section) => {
    scrollToSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg border-b border-gray-200 dark:border-dark-border z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Present AI
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('features')} 
              className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-white transition"
            >
              Özellikler
            </button>
            <button 
              onClick={() => scrollToSection('templates')} 
              className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-white transition"
            >
              Şablonlar
            </button>
            <a 
              href="https://github.com/MertBal-Dev" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-white transition flex items-center space-x-2"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition" 
              aria-label="Toggle Dark Mode"
            >
              {themeMode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => scrollToSection('generator')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg transform hover:scale-105 transition"
            >
              Hemen Başla
            </button>
          </div>

          {/* Mobile Menu Button & Theme Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 transition" 
              aria-label="Toggle Dark Mode"
            >
              {themeMode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border shadow-lg">
          <div className="px-4 py-4 space-y-1">
            <button 
              onClick={() => handleMobileNavClick('features')} 
              className="block w-full text-left px-4 py-3 text-gray-800 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Özellikler
            </button>
            <button 
              onClick={() => handleMobileNavClick('templates')} 
              className="block w-full text-left px-4 py-3 text-gray-800 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Şablonlar
            </button>
            <a 
              href="https://github.com/MertBal-Dev" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center space-x-2 px-4 py-3 text-gray-800 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
            
            {/* Mobile CTA Button */}
            <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
              <button 
                onClick={() => handleMobileNavClick('generator')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition"
              >
                Hemen Başla
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;