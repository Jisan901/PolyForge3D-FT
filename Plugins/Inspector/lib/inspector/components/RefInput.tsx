import React, { useState, useEffect, useCallback } from 'react';
import { Box, X, Target, ExternalLink } from 'lucide-react';
import { useInspector } from '../hooks/useInspector';
import { DragAndDropZone } from '@/Ui/components/Utils/DragNDrop';
import { Editor } from '@/Editor/Editor';

export interface RefInputProps {
  label?: string;
  value?: any;
  onChange?: (val: any) => void;
  obj?: any;
  prop?: string;
  placeholder?: string;
}

export const RefInput: React.FC<RefInputProps> = React.memo(({
  label,
  value,
  onChange,
  obj,
  prop,
  placeholder = 'None (Drop object here)'
}) => {
  const [inspectorValue, setInspectorValue] = useInspector<any>(obj, prop);

  const rawValue = (obj && prop) ? inspectorValue : value;

  const getRefInfo = useCallback(() => {
    if (!rawValue) return { ref: '', name: '' };
    if (typeof rawValue === 'string') return { ref: rawValue, name: rawValue };
    if (typeof rawValue === 'object') {
      return {
        ref: rawValue.ref || rawValue.uuid || '',
        name: rawValue.name || rawValue.ref || rawValue.uuid || ''
      };
    }
    return { ref: '', name: '' };
  }, [rawValue]);

  const [refInfo, setRefInfo] = useState(getRefInfo());

  useEffect(() => {
    setRefInfo(getRefInfo());
  }, [getRefInfo]);

  const handleUpdate = (newRef: { ref: string; name: string } | null) => {
    let finalValue: any = null;
    if (newRef) {
      if (typeof rawValue === 'object' && rawValue !== null && 'isRef' in rawValue) {
        finalValue = { ...rawValue, ref: newRef.ref, name: newRef.name };
      } else {
        finalValue = { isRef: true, ref: newRef.ref, name: newRef.name };
      }
    }

    setRefInfo(newRef || { ref: '', name: '' });
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

  const handleSelectObject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!refInfo.ref) return;
    const scene = Editor.core.sceneManager.activeScene;
    if (!scene) return;
    const targetObj = scene.getObjectByProperty('uuid', refInfo.ref);
    if (targetObj) {
      Editor.api.three.selectObject(targetObj);
    }
  };

  const handleDropPayload = (payload: any) => {
    if (!payload) return;
    if (payload.type === 'Object' && payload.data) {
      const { uuid, name } = payload.data;
      if (uuid) {
        handleUpdate({ ref: uuid, name: name || 'Object' });
      }
    } else if (payload.data?.uuid) {
      handleUpdate({ ref: payload.data.uuid, name: payload.data.name || 'Object' });
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
            <Box size={12} className="text-amber-400 shrink-0" />
            <span
              className={`text-[11px] truncate select-none ${
                refInfo.name ? 'text-gray-200' : 'text-gray-500 italic'
              }`}
              title={refInfo.name || placeholder}
            >
              {refInfo.name || placeholder}
            </span>
          </div>

          {refInfo.ref && (
            <>
              <button
                type="button"
                onClick={handleSelectObject}
                className="px-1.5 py-1 text-gray-400 hover:text-blue-400 hover:bg-white/5 transition-colors border-l border-[#262626]"
                title="Select referenced object"
              >
                <ExternalLink size={11} />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-1.5 py-1 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors border-l border-[#262626]"
                title="Clear reference"
              >
                <X size={12} />
              </button>
            </>
          )}

          <div className="px-1.5 py-1 bg-white/5 border-l border-[#262626] text-gray-500 group-hover:text-blue-400 transition-colors">
            <Target size={12} />
          </div>
        </DragAndDropZone>
      </div>
    </div>
  );
});
