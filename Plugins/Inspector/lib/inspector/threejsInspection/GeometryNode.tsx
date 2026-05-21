import React, { useReducer } from 'react';
import { InspectorCategory } from '../components/InspectorPanel';
import { TextInput } from '../components/TextInput';

export const GeometryNode = ({ obj, expanded=true }: { obj: any, expanded?: boolean }) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const vertexCount = obj.attributes?.position?.count || 0;
  const triangleCount = obj.index ? obj.index.count / 3 : vertexCount / 3;
  
  const attributes = obj.attributes ? Object.keys(obj.attributes).map(key => {
    const attr = obj.attributes[key];
    return {
      name: key,
      itemSize: attr.itemSize,
      count: attr.count,
      type: attr.array?.constructor?.name || 'Unknown'
    };
  }) : [];

  const handleAction = (action: string) => {
    if (action === 'computeBoundingBox' && obj.computeBoundingBox) obj.computeBoundingBox();
    if (action === 'computeBoundingSphere' && obj.computeBoundingSphere) obj.computeBoundingSphere();
    if (action === 'computeVertexNormals' && obj.computeVertexNormals) obj.computeVertexNormals();
    if (action === 'center' && obj.center) obj.center();
    if (action === 'bake') {
      obj.type = 'BufferGeometry';
      delete obj.parameters;
    }
    forceUpdate();
  };

  return (
    <InspectorCategory title="Geometry" defaultExpanded={expanded}>
      <TextInput label="UUID" obj={obj} prop="uuid" disabled={true} />
      <TextInput label="Type" obj={obj} prop="type" disabled={true} />
      <TextInput label="Name" obj={obj} prop="name" />
      
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Vertices</span>
          <span className="text-gray-200">{vertexCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Triangles</span>
          <span className="text-gray-200">{triangleCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs text-gray-400 mb-1">Actions</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('computeBoundingBox')}
          >
            Compute BBox
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('computeBoundingSphere')}
          >
            Compute BSphere
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('computeVertexNormals')}
          >
            Compute Normals
          </button>
          <button
            className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors"
            onClick={() => handleAction('center')}
          >
            Center
          </button>
          {obj.type !== 'BufferGeometry' && (
            <button
              className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors col-span-2"
              onClick={() => handleAction('bake')}
            >
              Bake
            </button>
          )}
        </div>
      </div>

      {attributes.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-1">Attributes</div>
          <div className="bg-[#141414] rounded border border-[#333] overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#252525] text-gray-400 border-b border-[#333]">
                <tr>
                  <th className="px-2 py-1 font-normal">Name</th>
                  <th className="px-2 py-1 font-normal">Type</th>
                  <th className="px-2 py-1 font-normal text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333]">
                {attributes.map((attr, i) => (
                  <tr key={i} className="text-gray-200">
                    <td className="px-2 py-1">{attr.name}</td>
                    <td className="px-2 py-1">{attr.type}</td>
                    <td className="px-2 py-1 text-right">{attr.itemSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </InspectorCategory>
  );
};
