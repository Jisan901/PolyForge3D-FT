import React from 'react';
import { Object3DNode } from './Object3DNode';
import { MaterialNode } from './MaterialNode';
import { GeometryNode } from './GeometryNode';
import { TextureNode } from './TextureNode';
import { globalInspector } from '../Inspector';
import { InspectorCategory } from '../components/InspectorPanel';
import {Box} from 'lucide-react'


export const DefinedInspector = ({ obj }: { obj: any }) => {
  if (!obj) return (
            <div className="h-full w-full p-2 text-gray-500 flex flex-col justify-center items-center">
                <Box />
                <span>No object selected</span>
            </div>
        )

  const customResolvers = globalInspector.customResolvers.filter(r => r.test(obj));

  return (
    <div className="flex flex-col gap-1">
      {customResolvers.map((resolver, idx) => {
        const Component = resolver.component;
        return (
          <InspectorCategory key={`custom-${idx}`} title={resolver.title} defaultExpanded={false}>
            <Component obj={obj} />
          </InspectorCategory>
        );
      })}
      {obj.isObject3D && <Object3DNode obj={obj} />}
      {obj.isMaterial && <MaterialNode obj={obj} />}
      {(obj.isBufferGeometry || obj.isGeometry) && <GeometryNode obj={obj} />}
      {obj.isTexture && <TextureNode obj={obj} />}
    </div>
  );
};
