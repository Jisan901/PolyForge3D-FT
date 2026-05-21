import React, { useState } from 'react';
import { AtlasConfig } from '../types';
import { X } from 'lucide-react';

interface CreateModalProps {
  onClose: () => void;
  onCreate: (config: AtlasConfig) => void;
  title?: string;
  submitText?: string;
}

export function CreateModal({ onClose, onCreate, title = "New Texture Atlas", submitText = "Create" }: CreateModalProps) {
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(2);
  const [cellWidth, setCellWidth] = useState(256);
  const [cellHeight, setCellHeight] = useState(256);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ columns, rows, cellWidth, cellHeight });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 w-80 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-medium text-neutral-200">{title}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Columns</label>
              <input
                type="number"
                min="1"
                max="100"
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Rows</label>
              <input
                type="number"
                min="1"
                max="100"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Cell Width (px)</label>
              <input
                type="number"
                min="1"
                max="4096"
                value={cellWidth}
                onChange={(e) => setCellWidth(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400">Cell Height (px)</label>
              <input
                type="number"
                min="1"
                max="4096"
                value={cellHeight}
                onChange={(e) => setCellHeight(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-neutral-200 text-neutral-900 font-medium rounded hover:bg-white transition-colors"
            >
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
