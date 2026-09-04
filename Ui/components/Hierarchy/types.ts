import React from 'react';
import { MenuItem } from '../ContextMenu';

export interface HierarchyNodeProps {
  node: any;
  depth: number;
  isFlat: boolean;
  searchQuery: string;
  handleContextMenu: (e: React.MouseEvent, id: string) => void;
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

export interface EditableNameProps {
  name: string;
  searchQuery?: string;
  isRenaming?: boolean;
  onRename: (newName: string) => void;
  onFinishRename?: () => void;
}

export interface HierarchyToolbarProps {
  totalCount: number;
  selectedId: string | null;
  activeSceneUuid?: string;
  viewMode: 'SCENE' | 'ENTITY';
  addButtonRef: React.RefObject<HTMLButtonElement>;
  onOpenAddMenu: (e: React.MouseEvent) => void;
  onFocusSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onToggleExpandAll: (expand: boolean) => void;
  onViewModeChange: (mode: 'SCENE' | 'ENTITY') => void;
}

export interface HierarchySearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function isDescendant(parent: any, child: any): boolean {
  if (!parent || !child) return false;
  if (parent === child) return true;
  let curr = child.parent;
  while (curr) {
    if (curr === parent) return true;
    curr = curr.parent;
  }
  return false;
}
