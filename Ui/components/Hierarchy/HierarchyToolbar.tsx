import React from 'react';
import { Plus, Target, Copy, Trash2, ChevronsUpDown, ListTree, List } from 'lucide-react';
import { HierarchyToolbarProps } from './types';

export const HierarchyToolbar: React.FC<HierarchyToolbarProps> = ({
  totalCount,
  selectedId,
  activeSceneUuid,
  viewMode,
  addButtonRef,
  onOpenAddMenu,
  onFocusSelected,
  onDuplicateSelected,
  onDeleteSelected,
  onToggleExpandAll,
  onViewModeChange,
}) => {
  const isActionDisabled = !selectedId || selectedId === activeSceneUuid;

  return (
    <div className="h-8 flex items-center px-2 border-b border-editor-border bg-editor-bg shrink-0 justify-between">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-wide text-editor-textDim uppercase">
          Hierarchy
        </span>
        {totalCount > 0 && (
          <span className="text-[10px] text-editor-textDim/60 font-mono">
            ({totalCount})
          </span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-0.5">
        {/* Add Object Quick Button */}
        <button
          ref={addButtonRef}
          onClick={onOpenAddMenu}
          className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
          title="Create Object (+)"
        >
          <Plus size={13} />
        </button>

        {/* Focus Selected */}
        <button
          disabled={isActionDisabled}
          onClick={onFocusSelected}
          className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Focus in Viewport (F)"
        >
          <Target size={12} />
        </button>

        {/* Duplicate Selected */}
        <button
          disabled={isActionDisabled}
          onClick={onDuplicateSelected}
          className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Duplicate (Ctrl+D)"
        >
          <Copy size={12} />
        </button>

        {/* Delete Selected */}
        <button
          disabled={isActionDisabled}
          onClick={onDeleteSelected}
          className="p-1 rounded text-editor-textDim hover:text-red-400 hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Delete (Del)"
        >
          <Trash2 size={12} />
        </button>

        <div className="w-[1px] h-3 bg-editor-border mx-1" />

        {/* Expand / Collapse All */}
        <button
          onClick={() => onToggleExpandAll(true)}
          className="p-1 rounded text-editor-textDim hover:text-white hover:bg-white/10 transition-colors"
          title="Expand All"
        >
          <ChevronsUpDown size={12} />
        </button>

        {/* View Mode Toggle */}
        <div className="flex bg-editor-input rounded border border-editor-border p-[1px] ml-0.5">
          <button
            className={`p-1 rounded transition-colors ${
              viewMode === 'SCENE' 
                ? 'bg-editor-accent text-white shadow-sm' 
                : 'text-editor-textDim hover:text-white'
            }`}
            onClick={() => onViewModeChange('SCENE')}
            title="Scene Tree"
          >
            <ListTree size={11} />
          </button>
          <button
            className={`p-1 rounded transition-colors ${
              viewMode === 'ENTITY' 
                ? 'bg-editor-accent text-white shadow-sm' 
                : 'text-editor-textDim hover:text-white'
            }`}
            onClick={() => onViewModeChange('ENTITY')}
            title="Flat Entity List"
          >
            <List size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HierarchyToolbar;
