import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import * as THREE from "three";
import { getCamera } from "@/Core/Functions";


const input = (window as any).gamePad.data;

export default class PlayerController extends Behavior {
    private camera: THREE.Camera;
    private RAPIER: any;
    private world: any;
    private characterBody: any;
    private characterCollider: any;
    private controller: any;

    // Visual mesh
    private capsuleMesh: THREE.Group;

    // Movement properties
    private velocity = { x: 0, y: 0, z: 0 };
    private moveSpeed = 5.0;
    private jumpForce = 5.0;
    private isGrounded = false;
    private groundedBuffer = 0;
    private groundedBufferTime = 0.1;
    private snapDistance = 0.3;

    // Capsule dimensions
    private capsuleHeight = 1.0; // half-height for physics
    private capsuleRadius = 0.3;

    // Camera/rotation
    private yaw = 0;
    private pitch = 0;
    private mouseSensitivity = 0.002;
    
    
    private nextPosition = new THREE.Vector3();

    onStart() {
        this.camera = getCamera();
        this.object.position.set(0, 10, 0)
        console.log('PlayerController started');

        this.RAPIER = Instance.pluginData.physics.RAPIER;
        this.world = Instance.pluginData.physics.world;

        // Create visual capsule mesh
        this.createCapsuleMesh();

        // Create character controller
        this.controller = this.world.createCharacterController(0.01);
        this.controller.setUp({ x: 0, y: 1, z: 0 });
        this.controller.setSlideEnabled(true);
        this.controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        this.controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
        this.controller.enableAutostep(0.5, 0.2, false);
        this.controller.setCharacterMass(30);
        this.controller.enableSnapToGround(0.5);
        this.controller.setApplyImpulsesToDynamicBodies(true);

        // Create character rigid body (kinematic)
        const position = this.object.position;
        const bodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased()
            .setTranslation(position.x, position.y, position.z);
        this.characterBody = this.world.createRigidBody(bodyDesc);

        // Create capsule collider (half-height, radius)
        const colliderDesc = this.RAPIER.ColliderDesc.capsule(
            this.capsuleHeight,
            this.capsuleRadius
        );
        this.characterCollider = this.world.createCollider(colliderDesc, this.characterBody);

        // Initialize rotation
        if (input.phi !== undefined) this.yaw = input.phi;
        if (input.theta !== undefined) this.pitch = input.theta;
    }

    private createCapsuleMesh() {
        this.capsuleMesh = new THREE.Group();

        // Create capsule geometry (cylinder + 2 hemispheres)
        const cylinderHeight = this.capsuleHeight * 2;
        const cylinderGeometry = new THREE.CylinderGeometry(
            this.capsuleRadius,
            this.capsuleRadius,
            cylinderHeight,
            16
        );

        const sphereGeometry = new THREE.SphereGeometry(
            this.capsuleRadius,
            16,
            8,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2
        );

        // Material
        const material = new THREE.MeshStandardMaterial({
            color: 0x3498db,
            roughness: 0.7,
            metalness: 0.3
        });

        // Cylinder body
        const cylinder = new THREE.Mesh(cylinderGeometry, material);
        this.capsuleMesh.add(cylinder);

        // Top hemisphere
        const topHemisphere = new THREE.Mesh(sphereGeometry, material);
        topHemisphere.position.y = this.capsuleHeight;
        this.capsuleMesh.add(topHemisphere);

        // Bottom hemisphere
        const bottomHemisphere = new THREE.Mesh(sphereGeometry.clone(), material);
        bottomHemisphere.rotation.x = Math.PI;
        bottomHemisphere.position.y = -this.capsuleHeight;
        this.capsuleMesh.add(bottomHemisphere);

        // Add to parent object
        this.object.add(this.capsuleMesh);
    }

    onUpdate(dt: number) {
        if (!this.characterBody) return;

        this.handleInput(dt);
        this.applyPhysics(dt);
        this.updateObjectTransform(dt);
    }

    private handleInput(dt: number) {
        // Get input deltas (these are already small values from mouse/touch movement)
        const moveX = input.hudData.deltaX * dt;
        const moveZ = input.hudData.deltaY * dt;

        const target = this.object;

        // Get movement directions
        const forward = target.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
        const left = new THREE.Vector3().crossVectors(forward, target.up).normalize();

        // Create movement vector with SPEED, not delta accumulation
        const moveVector = new THREE.Vector3()
            .addScaledVector(left, moveX)
            .addScaledVector(forward, -moveZ);

        // Normalize and apply speed (IMPORTANT: prevents accumulation)
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize().multiplyScalar(this.moveSpeed * dt);
        }

        // Set horizontal velocity (don't accumulate, just SET it)
        this.velocity.x = moveVector.x;
        this.velocity.z = moveVector.z;

        // Jump
        if (input.buttons?.jump?.pressed && this.isGrounded) {
            this.velocity.y = this.jumpForce;
        }
    }

    private applyPhysics(dt: number) {
        // Apply gravity (but not if we're grounded and not jumping)
        if (!this.isGrounded || this.velocity.y > 0) {
            this.velocity.y -= 9.81 * dt;
        }

        // Calculate desired movement
        const desiredMovement = {
            x: this.velocity.x ,
            y: this.velocity.y * dt,
            z: this.velocity.z 
        };

        // Compute collision-aware movement
        this.controller.computeColliderMovement(
            this.characterCollider,
            desiredMovement
        );

        let movement = this.controller.computedMovement();
        const rawGrounded = this.controller.computedGrounded();

        // SOLUTION: Snap to ground for slopes (prevents flickering)
        if (this.isGrounded && this.velocity.y <= 0) {
            const pos = this.characterBody.translation();
            const ray = new this.RAPIER.Ray(
                { x: pos.x, y: pos.y, z: pos.z },
                { x: 0, y: -1, z: 0 }
            );

            
        }

        // SOLUTION: Grounded buffer (coyote time)
        if (rawGrounded) {
            this.groundedBuffer = this.groundedBufferTime;
        } else {
            this.groundedBuffer -= dt;
        }

        this.isGrounded = this.groundedBuffer > 0;

        // Reset vertical velocity ONLY if grounded and moving down
        if (this.isGrounded && this.velocity.y <= 0) {
            this.velocity.y = 0;
        }

        // Apply movement to physics body
        const pos = this.characterBody.translation();
        pos.x += movement.x
        pos.y += movement.y
        pos.z += movement.z
        this.characterBody.setNextKinematicTranslation(pos);
        
        this.nextPosition.copy(pos)
    }

    private updateObjectTransform(dt) {
        // Sync Three.js object with physics body
        const pos = this.nextPosition;
        this.object.position.lerp(pos, 1.0 - Math.pow(0.001, dt));
        
    }

    // Public getters
    public getYaw(): number {
        return this.yaw;
    }

    public getPitch(): number {
        return this.pitch;
    }

    public getIsGrounded(): boolean {
        return this.isGrounded;
    }

    public getCapsuleMesh(): THREE.Group {
        return this.capsuleMesh;
    }

    onDestroy() {
        // Remove mesh
        if (this.capsuleMesh) {
            this.object.remove(this.capsuleMesh);
            this.capsuleMesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        // Remove physics objects
        if (this.characterCollider) {
            this.world.removeCollider(this.characterCollider, false);
        }
        if (this.characterBody) {
            this.world.removeRigidBody(this.characterBody);
        }
        if (this.controller) {
            this.world.removeCharacterController(this.controller);
        }
    }
}