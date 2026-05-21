import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { NumberInput } from '../components/NumberInput';
import { Vector3Input, Vector3 } from '../components/Vector3Input';

export const InstancedMeshNode = ({ obj }: { obj: any }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState(new THREE.Vector3());
  const [rotation, setRotation] = useState(new THREE.Euler());
  const [scale, setScale] = useState(new THREE.Vector3(1, 1, 1));
  const [tick, setTick] = useState(0);

  const matrix = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    if (!obj || !obj.isInstancedMesh) return;
    if (selectedIndex >= 0 && selectedIndex < obj.count) {
      obj.getMatrixAt(selectedIndex, matrix);
      const newPos = new THREE.Vector3();
      const newQuat = new THREE.Quaternion();
      const newScale = new THREE.Vector3();
      matrix.decompose(newPos, newQuat, newScale);
      
      const newRot = new THREE.Euler().setFromQuaternion(newQuat);
      
      setPosition(newPos);
      setRotation(newRot);
      setScale(newScale);
    }
  }, [obj, selectedIndex, tick, matrix]);

  const updateMatrix = (newPos: THREE.Vector3, newRot: THREE.Euler, newScale: THREE.Vector3) => {
    if (!obj || !obj.isInstancedMesh) return;
    if (selectedIndex >= 0 && selectedIndex < obj.count) {
      const quat = new THREE.Quaternion().setFromEuler(newRot);
      matrix.compose(newPos, quat, newScale);
      obj.setMatrixAt(selectedIndex, matrix);
      if (obj.instanceMatrix) {
        obj.instanceMatrix.needsUpdate = true;
      }
    }
  };

  const handlePositionChange = (val: Vector3) => {
    const newPos = new THREE.Vector3(val.x, val.y, val.z);
    setPosition(newPos);
    updateMatrix(newPos, rotation, scale);
  };

  const handleRotationChange = (val: Vector3) => {
    const newRot = new THREE.Euler(
      THREE.MathUtils.degToRad(val.x),
      THREE.MathUtils.degToRad(val.y),
      THREE.MathUtils.degToRad(val.z)
    );
    setRotation(newRot);
    updateMatrix(position, newRot, scale);
  };

  const handleScaleChange = (val: Vector3) => {
    const newScale = new THREE.Vector3(val.x, val.y, val.z);
    setScale(newScale);
    updateMatrix(position, rotation, newScale);
  };

  const handleCountChange = () => {
    if (selectedIndex >= obj.count) {
      setSelectedIndex(Math.max(0, obj.count - 1));
    }
    setTick(t => t + 1);
  };

  const rotDeg = new THREE.Vector3(
    THREE.MathUtils.radToDeg(rotation.x),
    THREE.MathUtils.radToDeg(rotation.y),
    THREE.MathUtils.radToDeg(rotation.z)
  );

  return (
    <InspectorCategory title="InstancedMesh" defaultExpanded={true}>
      <NumberInput label="Count" obj={obj} prop="count" step={1} min={0} onChange={handleCountChange} />
      
      <div className="h-px bg-gray-800 my-1" />
      
      <div className="text-xs font-semibold text-gray-300 mb-1">Instance Transform</div>
      <NumberInput 
        label="Index" 
        value={selectedIndex} 
        onChange={(val) => setSelectedIndex(Math.floor(val))} 
        min={0} 
        max={Math.max(0, obj.count - 1)} 
        step={1} 
      />
      
      <div className="mt-1">
        <Vector3Input 
          label="Position" 
          value={position} 
          onChange={handlePositionChange} 
        />
        <Vector3Input 
          label="Rotation" 
          value={rotDeg} 
          onChange={handleRotationChange} 
        />
        <Vector3Input 
          label="Scale" 
          value={scale} 
          onChange={handleScaleChange} 
        />
      </div>
    </InspectorCategory>
  );
};
