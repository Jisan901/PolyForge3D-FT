import { Behavior } from "@/Core/Behavior";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { INumber, IVec } from '@/Editor/ITypes';
export default class Move extends Behavior{
  @INumber(0.2)
  speed: number = 0.2;
  @INumber(2)
  dist: number = 2;
  @IVec()
  direction: THREE.Vector3;
  onStart() {
      this.direction = new THREE.Vector3().copy(this.direction)
  }

  onUpdate(dt: number) {
    if (this.object) this.object.position.copy(this.direction.clone().multiplyScalar(Math.sin(Instance.time.totalTime * this.speed) * this.dist));
  }
}