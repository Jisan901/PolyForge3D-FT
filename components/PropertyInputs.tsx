import React from 'react';

export const Vector3Input: React.FC<{ label: string; value: { x: number, y: number, z: number } }> = ({ label, value }) => (
  <div className="flex items-center mb-1">
    <div className="w-16 text-[10px] text-editor-textDim flex items-center">{label}</div>
    <div className="flex-1 flex gap-1">
      <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
        <div className="w-4 flex items-center justify-center text-[9px] font-bold text-red-400 cursor-ew-resize bg-white/5 h-full">X</div>
        <input type="number" defaultValue={value.x} className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner" />
      </div>
      <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
        <div className="w-4 flex items-center justify-center text-[9px] font-bold text-green-400 cursor-ew-resize bg-white/5 h-full">Y</div>
        <input type="number" defaultValue={value.y} className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner" />
      </div>
      <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
        <div className="w-4 flex items-center justify-center text-[9px] font-bold text-blue-400 cursor-ew-resize bg-white/5 h-full">Z</div>
        <input type="number" defaultValue={value.z} className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner" />
      </div>
    </div>
  </div>
);

export const Checkbox: React.FC<{ label: string; checked?: boolean }> = ({ label, checked }) => (
  <div className="flex items-center mb-2 mt-1">
    <div className="w-4 h-4 mr-2 border border-editor-border bg-editor-input rounded flex items-center justify-center">
      {checked && <div className="w-2 h-2 bg-editor-accent rounded-[1px]" />}
    </div>
    <span className="text-[11px] text-editor-text">{label}</span>
  </div>
);

export const ColorInput: React.FC<{ label: string; value: string }> = ({ label, value }) => (
   <div className="flex items-center mb-2">
    <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
    <div className="flex-1 h-5 rounded border border-editor-border cursor-pointer flex items-center px-1" style={{background: value}}>
       <span className="text-[9px] mix-blend-difference text-white ml-auto">{value}</span>
    </div>
  </div>
);

export const NumberInput: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center mb-2">
    <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
    <input type="number" defaultValue={value} className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent" />
  </div>
);

export const TextInput: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center mb-2">
      <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
      <input type="text" defaultValue={value} className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent" />
  </div>
);
