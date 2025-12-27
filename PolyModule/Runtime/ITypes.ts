import * as THREE from 'three';

export function INumber(target: any, propertyKey: string) {
  if (!target.constructor.propMap) target.constructor.propMap = {};
  target.constructor.propMap[propertyKey] = {
    name: propertyKey,
    type: "value",
    expectedClass: Number,
  };
}
export function IObject3D(target: any, propertyKey: string) {
  if (!target.constructor.propMap) target.constructor.propMap = {};
  target.constructor.propMap[propertyKey] = {
    name: propertyKey,
    type: "ref",
    expectedClass: THREE.Object3D,
  };
}