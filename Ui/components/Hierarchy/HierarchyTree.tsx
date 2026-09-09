import React from 'react';
import { Layers } from 'lucide-react';
import { DragAndDropZone } from '../Utils/DragNDrop';
import HierarchyNodeMemo from './HierarchyNode';
import { ACTIONS } from '@/Editor/Actions';
import { Editor } from '@/Editor/Editor';
import { mutationCall, toast } from '@/Editor/Mutation';

const editor = Editor;

interface HierarchyTreeProps {
  activeScene: any;
  viewMode: 'SCENE' | 'ENTITY';
  searchQuery: string;
  flattenedNodes: any[];
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  handleContextMenu: (e: React.MouseEvent, id: string) => void;
  handleEmptySpaceContextMenu: (e: React.MouseEvent) => void;
}

export const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  activeScene,
  viewMode,
  searchQuery,
  flattenedNodes,
  renamingId,
  setRenamingId,
  handleContextMenu,
  handleEmptySpaceContextMenu,
}) => {
  // Clear selection when clicking empty space
  const handleDeselect = (e: React.MouseEvent) => {
    // Check if clicked element is not an interactive child button/input
    const target = e.target as HTMLElement;
    if (target.closest('.group') || target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
      return;
    }
    ACTIONS.execute('select_object', '');
    editor.api?.three?.selectObject?.(null);
  };

  // Handle dropping onto root empty space
  const handleRootDrop = async (e: any) => {
    if (!activeScene) return;
    if (e.type === 'Object') {
      const sceneObj = editor.core.sceneManager.activeScene;
      if (!sceneObj) return;
      const draggedNode = sceneObj.getObjectByProperty('uuid', e.data.uuid);
      if (!draggedNode || draggedNode === activeScene || draggedNode.parent === activeScene) return;

      const oldParent = draggedNode.parent;
      editor.addObject(activeScene, draggedNode);

      if (oldParent) mutationCall(oldParent, 'children');
      mutationCall(activeScene, 'children');
      mutationCall(draggedNode, 'children');
      toast('Moved to scene root');
    }
  };

  return (
    <DragAndDropZone
      className="flex-1 overflow-y-auto py-1 custom-scrollbar flex flex-col min-h-0 cursor-default"
      onDrop={handleRootDrop}
      onClick={handleDeselect}
      onContextMenu={handleEmptySpaceContextMenu}
    >
      <div className="flex flex-col min-h-full" onClick={handleDeselect}>
        {activeScene ? (
          viewMode === 'SCENE' ? (
            <HierarchyNodeMemo
              node={activeScene}
              depth={0}
              isFlat={false}
              searchQuery={searchQuery}
              handleContextMenu={handleContextMenu}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
            />
          ) : (
            <div className="py-0.5">
              {flattenedNodes.length === 0 ? (
                <div className="p-4 text-center text-xs text-editor-textDim">
                  No objects in scene
                </div>
              ) : (
                flattenedNodes
                  .filter(node => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (node.name || node.type || '').toLowerCase().includes(q);
                  })
                  .map((node) => (
                    <HierarchyNodeMemo
                      key={node.uuid}
                      node={node}
                      depth={0}
                      isFlat={true}
                      searchQuery={searchQuery}
                      handleContextMenu={handleContextMenu}
                      renamingId={renamingId}
                      setRenamingId={setRenamingId}
                    />
                  ))
              )}
            </div>
          )
        ) : (
          <div className="p-6 text-center text-xs text-editor-textDim flex flex-col items-center justify-center gap-2">
            <Layers size={24} className="opacity-30" />
            <span>No active scene loaded</span>
          </div>
        )}

        {/* Empty space filler that captures clicks anywhere below the nodes */}
        <div 
          className="flex-1 min-h-[60px] cursor-default" 
          onClick={handleDeselect}
          onContextMenu={handleEmptySpaceContextMenu}
        />
      </div>
    </DragAndDropZone>
  );
};

export default HierarchyTree;
