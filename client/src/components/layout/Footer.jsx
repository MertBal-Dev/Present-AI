import React from 'react';
import { Sparkles, Github, Code } from '../common/Icons';

const Footer = ({ scrollToSection }) => {
  
  
  const technologies = [
    { name: 'React 18', url: 'https://react.dev/' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
    { name: 'Node.js', url: 'https://nodejs.org/' },
    { name: 'Express.js', url: 'https://expressjs.com/' },
    { name: 'Gemini AI API', url: 'https://deepmind.google/technologies/gemini/' },
    { name: 'Framer Motion', url: 'https://www.framer.com/motion/' }
  ];

  return (
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Present AI</span>
              </div>
              <p className="text-gray-400">AI destekli sunum hazırlama platformu</p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Teknolojiler</h4>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <a 
                    key={tech.name}
                    href={tech.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium hover:bg-gray-600 hover:text-white transform hover:scale-105 transition"
                  >
                    {tech.name}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Özellikler</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition">AI İçerik Oluşturma</button></li>
                <li><button onClick={() => scrollToSection('templates')} className="hover:text-white transition">Hazır Şablonlar</button></li>
                <li className="text-gray-400">PPTX & PDF Export</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Geliştirici</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://github.com/MertBal-Dev" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center space-x-2">
                    <Github className="w-4 h-4" />
                    <span>@MertBal-Dev</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2025 Present AI • Açık Kaynak Projesi</p>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Code className="w-4 h-4" />
              <span className="text-sm">Built with React, Tailwind & Gemini AI</span>
            </div>
          </div>
        </div>
      </footer>
  );
}

export default Footer;