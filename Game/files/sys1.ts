import { Behavior } from "@/Core/Behavior";
import { INumber, IRef } from '@/Editor/ITypes';
import { getRef } from '@/Core/Functions';
import { THREE } from '@/Core/lib/THREE';

export default class Rotate extends Behavior{
  @INumber(50)
  speed: number = 50;
  @IRef()
  target: THREE.Object3D = null; 

  onStart() {
    this.target = getRef(this.target);
  }

  onUpdate(dt: number) {
    if (this.target) this.target.rotation.x += 0.5 * dt;
  }
}