import {
    threeWebgl,
    threeWebgpu,
    randMesh
} from '../threeBase.js';
import {
    TransformControls
} from 'three/addons/controls/TransformControls.js';
import {
    pass
} from 'three/tsl'

import ART from './ART.js'


const RAPIER = (await import('@dimforge/rapier3d')).default;

const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

const {
    renderer,
    THREE,
    camera,
    controls,
    render
} = await threeWebgpu();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

camera.position.set(3, 3, 5);
camera.lookAt(0, 0, 0);

scene.add(new THREE.DirectionalLight(0xffffff, 4));
scene.add(new THREE.AmbientLight(0x404040, 1));
scene.add(new THREE.AxesHelper());
scene.add(new THREE.GridHelper());

const tfControl = new TransformControls(camera, renderer.domElement);
scene.add(tfControl.getHelper());

let dragging = null;
let dragTarget = null;






const grabberGeo = new THREE.SphereGeometry(0.1);
const grabberMat = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });
const grabberMesh = new THREE.Mesh(grabberGeo, grabberMat);
scene.add(grabberMesh);
tfControl.attach(grabberMesh);

const grabberDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 6, 0);
const grabberBody = world.createRigidBody(grabberDesc);

let grabJoint = null;

tfControl.addEventListener('dragging-changed', (e) => {
    controls.enabled = !e.value;
    dragging = e.value;
    
    if (dragging&&dragTarget) {
          // Create a spherical joint between grabber and hip
          const jointData = RAPIER.JointData.spherical(
            { x: 0, y: 0, z: 0 },
            { x: 0, y: 0, z: 0 }
          );
          grabJoint = world.createImpulseJoint(jointData, grabberBody, dragTarget, true);
          dragTarget.wakeUp();
        } else {
          // Remove joint
          if (grabJoint) {
            world.removeImpulseJoint(grabJoint, true);
            grabJoint = null;
          }
        }
});

// work space


ART.init(scene, world, RAPIER);

ART.createGround()
const ragdoll = ART.makeRagdoll({ position:[0,5,0], scale:1 });
const box  = ART.create(ART.BOX, 1, 1, 1, { mass: 1 });
   const ball = ART.create(ART.SPHERE, 0.5, null, null, { mass: 1 });
 const joint = ART.join(ART.JOINT_REVOLUTE, box, ball, { anchor1:[0,1,0], anchor2:[0,-1,0], contacts  : true });
 //joint.motor.setVelocity(2, 0.5);




function update() {
    
}





// --- Render ---
const postProcessing = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);
postProcessing.outputNode = scenePass;
let lastTime = performance.now();
function animate(now) {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    
    controls.update();
    
    // Calculate forces and kinematic targets
    update();
    
    // Step the physics world
    ART.step(delta);
    
    postProcessing.render();
    requestAnimationFrame(animate);
}

animate(0);