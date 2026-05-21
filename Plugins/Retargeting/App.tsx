/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import * as THREE from 'three';
import SkeletonWindow3D from './components/SkeletonWindow3D';
import RetargetingTable from './components/RetargetingTable';

export default function App() {
  const [selectedSource, setSelectedSource] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string[]>([]);
  const [sourceSkeleton, setSourceSkeleton] = useState<THREE.Object3D | null>(null);
  const [targetSkeleton, setTargetSkeleton] = useState<THREE.Object3D | null>(null);
  const [retargetDict, setRetargetDict] = useState<Record<string, string>>({});

  useEffect(() => {
    const loader = new THREE.ObjectLoader();
    loader.load('/mixamo.json', (obj) => {
      setSourceSkeleton(obj.clone());
      setTargetSkeleton(obj.clone());
    });
  }, []);

  const handleTargetSelect = (bones: string[]) => {
    setSelectedTarget(bones);
    if (bones.length === 1 && selectedSource.length === 1) {
      setRetargetDict(prev => ({
        ...prev,
        [selectedSource[0]]: bones[0]
      }));
    }
  };

  const handleRemoveMapping = (key: string) => {
    setRetargetDict(prev => {
      const newDict = { ...prev };
      delete newDict[key];
      return newDict;
    });
  };

  return (
    <div className="h-screen w-screen bg-neutral-950 flex flex-col p-2 gap-2 overflow-hidden">
      {/* Top: 3D Windows */}
      <div className="flex-1 flex flex-row gap-2 w-full min-h-0">
        
        {/* Source Window */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs text-neutral-300 font-medium">Source</h2>
            {selectedSource.length > 0 && (
              <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1 rounded truncate max-w-[150px]">
                {selectedSource.length === 1 ? selectedSource[0] : `${selectedSource.length} selected`}
              </span>
            )}
          </div>
          {sourceSkeleton ? (
            <SkeletonWindow3D 
              skeletonObject={sourceSkeleton}
              selected={selectedSource} 
              setSelected={setSelectedSource} 
            />
          ) : (
            <div className="text-xs text-neutral-400 font-mono animate-pulse flex items-center justify-center h-full bg-[#1e1e1e] rounded-md border border-neutral-800">
              Loading...
            </div>
          )}
        </div>

        {/* Target Window */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs text-neutral-300 font-medium">Target</h2>
            {selectedTarget.length > 0 && (
              <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-1 rounded truncate max-w-[150px]">
                {selectedTarget.length === 1 ? selectedTarget[0] : `${selectedTarget.length} selected`}
              </span>
            )}
          </div>
          {targetSkeleton ? (
            <SkeletonWindow3D 
              skeletonObject={targetSkeleton}
              selected={selectedTarget} 
              setSelected={handleTargetSelect} 
            />
          ) : (
            <div className="text-xs text-neutral-400 font-mono animate-pulse flex items-center justify-center h-full bg-[#1e1e1e] rounded-md border border-neutral-800">
              Loading...
            </div>
          )}
        </div>
      </div>
        
      {/* Bottom: Retargeting Table */}
      <div className="h-1/3 flex flex-col gap-1 w-full min-h-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs text-neutral-300 font-medium">Mapping</h2>
          <button 
            onClick={() => setRetargetDict({})}
            className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            Clear All
          </button>
        </div>
        <RetargetingTable retargetDict={retargetDict} onRemove={handleRemoveMapping} />
      </div>
    </div>
  );
}
