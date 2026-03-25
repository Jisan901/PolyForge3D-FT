import React, { createContext, useContext, useState, useEffect } from 'react';
import { THREE } from '@/Core/lib/THREE';
import { useEditorStates } from '@/Ui/contexts/EditorContext';


export interface Position3D { x: number; y: number; z: number; }

export type ToolType = 'select' | 'pan' | 'move' | 'rotate' | 'scale';
export type SelectionMode = 'vertex' | 'face';

export interface GeometryData {
  positions: Position3D[];
  uvs: number[];
  indices: number[];
}

interface EditorContextType {
  geometry: GeometryData | null;
  setGeometry: React.Dispatch<React.SetStateAction<GeometryData | null>>;
  selectedVertices: Set<number>;
  setSelectedVertices: React.Dispatch<React.SetStateAction<Set<number>>>;
  activeTool: ToolType;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>;
  selectionMode: SelectionMode;
  setSelectionMode: React.Dispatch<React.SetStateAction<SelectionMode>>;
  selectedObject: THREE.Mesh | null;
  setSelectedObject: React.Dispatch<React.SetStateAction<THREE.Mesh | null>>;
  selectedTexture: THREE.Texture | null;
  setSelectedTexture: React.Dispatch<React.SetStateAction<THREE.Texture | null>>;
  uvVersion: number;
  setUvVersion: React.Dispatch<React.SetStateAction<number>>;
}

const EditorContext = createContext<EditorContextType | null>(null);

// Initial default data (a simple quad)
const INITIAL_GEOMETRY: GeometryData = {
  positions: [
    { x: -0.5, y: -0.5, z: 0 },
    { x:  0.5, y: -0.5, z: 0 },
    { x:  0.5, y:  0.5, z: 0 },
    { x: -0.5, y:  0.5, z: 0 },
  ],
  uvs: [
    0.1, 0.1,
    0.9, 0.1,
    0.9, 0.9,
    0.1, 0.9,
  ],
  indices: [0, 1, 2, 0, 2, 3]
};

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [geometry, setGeometry] = useState<GeometryData | null>(INITIAL_GEOMETRY);
  const [selectedVertices, setSelectedVertices] = useState<Set<number>>(new Set());
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('vertex');
  const [_, setSelectedObject] = useState<THREE.Mesh | null>(null);
  const [selectedTexture, setSelectedTexture] = useState<THREE.Texture | null>(null);
  const [uvVersion, setUvVersion] = useState<number>(0);
  
  const { selectedObject } = useEditorStates();

  // Sync from selectedObject to geometry and texture
  useEffect(() => {
    if (selectedObject && selectedObject.geometry) {
      const geo = selectedObject.geometry as THREE.BufferGeometry;
      const posAttr = geo.getAttribute('position');
      const uvAttr = geo.getAttribute('uv');
      const indexAttr = geo.getIndex();

      if (posAttr && uvAttr) {
        const positions: Position3D[] = [];
        for (let i = 0; i < posAttr.count; i++) {
          positions.push({ x: posAttr.getX(i), y: posAttr.getY(i), z: posAttr.getZ(i) });
        }

        const uvs = Array.from(uvAttr.array);

        let indices: number[] = [];
        if (indexAttr) {
          indices = Array.from(indexAttr.array);
        } else {
          for (let i = 0; i < posAttr.count; i++) indices.push(i);
        }

        setGeometry({ positions, uvs, indices });
        setSelectedVertices(new Set());
        setUvVersion(0);
      }

      // Check for material map
      let map: THREE.Texture | null = null;
      if (selectedObject.material) {
        const mat = Array.isArray(selectedObject.material) ? selectedObject.material[0] : selectedObject.material;
        if ((mat as any).map) {
          map = (mat as any).map;
        }
      }
      setSelectedTexture(map);
    } else {
      setGeometry(INITIAL_GEOMETRY);
      setSelectedVertices(new Set());
      setUvVersion(0);
      setSelectedTexture(null);
    }
  }, [selectedObject]);

  // Sync from geometry to selectedObject when uvVersion changes
  useEffect(() => {
    if (selectedObject && selectedObject.geometry && geometry && uvVersion > 0) {
      const geo = selectedObject.geometry as THREE.BufferGeometry;
      const uvAttr = geo.getAttribute('uv');
      if (uvAttr) {
        for (let i = 0; i < geometry.uvs.length; i++) {
          uvAttr.array[i] = geometry.uvs[i];
        }
        uvAttr.needsUpdate = true;
      }
    }
  }, [uvVersion, geometry, selectedObject]);

  return (
    <EditorContext.Provider value={{
      geometry, setGeometry,
      selectedVertices, setSelectedVertices,
      activeTool, setActiveTool,
      selectionMode, setSelectionMode,
      selectedObject, setSelectedObject,
      selectedTexture, setSelectedTexture,
      uvVersion, setUvVersion
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
}
