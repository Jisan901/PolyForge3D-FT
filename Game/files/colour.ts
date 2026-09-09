import { Behavior } from "@/Core/Behavior";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { INumber, IVec } from '@/Editor/ITypes';
export default class Colo extends Behavior {

    @IVec()
    colour: THREE.Vector3;

    @INumber()
    intensity: number;

    @INumber()
    lightType: 0 | 1 | 2;

    onStart() {
        const col = this.colour;

        const mesh = this.object as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material = new THREE.MeshPhongMaterial();
        }
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.emissive.setFromVector3(col);
            mesh.material.emissiveIntensity = this.intensity;
        }

        if (this.lightType === 0) {
            const light = new THREE.PointLight(new THREE.Color().setFromVector3(col), this.intensity);
            this.object.add(light);
        }
        else if (this.lightType === 1) {
            const light = new THREE.DirectionalLight(new THREE.Color().setFromVector3(col), this.intensity);
            this.object.add(light);
        }
        else if (this.lightType === 2) {
            const light = new THREE.SpotLight(new THREE.Color().setFromVector3(col), this.intensity);
            this.object.add(light);
        }
    }

    onValidate() {
        //

    }

    onUpdate(dt: number) {

    }
}