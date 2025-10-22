import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import SlideEditor from './SlideEditor';

function SortableSlide({ id, slide, slideIndex, onUpdate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translateY(${transform.y}px)` : '',
    transition,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SlideEditor
        slide={slide}
        slideIndex={slideIndex}
        onUpdate={onUpdate}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default SortableSlide;