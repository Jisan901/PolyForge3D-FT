import React from 'react';
import { Check } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

export interface BooleanInputProps {
  label: string;
  value?: boolean;
  onChange?: (val: boolean) => void;
  
  obj?: any;
  prop?: string;
}

export const BooleanInput = React.memo(({ label, value, onChange, obj, prop }: BooleanInputProps) => {
  const [inspectorValue, setInspectorValue] = useInspector<boolean>(obj, prop);
  
  // Use inspector value if obj/prop are provided, otherwise fall back to the value prop
  const displayValue = (obj && prop) ? !!inspectorValue : !!value;

  const toggle = () => {
    const newValue = !displayValue;
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
      <div className="w-[60%] flex items-center">
        <button
          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
            displayValue ? 'bg-blue-600 border-blue-500' : 'bg-[#141414] border-[#333] hover:border-gray-500'
          }`}
          onClick={toggle}
        >
          {displayValue && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
});
