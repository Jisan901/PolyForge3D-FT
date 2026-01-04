// game/scripts/Rotate.ts
import { Behavior } from '@/PolyModule/Runtime/Behavior';
import { INumber, IObject3D } from '@/PolyModule/Runtime/ITypes';
import * as THREE from 'three';

export default class Rotate extends Behavior{
  @INumber
  speed: number = 0.5;
  offset: number = Math.random()*10
  val: number = 0;

  onStart() {
    console.log('light started', this.speed, this.target);
    this.val = this.offset;
  }

  onUpdate(dt: number) {
    if (this.object) this.object.intensity = 5+2*Math.sin(this.val);
    this.val +=this.speed
  }
}