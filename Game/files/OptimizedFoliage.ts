import { Behavior } from "@/Core/Behavior";
import { INumber, IRef } from "@/Editor/ITypes";
import { THREE } from "@/Core/lib/THREE";
import * as material from "./FoliageMaterial";
import { getRenderer, getRef } from "@/Core/Functions";
class OptimizedFolige { }

const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(),
    material.material,
    1000
);
const renderer = getRenderer();

export default class SampleFolige extends Behavior {
    @IRef()
    target: THREE.Object3D = null;
    onStart() {
        // this.target = getRef(this.target) || mesh;
        // this.object;
        // material.material.map = (this.target as THREE.Mesh).material.map;
        // material.material.alphaTest = (this.target as THREE.Mesh).material.alphaTest;
        // console.log('start', material, this.target)
        // mesh.geometry = (this.target as THREE.Mesh).geometry
        // this.object.add(mesh);
        // renderer.compute(material.computeShader)
    }

    onUpdate(dt: number) {
    }
}
