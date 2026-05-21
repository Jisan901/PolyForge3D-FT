import React, { useEffect, useRef } from 'react';
import { setupScene } from '../three/SceneSetup';

export const ThreeScene = ({ onObjectsReady }: { onObjectsReady: (objects: any) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const { renderer, objectsToInspect } = setupScene();
    containerRef.current.appendChild(renderer.domElement);
    
    // Pass the objects up to the parent component
    onObjectsReady(objectsToInspect);

    return () => {
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [onObjectsReady]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: 200, height: 200 }} 
      className="rounded-lg overflow-hidden border border-gray-800 shadow-xl" 
    />
  );
};
