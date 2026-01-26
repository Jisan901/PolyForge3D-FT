import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Cpu, MousePointer2, Zap, Save, RefreshCcw } from 'lucide-react';
import { Checkbox, NumberInput, ColorInput, TextInput } from './PropertyInputs';
import {PolyForge} from "../PolyForge"


const renderer = PolyForge.editorRenderer;

interface SettingsModalProps {
  onClose: () => void;
}

type SettingsCategory = 'General' | 'Graphics' | 'Input' | 'Physics';

interface GeneralSettings {
  theme: string;
  language: string;
  autoSave: boolean;
  autoSaveInterval: number;
  showFPS: boolean;
}

interface GraphicsSettings {
  antialiasing: string;
  resolutionScale: number;
  realtimeShadows: boolean;
  ambientLight: string;
  textureQuality: string;
  // Post-processing
  bloom: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  bloomRadius: number;
  fxaa: boolean;
  ssao: boolean;
  ssaoIntensity: number;
  dof: boolean;
  dofFocus: number;
  vignette: boolean;
  vignetteIntensity: number;
}

interface PhysicsSettings {
  gravity: number;
  timeStep: number;
  maxIterations: number;
  continuousCollision: boolean;
}

interface InputBindings {
  moveTool: string;
  rotateTool: string;
  scaleTool: string;
  playPause: string;
}

const defaultSettings = PolyForge.editor.defaultSettings;
const currentSettings = PolyForge.editor.currentSettings;

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('General');
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from storage or use defaults
  const [general, setGeneral] = useState<GeneralSettings>(() => {
    
    return currentSettings ? currentSettings.general : defaultSettings.general;
  });

  const [graphics, setGraphics] = useState<GraphicsSettings>(() => {
    return currentSettings ? currentSettings.graphics  : defaultSettings.graphics;
  });

  const [physics, setPhysics] = useState<PhysicsSettings>(() => {
    return currentSettings ? currentSettings.physics : defaultSettings.physics;
  });

  const [input, setInput] = useState<InputBindings>(() => {
    return currentSettings ? currentSettings.input: defaultSettings.input;
  });

  // Apply current settings to the engine


  

  const handleSave = async () => {
    // Save to settings file
    currentSettings.general = general
    currentSettings.graphics = graphics
    currentSettings.physics = physics
    currentSettings.input = input
    
    
    await PolyForge.editor.saveSettings(currentSettings)

    // Apply settings
    PolyForge.applyGraphicsSettings(graphics);
    PolyForge.applyPhysicsSettings(physics);

    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    switch (activeCategory) {
      case 'General':
        setGeneral(defaultSettings.general);
        break;
      case 'Graphics':
        setGraphics(defaultSettings.graphics);
        break;
      case 'Physics':
        setPhysics(defaultSettings.physics);
        break;
      case 'Input':
        setInput(defaultSettings.input);
        break;
    }
    setHasChanges(true);
  };

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
      
      <TextInput 
        label="Editor Theme" 
        value={general.theme}
        onChange={(val) => {
          setGeneral({ ...general, theme: val });
          setHasChanges(true);
        }}
      />
      
      <div className="flex items-center mb-2">
        <span className="w-24 text-[10px] text-editor-textDim">Language</span>
        <select 
          value={general.language}
          onChange={(e) => {
            setGeneral({ ...general, language: e.target.value });
            setHasChanges(true);
          }}
          className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white"
        >
          <option>English</option>
          <option>Japanese</option>
          <option>Korean</option>
        </select>
      </div>
      
      <Checkbox 
        label="Auto-save Scene" 
        checked={general.autoSave}
        onChange={(checked) => {
          setGeneral({ ...general, autoSave: checked });
          setHasChanges(true);
        }}
      />
      
      <NumberInput 
        label="Auto-save Interval (min)" 
        value={general.autoSaveInterval}
        onChange={(val) => {
          setGeneral({ ...general, autoSaveInterval: val });
          setHasChanges(true);
        }}
      />
      
      <Checkbox 
        label="Show FPS Counter" 
        checked={general.showFPS}
        onChange={(checked) => {
          setGeneral({ ...general, showFPS: checked });
          setHasChanges(true);
        }}
      />
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
        <select 
          value={graphics.antialiasing}
          onChange={(e) => {
            setGraphics({ ...graphics, antialiasing: e.target.value });
            setHasChanges(true);
          }}
          className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white"
        >
          <option>None</option>
          <option>FXAA</option>
          <option>MSAA 4x</option>
          <option>MSAA 8x</option>
        </select>
      </div>
      
      <NumberInput 
        label="Resolution Scale" 
        value={graphics.resolutionScale}
        min={0.5}
        max={2.0}
        step={0.1}
        onChange={(val) => {
          setGraphics({ ...graphics, resolutionScale: val });
          setHasChanges(true);
        }}
      />
      
      <Checkbox 
        label="Real-time Shadows" 
        checked={graphics.realtimeShadows}
        onChange={(checked) => {
          setGraphics({ ...graphics, realtimeShadows: checked });
          setHasChanges(true);
        }}
      />
      
      <ColorInput 
        label="Ambient Light" 
        value={graphics.ambientLight}
        onChange={(val) => {
          setGraphics({ ...graphics, ambientLight: val });
          setHasChanges(true);
        }}
      />
      
      <div className="flex items-center mb-2">
        <span className="w-24 text-[10px] text-editor-textDim">Texture Quality</span>
        <select 
          value={graphics.textureQuality}
          onChange={(e) => {
            setGraphics({ ...graphics, textureQuality: e.target.value });
            setHasChanges(true);
          }}
          className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none text-white"
        >
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Post-Processing Section */}
      <div className="border-t border-editor-border pt-4 mt-4">
        <h4 className="text-xs font-bold text-white mb-3">Post-Processing Effects</h4>
        
        {/* Bloom */}
        <Checkbox 
          label="Bloom" 
          checked={graphics.bloom}
          onChange={(checked) => {
            setGraphics({ ...graphics, bloom: checked });
            setHasChanges(true);
          }}
        />
        {graphics.bloom && (
          <div className="ml-6 space-y-2 mt-2 border-l-2 border-editor-accent/30 pl-3">
            <NumberInput 
              label="Strength" 
              value={graphics.bloomStrength}
              min={0}
              max={3}
              step={0.1}
              onChange={(val) => {
                setGraphics({ ...graphics, bloomStrength: val });
                setHasChanges(true);
              }}
            />
            <NumberInput 
              label="Threshold" 
              value={graphics.bloomThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(val) => {
                setGraphics({ ...graphics, bloomThreshold: val });
                setHasChanges(true);
              }}
            />
            <NumberInput 
              label="Radius" 
              value={graphics.bloomRadius}
              min={0}
              max={1}
              step={0.05}
              onChange={(val) => {
                setGraphics({ ...graphics, bloomRadius: val });
                setHasChanges(true);
              }}
            />
          </div>
        )}

        {/* FXAA */}
        <Checkbox 
          label="FXAA (Anti-aliasing)" 
          checked={graphics.fxaa}
          onChange={(checked) => {
            setGraphics({ ...graphics, fxaa: checked });
            setHasChanges(true);
          }}
        />

        {/* SSAO */}
        <Checkbox 
          label="SSAO (Ambient Occlusion)" 
          checked={graphics.ssao}
          onChange={(checked) => {
            setGraphics({ ...graphics, ssao: checked });
            setHasChanges(true);
          }}
        />
        {graphics.ssao && (
          <div className="ml-6 mt-2 border-l-2 border-editor-accent/30 pl-3">
            <NumberInput 
              label="Intensity" 
              value={graphics.ssaoIntensity}
              min={0}
              max={2}
              step={0.1}
              onChange={(val) => {
                setGraphics({ ...graphics, ssaoIntensity: val });
                setHasChanges(true);
              }}
            />
          </div>
        )}

        {/* Depth of Field */}
        <Checkbox 
          label="Depth of Field" 
          checked={graphics.dof}
          onChange={(checked) => {
            setGraphics({ ...graphics, dof: checked });
            setHasChanges(true);
          }}
        />
        {graphics.dof && (
          <div className="ml-6 mt-2 border-l-2 border-editor-accent/30 pl-3">
            <NumberInput 
              label="Focus Distance" 
              value={graphics.dofFocus}
              min={0.1}
              max={100}
              step={0.5}
              onChange={(val) => {
                setGraphics({ ...graphics, dofFocus: val });
                setHasChanges(true);
              }}
            />
          </div>
        )}

        {/* Vignette */}
        <Checkbox 
          label="Vignette" 
          checked={graphics.vignette}
          onChange={(checked) => {
            setGraphics({ ...graphics, vignette: checked });
            setHasChanges(true);
          }}
        />
        {graphics.vignette && (
          <div className="ml-6 mt-2 border-l-2 border-editor-accent/30 pl-3">
            <NumberInput 
              label="Intensity" 
              value={graphics.vignetteIntensity}
              min={0}
              max={1}
              step={0.05}
              onChange={(val) => {
                setGraphics({ ...graphics, vignetteIntensity: val });
                setHasChanges(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderPhysics = () => (
    <div className="space-y-4">
      <div className="border-b border-editor-border pb-2 mb-4">
        <h3 className="text-sm font-bold text-white mb-1">Physics Engine</h3>
        <p className="text-[10px] text-editor-textDim">Global physics simulation constants.</p>
      </div>
      
      <NumberInput 
        label="Gravity (m/s²)" 
        value={physics.gravity}
        step={0.1}
        onChange={(val) => {
          setPhysics({ ...physics, gravity: val });
          setHasChanges(true);
        }}
      />
      
      <NumberInput 
        label="Time Step" 
        value={physics.timeStep}
        min={0.001}
        max={0.1}
        step={0.001}
        onChange={(val) => {
          setPhysics({ ...physics, timeStep: val });
          setHasChanges(true);
        }}
      />
      
      <NumberInput 
        label="Max Solver Iterations" 
        value={physics.maxIterations}
        min={1}
        max={50}
        step={1}
        onChange={(val) => {
          setPhysics({ ...physics, maxIterations: Math.round(val) });
          setHasChanges(true);
        }}
      />
      
      <Checkbox 
        label="Enable Continuous Collision" 
        checked={physics.continuousCollision}
        onChange={(checked) => {
          setPhysics({ ...physics, continuousCollision: checked });
          setHasChanges(true);
        }}
      />
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
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">{input.moveTool}</div>
        
        <div className="text-editor-textDim">Rotate Tool</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">{input.rotateTool}</div>
        
        <div className="text-editor-textDim">Scale Tool</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">{input.scaleTool}</div>
        
        <div className="text-editor-textDim">Play / Pause</div>
        <div className="text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 text-center">{input.playPause}</div>
      </div>
      
      <button 
        onClick={handleReset}
        className="w-full py-1 mt-4 text-[10px] bg-white/5 border border-editor-border rounded hover:bg-white/10 text-editor-text transition-colors flex items-center justify-center gap-2"
      >
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
        className="w-[600px] max-h-[80vh] bg-editor-panel border border-editor-border shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 bg-editor-bg border-b border-editor-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-editor-accent/20 text-editor-accent rounded">
              <Monitor size={16} />
            </div>
            <h2 className="text-sm font-bold text-white">Project Settings</h2>
            {hasChanges && (
              <span className="text-[9px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Unsaved</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-editor-textDim transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
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
        <div className="h-12 border-t border-editor-border bg-editor-bg px-4 flex items-center justify-between shrink-0">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-1.5 rounded text-[11px] text-editor-textDim hover:text-white transition-colors"
          >
            <RefreshCcw size={12} />
            Reset {activeCategory}
          </button>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-1.5 rounded text-[11px] text-editor-textDim hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-1.5 bg-editor-accent hover:bg-editor-accentHover text-white text-[11px] font-bold rounded shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!hasChanges}
            >
              <Save size={14} />
              Apply Settings
            </button>
          </div>
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