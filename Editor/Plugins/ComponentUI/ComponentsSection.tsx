import React, { useState, useCallback, useEffect } from 'react';
import { Plus, MoreVertical, Trash2, RotateCcw, Copy } from 'lucide-react';
import { InspectorCategory, useInspector } from '@/Plugins/Inspector/lib/inspector';
import { ComponentRegistry } from './ComponentRegistry';
import { GenericComponentUI } from './GenericComponentUI';
import { AddComponentSelector } from './AddComponentSelector';
import { Editor } from '@/Editor/Editor';
import { BusHub } from '@/Editor/Api';
import { mutationCall, toast } from '@/Editor/Mutation';

interface ComponentsSectionProps {
  obj: any;
}

export const ComponentsSection: React.FC<ComponentsSectionProps> = ({ obj }) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);

  // Auto-migrate any legacy userData.components to userData._ecs on load
  useEffect(() => {
    if (obj?.userData?.components) {
      const entity = Editor.core.entityManager?.getOrCreateEntity(obj);
      if (entity) {
        entity.syncToUserData();
      }
      delete obj.userData.components;
      mutationCall(obj, 'userData._ecs');
    }
  }, [obj]);

  // Real-time synchronization: when inputs mutate userData._ecs, update in-memory entity components
  useEffect(() => {
    const unsub = BusHub.mutationBus.subscribe(({ target, path }) => {
      if (target === obj && path?.startsWith('userData._ecs.components')) {
        const entity = Editor.core.entityManager?.getEntity(obj);
        entity?.syncFromUserData();
      }
    });
    return () => unsub();
  }, [obj]);

  // Reactive subscription to modern userData._ecs changes
  const [ecs] = useInspector<any>(obj, 'userData._ecs');

  const componentsList: any[] = ecs?.components || obj?.userData?._ecs?.components || [];

  const handleAddComponent = useCallback(
    (nameCodeOrKey: number | string) => {
      if (!obj) return;
      try {
        const id = typeof nameCodeOrKey === 'number' ? nameCodeOrKey : parseInt(nameCodeOrKey, 10);
        const comp = Editor.core.componentManager.createComponent(id);

        const entity = Editor.core.entityManager?.getOrCreateEntity(obj);
        if (entity) {
          const ctor = Editor.core.entityManager?.getCtorByNameCode(id);
          if (ctor) {
            entity.addComponent(ctor, comp?.data);
            entity.syncToUserData();
          }
        }

        delete obj.userData.components;
        mutationCall(obj, 'userData._ecs');
        mutationCall(obj, 'userData.special');
        toast(`Added ${comp?.key || 'Component'}`);
      } catch (err: any) {
        console.error('Failed to add component:', err);
      }
    },
    [obj]
  );

  const handleDuplicateComponent = useCallback(
    (index: number) => {
      if (!obj) return;
      const comp = componentsList[index];
      if (!comp) return;

      const nameCode = comp.nameCode;
      const clonedData = structuredClone(comp.data || {});

      try {
        const entity = Editor.core.entityManager?.getOrCreateEntity(obj);
        if (entity) {
          const ctor = Editor.core.entityManager?.getCtorByNameCode(nameCode);
          if (ctor) {
            entity.addComponent(ctor, clonedData);
            entity.syncToUserData();
          }
        }

        delete obj.userData.components;
        mutationCall(obj, 'userData._ecs');
        setActiveMenuKey(null);
        toast(`Duplicated ${comp.type || 'Component'}`);
      } catch (err: any) {
        console.error('Failed to duplicate component:', err);
      }
    },
    [obj, componentsList]
  );

  const handleRemoveComponent = useCallback(
    (index: number) => {
      if (!obj) return;
      const comp = componentsList[index];
      if (!comp) return;

      const entity = Editor.core.entityManager?.getEntity(obj);
      if (entity) {
        let target = entity.allComponents.find((c) => c.id === comp.id);
        if (!target) {
          const ctor = Editor.core.entityManager?.getCtorByNameCode(comp.nameCode);
          if (ctor) {
            const list = entity.getComponents(ctor);
            if (list.length > 0) target = list[list.length - 1];
          }
        }
        if (target) {
          entity.removeComponent(target);
          entity.syncToUserData();
        }
      }

      delete obj.userData.components;
      mutationCall(obj, 'userData._ecs');
      mutationCall(obj, 'userData.special');
      setActiveMenuKey(null);
      toast(`Removed ${comp.type || 'Component'}`);
    },
    [obj, componentsList]
  );

  const handleResetComponent = useCallback(
    (index: number) => {
      if (!obj) return;
      const comp = componentsList[index];
      if (!comp) return;

      try {
        const entity = Editor.core.entityManager?.getEntity(obj);
        if (entity) {
          const target = entity.allComponents.find((c) => c.id === comp.id);
          const ctor = Editor.core.entityManager?.getCtorByNameCode(comp.nameCode);
          if (target && ctor) {
            const fresh = Editor.core.componentManager.createComponent(comp.nameCode);
            if (fresh?.data && typeof target.deserialize === 'function') {
              target.deserialize(fresh.data);
            }
            entity.syncToUserData();
          }
        }

        delete obj.userData.components;
        mutationCall(obj, 'userData._ecs');
        setActiveMenuKey(null);
        toast(`Reset ${comp.type || 'Component'}`);
      } catch (err: any) {
        console.error('Failed to reset component:', err);
      }
    },
    [obj, componentsList]
  );

  if (!obj || !obj.isObject3D) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 mt-1 border-t border-[#262626] pt-2">
      {/* Attached Components List */}
      {componentsList.map((comp: any, index: number) => {
        const compKey = `${obj?.uuid || ''}_${comp.id || comp.nameCode || index}`;
        const Icon = ComponentRegistry.getIcon(comp.nameCode ?? comp.type);

        const sameTypePrevCount = componentsList
          .slice(0, index)
          .filter((c) => (c.nameCode ?? c.type) === (comp.nameCode ?? comp.type)).length;
        const baseName = comp.type || 'Component';
        const title = sameTypePrevCount > 0 ? `${baseName} (${sameTypePrevCount})` : baseName;

        const Renderer =
          ComponentRegistry.getRenderer(comp.nameCode ?? comp.type) ||
          GenericComponentUI;

        const isMenuOpen = activeMenuKey === compKey;
        const basePath = `userData._ecs.components.${index}`;

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
                  onClick={() => handleDuplicateComponent(index)}
                  className="px-2.5 py-1 text-left hover:bg-white/10 text-gray-200 flex items-center gap-1.5 transition-colors"
                >
                  <Copy size={11} className="text-gray-400" />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => handleResetComponent(index)}
                  className="px-2.5 py-1 text-left hover:bg-white/10 text-gray-200 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={11} className="text-gray-400" />
                  Reset
                </button>
                <div className="h-px bg-[#333] my-1" />
                <button
                  type="button"
                  onClick={() => handleRemoveComponent(index)}
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
                nameCode={comp.nameCode}
                componentData={comp}
                basePath={basePath}
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
        attachedComponentKeys={componentsList.map((c) => String(c.nameCode ?? c.type))}
      />
    </div>
  );
};
