import React, { useState, useCallback } from 'react';
import { Plus, MoreVertical, Trash2, RotateCcw, Copy } from 'lucide-react';
import { InspectorCategory, useInspector } from '@/Plugins/Inspector/lib/inspector';
import { ComponentRegistry } from './ComponentRegistry';
import { GenericComponentUI } from './GenericComponentUI';
import { AddComponentSelector } from './AddComponentSelector';
import { Editor } from '@/Editor/Editor';
import { mutationCall, toast } from '@/Editor/Mutation';

interface ComponentsSectionProps {
  obj: any;
}

export const ComponentsSection: React.FC<ComponentsSectionProps> = ({ obj }) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);

  // Reactive subscription to userData.components changes
  const [components] = useInspector<Record<string, any>>(obj, 'userData.components');

  const componentsMap = components || obj?.userData?.components || {};
  const entries = Object.entries(componentsMap);

  const handleAddComponent = useCallback(
    (nameCodeOrKey: number | string) => {
      if (!obj) return;
      try {
        const id = typeof nameCodeOrKey === 'number' ? nameCodeOrKey : parseInt(nameCodeOrKey, 10);
        const comp = Editor.core.componentManager.createComponent(id);

        if (!obj.userData.components) {
          obj.userData.components = {};
        }

        const key = String(id);
        obj.userData.components[key] = comp;
        obj.userData.special = true;

        mutationCall(obj, 'userData.components');
        if (id === 7) {
          mutationCall(obj, 'userData.components.7');
        }
        toast(`Added ${comp.key || 'Component'}`);
      } catch (err: any) {
        console.error('Failed to add component:', err);
      }
    },
    [obj]
  );

  const handleRemoveComponent = useCallback(
    (key: string) => {
      if (!obj?.userData?.components) return;
      const comp = obj.userData.components[key];
      delete obj.userData.components[key];

      if (Object.keys(obj.userData.components).length === 0) {
        obj.userData.special = false;
      }

      mutationCall(obj, 'userData.components');
      if (key === '7' || parseInt(key, 10) === 7) {
        mutationCall(obj, 'userData.components.7');
      }
      setActiveMenuKey(null);
      toast(`Removed ${comp?.key || 'Component'}`);
    },
    [obj]
  );

  const handleResetComponent = useCallback(
    (key: string) => {
      if (!obj?.userData?.components) return;
      try {
        const nameCode = parseInt(key, 10);
        const newComp = Editor.core.componentManager.createComponent(nameCode);
        obj.userData.components[key] = newComp;

        mutationCall(obj, `userData.components.${key}`);
        mutationCall(obj, 'userData.components');
        setActiveMenuKey(null);
        toast(`Reset ${newComp.key || 'Component'}`);
      } catch (err: any) {
        console.error('Failed to reset component:', err);
      }
    },
    [obj]
  );

  if (!obj || !obj.isObject3D) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 mt-1 border-t border-[#262626] pt-2">
      {/* Attached Components List */}
      {entries.map(([compKey, compData]: [string, any]) => {
        const Icon = ComponentRegistry.getIcon(compData?.key || compKey);
        const title = ComponentRegistry.getTitle(compKey, compData);
        const Renderer =
          ComponentRegistry.getRenderer(compData?.key || compKey) ||
          GenericComponentUI;

        const isMenuOpen = activeMenuKey === compKey;

        const headerActions = (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuKey(isMenuOpen ? null : compKey);
              }}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Component options"
            >
              <MoreVertical size={13} />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-6 z-30 w-36 bg-[#222] border border-[#333] rounded shadow-xl py-1 text-xs flex flex-col font-sans animate-in fade-in duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleResetComponent(compKey)}
                  className="px-2.5 py-1 text-left hover:bg-white/10 text-gray-200 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={11} className="text-gray-400" />
                  Reset
                </button>
                <div className="h-px bg-[#333] my-1" />
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(compKey)}
                  className="px-2.5 py-1 text-left hover:bg-red-500/20 text-red-400 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={11} />
                  Remove
                </button>
              </div>
            )}
          </div>
        );

        return (
          <div key={compKey} className="relative rounded bg-[#161616] border border-[#262626] p-1">
            <InspectorCategory
              title={title}
              icon={<Icon size={13} className="text-blue-400" />}
              headerActions={headerActions}
              defaultExpanded={true}
            >
              <Renderer
                object={obj}
                componentKey={compKey}
                nameCode={compData?.nameCode}
                componentData={compData}
                basePath={`userData.components.${compKey}`}
              />
            </InspectorCategory>
          </div>
        );
      })}

      {/* Add Component Button */}
      <div className="px-1 mt-2">
        <button
          type="button"
          onClick={() => setSelectorOpen(true)}
          className="w-full py-1.5 px-3 rounded border border-dashed border-[#3a3a3a] hover:border-blue-500 bg-[#161616] hover:bg-blue-500/5 text-xs text-gray-300 hover:text-blue-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium"
        >
          <Plus size={13} />
          Add Component
        </button>
      </div>

      {/* Add Component Modal Selector */}
      <AddComponentSelector
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleAddComponent}
        attachedComponentKeys={Object.keys(componentsMap)}
      />
    </div>
  );
};
