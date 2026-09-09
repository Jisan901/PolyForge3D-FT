import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Cpu,
  Boxes,
  Box,
  Layers,
  Search,
  Activity,
  FileCode,
  BoxSelect,
  Eye,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight,
  ChevronDown,
  Hash,
  Globe,
  Sparkles,
  Zap,
  Tag
} from 'lucide-react';
import { Editor } from '@/Editor/Editor';
import { ACTIONS } from '@/Editor/Actions';
import { useEditorStates } from '../contexts/EditorContext';
import { mutationCall } from '@/Editor/Mutation';
import { Components } from '@/Core/Types/Components';

interface ComponentBadgeInfo {
  name: string;
  nameCode?: number;
  data?: any;
  enabled?: boolean;
}

interface EntityViewData {
  id: string;
  name: string;
  type: string;
  object3d: any;
  mask: number;
  componentCount: number;
  components: ComponentBadgeInfo[];
}

export default function ECSInspector() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'entities' | 'queries'>('entities');
  const [selectedFilterComp, setSelectedFilterComp] = useState<string | null>(null);
  const [expandedEntityIds, setExpandedEntityIds] = useState<Set<string>>(new Set());
  const [addMenuEntityId, setAddMenuEntityId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const editorStates = useEditorStates();
  const selectedId = editorStates?.selectedId || '';

  // Force re-read on scene changes or mutations
  const refresh = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    const unsubMutation = Editor.api.buses.mutationBus.subscribe(() => {
      refresh();
    });
    const unsubScene = Editor.api.buses.sceneUpdate.subscribe(() => {
      refresh();
    });
    const unsubSelection = Editor.api.buses.selectionUpdate.subscribe(() => {
      refresh();
    });

    // Heartbeat for reactive live changes (e.g. physics running or scripts added)
    const timer = setInterval(() => {
      refresh();
    }, 1000);

    return () => {
      unsubMutation();
      unsubScene();
      unsubSelection();
      clearInterval(timer);
    };
  }, [refresh]);

  // Aggregate all entities from EntityManager & Scene Graph
  const entitiesData: EntityViewData[] = useMemo(() => {
    const result: EntityViewData[] = [];
    const entityManager = Editor.core.entityManager;
    const activeScene = Editor.core.sceneManager?.activeScene;

    if (!activeScene) return result;

    activeScene.traverse((child: any) => {
      if (!child || !child.isObject3D) return;

      const entity = entityManager?.getEntity(child);
      const ecsComps = child.userData?._ecs?.components;
      const hasComponents = Boolean(
        (entity && entity.allComponents && entity.allComponents.length > 0) ||
        (Array.isArray(ecsComps) && ecsComps.length > 0) ||
        (child.userData?.components && Object.keys(child.userData.components).length > 0)
      );

      // Only list objects that have components or are explicitly tracked as entities
      if (!entity && !hasComponents && !child.userData?.special) return;

      // Extract components
      const badges: ComponentBadgeInfo[] = [];

      if (entity && entity.allComponents && entity.allComponents.length > 0) {
        for (const comp of entity.allComponents) {
          badges.push({
            name: (comp.constructor as any).componentName || comp.constructor.name.replace(/Component$/, ''),
            enabled: comp.enabled,
            data: typeof comp.serialize === 'function' ? comp.serialize() : {}
          });
        }
      } else if (Array.isArray(ecsComps)) {
        for (const comp of ecsComps) {
          badges.push({
            name: comp.type || 'Component',
            nameCode: comp.nameCode,
            data: comp.data,
            enabled: comp.enabled ?? true
          });
        }
      } else if (child.userData?.components) {
        for (const key of Object.keys(child.userData.components)) {
          const rec = child.userData.components[key];
          badges.push({
            name: rec.key ? rec.key.charAt(0).toUpperCase() + rec.key.slice(1) : `Component #${key}`,
            nameCode: rec.nameCode ?? parseInt(key, 10),
            data: rec.data,
            enabled: rec.data?.enabled ?? true
          });
        }
      }

      result.push({
        id: child.uuid,
        name: child.name || (child.type || 'Object3D'),
        type: child.type || 'Object3D',
        object3d: child,
        mask: entity ? entity.mask : 0,
        componentCount: badges.length,
        components: badges
      });
    });

    return result;
  }, [tick]);

  // Registered component templates for adding components
  const availableTemplates = useMemo(() => {
    try {
      return Editor.core.componentManager.getAllTemplate();
    } catch {
      return [];
    }
  }, []);

  // Filtered entities based on search & component filter
  const filteredEntities = useMemo(() => {
    return entitiesData.filter(ent => {
      const matchesSearch =
        search === '' ||
        ent.name.toLowerCase().includes(search.toLowerCase()) ||
        ent.id.toLowerCase().includes(search.toLowerCase()) ||
        ent.components.some(c => c.name.toLowerCase().includes(search.toLowerCase()));

      const matchesComp =
        !selectedFilterComp ||
        ent.components.some(
          c => c.name.toLowerCase() === selectedFilterComp.toLowerCase()
        );

      return matchesSearch && matchesComp;
    });
  }, [entitiesData, search, selectedFilterComp]);

  // Registered ECS Queries information
  const queriesData = useMemo(() => {
    const list: { name: string; components: string[]; count: number; filterKey: string }[] = [
      {
        name: 'Physics System Query',
        components: ['Rigidbody', 'Collider'],
        count: entitiesData.filter(e =>
          e.components.some(c => c.name.toLowerCase().includes('rigidbody')) &&
          e.components.some(c => c.name.toLowerCase().includes('collider'))
        ).length,
        filterKey: 'rigidbody'
      },
      {
        name: 'Script System Query',
        components: ['Script'],
        count: entitiesData.filter(e =>
          e.components.some(c => c.name.toLowerCase().includes('script'))
        ).length,
        filterKey: 'script'
      },
      {
        name: 'Transform Hierarchy Query',
        components: ['Transform'],
        count: entitiesData.filter(e =>
          e.components.some(c => c.name.toLowerCase().includes('transform'))
        ).length,
        filterKey: 'transform'
      }
    ];
    return list;
  }, [entitiesData]);

  const totalComponents = useMemo(() => {
    return entitiesData.reduce((acc, curr) => acc + curr.componentCount, 0);
  }, [entitiesData]);

  const handleSelectEntity = useCallback(
    (ent: EntityViewData) => {
      ACTIONS.execute('select_object', ent.id);
      if (Editor.api.three.selectedObject?.uuid !== ent.id) {
        Editor.api.three.selectObject(ent.object3d);
      }
    },
    []
  );

  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEntityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddComponent = useCallback(
    (object3d: any, nameCode: number) => {
      try {
        const compRecord = Editor.core.componentManager.createComponent(nameCode);
        const entity = Editor.core.entityManager?.getOrCreateEntity(object3d);
        if (entity) {
          const ctor = Editor.core.entityManager?.getCtorByNameCode(nameCode);
          if (ctor) {
            entity.addComponent(ctor, compRecord?.data);
            entity.syncToUserData();
          }
        }

        delete object3d.userData.components;
        mutationCall(object3d, 'userData._ecs');
        mutationCall(object3d, 'userData.special');
        setAddMenuEntityId(null);
        refresh();
      } catch (err) {
        console.error('Failed to add component:', err);
      }
    },
    [refresh]
  );

  const handleRemoveComponent = useCallback(
    (object3d: any, compName: string, nameCode?: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        const entity = Editor.core.entityManager?.getEntity(object3d);
        if (entity) {
          const ctor = nameCode !== undefined
            ? Editor.core.entityManager?.getCtorByNameCode(nameCode)
            : Editor.core.entityManager?.getCtorByName(compName);
          if (ctor) {
            const list = entity.getComponents(ctor);
            if (list.length > 0) {
              entity.removeComponent(list[list.length - 1]);
              entity.syncToUserData();
            }
          }
        }

        delete object3d.userData.components;
        mutationCall(object3d, 'userData._ecs');
        mutationCall(object3d, 'userData.special');
        refresh();
      } catch (err) {
        console.error('Failed to remove component:', err);
      }
    },
    [refresh]
  );

  const getComponentIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('script')) return <FileCode size={11} className="text-amber-400" />;
    if (n.includes('rigidbody')) return <Activity size={11} className="text-emerald-400" />;
    if (n.includes('collider')) return <BoxSelect size={11} className="text-sky-400" />;
    if (n.includes('transform')) return <Globe size={11} className="text-indigo-400" />;
    return <Layers size={11} className="text-purple-400" />;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#121214] text-[#e0e0e0] select-none font-sans text-xs overflow-hidden">
      {/* Top Header / Status bar */}
      <div className="flex flex-col border-b border-[#252529] bg-[#18181b] p-2 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu size={14} />
            </div>
            <span className="font-semibold text-[13px] tracking-wide text-white flex items-center gap-1.5">
              ECS Inspector
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]/30">
              <Boxes size={11} className="text-indigo-400" />
              <span>{entitiesData.length}</span>
              <span className="text-[#71717a]">entities</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]/30">
              <Layers size={11} className="text-emerald-400" />
              <span>{totalComponents}</span>
              <span className="text-[#71717a]">comps</span>
            </div>
            <button
              onClick={refresh}
              className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#d4d4d8] transition-colors"
              title="Refresh ECS State"
            >
              <RefreshCw size={11} />
            </button>
          </div>
        </div>

        {/* Search Bar & Mode Switch */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entities, components, or UUID..."
              className="w-full bg-[#202024] border border-[#2d2d32] focus:border-indigo-500/50 rounded pl-7 pr-2.5 py-1 text-[11px] text-[#f4f4f5] placeholder-[#71717a] outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#d4d4d8] text-[10px]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex p-0.5 rounded bg-[#202024] border border-[#2d2d32]">
            <button
              onClick={() => setActiveTab('entities')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                activeTab === 'entities'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
            >
              Entities
            </button>
            <button
              onClick={() => setActiveTab('queries')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                activeTab === 'queries'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[#a1a1aa] hover:text-white'
              }`}
            >
              Queries
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {activeTab === 'entities' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[10px]">
            <button
              onClick={() => setSelectedFilterComp(null)}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap border ${
                selectedFilterComp === null
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-[#202024] text-[#a1a1aa] border-transparent hover:border-[#3f3f46]'
              }`}
            >
              All ({entitiesData.length})
            </button>
            {['Script', 'Rigidbody', 'Collider', 'Transform'].map(cName => {
              const count = entitiesData.filter(e =>
                e.components.some(c => c.name.toLowerCase().includes(cName.toLowerCase()))
              ).length;
              const isSelected = selectedFilterComp === cName;
              return (
                <button
                  key={cName}
                  onClick={() => setSelectedFilterComp(isSelected ? null : cName)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors whitespace-nowrap border ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-[#202024] text-[#a1a1aa] border-transparent hover:border-[#3f3f46]'
                  }`}
                >
                  {getComponentIcon(cName)}
                  <span>{cName}</span>
                  <span className="text-[#71717a] text-[9px] font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {activeTab === 'queries' ? (
          /* Queries View */
          <div className="space-y-2">
            <div className="text-[11px] text-[#71717a] px-1 font-medium">
              Registered Reactive ECS Queries (Bitmask Cached)
            </div>
            {queriesData.map((q, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedFilterComp(q.filterKey);
                  setActiveTab('entities');
                }}
                className="p-3 rounded-md bg-[#18181b] border border-[#27272a] hover:border-indigo-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                      <Zap size={13} />
                    </div>
                    <div>
                      <div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {q.name}
                      </div>
                      <div className="text-[10px] text-[#71717a]">
                        Matches entities with all of: {q.components.join(' + ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#27272a] text-indigo-300 font-mono text-[11px] font-semibold border border-[#3f3f46]/30">
                    <span>{q.count}</span>
                    <span className="text-[9px] text-[#71717a] font-normal">entities</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {q.components.map(comp => (
                    <span
                      key={comp}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#222226] text-[#a1a1aa] text-[10px] border border-[#2d2d32]"
                    >
                      {getComponentIcon(comp)}
                      {comp}
                    </span>
                  ))}
                  <span className="text-[9px] text-[#71717a] ml-auto group-hover:text-indigo-300 transition-colors">
                    Click to filter &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Entities List View */
          <>
            {filteredEntities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#71717a] gap-2">
                <Boxes size={28} className="text-[#3f3f46]" />
                <span className="text-[11px]">No matching entities found.</span>
                <span className="text-[10px] text-[#52525b]">
                  Attach components to scene objects to track them here.
                </span>
              </div>
            ) : (
              filteredEntities.map(ent => {
                const isSelected = selectedId === ent.id;
                const isExpanded = expandedEntityIds.has(ent.id);

                return (
                  <div
                    key={ent.id}
                    onClick={() => handleSelectEntity(ent)}
                    className={`rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e1e24] border-indigo-500/80 shadow-[0_0_12px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/40'
                        : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] hover:bg-[#1b1b1f]'
                    }`}
                  >
                    {/* Entity Card Header */}
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={e => toggleExpand(ent.id, e)}
                          className="p-0.5 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#d4d4d8] transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        <div className="p-1 rounded bg-[#27272a] text-indigo-400">
                          <Box size={12} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-semibold truncate text-[11px] ${
                                isSelected ? 'text-indigo-300' : 'text-[#f4f4f5]'
                              }`}
                            >
                              {ent.name}
                            </span>
                            <span className="text-[9px] font-mono text-[#71717a] px-1 py-0.2 rounded bg-[#202024]">
                              {ent.id.slice(0, 6)}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#71717a] flex items-center gap-2">
                            <span>{ent.type}</span>
                            {ent.mask > 0 && (
                              <span className="font-mono text-[8px] text-indigo-400/80">
                                mask: {ent.mask}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Icons & Badges */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#202024] text-[#a1a1aa] font-mono text-[9px] border border-[#2d2d32]">
                          <span>{ent.componentCount}</span>
                          <span className="text-[#71717a]">comps</span>
                        </div>

                        {/* Quick Select Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectEntity(ent);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isSelected
                              ? 'bg-indigo-500 text-white'
                              : 'hover:bg-[#27272a] text-[#71717a] hover:text-[#d4d4d8]'
                          }`}
                          title="Select & Inspect in App Inspector"
                        >
                          <Eye size={12} />
                        </button>

                        {/* Add Component Menu Trigger */}
                        <div className="relative">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setAddMenuEntityId(addMenuEntityId === ent.id ? null : ent.id);
                            }}
                            className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-[#d4d4d8] transition-colors"
                            title="Add Component"
                          >
                            <Plus size={12} />
                          </button>

                          {/* Add Component Dropdown Popover */}
                          {addMenuEntityId === ent.id && (
                            <div
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-44 rounded-md bg-[#1f1f23] border border-[#3f3f46] shadow-xl z-50 py-1"
                            >
                              <div className="px-2 py-1 text-[9px] font-semibold text-[#a1a1aa] uppercase tracking-wider border-b border-[#2d2d32]">
                                Attach Component
                              </div>
                              <div className="max-h-48 overflow-y-auto py-0.5">
                                {availableTemplates.map(tpl => (
                                  <button
                                    key={tpl.nameCode}
                                    onClick={() => handleAddComponent(ent.object3d, tpl.nameCode)}
                                    className="w-full text-left px-2.5 py-1 text-[11px] text-[#e4e4e7] hover:bg-indigo-600 hover:text-white flex items-center justify-between transition-colors"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      {getComponentIcon(tpl.name || '')}
                                      {tpl.name}
                                    </span>
                                    <span className="text-[9px] opacity-60 font-mono">
                                      #{tpl.nameCode}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Component Badges Row */}
                    {ent.components.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
                        {ent.components.map((c, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all ${
                              isSelected
                                ? 'bg-indigo-950/40 text-indigo-200 border-indigo-500/30'
                                : 'bg-[#202024] text-[#a1a1aa] border-[#2d2d32]'
                            }`}
                          >
                            {getComponentIcon(c.name)}
                            <span>{c.name}</span>
                            <button
                              onClick={e => handleRemoveComponent(ent.object3d, c.name, c.nameCode, e)}
                              className="ml-1 hover:text-rose-400 text-[#71717a] transition-colors"
                              title={`Remove ${c.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded Details View */}
                    {isExpanded && (
                      <div className="border-t border-[#27272a] bg-[#141416] p-2.5 rounded-b-md space-y-2">
                        <div className="text-[10px] text-[#a1a1aa] font-medium flex items-center justify-between">
                          <span>Attached Component Details</span>
                          <span className="text-[9px] text-[#71717a]">
                            Click "Eye" to edit properties in App Inspector
                          </span>
                        </div>

                        {ent.components.length === 0 ? (
                          <div className="text-[10px] text-[#71717a] italic">
                            No components attached to this entity.
                          </div>
                        ) : (
                          ent.components.map((c, i) => (
                            <div
                              key={i}
                              className="p-2 rounded bg-[#1c1c20] border border-[#27272a] space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                                <div className="flex items-center gap-1.5">
                                  {getComponentIcon(c.name)}
                                  <span>{c.name}</span>
                                </div>
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#27272a] text-[#a1a1aa]">
                                  {c.enabled !== false ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>

                              {/* Component Data Summary Preview */}
                              {c.data && (
                                <div className="text-[10px] font-mono text-[#a1a1aa] bg-[#121214] p-1.5 rounded border border-[#202024] overflow-x-auto max-h-24 scrollbar-thin">
                                  <pre className="text-[9px] text-[#a1a1aa] leading-tight">
                                    {JSON.stringify(c.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Bottom Hint Footer */}
      <div className="border-t border-[#252529] bg-[#161618] px-3 py-1.5 flex items-center justify-between text-[10px] text-[#71717a]">
        <div className="flex items-center gap-1">
          <Sparkles size={11} className="text-indigo-400" />
          <span>Selecting an entity here synchronizes directly with the App Inspector</span>
        </div>
        <div className="font-mono text-[9px] text-[#52525b]">
          PolyForge HECS v1.0
        </div>
      </div>
    </div>
  );
}
