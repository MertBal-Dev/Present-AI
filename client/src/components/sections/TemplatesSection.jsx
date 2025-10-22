import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from '../common/Icons';

const TemplatesSection = ({ sampleTemplates, setShowTemplatePreview }) => {
  return (
      <section id="templates" className="py-24 bg-white dark:bg-dark-bg/50">
        <motion.div 
          className="max-w-7xl mx-auto px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <div className="text-center mb-16">
            <motion.h2 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Profesyonel Şablonlar</motion.h2>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="text-xl text-gray-600 dark:text-dark-text-secondary">Her ihtiyaca uygun, hazır ve özelleştirilebilir şablonlar</motion.p>
          </div>
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {sampleTemplates.map((template) => (
              <motion.div 
                key={template.id} 
                className="group cursor-pointer bg-white dark:bg-dark-card rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-border hover:border-blue-500 dark:hover:border-dark-primary hover:shadow-2xl transition-all duration-300" 
                onClick={() => setShowTemplatePreview(template)}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              >
                <div className={`h-48 bg-gradient-to-br ${template.preview.color} flex items-center justify-center text-6xl`}>{template.preview.icon}</div>
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-blue-600 dark:text-dark-secondary transition-transform duration-300 group-hover:rotate-12">{template.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{template.title}</h3>
                  </div>
                  <p className="text-gray-600 dark:text-dark-text-secondary mb-4">{template.description}</p>
                  <div className="flex items-center text-blue-600 dark:text-dark-primary font-medium group-hover:translate-x-1 transition-transform duration-300">
                    <span>Şablonu Kullan</span>
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
  );
}

export default TemplatesSection;