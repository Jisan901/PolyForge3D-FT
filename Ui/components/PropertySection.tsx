import React from 'react';
import { MoreVertical } from 'lucide-react';

interface PropertySectionProps {
  title: string;
  children?: React.ReactNode;
  icon?: any;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const PropertySection: React.FC<PropertySectionProps> = ({ title, children, icon: Icon, onContextMenu }) => (
  <div className="border-b border-editor-border pb-2 mb-2">
    <div 
      className="flex items-center px-3 py-2 bg-white/5 mb-1 cursor-pointer hover:bg-white/10 transition-colors group"
      onContextMenu={onContextMenu}
    >
       {Icon && <Icon size={12} className="mr-2 text-editor-accent" />}
      <span className="text-[11px] font-bold text-editor-text uppercase tracking-wider">{title}</span>
      <div className="flex-1" />
      <MoreVertical 
        size={12} 
        className="text-editor-textDim cursor-pointer hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" 
        onClick={(e) => {
          e.stopPropagation();
          if (onContextMenu) onContextMenu(e);
        }}
      />
    </div>
    <div className="px-3 pt-1">
      {children}
    </div>
  </div>
);
