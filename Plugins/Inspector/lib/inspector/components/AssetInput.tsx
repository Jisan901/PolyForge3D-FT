import React, { useRef, useState, useEffect, useCallback } from 'react';
import { File, FileCode, Music, Image as ImageIcon, Box, X, Target } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';
import { DragAndDropZone } from '@/Ui/components/Utils/DragNDrop';

export interface AssetInputProps {
  label?: string;
  value?: any;
  onChange?: (val: any) => void;
  obj?: any;
  prop?: string;
  placeholder?: string;
  accept?: string[];
}

function getFileIcon(path?: string) {
  if (!path) return <File size={12} className="text-gray-400" />;
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'js':
    case 'tsx':
    case 'jsx':
      return <FileCode size={12} className="text-blue-400" />;
    case 'mp3':
    case 'ogg':
    case 'wav':
      return <Music size={12} className="text-purple-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return <ImageIcon size={12} className="text-green-400" />;
    case 'gltf':
    case 'glb':
    case 'fbx':
    case 'obj':
    case 'bin':
      return <Box size={12} className="text-amber-400" />;
    default:
      return <File size={12} className="text-gray-400" />;
  }
}

export const AssetInput: React.FC<AssetInputProps> = React.memo(({
  label,
  value,
  onChange,
  obj,
  prop,
  placeholder = 'None (Drop asset here)',
  accept
}) => {
  const [inspectorValue, setInspectorValue] = useInspector<any>(obj, prop);

  const rawValue = (obj && prop) ? inspectorValue : value;

  // Normalise value: could be a string path or an object { isFile: true, value: '...' }
  const getPath = useCallback((): string => {
    if (!rawValue) return '';
    if (typeof rawValue === 'string') return rawValue;
    if (typeof rawValue === 'object' && rawValue.value) return String(rawValue.value);
    return '';
  }, [rawValue]);

  const [currentPath, setCurrentPath] = useState<string>(getPath());

  useEffect(() => {
    setCurrentPath(getPath());
  }, [getPath]);

  const handleUpdate = (newPath: string | null) => {
    let finalValue: any = newPath;
    if (typeof rawValue === 'object' && rawValue !== null && 'isFile' in rawValue) {
      finalValue = { ...rawValue, value: newPath };
    } else if (newPath === null) {
      finalValue = null;
    }

    setCurrentPath(newPath || '');
    if (obj && prop) {
      setInspectorValue(finalValue);
    }
    if (onChange) {
      onChange(finalValue);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleUpdate(null);
  };

  const handleDropPayload = (payload: any) => {
    if (!payload) return;
    // Handled payload from PolyForge drag-and-drop system
    if (payload.type === 'Asset') {
      const assetData = payload.data;
      const path = assetData.fullPath || assetData.id || assetData.name;
      if (path) {
        handleUpdate(path);
      }
    } else if (payload.data && typeof payload.data === 'string') {
      handleUpdate(payload.data);
    }
  };

  return (
    <div className="flex items-center w-full text-xs mb-[2px] group">
      {label && (
        <div className="w-[40%] text-gray-400 truncate pr-2 select-none py-1">
          {label}
        </div>
      )}
      <div className={`${label ? 'w-[60%]' : 'w-full'} flex items-center`}>
        <DragAndDropZone
          highlight={true}
          onDrop={(payload: any) => handleDropPayload(payload)}
          className="w-full flex items-center bg-[#141414] hover:bg-[#1a1a1a] border border-[#333] hover:border-gray-500 rounded overflow-hidden transition-colors cursor-pointer"
        >
          <div className="px-2 py-1 flex items-center gap-1.5 flex-1 min-w-0">
            {getFileIcon(currentPath)}
            <span
              className={`text-[11px] truncate select-none ${
                currentPath ? 'text-gray-200' : 'text-gray-500 italic'
              }`}
              title={currentPath || placeholder}
            >
              {currentPath ? currentPath.split('/').pop() || currentPath : placeholder}
            </span>
          </div>

          {currentPath && (
            <button
              type="button"
              onClick={handleClear}
              className="px-1.5 py-1 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors border-l border-[#262626]"
              title="Clear asset"
            >
              <X size={12} />
            </button>
          )}

          <div className="px-1.5 py-1 bg-white/5 border-l border-[#262626] text-gray-500 group-hover:text-blue-400 transition-colors">
            <Target size={12} />
          </div>
        </DragAndDropZone>
      </div>
    </div>
  );
});
