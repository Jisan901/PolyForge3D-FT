import React, { useCallback } from 'react';
import { NumberInput } from './NumberInput';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector2InputProps {
  label: string;
  value?: Vector2;
  onChange?: (val: Vector2) => void;
  step?: number;
  
  obj?: any;
  prop?: string;
}

export const Vector2Input = React.memo(({ label, value, onChange, step = 0.1, obj, prop }: Vector2InputProps) => {

  const vectorObj = (obj && prop) ? obj[prop] : value;

  const handleX = useCallback((x: number) => {
    if (onChange && vectorObj) onChange({ ...vectorObj, x });
  }, [onChange, vectorObj]);
  const handleY = useCallback((y: number) => {
    if (onChange && vectorObj) onChange({ ...vectorObj, y });
  }, [onChange, vectorObj]);

  return (
    <div className="flex flex-col w-full text-xs mb-[2px]">
      <div className="text-gray-400 truncate select-none py-1">
        {label}
      </div>
      <div className="flex gap-1">
        <div className="flex-1">
          <NumberInput 
            value={vectorObj?.x} 
            onChange={handleX} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-red-900/30 text-red-400 font-bold border-r border-[#333]">X</div>} 
            obj={vectorObj}
            prop="x"
          />
        </div>
        <div className="flex-1">
          <NumberInput 
            value={vectorObj?.y} 
            onChange={handleY} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-green-900/30 text-green-400 font-bold border-r border-[#333]">Y</div>} 
            obj={vectorObj}
            prop="y"
          />
        </div>
      </div>
    </div>
  );
});
