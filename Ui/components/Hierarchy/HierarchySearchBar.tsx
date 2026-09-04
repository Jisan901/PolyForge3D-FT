import React from 'react';
import { Search, X } from 'lucide-react';
import { HierarchySearchBarProps } from './types';

export const HierarchySearchBar: React.FC<HierarchySearchBarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="px-2 py-1.5 border-b border-editor-border bg-editor-panel shrink-0">
      <div className="relative flex items-center">
        <Search size={11} className="absolute left-2 text-editor-textDim pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search hierarchy..."
          className="w-full bg-editor-input text-xs pl-7 pr-6 py-1 rounded border border-editor-border focus:border-editor-accent focus:outline-none text-editor-text placeholder-zinc-500 font-sans"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-1.5 p-0.5 text-editor-textDim hover:text-white rounded"
            title="Clear search"
          >
            <X size={11} />
          </button>
        )}
      </div>
    </div>
  );
};

export default HierarchySearchBar;
