import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { resetTransform, getCamera, getRef, getScript} from "@/Core/Functions"
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';
import {Animator} from '@/Core/Animation/Animator';

const input = (window as any).gamePad.data;

export default class PlayerAnimation extends Behavior {
    @IRef()
    private playerEntity: THREE.Object3D;
    private animator: Animator;
    onStart() {
        this.animator = new Animator(this.object);
        this.playerEntity = getRef(this.playerEntity);
        this.playerController = getScript(this.playerEntity.uuid);
        
        
        
        this.animator.clip('idle', this.object.animations[0]);
        this.animator.clip('jump_land', this.object.animations[1]);
        this.animator.clip('jump_loop', this.object.animations[2]);
        this.animator.clip('jump_start', this.object.animations[3]);
        this.animator.clip('run', this.object.animations[4]);
        this.animator.clip('walk', this.object.animations[5]);
    }


    onUpdate(dt: number) {
        const moveX = input.hudData.deltaX * -1 * dt;
        const moveZ = input.hudData.deltaY * -1 * dt;
        if(!this.playerController.isGrounded) this.animator.play('jump_loop',0.1)
        else{
        if ((moveZ||moveX)&&this.playerController.isGrounded){
            this.animator.play('run',0.1)
        }else this.animator.play('idle',0.1);
        }
        
        
        
        this.animator.update(dt);
    }


    onDestroy() {
        
    }
}