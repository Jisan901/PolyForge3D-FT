import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { getRef, getScript} from "@/Core/Functions"
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';

const input = (window as any).gamePad.data;

export default class Loader extends Behavior {
    @IRef()
    private playerEntity: THREE.Object3D;
    onStart() {
        
        this.playerEntity = getRef(this.playerEntity);
        this.playerController = getScript(this.playerEntity.uuid);
        
        
        
        
    }
    onUpdate(dt: number) {}
}