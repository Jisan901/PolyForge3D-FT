import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { resetTransform, getCamera } from "@/Core/Functions"
import * as THREE from "three";

const input = (window as any).gamePad.data;
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}


export default class CameraBoom extends Behavior {
    private camera: THREE.Camera;
    private camera_holder = new THREE.Object3D();
    private camera_holder_pawn = new THREE.Object3D();
    private previousArmLen = 6;
    private springArmLength = 6;
    private maxLengthMultiplier = 12;
    private targetOffset = new THREE.Vector3(0,0.6,0);
    private socketOffset = new THREE.Vector3(-0.5,0,0);
    

    onStart() {
        this.camera = getCamera();
        resetTransform(this.camera);
        this.camera.rotation.y = -Math.PI;
        this.camera_holder.add(this.camera);
        this.camera_holder_pawn.add(this.camera_holder);
        
        input.phi;
        input.theta;
    }


    onUpdate(dt: number) {
        const smoothFactor = 1.0 - Math.pow(0.001, dt);
        const needTolerp = true;
        const speedFactor = 0;
        
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), input.phi);
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -input.theta);
        const targetQuat = qx.clone().multiply(qy);
        
        
        if (needTolerp) {
            this.object.parent.quaternion.slerp(qx, smoothFactor);
        }
        
        const armLength = lerp(this.previousArmLen, Math.min(this.springArmLength + speedFactor,this.maxLengthMultiplier), smoothFactor);
        this.previousArmLen = armLength;
        
        const cameraTarget = this.object.parent.position.clone().add(this.targetOffset);
        const armVector = new THREE.Vector3(0, 0, -armLength).applyQuaternion(targetQuat);
        this.camera_holder_pawn.position.lerp(cameraTarget.clone().add(armVector), smoothFactor);
        this.camera_holder.position.copy(this.socketOffset);
        this.camera_holder_pawn.lookAt(cameraTarget);
        this.camera_holder_pawn.updateMatrixWorld(true);
        
    }


    onDestroy() {
        
    }
}