import { Behavior } from "@/Core/Behavior";
import { Instance } from "@/Core/PolyForge";
import { getCamera, getRef } from "@/Core/Functions";
import { THREE } from '@/Core/lib/THREE';
import { INumber, IRef } from '@/Editor/ITypes';

const input = (window as any).gamePad.data;

export default class PlayerController extends Behavior {
    @IRef()
    private camera: THREE.Camera;
    private RAPIER: any;
    private world: any;
    private characterBody: any;
    private characterCollider: any;
    private controller: any;

    // Visual mesh
    @IRef()
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



    private nextPosition = new THREE.Vector3();

    onStart() {
        this.camera = getRef(this.camera) || getCamera();

        console.log('PlayerController started');

        this.RAPIER = Instance.pluginData.physics.RAPIER;
        this.world = Instance.pluginData.physics.world;

        // get visual capsule mesh
        this.capsuleMesh = getRef(this.capsuleMesh);

        // Create character controller
        this.controller = this.world.createCharacterController(0.01);
        globalThis.ctr = this.controller;
        this.controller.setUp({ x: 0, y: 1, z: 0 });
        this.controller.setSlideEnabled(true);
        this.controller.setMaxSlopeClimbAngle(45 * Math.PI / 180);
        this.controller.setMinSlopeSlideAngle(30 * Math.PI / 180);
        this.controller.enableAutostep(0.5, 0.2, false);
        this.controller.setCharacterMass(30);
        this.controller.enableSnapToGround(0);
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

        const target = this.capsuleMesh;

        // Get movement directions
        const forward = target.getWorldDirection(new THREE.Vector3(0, 0, 1)).setY(0).normalize();
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
        // Track platform movement BEFORE physics update
        let platformDelta = new THREE.Vector3();
        if (this.standingOnBody && this.isGrounded) {
            const currentPos = this.standingOnBody.translation();
            platformDelta.set(
                currentPos.x - this.lastPlatformPosition.x,
                currentPos.y - this.lastPlatformPosition.y,
                currentPos.z - this.lastPlatformPosition.z
            );
        }

        // Apply gravity
        if (!this.isGrounded || this.velocity.y > 0) {
            this.velocity.y -= 9.81 * dt;
        }

        // Calculate desired movement (include platform delta)
        const desiredMovement = {
            x: this.velocity.x + platformDelta.x,
            y: this.velocity.y * dt + platformDelta.y,
            z: this.velocity.z + platformDelta.z
        };

        // Compute collision-aware movement
        this.controller.computeColliderMovement(
            this.characterCollider,
            desiredMovement
        );

        const movement = this.controller.computedMovement();
        const rawGrounded = this.controller.computedGrounded();

        // Detect what we're standing on
        this.standingOnBody = null;
        if (rawGrounded) {
            const pos = this.characterBody.translation();
        }

        // Grounded buffer (coyote time)
        if (rawGrounded) {
            this.groundedBuffer = this.groundedBufferTime;
        } else {
            this.groundedBuffer -= dt;
        }

        this.isGrounded = this.groundedBuffer > 0;

        // FIXED: Only reset velocity if on flat ground (not sliding)
        // Let the controller handle slope sliding naturally
        if (this.isGrounded && this.velocity.y < 0) {
            // Only zero out if movement.y is near zero (truly flat ground)
            // This allows the controller's slide logic to work
            if (Math.abs(movement.y) < 0.001) {
                this.velocity.y = 0;
            }
        }

        // Apply movement to physics body
        const pos = this.characterBody.translation();
        this.nextPosition.set(
            pos.x + movement.x,
            pos.y + movement.y,
            pos.z + movement.z
        );

        this.characterBody.setNextKinematicTranslation(this.nextPosition);
    }
    
    
    onLateUpdate(deltaTime: number){
        
    }
    onBeforeUpdate(deltaTime: number){
        
    }

    private updateObjectTransform(dt) {
        // Sync Three.js object with physics body
        const pos = this.nextPosition;
        this.object.position.lerp(pos, 1 - Math.exp(-50 * dt));

    }

    // Public getters
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