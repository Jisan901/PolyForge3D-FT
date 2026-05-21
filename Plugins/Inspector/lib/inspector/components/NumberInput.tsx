import React, { useRef, useEffect } from 'react';
import { useInspector } from '../hooks/useInspector';

export interface NumberInputProps {
  label?: string;
  value?: number;
  onChange?: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  prefix?: React.ReactNode;
  
  obj?: any;
  prop?: string;
}

export const NumberInput = React.memo(({ label, value, onChange, step = 1, min, max, prefix, obj, prop }: NumberInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const isFocused = useRef(false);
  const [inspectorValue, setInspectorValue] = useInspector<number>(obj, prop);

  const getValue = () => {
    if (obj && prop) return inspectorValue ?? 0;
    return value ?? 0;
  };

  useEffect(() => {
    if (obj && prop) {
      if (!isDragging.current && !isFocused.current && inputRef.current) {
        const displayValue = String(inspectorValue ?? 0);
        if (inputRef.current.value !== displayValue) {
          inputRef.current.value = displayValue;
        }
      }
    } else {
      if (!isDragging.current && !isFocused.current && inputRef.current && value !== undefined) {
        const displayValue = String(value);
        if (inputRef.current.value !== displayValue) {
          inputRef.current.value = displayValue;
        }
      }
    }
  }, [obj, prop, inspectorValue, value]);

  const updateValue = (newValue: number) => {
    if (obj && prop) {
      setInspectorValue(newValue);
    }
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleDragStart = (clientX: number, pointerId?: number) => {
    if (isFocused.current) return;
    isDragging.current = true;
    const startX = clientX;
    const startValue = getValue();

    const handleMove = (moveClientX: number, shiftKey: boolean, altKey: boolean, e?: Event) => {
      if (e && e.cancelable) e.preventDefault();
      const deltaX = moveClientX - startX;
      let currentStep = step;
      if (shiftKey) currentStep *= 0.1;
      if (altKey) currentStep *= 10;

      let newValue = startValue + deltaX * currentStep;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      
      const precision = Math.max(0, (currentStep.toString().split('.')[1] || '').length);
      newValue = parseFloat(newValue.toFixed(precision));
      
      if (inputRef.current) {
        inputRef.current.value = String(newValue);
      }
      updateValue(newValue);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerId !== undefined && e.pointerId !== pointerId) return;
      handleMove(e.clientX, e.shiftKey, e.altKey, e);
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
      const parsed = parseFloat(inputRef.current.value);
      if (!isNaN(parsed)) {
        let newValue = parsed;
        if (min !== undefined) newValue = Math.max(min, newValue);
        if (max !== undefined) newValue = Math.min(max, newValue);
        
        if (step !== undefined && step > 0) {
          const precision = Math.max(0, (step.toString().split('.')[1] || '').length);
          newValue = Math.round(newValue / step) * step;
          newValue = parseFloat(newValue.toFixed(precision));
        }

        inputRef.current.value = String(newValue);
        if (newValue !== getValue()) {
          updateValue(newValue);
        }
      } else {
        inputRef.current.value = String(getValue());
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group">
      {label !== undefined && (
        <div 
          className="w-[40%] text-gray-400 truncate pr-2 select-none cursor-ew-resize group-hover:text-gray-200 transition-colors py-1 touch-pan-y"
          onPointerDown={handlePointerDown}
        >
          {label}
        </div>
      )}
      <div className={`${label !== undefined ? 'w-[60%]' : 'w-full'} flex relative`}>
        {prefix && (
          <div 
            className="absolute left-0 top-0 bottom-0 flex items-stretch cursor-ew-resize z-10 touch-pan-y" 
            onPointerDown={handlePointerDown}
          >
            {prefix}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          defaultValue={getValue()}
          className={`w-full bg-[#141414] text-gray-200 py-1 rounded border border-[#333] focus:outline-none focus:border-blue-500 focus:bg-[#1a1a1a] transition-colors ${prefix ? 'pl-7 pr-1' : 'px-2'}`}
          onFocus={() => { isFocused.current = true; }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
});
