import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ObjectType } from '../../types';
import ContextMenu, { MenuItem } from '../ContextMenu';
import { useEditorStates, useEditorActions } from '../../contexts/EditorContext';
import { mutate, toast } from "@/Editor/Mutation";
import { Editor } from "@/Editor/Editor";
import { useSceneObserver } from "../../Hooks";
import { BusHub } from "@/Editor/Api";
import { getMenu, getMenuFlat } from "../Utils/getMenu";
import HierarchyToolbar from './HierarchyToolbar';
import HierarchySearchBar from './HierarchySearchBar';
import HierarchyTree from './HierarchyTree';

const editor = Editor;

export const Hierarchy: React.FC = () => {
  const { addObject, selectObject, deleteObject, onDuplicate } = useEditorActions();
  const { scene, selectedId, selectedObject } = useEditorStates();
  useSceneObserver();

  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<'SCENE' | 'ENTITY'>('SCENE');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [treeVersion, setTreeVersion] = useState(0);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const activeScene = scene?.[0];

  // Re-sync on object additions, removals, or renames anywhere in the scene graph
  useEffect(() => {
    return BusHub.mutationBus.subscribe(({ path }) => {
      if (path === 'children' || path === 'name' || !path) {
        setTreeVersion(v => v + 1);
      }
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    selectObject(id);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
  }, [selectObject]);

  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: null });
  };

  // Keyboard navigation & shortcuts inside hierarchy
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (renamingId) return; // Don't intercept when renaming

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedId && selectedObject && selectedObject !== activeScene) {
        e.preventDefault();
        deleteObject?.(selectedId);
      }
    } else if (e.key === 'F2') {
      if (selectedId && selectedObject && selectedObject !== activeScene) {
        e.preventDefault();
        setRenamingId(selectedId);
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      if (selectedId && selectedObject && selectedObject !== activeScene) {
        e.preventDefault();
        onDuplicate?.(selectedId);
      }
    } else if (e.key.toLowerCase() === 'f') {
      e.preventDefault();
      editor.api?.three?.focusSelected?.();
    }
  };

  // Expand / Collapse all
  const handleToggleExpandAll = (expand: boolean) => {
    if (!activeScene) return;
    const setExpand = (obj: any) => {
      if (!obj || obj.userData?.hiddenOnEditor) return;
      mutate(obj.userData, 'expanded', expand);
      if (obj.children) {
        obj.children.forEach(setExpand);
      }
    };
    setExpand(activeScene);
    toast(expand ? 'Expanded all' : 'Collapsed all');
  };

  const getContextMenuItems = (id: string | null): MenuItem[] => {
    const parentId = id || activeScene?.uuid;
    const universalItems: MenuItem[] = [
      { label: 'Create Empty / Group', action: () => addObject?.(ObjectType.FOLDER, parentId) },
      {
        label: '3D Object',
        submenu: getMenuFlat(addObject, parentId)
      },
      ...getMenu(addObject, parentId)
    ];

    if (!id || id === activeScene?.uuid) {
      return universalItems;
    }

    const targetedItems: MenuItem[] = [
      { 
        label: 'Focus in Viewport', 
        shortcut: 'F', 
        action: () => editor.api?.three?.focusSelected?.() 
      },
      { 
        label: 'Rename', 
        shortcut: 'F2', 
        action: () => setRenamingId(id) 
      },
      { 
        label: 'Duplicate', 
        shortcut: 'Ctrl+D', 
        action: () => onDuplicate?.(id) 
      },
      { 
        label: 'Delete', 
        shortcut: 'Del', 
        danger: true, 
        action: () => deleteObject?.(id) 
      },
      { separator: true, label: '', action: () => {} },
    ];

    const defaultItems = [...targetedItems, ...universalItems];
    (Editor.api?.buses?.hierarchyContextMenu?.emit as any)?.(id, defaultItems);
    return defaultItems;
  };

  // Flatten all nodes for ENTITY list view
  const flattenedNodes = useMemo(() => {
    if (!activeScene) return [];
    const list: any[] = [];
    const collect = (node: any) => {
      if (!node || node.userData?.hiddenOnEditor) return;
      if (node !== activeScene) {
        list.push(node);
      }
      if (node.children) {
        node.children.forEach(collect);
      }
    };
    collect(activeScene);
    return list;
  }, [activeScene, scene, treeVersion]);

  // Quick Add Menu position
  const handleOpenAddMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      setAddMenuPos({ x: rect.left, y: rect.bottom + 4 });
    }
  };

  return (
    <div 
      className="h-full flex flex-col bg-editor-panel select-none text-xs outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header Toolbar */}
      <HierarchyToolbar
        totalCount={flattenedNodes.length}
        selectedId={selectedId}
        activeSceneUuid={activeScene?.uuid}
        viewMode={viewMode}
        addButtonRef={addButtonRef}
        onOpenAddMenu={handleOpenAddMenu}
        onFocusSelected={() => editor.api?.three?.focusSelected?.()}
        onDuplicateSelected={() => selectedId && onDuplicate?.(selectedId)}
        onDeleteSelected={() => selectedId && deleteObject?.(selectedId)}
        onToggleExpandAll={handleToggleExpandAll}
        onViewModeChange={setViewMode}
      />

      {/* Search Input Bar */}
      <HierarchySearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Tree / Entity List Container */}
      <HierarchyTree
        activeScene={activeScene}
        viewMode={viewMode}
        searchQuery={searchQuery}
        flattenedNodes={flattenedNodes}
        renamingId={renamingId}
        setRenamingId={setRenamingId}
        handleContextMenu={handleContextMenu}
        handleEmptySpaceContextMenu={handleEmptySpaceContextMenu}
      />

      {/* Context Menu (Right Click) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.targetId)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Quick Add Menu (Plus Button) */}
      {addMenuPos && (
        <ContextMenu
          x={addMenuPos.x}
          y={addMenuPos.y}
          items={getContextMenuItems(selectedId || activeScene?.uuid || null)}
          onClose={() => setAddMenuPos(null)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
};

export default Hierarchy;
