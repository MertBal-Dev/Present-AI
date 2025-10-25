import React, { useState, useRef } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SlideImage from './presentation/SlideImage';
import {
  Trash2,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  X,
  UploadCloud
} from '../components/common/Icons';

function SortableContentItem({ id, item, onUpdate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : '',
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-3 mb-2 bg-white dark:bg-dark-bg rounded-lg p-3 shadow-sm border border-gray-200 dark:border-dark-border"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={item}
          onChange={onUpdate}
          className="flex-1 min-w-0 bg-transparent px-3 py-2 border-none outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-dark-primary rounded-md text-gray-900 dark:text-dark-text text-sm sm:text-base"
        />
      </div>

      <button
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SlideEditor({ slide, slideIndex, onUpdate, onDelete, dragHandleProps }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('slideImage', file);

      const API_URL = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001'}/upload-image`;




      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Yükleme başarısız');

      onUpdate(['slides', slideIndex, 'imageUrl'], data.imageUrl);
      onUpdate(['slides', slideIndex, 'imageKeywords', 'query'], '');
    } catch (error) {
      alert(`Hata: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-2 border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden hover:border-indigo-400 dark:hover:border-dark-primary transition bg-white dark:bg-dark-card shadow-sm">
      <div className="bg-gray-50 dark:bg-dark-card/50 p-4 flex items-center justify-between border-b dark:border-dark-border">
        <div className="flex items-center space-x-4 flex-1">
          <button {...dragHandleProps} className="cursor-grab p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <input
              type="text"
              value={slide.title}
              onChange={(e) => onUpdate(['slides', slideIndex, 'title'], e.target.value)}
              className="text-lg font-bold bg-transparent outline-none border-b-2 border-transparent hover:border-gray-300 dark:hover:border-dark-border focus:border-indigo-500 dark:focus:border-dark-primary transition w-full text-gray-900 dark:text-dark-text"
              placeholder="Slayt başlığı..."
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-dark-text-secondary font-medium bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md">
            Slayt {slide.slideNumber}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
            {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-100 dark:hover:bg-red-500/10 text-red-500 rounded-lg transition">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Düzen</label>
            <select
              value={slide.layout || 'title-and-content'}
              onChange={(e) => onUpdate(['slides', slideIndex, 'layout'], e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-xl outline-none focus:border-indigo-500 dark:focus:border-dark-primary text-gray-900 dark:text-dark-text"
            >
              <option value="title-and-content">Başlık ve İçerik</option>
              <option value="title-only">Sadece Başlık</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              {(slide.layout === 'title-and-content' || !slide.layout) && slide.content?.map((block, blockIdx) => (
                block.type === 'paragraph' ? (
                  <div key={blockIdx} className="bg-gray-50 dark:bg-dark-bg/50 p-4 rounded-xl">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Paragraf</label>
                    <textarea
                      value={block.value.replace(/<[^>]*>/g, '')}
                      onChange={(e) => onUpdate(['slides', slideIndex, 'content', blockIdx, 'value'], `<p>${e.target.value}</p>`)}
                      className="w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text px-3 py-2 border-2 border-gray-200 dark:border-dark-border rounded-lg outline-none focus:border-indigo-500 dark:focus:border-dark-primary resize-y"
                      rows="4"
                    />
                  </div>
                ) : block.type === 'bullet_list' ? (
                  <div key={blockIdx} className="bg-gray-50 dark:bg-dark-bg/50 p-4 rounded-xl">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Madde Listesi</label>
                    <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                      if (active.id !== over.id) {
                        const reordered = arrayMove(block.items, active.id, over.id);
                        onUpdate(['slides', slideIndex, 'content', blockIdx, 'items'], reordered);
                      }
                    }}>
                      <SortableContext items={block.items.map((_, i) => i)} strategy={verticalListSortingStrategy}>
                        {block.items.map((item, itemIdx) => (
                          <SortableContentItem
                            key={itemIdx}
                            id={itemIdx}
                            item={item.replace(/<[^>]*>/g, '')}
                            onUpdate={(e) => onUpdate(['slides', slideIndex, 'content', blockIdx, 'items', itemIdx], e.target.value)}
                            onRemove={() => onUpdate(['slides', slideIndex, 'content', blockIdx, 'items'], block.items.filter((_, i) => i !== itemIdx))}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <button
                      onClick={() => onUpdate(['slides', slideIndex, 'content', blockIdx, 'items'], [...(block.items || []), 'Yeni madde'])}
                      className="text-sm text-blue-600 dark:text-dark-secondary hover:text-blue-700 dark:hover:text-white font-medium flex items-center space-x-1 mt-3"
                    >
                      <Plus className="w-4 h-4" /><span>Madde Ekle</span>
                    </button>
                  </div>
                ) : null
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Konuşmacı Notları</label>
                <textarea
                  value={slide.notes || ''}
                  onChange={(e) => onUpdate(['slides', slideIndex, 'notes'], e.target.value)}
                  className="w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text px-4 py-3 border-2 border-gray-200 dark:border-dark-border rounded-xl outline-none focus:border-indigo-500 dark:focus:border-dark-primary resize-none h-24"
                  placeholder="Bu slayt için notlarınız..."
                />
              </div>
            </div>

            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">Görsel</label>
              <div className="space-y-2">
                <div className="w-full h-40 bg-gray-200 dark:bg-dark-bg rounded-lg overflow-hidden border dark:border-dark-border">
                  <SlideImage
                    keywords={slide.imageKeywords}
                    existingImageUrl={slide.imageUrl}
                    onImageChange={(newUrl) => onUpdate(['slides', slideIndex, 'imageUrl'], newUrl)}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Görsel konusu..."
                  value={slide.imageKeywords?.query || ''}
                  onChange={(e) => onUpdate(['slides', slideIndex, 'imageKeywords', 'query'], e.target.value)}
                  className="w-full bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text px-3 py-2 border-2 border-gray-200 dark:border-dark-border rounded-lg outline-none focus:border-indigo-500 dark:focus:border-dark-primary"
                  title="Yapay zeka için görsel konusu"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full mt-1 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition ${isUploading
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      <span>Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Görsel Yükle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SlideEditor;
