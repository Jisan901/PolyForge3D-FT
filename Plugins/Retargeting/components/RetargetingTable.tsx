import React from 'react';
import { X } from 'lucide-react';

interface RetargetingTableProps {
  retargetDict?: Record<string, string | number | boolean | null>;
  onRemove?: (key: string) => void;
}

export default function RetargetingTable({ retargetDict = {}, onRemove }: RetargetingTableProps) {
  const entries = Object.entries(retargetDict);

  return (
    <div className="flex flex-col w-full h-full bg-[#1e1e1e] rounded-md border border-neutral-800 shadow-2xl overflow-hidden">
      <div className="px-2 py-1.5 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
        <h3 className="text-xs font-medium text-neutral-300">Retargeting Map</h3>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-xs text-left text-neutral-300">
          <thead className="text-[10px] text-neutral-500 uppercase bg-neutral-900/80 sticky top-0 backdrop-blur-sm">
            <tr>
              <th scope="col" className="px-2 py-1.5 font-medium w-[45%]">Source Key</th>
              <th scope="col" className="px-2 py-1.5 font-medium w-[45%]">Target Value</th>
              <th scope="col" className="px-2 py-1.5 font-medium w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {entries.length > 0 ? (
              entries.map(([key, value]) => (
                <tr 
                  key={key} 
                  className="hover:bg-neutral-800/30 transition-colors group"
                >
                  <td className="px-2 py-1 font-mono text-blue-400/90 break-all">{key}</td>
                  <td className="px-2 py-1 font-mono text-green-400/90 break-all">{String(value)}</td>
                  <td className="px-2 py-1 text-right">
                    <button 
                      onClick={() => onRemove?.(key)}
                      className="text-neutral-500 hover:text-red-400 transition-colors"
                      title="Remove mapping"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-2 py-4 text-center text-neutral-500 italic">
                  No mapping data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
