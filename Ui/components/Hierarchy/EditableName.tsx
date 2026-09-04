import React, { useState, useRef, useEffect } from 'react';
import { EditableNameProps } from './types';

export const EditableName: React.FC<EditableNameProps> = ({ 
  name, 
  searchQuery = '', 
  isRenaming = false,
  onRename, 
  onFinishRename 
}) => {
  const [editing, setEditing] = useState(isRenaming);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(name);
  }, [name]);

  useEffect(() => {
    if (isRenaming) {
      setEditing(true);
    }
  }, [isRenaming]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim();
    setEditing(false);
    onFinishRename?.();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setValue(name);
    }
  };

  const cancel = () => {
    setValue(name);
    setEditing(false);
    onFinishRename?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="flex-1 bg-black/60 text-white text-[11px] px-1 py-0.5 rounded border border-editor-accent outline-none font-sans"
      />
    );
  }

  // Highlight search substring if active
  const renderHighlighted = () => {
    if (!searchQuery) return name;
    const idx = name.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return name;
    const before = name.slice(0, idx);
    const match = name.slice(idx, idx + searchQuery.length);
    const after = name.slice(idx + searchQuery.length);
    return (
      <>
        {before}
        <span className="bg-yellow-500/30 text-yellow-200 font-semibold px-0.5 rounded">{match}</span>
        {after}
      </>
    );
  };

  return (
    <span
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className="flex-1 truncate select-none text-[11px]"
      title={`${name} (Double-click to rename)`}
    >
      {renderHighlighted()}
    </span>
  );
};

export default EditableName;
