import React from 'react';
import { motion } from 'framer-motion';
import { Robot, Sparkles, Download } from '../common/Icons';

const FeaturesSection = () => {
    return (
      <section id="features" className="py-24 bg-gray-50/50 dark:bg-dark-bg">
        <motion.div 
          className="max-w-7xl mx-auto px-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ staggerChildren: 0.2 }}
        >
          <div className="text-center mb-16">
            <motion.h2 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">Neden Present AI?</motion.h2>
            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="text-xl text-gray-600 dark:text-dark-text-secondary">Sunumlarınızı bir üst seviyeye taşıyacak özellikler</motion.p>
          </div>
          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          >
            {[
              { icon: <Robot className="w-8 h-8" />, title: 'AI Destekli İçerik', description: 'Konunuzu yazın, yapay zeka sizin için araştırıp profesyonel içerik oluştursun.', color: 'from-blue-500 to-cyan-500' },
              { icon: <Sparkles className="w-8 h-8" />, title: 'Modern Tasarımlar', description: '5+ profesyonel tema ve sınırsız özelleştirme seçeneği ile göz alıcı sunumlar.', color: 'from-purple-500 to-pink-500' },
              { icon: <Download className="w-8 h-8" />, title: 'PowerPoint & PDF Export', description: 'Hazır sunumunuzu PPTX ve PDF formatında indirin, hemen kullanmaya başlayın.', color: 'from-orange-500 to-red-500' },
            ].map((feature, idx) => (
              <motion.div 
                key={idx} 
                className="group p-8 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border transition-all duration-300"
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } }}
                whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
              >
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${feature.color} text-white mb-4 group-hover:scale-110 transition`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    );
}

export default FeaturesSection;