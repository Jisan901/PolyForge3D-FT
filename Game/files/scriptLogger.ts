import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { resetTransform, getCamera, getRef, getScript} from "@/Core/Functions"
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';




export default class Sl4 extends Behavior {
    @IRef()
    private obj: THREE.Object3D;
    
    
    onStart() {
        this.obj = getRef(this.obj);
        console.log(getScript(this.obj.uuid))
        
    }


    onUpdate(dt: number) {}


    onDestroy() {
        
    }
}