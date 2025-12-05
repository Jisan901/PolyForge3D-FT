import React, { useState } from 'react';
import { Box, Layers, Globe } from 'lucide-react';
import { SceneObject } from '../types';
import { PropertySection } from './PropertySection';
import { Vector3Input, Checkbox, ColorInput, NumberInput, TextInput } from './PropertyInputs';
import ContextMenu, { MenuItem } from './ContextMenu';

interface InspectorProps {
  object: SceneObject | null;
}

const Inspector: React.FC<InspectorProps> = ({ object }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; component: string } | null>(null);

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

        {/* Dynamic Properties based on properties map */}
        {object.properties && (
           <PropertySection 
            title="Properties" 
            icon={Layers}
            onContextMenu={(e) => handleContextMenu(e, 'Properties')}
           >
             {Object.entries(object.properties).map(([key, val]) => {
                if (typeof val === 'boolean') return <Checkbox key={key} label={key} checked={val} />;
                if (typeof val === 'number') return <NumberInput key={key} label={key} value={val} />;
                if (key === 'color') return <ColorInput key={key} label={key} value={val as string} />;
                return <TextInput key={key} label={key} value={val as string} />;
             })}
           </PropertySection>
        )}
        
        <div className="px-3 mt-4">
             <button className="w-full py-1.5 rounded border border-editor-border bg-white/5 text-[10px] hover:bg-white/10 text-editor-text transition-colors">Add Component</button>
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
    </div>
  );
};

export default Inspector;
