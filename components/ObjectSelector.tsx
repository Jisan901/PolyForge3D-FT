import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Box, FileText, Component, Layers, Image, FileCode, Circle, Square, Video, Lightbulb, Activity, BoxSelect, Volume2 } from 'lucide-react';

export interface SelectorItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  icon?: any;
  description?: string;
}

interface ObjectSelectorProps {
  title: string;
  items: SelectorItem[];
  onSelect: (item: SelectorItem) => void;
  onClose: () => void;
}

export const ObjectSelector: React.FC<ObjectSelectorProps> = ({ title, items, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lowerTerm = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerTerm) || 
      (item.category && item.category.toLowerCase().includes(lowerTerm))
    );
  }, [items, searchTerm]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, SelectorItem[]> = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getIcon = (item: SelectorItem) => {
    if (item.icon) return <item.icon size={14} className="opacity-70" />;
    // Fallback icons based on loose type matching
    if (item.category === 'Physics') return <BoxSelect size={14} className="text-green-400" />;
    if (item.category === 'Rendering') return <Lightbulb size={14} className="text-yellow-400" />;
    if (item.category === 'Scripts') return <FileCode size={14} className="text-blue-400" />;
    if (item.category === 'Audio') return <Volume2 size={14} className="text-orange-400" />;
    return <Box size={14} className="opacity-50" />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" onClick={onClose}>
      <div 
        className="w-96 bg-[#1e1e1e] border border-[#3f3f46] shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '400px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#3f3f46] bg-[#27272a] shrink-0">
           <span className="text-xs font-bold text-gray-200">{title}</span>
           <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={14} /></button>
        </div>
        
        {/* Search Bar */}
        <div className="p-2 border-b border-[#3f3f46] bg-[#27272a] shrink-0">
           <div className="flex items-center bg-[#18181b] border border-[#3f3f46] rounded px-2 py-1.5 focus-within:border-editor-accent transition-colors">
              <Search size={12} className="text-gray-500 mr-2" />
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none text-xs text-white w-full focus:outline-none placeholder-gray-600"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
           {filteredItems.length === 0 ? (
             <div className="p-8 text-center flex flex-col items-center text-editor-textDim opacity-50">
                <Search size={24} className="mb-2" />
                <span className="text-xs">No items found</span>
             </div>
           ) : (
             Object.entries(groupedItems).map(([category, items]) => (
               <div key={category} className="mb-2">
                 <div className="px-2 py-1 text-[10px] font-bold text-editor-textDim uppercase tracking-wider sticky top-0 bg-[#1e1e1e]/95 backdrop-blur-sm z-10">
                   {category}
                 </div>
                 {items.map(item => (
                   <div 
                     key={item.id}
                     className="flex items-center px-3 py-1.5 mx-1 hover:bg-editor-accent hover:text-white cursor-pointer rounded-sm group transition-colors"
                     onClick={() => {
                       onSelect(item);
                       onClose();
                     }}
                   >
                     <div className="mr-3">{getIcon(item)}</div>
                     <div className="flex flex-col">
                        <span className="text-xs font-medium">{item.name}</span>
                        {item.description && (
                          <span className="text-[9px] text-gray-500 group-hover:text-white/70">{item.description}</span>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
             ))
           )}
        </div>
        
        {/* Footer Hint */}
        <div className="px-3 py-1.5 bg-[#27272a] border-t border-[#3f3f46] text-[9px] text-editor-textDim flex justify-between shrink-0">
            <span>{filteredItems.length} items</span>
            <div className="flex gap-2">
                <span>Select <span className="bg-white/10 px-1 rounded text-white">↵</span></span>
                <span>Close <span className="bg-white/10 px-1 rounded text-white">Esc</span></span>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};