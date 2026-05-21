import React, { useRef, useEffect } from 'react';
import { useInspector } from '../hooks/useInspector';

export interface SliderInputProps {
  label: string;
  value?: number;
  onChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  
  obj?: any;
  prop?: string;
}

export const SliderInput = React.memo(({ label, value, onChange, min = 0, max = 100, step = 1, obj, prop }: SliderInputProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useRef(false);
  const isDragging = useRef(false);
  const [inspectorValue, setInspectorValue] = useInspector<number>(obj, prop);

  const getValue = () => {
    let val = obj && prop ? inspectorValue : value;
    return typeof val === 'number' ? val : Number(val) || 0;
  };

  const updateDOM = (val: number) => {
    if (fillRef.current) {
      const range = max - min;
      const percent = range === 0 ? 0 : Math.max(0, Math.min(100, ((val - min) / range) * 100));
      fillRef.current.style.width = `${percent}%`;
    }
    if (inputRef.current && !isFocused.current) {
      inputRef.current.value = String(val);
    }
  };

  useEffect(() => {
    if (obj && prop) {
      if (!isDragging.current) {
        updateDOM(inspectorValue ?? 0);
      }
    } else {
      if (!isDragging.current && value !== undefined) {
        updateDOM(value);
      }
    }
  }, [obj, prop, inspectorValue, value, min, max]);

  const updateValue = (newValue: number) => {
    if (obj && prop) {
      setInspectorValue(newValue);
    }
    if (onChange) onChange(newValue);
  };

  const handleDragStart = (clientX: number, pointerId?: number) => {
    isDragging.current = true;
    
    const updateFromClientX = (cx: number, e?: Event) => {
      if (e && e.cancelable) e.preventDefault();
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
      let newValue = min + percent * (max - min);
      
      if (step > 0) {
        const precision = Math.max(0, (step.toString().split('.')[1] || '').length);
        newValue = Math.round(newValue / step) * step;
        newValue = parseFloat(newValue.toFixed(precision));
      }
      
      updateDOM(newValue);
      updateValue(newValue);
    };

    updateFromClientX(clientX);

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerId !== undefined && e.pointerId !== pointerId) return;
      updateFromClientX(e.clientX, e);
    };

    const handleEnd = (e: PointerEvent) => {
      if (pointerId !== undefined && e.pointerId !== pointerId) return;
      isDragging.current = false;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handleEnd);
      document.removeEventListener('pointercancel', handleEnd);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handleEnd);
    document.addEventListener('pointercancel', handleEnd);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDragStart(e.clientX, e.pointerId);
  };

  const handleBlur = () => {
    isFocused.current = false;
    if (inputRef.current) {
      let val = parseFloat(inputRef.current.value);
      if (isNaN(val)) val = getValue();
      
      if (min !== undefined) val = Math.max(min, val);
      if (max !== undefined) val = Math.min(max, val);
      
      if (step !== undefined && step > 0) {
        const precision = Math.max(0, (step.toString().split('.')[1] || '').length);
        val = Math.round(val / step) * step;
        val = parseFloat(val.toFixed(precision));
      }
      
      inputRef.current.value = String(val);
      updateDOM(val);
      updateValue(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group">
      <div className="w-[40%] text-gray-400 truncate pr-2 select-none py-1">
        {label}
      </div>
      <div className="w-[60%] flex items-center gap-2">
        <div 
          ref={trackRef}
          className="flex-1 h-5 bg-[#222] rounded border border-[#333] relative cursor-pointer overflow-hidden touch-pan-y"
          onPointerDown={handlePointerDown}
        >
          <div 
            ref={fillRef}
            className="absolute top-0 left-0 bottom-0 bg-blue-600/50 border-r border-blue-500 pointer-events-none"
            style={{ width: `${(max - min) === 0 ? 0 : Math.max(0, Math.min(100, ((getValue() - min) / (max - min)) * 100))}%` }}
          />
        </div>
        <input 
          ref={inputRef}
          type="text"
          defaultValue={getValue()}
          onFocus={() => { isFocused.current = true; }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-12 bg-transparent text-right text-gray-300 font-mono focus:outline-none focus:bg-[#141414] focus:border-[#333] border border-transparent rounded px-1"
        />
      </div>
    </div>
  );
});
