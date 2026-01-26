import React, { useState, useCallback, useRef } from 'react';
import { 
  ChevronRight, ChevronDown, Box, Camera, Lightbulb, Folder, 
  Eye, Layers, Circle, Cylinder, Square, List, ListTree 
} from 'lucide-react';
import { ObjectType } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';
import { useEditorStates, useEditorActions } from '../contexts/EditorContext';
import { PolyForge, mutate, mutationCall, toast } from "../PolyForge";
import { useObserver, useValidatedSelection, useSceneObserver, useTargetObserver } from "../PolyModule/Hooks";
import { DragAndDropZone } from "./Utils/DragNDrop";
import { getMenuFlat } from "./Utils/getMenu";

const editor = PolyForge.editor;
const editorRenderer = PolyForge.editorRenderer;

// Icon mapping utility
const getObjectIcon = (type: ObjectType) => {
  const iconProps = { size: 12 };
  const iconMap = {
    [ObjectType.SCENE]: <Layers {...iconProps} className="text-orange-400" />,
    [ObjectType.CAMERA]: <Camera {...iconProps} className="text-blue-400" />,
    [ObjectType.LIGHT]: <Lightbulb {...iconProps} className="text-yellow-400" />,
    [ObjectType.FOLDER]: <Folder {...iconProps} className="text-editor-textDim" />,
    [ObjectType.SPHERE]: <Circle {...iconProps} className="text-green-400" />,
    [ObjectType.CYLINDER]: <Cylinder {...iconProps} className="text-green-400" />,
    [ObjectType.PLANE]: <Square {...iconProps} className="text-green-400" />,
  };
  return iconMap[type] || <Box {...iconProps} className="text-green-400" />;
};

// Editable name component
const EditableName = ({ name, onRename }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const [backup, setBackup] = useState(name);

  const startEdit = () => {
    setBackup(name);
    setEditing(true);

    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        document.execCommand("selectAll", false, null);
      }
    });
  };

  const finishEdit = () => {
    const newName = ref.current?.innerText.trim() || '';
    setEditing(false);
    if (newName && newName !== backup) {
      onRename(newName);
    }
  };

  const cancelEdit = () => {
    if (ref.current) {
      ref.current.innerText = backup;
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <span
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      onContextMenu={(e) => editing && e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={startEdit}
      onBlur={finishEdit}
      onKeyDown={handleKeyDown}
      className={`flex-1 truncate outline-none ${editing ? "bg-[#0002] px-1 rounded" : ""}`}
    >
      {name}
    </span>
  );
};

// Hierarchy node component
const HierarchyNode = ({ node, depth, isFlat, handleContextMenu, sceneVersion }) => {
  const name = useObserver(node, 'name');
  const expanded = useObserver(node.userData, 'expanded');
//   const render = useRef(0);
  
//   render.current++;
  useTargetObserver(node);
  useSceneObserver();
  
  const isSelected = useValidatedSelection(node.uuid);
  const { selectObject } = useEditorActions();
  const hasChildren = node.children?.length > 0;

  const toggleExpand = () => {
    mutate(node.userData, 'expanded', !node.userData.expanded);
  };

  const handleDrop = async (e) => {
    if (e.type === 'Object') {
      const scene = PolyForge.api.sceneManager.activeScene;
      const draggedNode = scene.getObjectByProperty('uuid', e.data.uuid);
      const dropTarget = scene.getObjectByProperty('uuid', node.uuid);

      if (!draggedNode || !dropTarget) {
        toast('Invalid drag operation');
        return;
      }

      const oldParent = draggedNode.parent;
      editor.addObject(dropTarget, draggedNode);

      mutationCall(oldParent);
      mutationCall(dropTarget);
      mutationCall(draggedNode);

      toast('Parent changed');
    } else if (e.type === 'Asset') {
      const objectData = await editor.api.loadObjectFile(e.data.fullPath);
      editor.addObject(node, objectData);
      mutationCall(node);
      toast('Loaded');
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectObject(node.uuid);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFlat && hasChildren) {
      toggleExpand();
    }
  };

  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editor.setProperty(node, 'visible', !node.visible);
  };

  return (
    <DragAndDropZone
      onDrop={handleDrop}
      payload={{ type: 'Object', data: { uuid: node.uuid, name: node.name||node.type } }}
    >
      <div>
        <div
          className={`
            flex items-center py-[2px] cursor-pointer text-[11px] select-none group
            ${isSelected ? 'bg-editor-accent text-white' : 'hover:bg-white/5 text-editor-text'}
          `}
          style={{ paddingLeft: isFlat ? '8px' : `${depth * 12 + 4}px` }}
          onClick={handleClick}
          onContextMenu={(e) => handleContextMenu(e, node.uuid)}
        >
          {/* Expand button */}
          <div
            className="w-4 h-4 mr-1 flex items-center justify-center"
            onClick={handleExpandClick}
          >
            {!isFlat && hasChildren && (
              expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
            )}
          </div>

          {/* Icon */}
          {getObjectIcon(node.type)}

          {/* Name */}
          <EditableName
            key={name}
            name={name || node.type}
            onRename={(newName) => editor.setProperty(node, 'name', newName)}
          />

          {/* Visibility toggle */}
          <div className={`w-6 ${node.visible ? 'opacity-100' : 'opacity-50'}`}>
            <Eye size={10} onClick={handleVisibilityClick} />
          </div>
        </div>

        {/* Children */}
        {!isFlat && hasChildren && expanded && (
          <div>
            {node.children.map((child, i) => (
              <HierarchyNodeMemo
                key={`${child.uuid}-${i}-${node.children.length}`}
                node={child}
                depth={depth + 1}
                isFlat={false}
                handleContextMenu={handleContextMenu}
                sceneVersion={sceneVersion}
              />
            ))}
          </div>
        )}
      </div>
    </DragAndDropZone>
  );
};

// Memoized version with proper comparison
const HierarchyNodeMemo = React.memo(HierarchyNode, (prev, next) => {
  if (prev.node !== next.node) return false;
  if (prev.depth !== next.depth) return false;
  if (prev.isFlat !== next.isFlat) return false;
  
  const prevChildren = prev.node.children?.map(c => c.uuid).join(',');
  const nextChildren = next.node.children?.map(c => c.uuid).join(',');
  if (prevChildren !== nextChildren) return false;
  
  return true;
});

// Main Hierarchy component
const Hierarchy: React.FC = () => {
  const { addObject, selectObject, deleteObject, onDuplicate } = useEditorActions();
  const { scene } = useEditorStates();
  const sceneVersion = useSceneObserver();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);
  const [viewMode, setViewMode] = useState<'SCENE' | 'ENTITY'>('SCENE');

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectObject(id);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
  }, [selectObject]);

  const getContextMenuItems = (id: string): MenuItem[] => [
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => console.log('Copy', id) },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => console.log('Paste', id), disabled: true },
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => onDuplicate?.(id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Rename', shortcut: 'F2', action: () => console.log('Rename', id) },
    { label: 'Delete', shortcut: 'Del', danger: true, action: () => deleteObject?.(id) },
    { separator: true, label: '', action: () => {} },
    { label: 'Create Empty', action: () => addObject?.(ObjectType.FOLDER, id) },
    {
      label: '3D Object',
      action: () => {},
      submenu: getMenuFlat(addObject, id)
          
    },
  ];

  const flattenNodes = (nodes): any[] => {
    let result: any[] = [];
    nodes.forEach(node => {
      if (node.userData.special) {
        result.push(node);
      }
      if (node.children) {
        result = result.concat(flattenNodes(node.children));
      }
    });
    return result;
  };

  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, targetId: null });
    }
  };

  return (
    <div className="h-full flex flex-col bg-editor-panel" key={sceneVersion}>
      {/* Header */}
      <div className="h-8 flex items-center px-3 border-b border-editor-border bg-editor-bg shrink-0 justify-between">
        <span className="text-xs font-semibold tracking-wide text-editor-textDim uppercase">
          Hierarchy
        </span>

        {/* View Toggle */}
        <div className="flex bg-editor-input rounded border border-editor-border p-[2px]">
          <button
            className={`p-0.5 rounded ${
              viewMode === 'SCENE' 
                ? 'bg-editor-accent text-white' 
                : 'text-editor-textDim hover:text-white'
            }`}
            onClick={() => setViewMode('SCENE')}
            title="Scene Hierarchy"
          >
            <ListTree size={12} />
          </button>
          <button
            className={`p-0.5 rounded ${
              viewMode === 'ENTITY' 
                ? 'bg-editor-accent text-white' 
                : 'text-editor-textDim hover:text-white'
            }`}
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
      {scene.length > 0 && (
        <div 
          className="flex-1 overflow-y-auto py-1"
          onClick={() => selectObject(null)}
          onContextMenu={handleEmptySpaceContextMenu}
        >
          {viewMode === 'SCENE' ? (
            <HierarchyNodeMemo 
              key={`${sceneVersion}-${scene[0].uuid}`}
              node={scene[0]} 
              depth={0} 
              isFlat={false} 
              handleContextMenu={handleContextMenu} 
              sceneVersion={sceneVersion}
            />
          ) : (
            flattenNodes(scene).map(node => (
              <HierarchyNodeMemo 
                key={node.uuid}
                node={node} 
                depth={0} 
                isFlat={true} 
                handleContextMenu={handleContextMenu} 
                sceneVersion={sceneVersion}
              />
            ))
          )}
        </div>
      )}

      {/* Context Menu */}
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