import React, { useState } from 'react';
import { Box, Layers, Globe, BoxSelect, Activity, Lightbulb, Cpu, Circle, Camera, Volume2, FileCode } from 'lucide-react';
import { SceneObject } from '../types';
import { PropertySection } from './PropertySection';
import { Vector3Input, Checkbox, ColorInput, NumberInput, TextInput } from './PropertyInputs';
import ContextMenu, { MenuItem } from './ContextMenu';
import { ObjectSelector, SelectorItem } from './ObjectSelector';

interface InspectorProps {
  object: SceneObject | null;
  onAddComponent?: (componentName: string) => void;
}

const AVAILABLE_COMPONENTS: SelectorItem[] = [
    // Physics
    { id: 'RigidBody', name: 'RigidBody', category: 'Physics', icon: Activity, description: 'Adds physics simulation to the object' },
    { id: 'BoxCollider', name: 'Box Collider', category: 'Physics', icon: BoxSelect, description: 'Box-shaped primitive collider' },
    { id: 'SphereCollider', name: 'Sphere Collider', category: 'Physics', icon: Circle, description: 'Sphere-shaped primitive collider' },
    { id: 'MeshCollider', name: 'Mesh Collider', category: 'Physics', icon: Box, description: 'Collider based on mesh geometry' },
    
    // Rendering
    { id: 'Light', name: 'Light', category: 'Rendering', icon: Lightbulb, description: 'Illuminates the scene' },
    { id: 'Camera', name: 'Camera', category: 'Rendering', icon: Camera, description: 'Renders the scene to a viewport' },
    { id: 'MeshRenderer', name: 'Mesh Renderer', category: 'Rendering', icon: Box, description: 'Renders the geometry' },
    
    // Audio
    { id: 'AudioSource', name: 'Audio Source', category: 'Audio', icon: Volume2, description: 'Plays audio clips in the scene' },
    { id: 'AudioListener', name: 'Audio Listener', category: 'Audio', icon: Volume2, description: 'Receives audio input' },

    // Scripts
    { id: 'Script', name: 'New Script', category: 'Scripts', icon: FileCode, description: 'Create a new behavior script' },
    { id: 'PlayerController', name: 'Player Controller', category: 'Scripts', icon: FileCode, description: 'Custom script' },
    { id: 'GameManager', name: 'Game Manager', category: 'Scripts', icon: FileCode, description: 'Custom script' },
];

const Inspector: React.FC<InspectorProps> = ({ object, onAddComponent }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; component: string } | null>(null);
  const [showAddComponent, setShowAddComponent] = useState(false);

  const handleContextMenu = (e: React.MouseEvent, component: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, component });
  };

  const getContextMenuItems = (component: string): MenuItem[] => [
    { label: `Reset ${component}`, action: () => console.log(`Resetting ${component}`) },
    { separator: true, label: '', action: () => {} },
    { label: 'Copy Component', action: () => console.log('Copy Component') },
    { label: 'Paste Component Values', action: () => console.log('Paste Values'), disabled: true },
    { separator: true, label: '', action: () => {} },
    { label: 'Move Up', action: () => console.log('Move Up') },
    { label: 'Move Down', action: () => console.log('Move Down') },
    { separator: true, label: '', action: () => {} },
    { label: 'Remove Component', danger: true, action: () => console.log('Remove Component') },
  ];

  const getIconForComponent = (name: string) => {
      if (name.includes('Collider')) return BoxSelect;
      if (name.includes('RigidBody')) return Activity;
      if (name.includes('Light')) return Lightbulb;
      if (name.includes('Script')) return Cpu;
      return Layers;
  };

  const renderPropertyInput = (key: string, val: any) => {
    if (typeof val === 'boolean') return <Checkbox key={key} label={key} checked={val} />;
    if (typeof val === 'number') return <NumberInput key={key} label={key} value={val} />;
    if (key === 'color') return <ColorInput key={key} label={key} value={val as string} />;
    if (key.toLowerCase().includes('position') || key.toLowerCase().includes('rotation') || key.toLowerCase().includes('scale') || (typeof val === 'object' && 'x' in val && 'y' in val && 'z' in val)) {
         return <Vector3Input key={key} label={key} value={val} />;
    }
    return <TextInput key={key} label={key} value={String(val)} />;
  };

  if (!object) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-editor-panel border-l border-editor-border text-editor-textDim">
        <Box size={32} className="mb-2 opacity-20" />
        <span className="text-xs">No object selected</span>
      </div>
    );
  }

  // Split properties into "simple" (generic properties) and "complex" (components)
  const simpleProps: Record<string, any> = {};
  const components: Record<string, any> = {};

  if (object.properties) {
      Object.entries(object.properties).forEach(([key, val]) => {
          if (typeof val === 'object' && val !== null && !Array.isArray(val) && !('x' in val && 'y' in val && 'z' in val)) {
              components[key] = val;
          } else {
              simpleProps[key] = val;
          }
      });
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-y-auto">
      {/* Header */}
      <div className="h-10 flex items-center px-4 border-b border-editor-border bg-editor-bg sticky top-0 z-10 shrink-0">
        <div className="w-4 h-4 rounded-sm bg-editor-accent mr-2" />
        <div className="flex flex-col">
            <span className="text-xs font-bold text-white">{object.name}</span>
            <span className="text-[9px] text-editor-textDim uppercase">{object.type}</span>
        </div>
        <div className="flex-1" />
        <Checkbox label="Active" checked={true} />
      </div>

      <div className="p-1 pb-10">
        {/* Transform Component */}
        {object.transform && (
          <PropertySection 
            title="Transform" 
            icon={Globe}
            onContextMenu={(e) => handleContextMenu(e, 'Transform')}
          >
            <Vector3Input label="Position" value={object.transform.position} />
            <Vector3Input label="Rotation" value={object.transform.rotation} />
            <Vector3Input label="Scale" value={object.transform.scale} />
          </PropertySection>
        )}

        {/* General Properties Section */}
        {Object.keys(simpleProps).length > 0 && (
           <PropertySection 
            title="Properties" 
            icon={Layers}
            onContextMenu={(e) => handleContextMenu(e, 'Properties')}
           >
             {Object.entries(simpleProps).map(([key, val]) => renderPropertyInput(key, val))}
           </PropertySection>
        )}

        {/* Dynamic Component Sections */}
        {Object.entries(components).map(([compName, compData]) => (
            <PropertySection
                key={compName}
                title={compName}
                icon={getIconForComponent(compName)}
                onContextMenu={(e) => handleContextMenu(e, compName)}
            >
                {Object.entries(compData).map(([propKey, propVal]) => renderPropertyInput(propKey, propVal))}
            </PropertySection>
        ))}
        
        <div className="px-3 mt-4">
             <button 
                className="w-full py-1.5 rounded border border-editor-border bg-white/5 text-[10px] hover:bg-white/10 text-editor-text transition-colors"
                onClick={() => setShowAddComponent(true)}
             >
                Add Component
             </button>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.component)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {showAddComponent && (
          <ObjectSelector 
             title="Add Component"
             items={AVAILABLE_COMPONENTS}
             onClose={() => setShowAddComponent(false)}
             onSelect={(item) => {
                 onAddComponent && onAddComponent(item.id);
                 setShowAddComponent(false);
             }}
          />
      )}
    </div>
  );
};

export default Inspector;