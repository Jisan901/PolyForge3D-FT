import React from 'react';
import { Box, Layers, Globe, MoreVertical } from 'lucide-react';
import { SceneObject, Transform } from '../types';

interface InspectorProps {
  object: SceneObject | null;
}

const Section: React.FC<{ title: string; children?: React.ReactNode; icon?: any }> = ({ title, children, icon: Icon }) => (
  <div className="border-b border-editor-border pb-2 mb-2">
    <div className="flex items-center px-3 py-2 bg-white/5 mb-1 cursor-pointer">
       {Icon && <Icon size={12} className="mr-2 text-editor-accent" />}
      <span className="text-[11px] font-bold text-editor-text uppercase tracking-wider">{title}</span>
      <div className="flex-1" />
      <MoreVertical size={12} className="text-editor-textDim cursor-pointer hover:text-white" />
    </div>
    <div className="px-3 pt-1">
      {children}
    </div>
  </div>
);

const Vector3Input: React.FC<{ label: string; value: { x: number, y: number, z: number } }> = ({ label, value }) => (
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

const Checkbox: React.FC<{ label: string; checked?: boolean }> = ({ label, checked }) => (
  <div className="flex items-center mb-2 mt-1">
    <div className="w-4 h-4 mr-2 border border-editor-border bg-editor-input rounded flex items-center justify-center">
      {checked && <div className="w-2 h-2 bg-editor-accent rounded-[1px]" />}
    </div>
    <span className="text-[11px] text-editor-text">{label}</span>
  </div>
);

const ColorInput: React.FC<{ label: string; value: string }> = ({ label, value }) => (
   <div className="flex items-center mb-2">
    <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
    <div className="flex-1 h-5 rounded border border-editor-border cursor-pointer flex items-center px-1" style={{background: value}}>
       <span className="text-[9px] mix-blend-difference text-white ml-auto">{value}</span>
    </div>
  </div>
)

const NumberInput: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center mb-2">
    <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
    <input type="number" defaultValue={value} className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent" />
  </div>
);

const Inspector: React.FC<InspectorProps> = ({ object }) => {
  if (!object) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-editor-panel border-l border-editor-border text-editor-textDim">
        <Box size={32} className="mb-2 opacity-20" />
        <span className="text-xs">No object selected</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-y-auto">
      {/* Header */}
      <div className="h-10 flex items-center px-4 border-b border-editor-border bg-editor-bg sticky top-0 z-10">
        <div className="w-4 h-4 rounded-sm bg-editor-accent mr-2" />
        <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{object.name}</span>
            <span className="text-[9px] text-editor-textDim uppercase">{object.type}</span>
        </div>
        <div className="flex-1" />
        <Checkbox label="Active" checked={true} />
      </div>

      <div className="p-1">
        {/* Transform Component */}
        {object.transform && (
          <Section title="Transform" icon={Globe}>
            <Vector3Input label="Position" value={object.transform.position} />
            <Vector3Input label="Rotation" value={object.transform.rotation} />
            <Vector3Input label="Scale" value={object.transform.scale} />
          </Section>
        )}

        {/* Dynamic Properties based on properties map */}
        {object.properties && (
           <Section title="Properties" icon={Layers}>
             {Object.entries(object.properties).map(([key, val]) => {
                if (typeof val === 'boolean') return <Checkbox key={key} label={key} checked={val} />;
                if (typeof val === 'number') return <NumberInput key={key} label={key} value={val} />;
                if (key === 'color') return <ColorInput key={key} label={key} value={val as string} />;
                return (
                    <div key={key} className="flex items-center mb-2">
                        <span className="w-24 text-[10px] text-editor-textDim capitalize">{key}</span>
                        <input type="text" defaultValue={val as string} className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent" />
                    </div>
                );
             })}
           </Section>
        )}
        
        <div className="px-3 mt-4">
             <button className="w-full py-1.5 rounded border border-editor-border bg-white/5 text-[10px] hover:bg-white/10 text-editor-text">Add Component</button>
        </div>
      </div>
    </div>
  );
};

export default Inspector;