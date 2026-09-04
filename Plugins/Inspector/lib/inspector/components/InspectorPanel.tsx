import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const InspectorPanel = ({ children, title = "Inspector" }: { children: React.ReactNode, title?: string }) => {
  return (
    <div className="w-full h-full bg-[#1c1c1c] text-gray-200 font-sans border border-gray-800 rounded-md shadow-xl overflow-hidden flex flex-col">
      <div className="bg-[#252525] px-3 py-2 text-sm font-semibold border-b border-gray-800 flex items-center">
        {title}
      </div>
      <div className="w-full h-full p-2 flex flex-col gap-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export const InspectorCategory: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}> = ({ title, children, defaultExpanded = true, icon, headerActions, className = '' }) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  
  return (
    <div className={`mb-2 ${className}`}>
      <div className="flex items-center justify-between w-full hover:bg-[#2a2a2a] rounded transition-colors pr-1">
        <button 
          className="flex items-center flex-1 text-left px-1 py-1 text-xs font-semibold text-gray-300 uppercase tracking-wider"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={14} className="mr-1 shrink-0" /> : <ChevronRight size={14} className="mr-1 shrink-0" />}
          {icon && <span className="mr-1.5 opacity-80 shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </button>
        {headerActions && (
          <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>
      {expanded && (
        <div className="pl-4 pr-1 pt-1 flex flex-col gap-1">
          {children}
        </div>
      )}
    </div>
  );
};
