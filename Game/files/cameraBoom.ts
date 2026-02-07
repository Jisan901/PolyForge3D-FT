import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { resetTransform, getCamera, getRef} from "@/Core/Functions"
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';

const input = (window as any).gamePad.data;
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}


export default class CameraBoom extends Behavior {
    @IRef()
    private camera: THREE.Camera;
    @IRef()
    private renderedMesh: THREE.Object3D;
    @IRef()
    private camera_holder: THREE.Object3D;
    private camera_holder_pawn: THREE.Object3D;
    private previousArmLen = 6;
    private springArmLength = 6;
    private maxLengthMultiplier = 12;
    private targetOffset = new THREE.Vector3(0,0.6,0);
    private socketOffset = new THREE.Vector3(-0.5,0,0);
    

    onStart() {
        this.camera = getRef(this.camera) || getCamera();
        this.renderedMesh = getRef(this.renderedMesh);
        this.camera_holder = getRef(this.camera_holder);
        this.camera_holder_pawn = this.object;
        
        resetTransform(this.camera);
        this.camera.rotation.y = -Math.PI;
        
        
    }


    onUpdate(dt: number) {
        const speed = 50; // higher = faster follow (units: 1/sec)
        const t = 1 - Math.exp(-speed * dt);
        const smoothFactor = t//1.0 - Math.pow(0.0001, dt);



        const needTolerp = input.forward;
        const speedFactor = 0;
        
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), input.phi);
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -input.theta);
        const targetQuat = qx.clone().multiply(qy);
        
        
        if (needTolerp) {
            this.renderedMesh.quaternion.slerp(qx, smoothFactor);
        }
        
        const armLength = lerp(this.previousArmLen, Math.min(this.springArmLength + speedFactor,this.maxLengthMultiplier), smoothFactor);
        this.previousArmLen = armLength;
        
        const cameraTarget = this.object.parent.position.clone().add(this.targetOffset);
        const armVector = new THREE.Vector3(0, 0, -armLength).applyQuaternion(targetQuat);
        this.camera_holder_pawn.position.lerp(this.targetOffset.clone().add(armVector), smoothFactor);
        this.camera_holder.position.copy(this.socketOffset);
        this.camera_holder_pawn.lookAt(cameraTarget);
    }


    onDestroy() {
        
    }
}