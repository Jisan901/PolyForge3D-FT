import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Cpu, MousePointer2, Zap, Save, RefreshCcw } from 'lucide-react';
import { Checkbox, NumberInput, ColorInput, TextInput } from './PropertyInputs';

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsCategory = 'General' | 'Graphics' | 'Input' | 'Physics';

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('General');

  const categories: { id: SettingsCategory; icon: any }[] = [
    { id: 'General', icon: Monitor },
    { id: 'Graphics', icon: Zap },
    { id: 'Input', icon: MousePointer2 },
    { id: 'Physics', icon: Cpu },
  ];

  const renderGeneral = () => (
    <div className="space-y-4">
      <div className="border-b border-editor-border pb-2 mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Editor Preferences</h3>
        <p className="text-[10px] text-editor-textDim">Adjust the visual appearance and behavior of PolyForge.</p>
      </div>
      <TextInput label="Editor Theme" value="Dark (Standard)" />
      <div className="flex items-center mb-2">
        <span className="w-24 text-[10px] text-editor-textDim">Language</span>
        <select className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white">
          <option>English</option>
          <option>Japanese</option>
          <option>Korean</option>
        </select>
      </div>
      <Checkbox label="Auto-save Scene" checked={true} />
      <NumberInput label="Auto-save Interval (min)" value={5} />
      <Checkbox label="Show FPS Counter" checked={false} />
    </div>
  );

  const renderGraphics = () => (
    <div className="space-y-4">
       <div className="border-b border-editor-border pb-2 mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Rendering Quality</h3>
        <p className="text-[10px] text-editor-textDim">Configure real-time viewport graphics settings.</p>
      </div>
      <div className="flex items-center mb-2">
        <span className="w-24 text-[10px] text-editor-textDim">Antialiasing</span>
        <select className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white">
          <option>None</option>
          <option>FXAA</option>
          <option>MSAA 4x</option>
          <option>MSAA 8x</option>
        </select>
      </div>
      <NumberInput label="Resolution Scale" value={1.0} />
      <Checkbox label="Real-time Shadows" checked={true} />
      <ColorInput label="Ambient Light" value="#1a1a1a" />
      <div className="flex items-center mb-2">
        <span className="w-24 text-[10px] text-editor-textDim">Texture Quality</span>
        <select className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
    </div>
  );

  const renderPhysics = () => (
    <div className="space-y-4">
       <div className="border-b border-editor-border pb-2 mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Physics Engine</h3>
        <p className="text-[10px] text-editor-textDim">Global physics simulation constants.</p>
      </div>
      <NumberInput label="Gravity (m/s²)" value={-9.81} />
      <NumberInput label="Time Step" value={0.02} />
      <NumberInput label="Max Solver Iterations" value={10} />
      <Checkbox label="Enable Continuous Collision" checked={true} />
    </div>
  );

  const renderInput = () => (
    <div className="space-y-4">
       <div className="border-b border-editor-border pb-2 mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Input Bindings</h3>
        <p className="text-[10px] text-editor-textDim">View and modify editor shortcuts.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="text-editor-textDim">Move Tool</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">W</div>
        <div className="text-editor-textDim">Rotate Tool</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">E</div>
        <div className="text-editor-textDim">Scale Tool</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">R</div>
        <div className="text-editor-textDim">Play / Pause</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">Ctrl + P</div>
      </div>
      <button className="w-full py-1 mt-4 text-[10px] bg-white/5 border border-editor-border rounded hover:bg-white/10 text-editor-text transition-colors flex items-center justify-center gap-2">
        <RefreshCcw size={10} /> Reset to Defaults
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeCategory) {
      case 'General': return renderGeneral();
      case 'Graphics': return renderGraphics();
      case 'Input': return renderInput();
      case 'Physics': return renderPhysics();
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[600px] h-[450px] bg-editor-panel border border-editor-border shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 bg-editor-bg border-b border-editor-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-editor-accent/20 text-editor-accent rounded">
              <Monitor size={16} />
            </div>
            <h2 className="text-sm font-bold text-white">Project Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-editor-textDim transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 border-r border-editor-border bg-black/10 flex flex-col p-2 gap-1 shrink-0">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs transition-all ${activeCategory === cat.id ? 'bg-editor-accent text-white shadow-lg' : 'text-editor-textDim hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon size={14} />
                  {cat.id}
                </button>
              );
            })}
          </div>

          {/* Settings Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-editor-bg/20 custom-scrollbar">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-editor-border bg-editor-bg px-4 flex items-center justify-end gap-2 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-1.5 rounded text-[11px] text-editor-textDim hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-1.5 bg-editor-accent hover:bg-editor-accentHover text-white text-[11px] font-bold rounded shadow-lg transition-all"
          >
            <Save size={14} />
            Apply Settings
          </button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>,
    document.body
  );
};

export default SettingsModal;