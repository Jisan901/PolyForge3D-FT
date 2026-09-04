import React from 'react';
import { createPortal } from 'react-dom';
import SettingsPanel, { SettingsPanelProps } from './SettingsPanel';

export interface SettingsModalProps extends SettingsPanelProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, ...props }) => {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[720px] max-w-[90vw] h-[540px] max-h-[85vh] bg-editor-panel border border-editor-border shadow-2xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <SettingsPanel onClose={onClose} {...props} />
      </div>
    </div>,
    document.body
  );
};

export { SettingsPanel };
export default SettingsPanel;