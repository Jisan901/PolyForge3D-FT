import React from 'react';
import { Object3DNode } from './Object3DNode';
import { MaterialNode } from './MaterialNode';
import { GeometryNode } from './GeometryNode';
import { TextureNode } from './TextureNode';
import { globalInspector } from '../Inspector';
import { InspectorCategory } from '../components/InspectorPanel';
import {Box} from 'lucide-react'


export const DefinedInspector: React.FC<{ obj: any }> = ({ obj }) => {
  if (!obj) return (
            <div className="h-full w-full p-2 text-gray-500 flex flex-col justify-center items-center">
                <Box />
                <span>No object selected</span>
            </div>
        )

  const customResolvers = globalInspector.customResolvers.filter(r => r.test(obj));
  const topResolvers = customResolvers.filter(r => r.placement === 'top');
  const bottomResolvers = customResolvers.filter(r => r.placement !== 'top');

  const renderResolver = (resolver: typeof customResolvers[0], idx: number) => {
    const Component = resolver.component;
    const resolverKey = `custom-${resolver.title || idx}-${obj?.uuid || 'root'}`;
    if (resolver.noWrapper) {
      return <Component key={resolverKey} obj={obj} />;
    }
    return (
      <InspectorCategory key={resolverKey} title={resolver.title} defaultExpanded={false}>
        <Component obj={obj} />
      </InspectorCategory>
    );
  };

  return (
    <div className="flex flex-col gap-1" key={obj?.uuid || 'empty'}>
      {topResolvers.map(renderResolver)}
      {obj.isObject3D && <Object3DNode obj={obj} />}
      {obj.isMaterial && <MaterialNode obj={obj} />}
      {(obj.isBufferGeometry || obj.isGeometry) && <GeometryNode obj={obj} />}
      {obj.isTexture && <TextureNode obj={obj} />}
      {bottomResolvers.map(renderResolver)}
    </div>
  );
};
