import React, { useRef, useEffect } from 'react';
import { useInspector } from '../hooks/useInspector';

export interface TextInputProps {
  label: string;
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  
  obj?: any;
  prop?: string;
}

export const TextInput = React.memo(({ label, value, onChange, disabled, obj, prop }: TextInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocused = useRef(false);
  const [inspectorValue, setInspectorValue] = useInspector<string>(obj, prop);

  const getValue = () => {
    if (obj && prop) return inspectorValue ?? '';
    return value ?? '';
  };

  useEffect(() => {
    if (obj && prop) {
      if (!isFocused.current && inputRef.current) {
        const displayValue = String(inspectorValue ?? '');
        if (inputRef.current.value !== displayValue) {
          inputRef.current.value = displayValue;
        }
      }
    } else {
      if (!isFocused.current && inputRef.current && value !== undefined) {
        if (inputRef.current.value !== value) {
          inputRef.current.value = value;
        }
      }
    }
  }, [obj, prop, inspectorValue, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (obj && prop) {
      setInspectorValue(newValue);
    }
    if (onChange) onChange(newValue);
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group">
      <div className="w-[40%] text-gray-400 truncate pr-2 select-none py-1">
        {label}
      </div>
      <div className="w-[60%] flex">
        <input
          ref={inputRef}
          type="text"
          defaultValue={getValue()}
          disabled={disabled}
          className={`w-full bg-[#141414] text-gray-200 px-2 py-1 rounded border border-[#333] focus:outline-none focus:border-blue-500 focus:bg-[#1a1a1a] transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onFocus={() => { isFocused.current = true; }}
          onBlur={() => { isFocused.current = false; }}
          onChange={handleChange}
        />
      </div>
    </div>
  );
});
