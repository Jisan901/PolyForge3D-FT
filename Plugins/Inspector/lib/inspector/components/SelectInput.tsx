import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';

export interface SelectOption {
  label: string;
  value: any;
}

export interface SelectInputProps {
  label: string;
  options: (SelectOption | string)[];
  value?: any;
  onChange?: (val: any) => void;
  obj?: any;
  prop?: string;
}

export const SelectInput = React.memo(({ label, options, value, onChange, obj, prop }: SelectInputProps) => {
  const [inspectorValue, setInspectorValue] = useInspector<any>(obj, prop);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const currentValue = (obj && prop) ? inspectorValue : value;

  const normalizedOptions: SelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === currentValue) || normalizedOptions[0];

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 200; // max height

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Open upwards
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 99999,
        });
      } else {
        // Open downwards
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 99999,
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = (event: Event) => {
      // Don't close if scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Capture phase to catch all scrolls
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: any) => {
    if (obj && prop) {
      setInspectorValue(optionValue);
    }
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group relative" ref={containerRef}>
      <div className="w-[40%] text-gray-400 truncate pr-2 select-none py-1">
        {label}
      </div>
      <div className="w-[60%] relative">
        <button
          ref={buttonRef}
          className="w-full flex items-center justify-between bg-[#141414] hover:bg-[#1a1a1a] text-gray-200 px-2 py-1 rounded border border-[#333] hover:border-gray-500 transition-colors text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">{selectedOption?.label ?? 'Select...'}</span>
          <ChevronDown size={12} className="text-gray-500" />
        </button>
        
        {isOpen && createPortal(
          <div 
            ref={menuRef}
            className="bg-[#1a1a1a] border border-[#333] rounded shadow-lg overflow-y-auto py-0.5"
            style={{ ...dropdownStyle, maxHeight: '200px' }}
          >
            {normalizedOptions.map((opt, i) => (
              <div
                key={i}
                className={`flex justify-between items-center px-1.5 py-0.5 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors text-[11px] ${
                  opt.value === currentValue ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'
                }`}
                onClick={() => handleSelect(opt.value)}
              >
                <span className="truncate pr-2">{opt.label}</span>
                <span className="opacity-50 truncate max-w-[50%] text-right font-mono text-[10px]">
                  {String(opt.value)}
                </span>
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
});
