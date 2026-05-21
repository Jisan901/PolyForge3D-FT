import {THREE} from "@/Core/lib/THREE";
import {getRenderer} from "@/Core/Functions";
import {
    Fn,
    instancedArray,
    instanceIndex,
    deltaTime,
    range,
    positionLocal,
    vec3,
    sin,
    time,
    float,
    rotate
} from "three/tsl";

const count = 1000;
const positionArray = instancedArray(count, "vec3");

// create a compute function

const w = float(5000);


const computeShader = Fn(() => {
    const position = positionArray.element(instanceIndex);
    position.x.assign(range(0,1).mul(10));
    position.z.assign(range(0,1).mul(10))
})().compute(count);

//

const renderer = getRenderer();

//const i

const material = new THREE.MeshStandardNodeMaterial();
//material.colorNode = positionLocal.add(positionArray.element( instanceIndex ));
material.positionNode = rotate(positionLocal,vec3(0,positionArray.element(instanceIndex).z,0)).add(positionArray.element(instanceIndex));
material.side = THREE.DoubleSide;

renderer.compute(computeShader);

export {material, computeShader};
