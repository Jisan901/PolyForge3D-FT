import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Box, Camera, Lightbulb, Folder, Eye, Layers, Circle, Cylinder, Square, List, ListTree } from 'lucide-react';
import { SceneObject, ObjectType } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';

interface HierarchyProps {
  data: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAddObject?: (type: ObjectType, parentId?: string) => void;
}

const Hierarchy: React.FC<HierarchyProps> = ({ data, selectedId, onSelect, onToggleExpand, onDelete, onDuplicate, onAddObject }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string } | null>(null);
  const [viewMode, setViewMode] = useState<'SCENE' | 'ENTITY'>('SCENE');

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id); // Select the item being right-clicked
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
  };

  const getContextMenuItems = (id: string): MenuItem[] => [
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => console.log('Copy', id) },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => console.log('Paste', id), disabled: true },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => onDuplicate && onDuplicate(id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => onDelete && onDelete(id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Create Empty', action: () => console.log('Create Empty', id) },
    { 
      label: '3D Object', 
      action: () => {}, 
      submenu: [
        { label: 'Cube', action: () => onAddObject && onAddObject(ObjectType.CUBE, id) },
        { label: 'Sphere', action: () => onAddObject && onAddObject(ObjectType.SPHERE, id) },
        { label: 'Capsule', action: () => onAddObject && onAddObject(ObjectType.CAPSULE, id) },
        { label: 'Cylinder', action: () => onAddObject && onAddObject(ObjectType.CYLINDER, id) },
        { label: 'Plane', action: () => onAddObject && onAddObject(ObjectType.PLANE, id) },
      ]
    },
  ];

  const getIcon = (type: ObjectType) => {
    switch (type) {
      case ObjectType.SCENE: return <Layers size={12} className="text-orange-400" />;
      case ObjectType.CAMERA: return <Camera size={12} className="text-blue-400" />;
      case ObjectType.LIGHT: return <Lightbulb size={12} className="text-yellow-400" />;
      case ObjectType.FOLDER: return <Folder size={12} className="text-editor-textDim" />;
      case ObjectType.SPHERE: return <Circle size={12} className="text-green-400" />;
      case ObjectType.CYLINDER: return <Cylinder size={12} className="text-green-400" />;
      case ObjectType.PLANE: return <Square size={12} className="text-green-400" />;
      default: return <Box size={12} className="text-green-400" />;
    }
  };

  const flattenNodes = (nodes: SceneObject[]): SceneObject[] => {
    let result: SceneObject[] = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children) {
        result = result.concat(flattenNodes(node.children));
      }
    });
    return result;
  };

  const renderNode = (node: SceneObject, depth: number = 0, isFlat: boolean = false) => {
    const isSelected = node.id === selectedId;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div 
          className={`
            flex items-center py-[2px] cursor-pointer text-[11px] select-none group
            ${isSelected ? 'bg-editor-accent text-white' : 'hover:bg-white/5 text-editor-text'}
          `}
          style={{ paddingLeft: isFlat ? '8px' : `${depth * 12 + 4}px` }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onContextMenu={(e) => handleContextMenu(e, node.id)}
        >
          {/* Expand/Collapse Icon */}
          <div 
            className={`w-4 h-4 flex items-center justify-center mr-1 ${isSelected ? 'text-white' : 'text-editor-textDim hover:text-white'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isFlat) onToggleExpand(node.id);
            }}
          >
            {!isFlat && hasChildren && (
              node.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
            )}
          </div>

          {/* Type Icon */}
          <span className="mr-2 opacity-80">{getIcon(node.type)}</span>
          
          {/* Name */}
          <span className="flex-1 truncate">{node.name}</span>

          {/* Visibility Toggle (Hover only) */}
          <div className="w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center">
            <Eye size={10} className={isSelected ? 'text-white' : 'text-editor-textDim'} />
          </div>
        </div>

        {/* Recursive Children (Only in Scene Mode) */}
        {!isFlat && hasChildren && node.expanded && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1, false))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="h-full flex flex-col bg-editor-panel"
      onContextMenu={(e) => {
        // Handle right click on empty space in hierarchy
        if (e.target === e.currentTarget) {
           e.preventDefault();
           setContextMenu({ x: e.clientX, y: e.clientY, targetId: 'root' });
        }
      }}
    >
      {/* Header */}
      <div className="h-8 flex items-center px-3 border-b border-editor-border bg-editor-bg shrink-0 justify-between">
        <span className="text-xs font-semibold tracking-wide text-editor-textDim uppercase">Hierarchy</span>
        
        {/* View Toggle */}
        <div className="flex bg-editor-input rounded border border-editor-border p-[2px]">
          <button 
            className={`p-0.5 rounded ${viewMode === 'SCENE' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'}`}
            onClick={() => setViewMode('SCENE')}
            title="Scene Hierarchy"
          >
            <ListTree size={12} />
          </button>
          <button 
            className={`p-0.5 rounded ${viewMode === 'ENTITY' ? 'bg-editor-accent text-white' : 'text-editor-textDim hover:text-white'}`}
            onClick={() => setViewMode('ENTITY')}
            title="Entity List"
          >
            <List size={12} />
          </button>
        </div>
      </div>
      
      {/* Search */}
      <div className="p-1 border-b border-editor-border shrink-0">
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full bg-editor-input text-xs px-2 py-1 rounded border border-editor-border focus:border-editor-accent focus:outline-none text-editor-text placeholder-zinc-600"
        />
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-1" onClick={() => onSelect('')}>
        {viewMode === 'SCENE' 
          ? data.map(node => renderNode(node, 0, false))
          : flattenNodes(data).map(node => renderNode(node, 0, true))
        }
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.targetId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default Hierarchy;