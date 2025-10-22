import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSlide from '../SortableSlide';
import { Eye, Download, Plus, Trash2, Undo, Redo } from '../common/Icons';

const Editor = ({
  presentationData,
  handlePresentationChange,
  theme,
  setTheme,
  setCurrentSlideIndex,
  setIsPresentationMode,
  handleDownload,
  currentTheme,
  handleDragEnd,
  handleDeleteSlide,
  handleAddSlide,
  undo,
  redo,
  canUndo,
  canRedo,
}) => {
  return (
    <section id="editor" className="py-20 bg-gray-100 dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-dark-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b dark:border-dark-border gap-4">
            <div className="flex items-center space-x-4">
              <input type="text" value={presentationData.title} onChange={(e) => handlePresentationChange(['title'], e.target.value)} className="text-3xl font-bold bg-transparent outline-none border-b-2 border-transparent hover:border-gray-300 dark:hover:border-dark-border focus:border-blue-500 dark:focus:border-dark-primary transition w-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center border-2 border-gray-200 dark:border-dark-border rounded-xl p-1 space-x-1">
                <button onClick={undo} disabled={!canUndo} className="p-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Geri Al">
                  <Undo className="w-5 h-5" />
                </button>
                <button onClick={redo} disabled={!canRedo} className="p-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition" title="Yinele">
                  <Redo className="w-5 h-5" />
                </button>
              </div>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} className="px-4 py-3 border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card rounded-xl outline-none focus:border-blue-500 dark:focus:border-dark-primary">
                <option value="gradient-blue">Mavi Gradient</option>
                <option value="sunset">Gün Batımı</option>
                <option value="ocean">Okyanus</option>
                <option value="midnight">Gece Yarısı</option>
                <option value="forest">Orman</option>
              </select>
              <button onClick={async () => {
                setCurrentSlideIndex(0);
                setIsPresentationMode(true);
              }} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition">
                <Eye className="w-5 h-5" />
                <span>Sunum Modu</span>
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => handleDownload('pptx', currentTheme)} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition">
                  <Download className="w-5 h-5" />
                  <span>PPTX</span>
                </button>
                <button onClick={() => handleDownload('pdf', currentTheme)} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition">
                  <Download className="w-5 h-5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={presentationData.slides.map(s => s.slideNumber)} strategy={verticalListSortingStrategy}>
              <div className="space-y-6">
                {presentationData.slides.map((slide, slideIndex) => (
                  <SortableSlide key={slide.slideNumber} id={slide.slideNumber} slide={slide} slideIndex={slideIndex} onUpdate={handlePresentationChange} onDelete={() => handleDeleteSlide(slideIndex)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button onClick={handleAddSlide} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl text-gray-600 dark:text-dark-text-secondary hover:border-blue-500 dark:hover:border-dark-primary hover:text-blue-500 dark:hover:text-dark-primary transition flex items-center justify-center space-x-2 mt-6">
            <Plus className="w-5 h-5" />
            <span className="font-medium">Yeni Slayt Ekle</span>
          </button>

          <div className="mt-8 pt-6 border-t dark:border-dark-border">
            <h3 className="text-2xl font-bold mb-4">Kaynakça</h3>
            <div className="space-y-3">
              {presentationData.bibliography?.map((sourceObj, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={sourceObj.citation || ''}
                    onChange={(e) => handlePresentationChange(['bibliography', index, 'citation'], e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-dark-bg border-2 border-gray-200 dark:border-dark-border rounded-xl outline-none focus:border-blue-500 dark:focus:border-dark-primary"
                  />
                  <button onClick={() => handlePresentationChange(['bibliography'], presentationData.bibliography.filter((_, i) => i !== index))} className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button onClick={() => handlePresentationChange(['bibliography'], [...(presentationData.bibliography || []), { citation: 'Yeni kaynak...' }])} className="text-sm text-blue-600 dark:text-dark-secondary hover:text-blue-700 dark:hover:text-white font-medium flex items-center space-x-1 mt-2">
                <Plus className="w-4 h-4" /><span>Kaynak Ekle</span></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Editor;
