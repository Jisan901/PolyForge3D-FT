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


// --- Ground ---
const groundGeo = new THREE.BoxGeometry(10, 0.2, 10);
const groundMat = new THREE.MeshStandardMaterial();
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.position.y = -0.1;
scene.add(groundMesh);

const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(RAPIER.ColliderDesc.cuboid(5, 0.1, 5), groundBody);

// --- Helper ---
function createBox(w, h, d, x, y, z, color = 0xaaaaaa) {
    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setLinearDamping(0.5)
            .setAngularDamping(4.0)
    );

    world.createCollider(
        RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
            .setFriction(2)
            .setRestitution(0.0),
        body
    );

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color })
    );
    scene.add(mesh);

    return { body, mesh };
}

// --- Anchor (green grab sphere) ---


// --- Bodies ---
const torso = createBox(0.3, 0.6, 0.2,  0,    1.2, 0, 0xaaaaaa);
const legL  = createBox(0.2, 0.6, 0.2, -0.25, 0.6, 0, 0x8888cc);
const legR  = createBox(0.2, 0.6, 0.2,  0.25, 0.6, 0, 0x8888cc);

torso.body.setAdditionalMass(2);

dragTarget = torso.body;


// --- Joints ---
function createHip(parent, child, offsetX) {
    return world.createImpulseJoint(
        RAPIER.JointData.revolute(
            { x: offsetX, y: -0.3, z: 0 },
            { x: 0,       y:  0.3, z: 0 },
            { x: 0,       y:  0,   z: 1 }
        ),
        parent.body,
        child.body,
        true
    );
}

const jointL = createHip(torso, legL, -0.15);
const jointR = createHip(torso, legR,  0.15);


// --- Extract lean angle from quaternion (Z axis, 2D) ---
function getLeanZ(body) {
    const r = body.rotation();
    const sinZ = 2 * (r.w * r.z + r.x * r.y);
    const cosZ = 1 - 2 * (r.y * r.y + r.z * r.z);
    return Math.atan2(sinZ, cosZ);
}

// --- Update loop (Physics & Balance Logic) ---
function update() {
    syncAnchor();
    const pTorso = torso.body.translation();
    const pL     = legL.body.translation();
    const pR     = legR.body.translation();

    const torsoLeanZ = getLeanZ(torso.body);
    const legLLeanZ  = getLeanZ(legL.body);
    const legRLeanZ  = getLeanZ(legR.body);
    return;
    // --- Center of mass (X) ---
    const comX        = (pTorso.x + pL.x + pR.x) / 3;
    const footCenterX = (pL.x + pR.x) * 0.5;
    const balanceErr  = comX - footCenterX;

    // --- Hip motor targets ---
    const stiffness = 1200;
    const damping   = 140;

    const baseTarget = -balanceErr * 5.0 - torso.body.linvel().x * 0.5;
    const targetL = baseTarget - legLLeanZ * 0.5;
    const targetR = baseTarget - legRLeanZ * 0.5;

    jointL.configureMotorPosition(targetL, stiffness, damping);
    jointR.configureMotorPosition(targetR, stiffness, damping);

    // --- Torso uprighting ---
    const uprightTorque = -torsoLeanZ * 40.0 - torso.body.angvel().z * 8.0;
    torso.body.applyTorqueImpulse({ x: 0, y: 0, z: uprightTorque }, true);

    // Legs also try to stay vertically aligned below torso
    legL.body.applyTorqueImpulse({ x: 0, y: 0, z: -legLLeanZ * 10.0 }, true);
    legR.body.applyTorqueImpulse({ x: 0, y: 0, z: -legRLeanZ * 10.0 }, true);

    // --- Height support ---
    const targetHeight = 1.2;
    const heightError  = targetHeight - pTorso.y;
    const upForce = heightError * 100 - torso.body.linvel().y * 15;
    torso.body.applyImpulse({ x: 0, y: upForce * 0.016, z: 0 }, true);
    
}

// --- Visual & Kinematic Syncing ---
function syncMeshes() {
    const bodiesToSync = [torso, legL, legR];
    
    // Only overwrite the anchor's visual mesh if we aren't dragging it

    bodiesToSync.forEach(o => {
        const p = o.body.translation();
        const r = o.body.rotation();
        o.mesh.position.set(p.x, p.y, p.z);
        o.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    });
}

function syncAnchor() {
    if (dragging) {
        grabberBody.setNextKinematicTranslation(grabberMesh.position);
    } else {
        //grabberMesh.position.copy(hip.mesh.position);
    }
}

// --- Render ---
const postProcessing = new THREE.PostProcessing(renderer);
const scenePass = pass(scene, camera);
postProcessing.outputNode = scenePass;

function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    
    // Calculate forces and kinematic targets
    update();
    
    // Step the physics world
    world.step();
    
    // Sync the meshes AFTER the physics step
    syncMeshes();
    
    postProcessing.render();
}

animate();