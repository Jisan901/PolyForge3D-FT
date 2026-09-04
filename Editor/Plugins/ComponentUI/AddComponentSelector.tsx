import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { ComponentRegistry } from './ComponentRegistry';
import { Editor } from '@/Editor/Editor';

interface AddComponentSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nameCodeOrKey: number | string) => void;
  attachedComponentKeys: string[];
}

export const AddComponentSelector: React.FC<AddComponentSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  attachedComponentKeys
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const templates = Editor.core.componentManager.getAllTemplate();

  const filtered = templates.filter((tpl) => {
    const q = query.toLowerCase();
    const nameMatch = (tpl.name || '').toLowerCase().includes(q);
    const keyMatch = (tpl.key || '').toLowerCase().includes(q);
    const descMatch = (tpl.description || '').toLowerCase().includes(q);
    return nameMatch || keyMatch || descMatch;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1c1c1c] border border-[#333] rounded-lg shadow-2xl overflow-hidden flex flex-col font-sans max-h-[70vh] animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-[#252525] border-b border-[#333]">
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">
            Add Component
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b border-[#2a2a2a] bg-[#161616]">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1f1f1f] rounded border border-[#333] focus-within:border-blue-500 transition-colors">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-1 divide-y divide-[#262626]">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No matching components found
            </div>
          ) : (
            filtered.map((tpl) => {
              const Icon = ComponentRegistry.getIcon(tpl.nameCode || tpl.key || '');
              const keyStr = String(tpl.key || tpl.nameCode);
              const isAttached =
                attachedComponentKeys.includes(keyStr) ||
                attachedComponentKeys.includes(String(tpl.nameCode));

              return (
                <button
                  key={tpl.nameCode}
                  type="button"
                  disabled={isAttached}
                  onClick={() => {
                    onSelect(tpl.nameCode);
                    onClose();
                  }}
                  className={`w-full text-left p-2 rounded flex items-center gap-2.5 transition-colors ${
                    isAttached
                      ? 'opacity-40 cursor-not-allowed bg-transparent'
                      : 'hover:bg-[#282828] cursor-pointer'
                  }`}
                >
                  <div className="w-7 h-7 rounded bg-[#2a2a2a] flex items-center justify-center text-blue-400 shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-200 truncate">
                        {tpl.name || tpl.key}
                      </span>
                      {isAttached ? (
                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                          <Check size={11} /> Added
                        </span>
                      ) : (
                        <Plus size={13} className="text-gray-500" />
                      )}
                    </div>
                    {tpl.description && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {tpl.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
