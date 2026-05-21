import React from 'react';

export interface ButtonInputProps {
  label: string;
  onClick?: () => void;
  obj?: any;
  prop?: string;
}

export const ButtonInput = React.memo(({ label, onClick, obj, prop }: ButtonInputProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (obj && prop && typeof obj[prop] === 'function') {
      // Execute the function with the object as its 'this' context
      obj[prop].call(obj);
    }
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] mt-1 group">
      <button
        onClick={handleClick}
        className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#1a1a1a] text-gray-200 px-2 py-1.5 rounded border border-[#444] transition-colors text-center font-medium cursor-pointer"
      >
        {label}
      </button>
    </div>
  );
});
