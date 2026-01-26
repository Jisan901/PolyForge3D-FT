import React, { useState } from 'react';
import { Box, Layers, Globe, BoxSelect, Activity, Lightbulb, Cpu, FileCode } from 'lucide-react';
import { PropertySection } from './PropertySection';
import { Vector3Input, Checkbox, ColorInput, NumberInput, TextInput, TextureInput, RefInput, AssetInput } from './PropertyInputs';
import ContextMenu, { MenuItem } from './ContextMenu';
import { SelectorItem } from './ObjectSelector';
import { useObjectSelector } from './Utils/useSelector';
import { useEditorActions, useEditorStates } from '../contexts/EditorContext';
import { mutationCall } from "@/Editor/Mutation";

import { Editor } from "@/Editor/Editor";

import { useObserver } from "../Hooks";
import {
  TypedInspector,
  PropertyRenderer,
  MeshInspector,
  MaterialInspector,
  GeometryInspector,
  LightInspector,
  CameraInspector,
  Object3DInspector
} from './InspectorComponents';

const editor = Editor;

/* ============================================================================
   HELPER FUNCTIONS
============================================================================ */

function getIconForComponentName(name: string) {
  switch (name) {
    case 'Script': return FileCode;
    case 'Transform': return Globe;
    case 'MeshRenderer': return Box;
    case 'Rigidbody': return Activity;
    case 'Collider': return BoxSelect;
    default: return undefined;
  }
}

function getIconForComponent(name: string) {
  if (name.includes('collider')) return BoxSelect;
  if (name.includes('rigidBody')) return Activity;
  if (name.includes('light')) return Lightbulb;
  if (name.includes('script')) return Cpu;
  return Layers;
}

// Create available components list
const AVAILABLE_COMPONENTS: SelectorItem[] = editor.core.componentManager.getAllTemplate().map(e => ({
  id: e.nameCode,
  name: e.name,
  category: 'components',
  description: e.description || '',
  icon: getIconForComponentName(e.name)
}));

/* ============================================================================
   CUSTOM COMPONENT RENDERER
============================================================================ */

interface CustomComponentProps {
  object: any;
  componentName: string;
  componentData: any;
  onContextMenu: (e: React.MouseEvent) => void;
}

const CustomComponentRenderer: React.FC<CustomComponentProps> = ({
  object,
  componentName,
  componentData,
  onContextMenu
}) => {
  const renderProperty = (propKey: string, propVal: any) => {
    const path = `userData.components.${componentName}.data.${propKey}`;
    

    
    // Use standard PropertyRenderer for other types
    return (
      <PropertyRenderer
        key={path}
        object={object}
        path={path}
        value={propVal}
        label={propKey}
      />
    );
  };
    


    
  return (
    <PropertySection
      title={componentData.key}
      icon={getIconForComponent(componentData.key)}
      onContextMenu={onContextMenu}
    >
      {Object.entries(componentData.data).map(([propKey, propVal]) =>
        renderProperty(propKey, propVal)
      )}
    </PropertySection>
  );
};

/* ============================================================================
   MAIN INSPECTOR COMPONENT
============================================================================ */

const Inspector: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; component: string } | null>(null);
  const { selectedObject: object, mappedObject } = useEditorStates();
  const { onAddComponent, onRemoveComponent } = useEditorActions();

  // Use the custom hook for component selection
  const componentSelector = useObjectSelector({
    title: "Add Component",
    items: AVAILABLE_COMPONENTS,
    onSelect: (item) => {
      onAddComponent?.(item.id);
    },
  });

  const selectedName = useObserver(object, 'name');

  function getContextMenuItems(component: string): MenuItem[] {
    return [
      { label: `Reset`, action: () => onAddComponent(parseInt(component), true) },
      { separator: true },
      { label: 'Copy Component', action: () => console.log('Copy Component') },
      { label: 'Paste Component Values', action: () => console.log('Paste Values'), disabled: true },
      { separator: true },
      { label: 'Move Up', action: () => console.log('Move Up') },
      { label: 'Move Down', action: () => console.log('Move Down') },
      { separator: true },
      { label: 'Remove Component', danger: true, action: () => onRemoveComponent?.(component) },
    ];
  }

  const handleContextMenu = (e: React.MouseEvent, component: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, component });
  };

  // Empty state
  if (!mappedObject || !object) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-editor-panel border-l border-editor-border text-editor-textDim">
        <Box size={32} className="mb-2 opacity-20" />
        <span className="text-xs">No object selected</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-y-auto" key={object.uuid}>
      {/* Header */}
      <div className="h-10 flex items-center px-4 border-b border-editor-border bg-editor-bg sticky top-0 z-10 shrink-0">
        <div className="w-4 h-4 rounded-sm bg-editor-accent mr-2" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white">{selectedName}</span>
          <span className="text-[9px] text-editor-textDim uppercase">{object.type}</span>
        </div>
        <div className="flex-1" />
        <Checkbox label="Active" checked={object.visible} onChange={(val) => {
          editor.setProperty(object, 'visible', val);
        }} />
      </div>

      <div className="p-1 pb-10">
        {/* Type-Specific Inspector (Mesh, Light, Camera, etc.) */}
        <TypedInspector object={object} />

        {/* General Properties Section (if any custom mapped properties exist) */}
        {mappedObject?.map && Object.keys(mappedObject.map).length > 0 && (
          <PropertySection title="Custom Properties" icon={Layers}>
            {Object.entries(mappedObject.map).map(([key, val]) => (
              <PropertyRenderer
                key={key}
                object={object}
                path={key}
                value={val}
              />
            ))}
          </PropertySection>
        )}

        {/* Dynamic Component Sections (Scripts, Physics, etc.) */}
        {mappedObject?.components && Object.entries(mappedObject.components).map(([compName, compData]) => (
          <CustomComponentRenderer
            key={compData.key}
            object={object}
            componentName={compName}
            componentData={compData}
            onContextMenu={(e) => handleContextMenu(e, compName)}
          />
        ))}

        {/* Add Component Button */}
        {object.isObject3D && (
          <div className="px-3 mt-4">
            <button
              className="w-full py-1.5 rounded border border-editor-border bg-white/5 text-[10px] hover:bg-white/10 text-editor-text transition-colors"
              onClick={componentSelector.open}
            >
              Add Component
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.component)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Component Selector */}
      {componentSelector.Selector}
    </div>
  );
};

export default Inspector;