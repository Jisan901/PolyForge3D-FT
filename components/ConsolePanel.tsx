import React, { useRef, useEffect } from 'react';
import { AlertTriangle, Info, XCircle, Ban } from 'lucide-react';

export interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
  count: number;
}

interface ConsolePanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warn': return <AlertTriangle size={12} className="text-yellow-500" />;
      case 'error': return <XCircle size={12} className="text-red-500" />;
      default: return <Info size={12} className="text-editor-textDim" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-editor-panel text-editor-text font-mono text-[11px]">
      {/* Console Toolbar */}
      <div className="h-8 flex items-center px-2 border-b border-editor-border bg-editor-bg gap-2 shrink-0">
         <button 
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 text-editor-textDim transition-colors"
            onClick={onClear}
         >
            <Ban size={12} />
            <span>Clear</span>
         </button>
         <div className="h-4 w-[1px] bg-editor-border mx-1" />
         <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 cursor-pointer text-editor-textDim">
            <span className="text-editor-text">Collapse</span>
         </div>
         <div className="flex-1" />
         <div className="flex gap-2 text-[10px] text-editor-textDim">
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><Info size={10} /> {logs.filter(l => l.type === 'log').length}</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><AlertTriangle size={10} className="text-yellow-500/80" /> {logs.filter(l => l.type === 'warn').length}</span>
            <span className="flex items-center gap-1 hover:text-white cursor-pointer"><XCircle size={10} className="text-red-500/80" /> {logs.filter(l => l.type === 'error').length}</span>
         </div>
      </div>

      {/* Logs List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-1 bg-[#1e1e1e]">
        {logs.length === 0 ? (
           <div className="h-full flex items-center justify-center text-editor-textDim opacity-30 select-none">
              <span>No logs to display</span>
           </div>
        ) : (
          logs.map((log, index) => (
            <div 
                key={index} 
                className={`
                    flex items-start gap-2 p-1 border-b border-editor-border/30 hover:bg-white/5 select-text cursor-default
                    ${log.type === 'error' ? 'bg-red-500/10' : log.type === 'warn' ? 'bg-yellow-500/5' : ''}
                `}
            >
                <div className="mt-0.5 shrink-0">{getIcon(log.type)}</div>
                <div className="flex-1 break-all text-editor-text">
                    <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                    <span className={log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-editor-text'}>
                        {log.message}
                    </span>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;