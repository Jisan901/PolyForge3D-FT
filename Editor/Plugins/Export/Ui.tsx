import React from 'react';
import { InspectorCategory } from '@/Plugins/Inspector/lib/inspector/components/InspectorPanel';
import { DragAndDropZone } from "@/Ui/components/Utils/DragNDrop";


const DraggableExportItem: React.FC<{obj: any ,title: string, desc?: string, type?: 'object' | 'geometry' | 'material' | 'texture' | 'animation' }> = ({obj, title, desc, type = 'object' }) => {
  const icons = {
    object: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    geometry: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    material: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
    texture: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    animation: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  };

  return (
      <DragAndDropZone
      payload={{ type: 'Export', data: { uuid: obj.uuid, name: obj.name||obj.type, obj } }}
      >
    <div
      className="flex items-center gap-2 p-1.5 rounded bg-[#1e1e1e] border border-[#2a2a2a] hover:border-blue-500/50 hover:bg-[#222] cursor-grab active:cursor-grabbing transition-all group mb-1.5"
    >
      <div className="text-[#444] group-hover:text-blue-400/50 flex flex-col gap-[3px] px-1 transition-colors">
        <div className="w-1 h-1 rounded-full bg-current"></div>
        <div className="w-1 h-1 rounded-full bg-current"></div>
        <div className="w-1 h-1 rounded-full bg-current"></div>
      </div>
      <div className="flex bg-[#252525] p-1.5 rounded-md text-gray-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors border border-[#333] group-hover:border-blue-500/30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           {icons[type] || icons.object}
        </svg>
      </div>
      <div className="flex flex-col overflow-hidden flex-1 ml-1">
        <span className="text-[11px] text-gray-300 font-medium truncate">{title}</span>
        <span className="text-[9px] text-gray-500 truncate group-hover:text-gray-400 transition-colors">{desc || 'Drag to export'}</span>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1.5 text-gray-400">
        <button className="p-1 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Quick Assign">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </button>
        <button className="p-1 hover:text-green-400 hover:bg-green-500/10 rounded transition-colors" title="Export File">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        </button>
      </div>
      </div>
    </DragAndDropZone>
  );
};

const ExportNode = ({ obj }: { obj: any }) => {
  if (!obj) return null;

  // Helpers to detect properties
  const hasAnimations = obj.animations && obj.animations.length > 0;
  const hasMaterial = !!obj.material;
  const hasGeometry = !!obj.geometry || obj.isBufferGeometry || obj.isGeometry;
  
  // Collect detailed maps
  let availableMaps: string[] = [];
  if (obj.material) {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const added = new Set<string>();
    mats.forEach(m => {
        if (m.map && !added.has('Albedo/Diffuse')) { added.add('Albedo/Diffuse'); availableMaps.push('Albedo/Diffuse'); }
        if (m.normalMap && !added.has('Normal Map')) { added.add('Normal Map'); availableMaps.push('Normal Map'); }
        if (m.roughnessMap && !added.has('Roughness Map')) { added.add('Roughness Map'); availableMaps.push('Roughness Map'); }
        if (m.metalnessMap && !added.has('Metalness Map')) { added.add('Metalness Map'); availableMaps.push('Metalness Map'); }
        if (m.emissiveMap && !added.has('Emissive Map')) { added.add('Emissive Map'); availableMaps.push('Emissive Map'); }
        if (m.aoMap && !added.has('AO Map')) { added.add('AO Map'); availableMaps.push('AO Map'); }
        if (m.alphaMap && !added.has('Alpha Map')) { added.add('Alpha Map'); availableMaps.push('Alpha Map'); }
    });
  }

  const isExportableObject = obj.isObject3D;

  return (
    <div className="flex flex-col gap-1">
      {isExportableObject && (
        <InspectorCategory title="Object" defaultExpanded={false}>
          <DraggableExportItem obj={obj} title={obj.name || obj.type || "Object3D"} desc={`${obj.type} Export`} type="object" />
        </InspectorCategory>
      )}

      {hasGeometry && (
         <InspectorCategory title="Geometry" defaultExpanded={false}>
           <DraggableExportItem obj={obj.geometry} title={obj.geometry?.name || "Geometry"} desc="Geometry Data" type="geometry" />
         </InspectorCategory>
      )}

      {hasMaterial && (
         <InspectorCategory title="Material" defaultExpanded={false}>
           <DraggableExportItem obj={obj.material} title={obj.material?.name || "Material"} desc="Material Profile" type="material" />
         </InspectorCategory>
      )}

      {availableMaps.length > 0 && (
         <InspectorCategory title="Material Maps" defaultExpanded={false}>
           {availableMaps.map((mapName) => (
              <DraggableExportItem obj={mapName} key={mapName} title={mapName} desc="Texture Data" type="texture" />
           ))}
         </InspectorCategory>
      )}

      {hasAnimations && (
         <InspectorCategory title={`Animations (${obj.animations.length})`} defaultExpanded={false}>
           {obj.animations.map((anim: any, idx: number) => (
              <DraggableExportItem obj={anim} key={idx} title={anim.name || `Animation ${idx}`} desc="Animation Clip" type="animation" />
           ))}
         </InspectorCategory>
      )}
    </div>
  );
};

export default ExportNode;
