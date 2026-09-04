import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { HierarchyNodeProps, isDescendant } from './types';
import EditableName from './EditableName';
import { useEditorActions } from '../../contexts/EditorContext';
import { mutate, mutationCall, toast } from "@/Editor/Mutation";
import { Editor } from "@/Editor/Editor";
import { useObserver, useTargetObserver, useValidatedSelection } from "../../Hooks";
import { DragAndDropZone } from "../Utils/DragNDrop";
import { getHierarchyIcon } from "../IconMap";

const editor = Editor;

export const HierarchyNode: React.FC<HierarchyNodeProps> = ({ 
  node, 
  depth, 
  isFlat, 
  searchQuery,
  handleContextMenu,
  renamingId,
  setRenamingId
}) => {
  if (node?.userData?.hiddenOnEditor) return null;

  const name = useObserver(node, 'name');
  const expandedProp = useObserver(node?.userData, 'expanded');
  useObserver(node, 'children');
  useTargetObserver(node);
  const isSelected = useValidatedSelection(node?.uuid);
  const { selectObject } = useEditorActions();

  const isExpanded = expandedProp !== false;
  const hasChildren = Boolean(node?.children && node.children.length > 0);
  const isRenaming = renamingId === node?.uuid;

  // Filter visibility when searching
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nodeName = (node.name || node.type || '').toLowerCase();
    return nodeName.includes(q);
  }, [node.name, node.type, searchQuery]);

  const hasMatchingDescendant = useMemo(() => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    const check = (n: any): boolean => {
      if (!n || n.userData?.hiddenOnEditor) return false;
      const nName = (n.name || n.type || '').toLowerCase();
      if (nName.includes(q)) return true;
      if (n.children) {
        return n.children.some(check);
      }
      return false;
    };
    return (node.children || []).some(check);
  }, [node.children, searchQuery]);

  // If searching and neither this node nor any descendant matches, don't show
  if (searchQuery && !matchesSearch && !hasMatchingDescendant) {
    return null;
  }

  // During active search, automatically reveal descendants
  const effectiveExpanded = searchQuery ? true : isExpanded;

  const toggleExpand = () => {
    mutate(node.userData, 'expanded', !isExpanded);
  };

  const handleDrop = async (e: any) => {
    if (e.type === 'Object') {
      const scene = editor.core.sceneManager.activeScene;
      if (!scene) return;

      const draggedNode = scene.getObjectByProperty('uuid', e.data.uuid);
      const dropTarget = scene.getObjectByProperty('uuid', node.uuid);

      if (!draggedNode || !dropTarget) {
        toast('Invalid drag operation');
        return;
      }

      if (draggedNode.uuid === dropTarget.uuid) {
        return;
      }

      // Prevent moving an object into its own subtree (cycle prevention)
      if (isDescendant(draggedNode, dropTarget)) {
        toast('Cannot move an object into its own child');
        return;
      }

      const oldParent = draggedNode.parent;
      editor.addObject(dropTarget, draggedNode);

      if (oldParent) mutationCall(oldParent, 'children');
      mutationCall(dropTarget, 'children');
      mutationCall(draggedNode, 'children');

      // Auto-expand target so dropped item is visible
      mutate(dropTarget.userData, 'expanded', true);
      toast(`Moved "${draggedNode.name || 'Object'}" to "${dropTarget.name || 'Parent'}"`);
    } else if (e.type === 'Asset') {
      try {
        const objectData = await editor.api.loadObjectFile(e.data.fullPath);
        editor.addObject(node, objectData);
        mutationCall(node, 'children');
        mutate(node.userData, 'expanded', true);
        toast(`Loaded asset into "${node.name || 'Object'}"`);
      } catch (err) {
        console.error('Failed to load asset into hierarchy node:', err);
        toast('Failed to load asset');
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectObject(node.uuid);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectObject(node.uuid);
    editor.api?.three?.focusSelected?.();
  };

  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editor.setProperty(node, 'visible', !node.visible);
  };

  // Check component count
  const componentCount = Array.isArray(node?.userData?.components) 
    ? node.userData.components.length 
    : (node?.userData?.components ? Object.keys(node.userData.components).length : 0);

  return (
    <DragAndDropZone
      onDrop={handleDrop}
      payload={{ type: 'Object', data: { uuid: node.uuid, name: node.name || node.type, obj: node } }}
      className="w-full"
    >
      <div className="w-full">
        <div
          className={`
            flex items-center h-6 px-1.5 cursor-pointer text-[11px] select-none group relative transition-colors
            ${isSelected 
              ? 'bg-editor-accent text-white font-medium' 
              : 'hover:bg-white/5 text-editor-text'
            }
          `}
          style={{ paddingLeft: isFlat ? '8px' : `${depth * 12 + 4}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => handleContextMenu(e, node.uuid)}
        >
          {/* Active selection indicator bar */}
          {isSelected && (
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white shadow-sm" />
          )}

          {/* Expand/Collapse Chevron */}
          <div
            className="w-4 h-4 mr-0.5 flex items-center justify-center shrink-0 text-editor-textDim hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              if (!isFlat && hasChildren) toggleExpand();
            }}
          >
            {!isFlat && hasChildren ? (
              effectiveExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
            ) : null}
          </div>

          {/* Type Icon */}
          <div className="mr-1.5 shrink-0 flex items-center">
            {getHierarchyIcon(node, { size: 12, isExpanded: effectiveExpanded })}
          </div>

          {/* Node Name */}
          <EditableName
            name={name || node.name || node.type || 'Object3D'}
            searchQuery={searchQuery}
            isRenaming={isRenaming}
            onRename={(newName) => editor.setProperty(node, 'name', newName)}
            onFinishRename={() => setRenamingId(null)}
          />

          {/* Badges: Children count or Component count */}
          <div className="flex items-center gap-1 ml-1.5 shrink-0">
            {componentCount > 0 && (
              <span 
                className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono"
                title={`${componentCount} components attached`}
              >
                C:{componentCount}
              </span>
            )}
            {!isFlat && hasChildren && !effectiveExpanded && (
              <span className="text-[9px] text-editor-textDim/80 font-mono px-1 rounded bg-white/5">
                {node.children.length}
              </span>
            )}
          </div>

          {/* Visibility Toggle Button */}
          <button
            onClick={handleVisibilityClick}
            className={`
              w-5 h-5 flex items-center justify-center rounded shrink-0 ml-1 transition-opacity
              ${node.visible !== false 
                ? 'text-editor-textDim group-hover:opacity-100 opacity-0 hover:text-white' 
                : 'text-red-400 opacity-100 hover:text-red-300'
              }
            `}
            title={node.visible !== false ? 'Hide object' : 'Show object'}
          >
            {node.visible !== false ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
        </div>

        {/* Child Subtree */}
        {!isFlat && hasChildren && effectiveExpanded && (
          <div className="relative">
            {node.children.map((child: any, i: number) => (
              <HierarchyNodeMemo
                key={child.uuid || `${node.uuid}-child-${i}`}
                node={child}
                depth={depth + 1}
                isFlat={false}
                searchQuery={searchQuery}
                handleContextMenu={handleContextMenu}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
              />
            ))}
          </div>
        )}
      </div>
    </DragAndDropZone>
  );
};

export const HierarchyNodeMemo = React.memo(HierarchyNode);
export default HierarchyNodeMemo;
