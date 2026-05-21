import React, { useCallback, useState, useEffect } from 'react';
import { useInspector } from '../hooks/useInspector';

export interface ColorInputProps {
  label: string;
  value?: string;
  onChange?: (val: string) => void;
  obj?: any;
  prop?: string;
}

export const ColorInput = React.memo(({ label, value, onChange, obj, prop }: ColorInputProps) => {
  const [inspectorValue, setInspectorValue] = useInspector<any>(obj, prop);
  
  const currentValue = (obj && prop) ? inspectorValue : value;
  
  // Convert THREE.Color to hex string for input type="color"
  const getHexString = (color: any) => {
    if (!color) return '#ffffff';
    if (typeof color === 'string') return color;
    if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0');
    if (color.isColor) return '#' + color.getHexString();
    return '#ffffff';
  };

  const [localValue, setLocalValue] = useState(getHexString(currentValue));

  useEffect(() => {
    setLocalValue(getHexString(currentValue));
  }, [currentValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setLocalValue(hex);
    
    if (obj && prop) {
      if (obj[prop] && obj[prop].isColor) {
        obj[prop].set(hex);
        setInspectorValue(obj[prop]);
      } else {
        setInspectorValue(hex);
      }
    }
    if (onChange) {
      onChange(hex);
    }
  }, [obj, prop, onChange, setInspectorValue]);

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group relative">
      <div className="w-[40%] text-gray-400 truncate pr-2 select-none py-1">
        {label}
      </div>
      <div className="w-[60%] flex items-center">
        <input
          type="color"
          value={localValue}
          onChange={handleChange}
          className="w-full h-6 bg-[#141414] border border-[#333] rounded cursor-pointer"
        />
        <span className="ml-2 text-gray-500 font-mono text-[10px] w-12">{localValue}</span>
      </div>
    </div>
  );
});
