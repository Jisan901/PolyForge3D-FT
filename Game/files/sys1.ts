// game/scripts/Rotate.ts
import { Behavior } from "@/Core/Behavior";
import { INumber, IObject3D } from '@/PolyModule/Runtime/ITypes';
import * as THREE from 'three';

export default class Rotate extends Behavior{
  @INumber
  speed: number = 50;
  @IObject3D
  target: THREE.Object3D = null; 

  onStart() {
    console.log('Rotate started', this.speed, this.target);
    
  }

  onUpdate(dt: number) {
    if (this.object) this.object.rotation.y += dt * this.speed||0.002;
  }
}