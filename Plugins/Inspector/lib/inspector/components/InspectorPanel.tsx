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

export const InspectorCategory: React.FC<{ title: string, children: React.ReactNode, defaultExpanded?: boolean }> = ({ title, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  
  return (
    <div className="mb-2">
      <button 
        className="flex items-center w-full text-left px-1 py-1 hover:bg-[#2a2a2a] rounded transition-colors text-xs font-semibold text-gray-300 uppercase tracking-wider"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} className="mr-1" /> : <ChevronRight size={14} className="mr-1" />}
        {title}
      </button>
      {expanded && (
        <div className="pl-4 pr-1 pt-1 flex flex-col gap-1">
          {children}
        </div>
      )}
    </div>
  );
};
