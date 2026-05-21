import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Settings, Plug, Zap, Globe, Settings2 } from 'lucide-react';
import { Editor } from "@/Editor/Editor";

const editor = Editor;


interface PluginConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: any;
  settings: {
    [key: string]: {
      type: 'boolean' | 'number' | 'string' | 'select';
      label: string;
      value: any;
      options?: string[];
    };
  };
}

const INITIAL_PLUGINS: PluginConfig[] = [
  {
    id: 'post-processing',
    name: 'Post Processing',
    description: 'Global visual effects and camera filters',
    enabled: true,
    icon: Zap,
    settings: {
      bloom: { type: 'boolean', label: 'Enable Bloom', value: true },
      bloomIntensity: { type: 'number', label: 'Bloom Intensity', value: 1.5 },
      depthOfField: { type: 'boolean', label: 'Depth of Field', value: false },
      antiAliasing: { type: 'select', label: 'Anti-Aliasing', value: 'FXAA', options: ['None', 'FXAA', 'SMAA', 'TAA'] },
    }
  },
  {
    id: 'physics-engine',
    name: 'Physics Engine',
    description: 'Rigid body dynamics and collision detection',
    enabled: true,
    icon: Settings,
    settings: {
      gravityValue: { type: 'number', label: 'Gravity', value: -9.81 },
      timeStep: { type: 'number', label: 'Fixed Time Step', value: 0.02 },
      solverIterations: { type: 'number', label: 'Solver Iterations', value: 10 },
    }
  },
  {
    id: 'networking',
    name: 'Multiplayer / Network',
    description: 'Server synchronization and client variables',
    enabled: false,
    icon: Globe, // using Lucide 'Globe' or something similar
    settings: {
      protocol: { type: 'select', label: 'Protocol', value: 'WebSocket', options: ['WebSocket', 'WebRTC', 'UDP'] },
      port: { type: 'number', label: 'Default Port', value: 3000 },
      autoConnect: { type: 'boolean', label: 'Auto Connect on Start', value: false },
    }
  }
];

const PluginsPanel: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginConfig[]>(editor.core.loaders.scriptLoader.globalInstances);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['post-processing']));

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlugins(plugins.map(p => {if (p.id === id ) {
        p.enabled= !p.enabled
        return p
        } return p}));
  };

  const updateSetting = (pluginId: string, settingKey: string, newValue: any) => {
    setPlugins(plugins.map(p => {
      if (p.id === pluginId) {
        return {
          ...p,
          settings: {
            ...p.settings,
            [settingKey]: {
              ...p.settings[settingKey],
              value: newValue
            }
          }
        };
      }
      return p;
    }));
  };
  console.log(plugins)
  
  return (
    <div className="h-full flex flex-col bg-editor-panel text-editor-text overflow-hidden">
      <div className="h-8 flex items-center px-4 border-b border-editor-border bg-editor-bg shrink-0">
        <Plug size={14} className="text-editor-textDim mr-2" />
        <span className="text-xs font-semibold text-white">Plugins & Systems</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {plugins.map((plugin) => {
          const isExpanded = expandedIds.has(plugin.id);
          const Icon = !plugin.icon ? Plug : plugin.icon; // Quick fix for Global icon

          return (
            <div key={plugin.id} className="mb-2 bg-black/20 border border-editor-border rounded overflow-hidden">
              {/* Header */}
              <div 
                className="flex items-center px-2 py-2 cursor-pointer hover:bg-white/5 transition-colors select-none"
                onClick={() => toggleExpand(plugin.id)}
              >
                <div className="mr-2 text-editor-textDim">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <div className="p-1 bg-editor-bg border border-editor-border rounded mr-2 text-editor-accent">
                  {plugin.id === 'networking' ? <Plug size={12} /> : <Icon size={12} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-white truncate">{plugin.name}</div>
                  <div className="text-[9px] text-editor-textDim truncate">{plugin.description}</div>
                </div>
                <div className="ml-2 flex items-center">
                   <div 
                     className={`w-6 h-3.5 rounded-full relative cursor-pointer transition-colors ${plugin.enabled ? 'bg-editor-accent' : 'bg-editor-border'}`}
                     onClick={(e) => toggleEnabled(plugin.id, e)}
                   >
                     <div className={`absolute top-[1px] left-[1px] w-3 h-3 bg-white rounded-full transition-transform ${plugin.enabled ? 'translate-x-[10px]' : 'translate-x-0'}`} />
                   </div>
                </div>
              </div>

              {/* Body (Config Options) */}
              {isExpanded && (
                <div className="p-3 bg-[#1e1e1e] border-t border-editor-border flex flex-col gap-3 relative">
                  {/* Gray out if disabled */}
                  {!plugin.enabled && (
                    <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                  )}
                  
                  {plugin.settings && Object.entries(plugin.settings).map(([key, setting]) => (
                    <div key={key} className="flex items-center justify-between text-[10px]">
                      <span className="text-editor-textDim w-1/2 pr-2 truncate" title={setting.label}>{setting.label}</span>
                      
                      <div className="w-1/2 flex justify-end">
                        {setting.type === 'boolean' && (
                          <input 
                            type="checkbox" 
                            checked={setting.value}
                            onChange={(e) => updateSetting(plugin.id, key, e.target.checked)}
                            className="w-3 h-3 bg-editor-input border border-editor-border rounded focus:outline-none focus:border-editor-accent accent-editor-accent"
                          />
                        )}
                        
                        {setting.type === 'number' && (
                          <input 
                            type="number" 
                            value={setting.value}
                            onChange={(e) => updateSetting(plugin.id, key, parseFloat(e.target.value))}
                            className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 focus:outline-none focus:border-editor-accent text-white"
                          />
                        )}
                        
                        {setting.type === 'string' && (
                          <input 
                            type="text" 
                            value={setting.value}
                            onChange={(e) => updateSetting(plugin.id, key, e.target.value)}
                            className="w-full bg-editor-input border border-editor-border rounded px-1.5 py-0.5 focus:outline-none focus:border-editor-accent text-white"
                          />
                        )}

                        {setting.type === 'select' && setting.options && (
                          <select 
                            value={setting.value}
                            onChange={(e) => updateSetting(plugin.id, key, e.target.value)}
                            className="w-full bg-editor-input border border-editor-border rounded px-1 flex-1 py-0.5 focus:outline-none focus:border-editor-accent text-white"
                          >
                            {setting.options.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
};

export default PluginsPanel;
