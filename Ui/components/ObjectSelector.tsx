import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Box, FileCode, BoxSelect, Lightbulb, Volume2 } from 'lucide-react';

export interface SelectorItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  description?: string;
}

interface ObjectSelectorProps {
  title: string;
  items: SelectorItem[];
  onSelect: (item: SelectorItem) => void;
  onClose: () => void;
  grid?: boolean; // 👈 new
}

export const ObjectSelector: React.FC<ObjectSelectorProps> = ({
  title,
  items,
  onSelect,
  onClose,
  grid = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------------- effects ---------------- */

  useEffect(() => {
    //inputRef.current?.focus();

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* ---------------- filtering ---------------- */

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, SelectorItem[]>>((acc, item) => {
      const key = item.category || 'Other';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  /* ---------------- helpers ---------------- */

  const getIcon = (item: SelectorItem) => {
    if (item.icon) return <item.icon size={14} className="opacity-80" />;
    switch (item.category) {
      case 'Physics': return <BoxSelect size={14} className="text-green-400" />;
      case 'Rendering': return <Lightbulb size={14} className="text-yellow-400" />;
      case 'Scripts': return <FileCode size={14} className="text-blue-400" />;
      case 'Audio': return <Volume2 size={14} className="text-orange-400" />;
      default: return <Box size={14} className="opacity-50" />;
    }
  };

  const handleSelect = (item: SelectorItem) => {
    onSelect(item);
    onClose();
  };

  /* ---------------- render ---------------- */

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-96 max-h-[400px] min-h-[400px] bg-[#1e1e1e] border border-[#3f3f46] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#27272a] border-b border-[#3f3f46]">
          <span className="text-xs font-bold">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 bg-[#27272a] border-b border-[#3f3f46]">
          <div className="flex items-center px-2 py-1.5 bg-[#18181b] border border-[#3f3f46] rounded">
            <Search size={12} className="text-gray-500 mr-2" />
            <input
              ref={inputRef}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-xs outline-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-xs opacity-50">
              <Search size={22} />
              No items found
            </div>
          )}

          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-3">
              <div className="px-2 py-1 text-[10px] font-bold uppercase opacity-60 sticky top-0 bg-[#1e1e1e]">
                {category}
              </div>

              {/* LIST MODE */}
              {!grid && items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 px-3 py-1.5 mx-1 rounded-sm cursor-pointer hover:bg-editor-accent transition"
                >
                  {getIcon(item)}
                  <div>
                    <div className="text-xs font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-[9px] opacity-60">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* GRID MODE */}
              {grid && (
                <div className="grid grid-cols-3 gap-1 px-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="flex flex-col items-center justify-center gap-1 p-2 rounded-sm cursor-pointer hover:bg-editor-accent transition"
                    >
                      {getIcon(item)}
                      <span className="text-[10px] text-center leading-tight">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-[#27272a] border-t border-[#3f3f46] text-[9px] flex justify-between opacity-60">
          <span>{filteredItems.length} items</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};