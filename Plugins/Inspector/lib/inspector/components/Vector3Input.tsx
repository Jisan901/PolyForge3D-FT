import React, { useCallback } from 'react';
import { NumberInput } from './NumberInput';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector3InputProps {
  label: string;
  value?: Vector3;
  onChange?: (val: Vector3) => void;
  step?: number;
  
  obj?: any;
  prop?: string;
}

export const Vector3Input = React.memo(({ label, value, onChange, step = 0.1, obj, prop }: Vector3InputProps) => {

  const vectorObj = (obj && prop) ? obj[prop] : value;

  const handleX = useCallback((x: number) => {
    if (onChange && vectorObj) onChange({ ...vectorObj, x });
  }, [onChange, vectorObj]);
  const handleY = useCallback((y: number) => {
    if (onChange && vectorObj) onChange({ ...vectorObj, y });
  }, [onChange, vectorObj]);
  const handleZ = useCallback((z: number) => {
    if (onChange && vectorObj) onChange({ ...vectorObj, z });
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
        <div className="flex-1">
          <NumberInput 
            value={vectorObj?.z} 
            onChange={handleZ} 
            step={step} 
            prefix={<div className="w-6 h-full flex items-center justify-center bg-blue-900/30 text-blue-400 font-bold border-r border-[#333]">Z</div>} 
            obj={vectorObj}
            prop="z"
          />
        </div>
      </div>
    </div>
  );
});
