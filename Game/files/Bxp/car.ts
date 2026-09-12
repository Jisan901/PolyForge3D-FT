import { Behavior } from "@/Core/Behavior";
import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import { getCamera, getRef } from "@/Core/Functions";
import { INumber, IRef } from '@/Editor/ITypes';

/**
 * 4-Wheel Rapier3D Vehicle Controller
 * Based on the Three.js Rapier Raycast Vehicle Controller example.
 *
 * Features:
 * - Direct script creation of car body and 4 articulated wheels.
 * - Native Rapier Raycast Vehicle Controller (`world.createVehicleController`).
 * - Responsive 3rd-person follow camera with automatic hierarchy detection (works whether
 *   the camera is a child of the car or independent in the scene).
 * - Full WASD / Arrow Keys, GamePad, Space for brake, R for upright reset.
 */
export default class Car extends Behavior {
    // Driving & Handling Properties
    @INumber(32)
    maxSpeed: number = 32;

    @INumber(1.0)
    accelerationStep: number = 1.0;

    @INumber(0.55)
    maxSteerAngle: number = 0.55; // ~31.5 degrees

    @INumber(0.25)
    steerSmoothing: number = 0.25;

    @INumber(0.2)
    brakeStep: number = 0.2;

    // Chassis & Weight
    @INumber(15.0)
    chassisMass: number = 15.0;

    // Suspension Properties
    @INumber(24.0)
    suspensionStiffness: number = 24.0;

    @INumber(0.8)
    suspensionRestLength: number = 0.8;

    @INumber(0.85)
    maxSuspensionTravel: number = 0.85;

    @INumber(0.35)
    wheelRadius: number = 0.35;

    @INumber(0.4)
    wheelWidth: number = 0.4;

    @INumber(1000.0)
    wheelFrictionSlip: number = 1000.0;

    // Camera Configuration
    @INumber(7.5)
    camDistance: number = 7.5;

    @INumber(3.2)
    camHeight: number = 3.2;

    @INumber(6.0)
    camLookAhead: number = 6.0;

    followCamera: boolean = true;

    @IRef()
    camera?: THREE.Camera;

    // Physics Engine Objects
    RAPIER: any = null;
    world: any = null;
    chassisBody: any = null;
    chassisCollider: any = null;
    vehicleController: any = null;

    // Visual Meshes
    private wheels: THREE.Mesh[] = [];
    private carBodyMesh: THREE.Group | null = null;
    private taillightMaterial: THREE.MeshStandardMaterial | null = null;

    // Input Movement State
    private movement = {
        forward: 0,
        right: 0,
        brake: 0,
        reset: false,
        accelerateForce: 0,
        brakeForce: 0
    };

    private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    private boundKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);

    // Vector Pooling for Zero-Allocation Updates
    private _wheelSteeringQuat = new THREE.Quaternion();
    private _wheelRotationQuat = new THREE.Quaternion();
    private _up = new THREE.Vector3(0, 1, 0);
    private _tempAxle = new THREE.Vector3();
    private _camTargetPos = new THREE.Vector3();
    private _camLookAtPos = new THREE.Vector3();
    private _camLocalPos = new THREE.Vector3();
    private _carWorldPos = new THREE.Vector3();
    private _carWorldQuat = new THREE.Quaternion();
    private _carForward = new THREE.Vector3();
    private _carBackward = new THREE.Vector3();

    onStart() {
        console.log('[Car] Initializing Rapier Vehicle Controller...');

        // 1. Resolve Rapier Physics World
        this.resolvePhysics();

        // 2. Setup Input Listeners
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        // 3. Resolve Active Camera
        if (this.camera) {
            this.camera = getRef<THREE.Camera>(this.camera as any);
        }
        if (!this.camera) {
            this.camera = getCamera();
        }

        // 4. Create the Car Mesh & Wheels Directly in Script
        this.createCar();

        // 5. Initialize Native Rapier Physics Vehicle
        this.setupPhysicsVehicle();
    }

    private resolvePhysics(): void {
        const physics = (Instance as any)?.pluginData?.physics ||
                        (globalThis as any)?.Instance?.pluginData?.physics;
        if (physics) {
            this.RAPIER = physics.RAPIER;
            this.world = physics.world;
        } else {
            console.warn('[Car] Rapier physics world not found on Instance.pluginData.physics.');
        }
    }

    /**
     * Creates the complete car model directly in script and adds it to this.object.
     * Matches the Three.js example: chassis mesh + 4 wheel meshes as direct children.
     */
    private createCar(): void {
        // Clear any previous procedural meshes
        if (this.carBodyMesh && this.carBodyMesh.parent === this.object) {
            this.object.remove(this.carBodyMesh);
        }
        for (const w of this.wheels) {
            if (w.parent === this.object) this.object.remove(w);
        }
        this.wheels = [];

        this.carBodyMesh = new THREE.Group();
        this.carBodyMesh.name = 'CarBody';

        // Sporty Car Materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xd32f2f,
            roughness: 0.35,
            metalness: 0.7
        });

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x141822,
            roughness: 0.1,
            metalness: 0.95
        });

        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x1f1f1f,
            roughness: 0.8
        });

        const headlightMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xdfefff,
            emissiveIntensity: 2.5,
            roughness: 0.2
        });

        this.taillightMaterial = new THREE.MeshStandardMaterial({
            color: 0x990000,
            emissive: 0x550000,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });

        // 1. Main Chassis Box: Width 2m, Height 0.75m, Length 4m
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.0), bodyMat);
        chassis.position.y = 0.35;
        chassis.castShadow = true;
        this.carBodyMesh.add(chassis);

        // 2. Cabin / Windshield
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.0), glassMat);
        cabin.position.set(0, 0.85, 0.1);
        cabin.castShadow = true;
        this.carBodyMesh.add(cabin);

        // 3. Front Splitter & Grille (facing -Z)
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.4), trimMat);
        splitter.position.set(0, 0.08, -1.95);
        this.carBodyMesh.add(splitter);

        // 4. Headlights (facing -Z forward)
        const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.1), headlightMat);
        hlL.position.set(-0.65, 0.45, -2.01);
        const hlR = hlL.clone();
        hlR.position.x = 0.65;
        this.carBodyMesh.add(hlL, hlR);

        // 5. Rear Spoiler (facing +Z backward)
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.35), trimMat);
        spoiler.position.set(0, 1.05, 1.8);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.1), trimMat);
        postL.position.set(-0.65, 0.85, 1.8);
        const postR = postL.clone();
        postR.position.x = 0.65;
        this.carBodyMesh.add(spoiler, postL, postR);

        // 6. Reactive Taillight Bar (facing +Z backward)
        const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.1), this.taillightMaterial);
        taillight.position.set(0, 0.5, 2.01);
        this.carBodyMesh.add(taillight);

        this.object.add(this.carBodyMesh);

        // 7. Create 4 Wheel Meshes directly as children of this.object
        const wheelPositions = [
            { x: -1.0, y: 0.0, z: -1.5 }, // 0: Front Left
            { x: 1.0, y: 0.0, z: -1.5 },  // 1: Front Right
            { x: -1.0, y: 0.0, z: 1.5 },  // 2: Rear Left
            { x: 1.0, y: 0.0, z: 1.5 }    // 3: Rear Right
        ];

        const tireMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.85, roughness: 0.25 });

        // Wheel geometry rotated so cylinder axis lies along X axis
        const wheelGeo = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelWidth, 24);
        wheelGeo.rotateZ(Math.PI * 0.5);

        const rimGeo = new THREE.CylinderGeometry(this.wheelRadius * 0.65, this.wheelRadius * 0.65, this.wheelWidth * 1.05, 12);
        rimGeo.rotateZ(Math.PI * 0.5);

        for (let i = 0; i < 4; i++) {
            const wheel = new THREE.Mesh(wheelGeo, tireMat);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            wheel.add(rim);

            wheel.position.set(wheelPositions[i].x, wheelPositions[i].y, wheelPositions[i].z);
            wheel.castShadow = true;

            this.object.add(wheel);
            this.wheels.push(wheel);
        }

        console.log('[Car] Procedural car body and 4 wheels created in script.');
    }

    private setupPhysicsVehicle(): void {
        if (!this.world || !this.RAPIER) return;

        const pos = this.object.position;
        const rot = this.object.quaternion;

        // 1. Dynamic Chassis Rigid Body
        const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(pos.x, pos.y + 1.0, pos.z)
            .setRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w })
            .setLinearDamping(0.2)
            .setAngularDamping(2.5)
            .setCanSleep(false);

        this.chassisBody = this.world.createRigidBody(bodyDesc);

        // 2. Chassis Box Collider: elevated and trimmed so it never scrapes or bounces on terrain
        // Half-extents: x=0.85 (tucked inside wheels at x=±1.0), y=0.22, z=1.7 (inside z=±2.0)
        // Center at y=0.42 gives bottom clearance at y=0.20m, preventing chassis from colliding with ground
        const colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.85, 0.22, 1.7)
            .setTranslation(0, 0.42, 0)
            .setFriction(0.35)
            .setRestitution(0.0)
            .setMass(this.chassisMass);

        this.chassisCollider = this.world.createCollider(colliderDesc, this.chassisBody);
        (this.chassisCollider as any).userData = { isCar: true, car: this };

        // 3. Create Native Rapier Raycast Vehicle Controller
        this.vehicleController = this.world.createVehicleController(this.chassisBody);

        const wheelPositions = [
            { x: -1.0, y: 0.0, z: -1.5 }, // 0: Front Left
            { x: 1.0, y: 0.0, z: -1.5 },  // 1: Front Right
            { x: -1.0, y: 0.0, z: 1.5 },  // 2: Rear Left
            { x: 1.0, y: 0.0, z: 1.5 }    // 3: Rear Right
        ];

        const wheelDirection = { x: 0.0, y: -1.0, z: 0.0 }; // Downward suspension
        const wheelAxle = { x: -1.0, y: 0.0, z: 0.0 };      // Lateral axle

        for (let i = 0; i < 4; i++) {
            this.vehicleController.addWheel(
                wheelPositions[i],
                wheelDirection,
                wheelAxle,
                this.suspensionRestLength,
                this.wheelRadius
            );

            this.vehicleController.setWheelSuspensionStiffness(i, this.suspensionStiffness);
            this.vehicleController.setWheelFrictionSlip(i, this.wheelFrictionSlip);
            this.vehicleController.setWheelMaxSuspensionTravel(i, this.maxSuspensionTravel);
            this.vehicleController.setWheelSuspensionCompression(i, 1.2);
            this.vehicleController.setWheelSuspensionRelaxation(i, 1.5);
        }

        console.log('[Car] Native Rapier Vehicle Controller setup completed (4 wheels initialized).');
    }

    private onKeyDown(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        if (key === 'w' || e.key === 'ArrowUp') this.movement.forward = -1; // -Z is forward
        if (key === 's' || e.key === 'ArrowDown') this.movement.forward = 1;
        if (key === 'a' || e.key === 'ArrowLeft') this.movement.right = 1;
        if (key === 'd' || e.key === 'ArrowRight') this.movement.right = -1;
        if (key === ' ') this.movement.brake = 1;
        if (key === 'r') this.resetCar();
    }

    private onKeyUp(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        if (key === 'w' || key === 's' || e.key === 'ArrowUp' || e.key === 'ArrowDown') this.movement.forward = 0;
        if (key === 'a' || key === 'd' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.movement.right = 0;
        if (key === ' ') this.movement.brake = 0;
    }

    public resetCar(): void {
        if (!this.chassisBody) return;
        const curPos = this.chassisBody.translation();

        this.chassisBody.setTranslation({ x: curPos.x, y: curPos.y + 1.5, z: curPos.z }, true);
        this.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

        this.movement.accelerateForce = 0;
        this.movement.brakeForce = 0;
        console.log('[Car] Vehicle reset upright.');
    }

    onUpdate(dt: number): void {
        if (!this.vehicleController || !this.chassisBody) {
            this.resolvePhysics();
            if (this.world && !this.chassisBody) this.setupPhysicsVehicle();
            return;
        }

        const clampedDt = Math.min(dt, 0.05);

        // 1. Gather Inputs (Gamepad & Keyboard)
        this.syncGamepadInput();

        // 2. Compute Engine, Steering, and Braking Forces
        this.updateCarControl();

        // 3. Step Physics Vehicle Controller with Filter Predicate
        // Ignores sensors (triggers) and car's own colliders so rays only hit terrain/ground
        this.vehicleController.updateVehicle(
            clampedDt,
            undefined,
            undefined,
            (collider: any) => !collider.isSensor() && collider.parent()?.handle !== this.chassisBody.handle
        );

        // 4. Ground Adherence & Aerodynamic Downforce Assistance
        this.applyGroundAssistance(clampedDt);

        // 5. Synchronize Visual Wheels with Suspension & Steering
        this.updateWheels();

        // 6. Synchronize Three.js Object with Rapier Chassis Body
        this.syncTransform();

        // 7. Update Taillights
        if (this.taillightMaterial) {
            const isBraking = this.movement.brake > 0 || this.movement.forward > 0;
            this.taillightMaterial.emissive.setHex(isBraking ? 0xff0000 : 0x440000);
            this.taillightMaterial.emissiveIntensity = isBraking ? 2.5 : 0.6;
        }

        // 8. Follow Camera with Accurate Facing
        if (this.followCamera && this.camera) {
            this.updateCameraFollow(clampedDt);
        }
    }

    private syncGamepadInput(): void {
        const pad = (window as any).gamePad?.data;
        if (pad) {
            if (pad.forward) this.movement.forward = -1;
            else if (pad.backward) this.movement.forward = 1;

            if (pad.left) this.movement.right = 1;
            else if (pad.right) this.movement.right = -1;

            if (pad.buttons?.jump?.pressed || pad.buttons?.b?.pressed) {
                this.movement.brake = 1;
            }

            if (pad.hudData) {
                if (Math.abs(pad.hudData.deltaY) > 0.1) {
                    this.movement.forward = Math.sign(pad.hudData.deltaY);
                }
                if (Math.abs(pad.hudData.deltaX) > 0.1) {
                    this.movement.right = -Math.sign(pad.hudData.deltaX);
                }
            }
        }
    }

    private updateCarControl(): void {
        // Accelerate Force
        if (this.movement.forward < 0) {
            this.movement.accelerateForce = Math.max(
                -this.maxSpeed,
                this.movement.accelerateForce - this.accelerationStep
            );
        } else if (this.movement.forward > 0) {
            this.movement.accelerateForce = Math.min(
                this.maxSpeed * 0.6,
                this.movement.accelerateForce + this.accelerationStep
            );
        } else {
            // Natural rolling friction deceleration
            this.movement.accelerateForce *= 0.92;
            if (Math.abs(this.movement.accelerateForce) < 0.1) this.movement.accelerateForce = 0;
            if (this.chassisBody.isSleeping && this.chassisBody.isSleeping()) {
                this.chassisBody.wakeUp();
            }
        }

        // Brake Force
        if (this.movement.brake > 0) {
            this.movement.brakeForce = Math.min(1.0, this.movement.brakeForce + this.brakeStep);
        } else {
            this.movement.brakeForce = 0;
        }

        const engineForce = this.movement.accelerateForce;

        // Front wheels provide main pull (100%), rear wheels provide auxiliary 4WD push (35%)
        // This prevents wheelies, unwanted pitch-up launches, and keeps front wheels grounded
        this.vehicleController.setWheelEngineForce(0, engineForce);
        this.vehicleController.setWheelEngineForce(1, engineForce);
        this.vehicleController.setWheelEngineForce(2, engineForce * 0.35);
        this.vehicleController.setWheelEngineForce(3, engineForce * 0.35);

        // Smooth steering
        const currentSteering = this.vehicleController.wheelSteering(0) || 0;
        const targetSteering = this.maxSteerAngle * this.movement.right;
        const steering = THREE.MathUtils.lerp(currentSteering, targetSteering, this.steerSmoothing);

        this.vehicleController.setWheelSteering(0, steering);
        this.vehicleController.setWheelSteering(1, steering);

        // Apply progressive braking
        const wheelBrake = this.movement.brake * this.movement.brakeForce * 10.0;
        this.vehicleController.setWheelBrake(0, wheelBrake);
        this.vehicleController.setWheelBrake(1, wheelBrake);
        this.vehicleController.setWheelBrake(2, wheelBrake);
        this.vehicleController.setWheelBrake(3, wheelBrake);
    }

    /**
     * Stabilizes vehicle when airborne and applies aerodynamic downforce when grounded.
     * Prevents the car from launching into the sky or flipping on rugged terrain.
     */
    private applyGroundAssistance(dt: number): void {
        let contactCount = 0;
        for (let i = 0; i < 4; i++) {
            if (this.vehicleController.wheelIsInContact(i)) contactCount++;
        }

        if (contactCount < 2) {
            // When airborne or losing ground contact, apply downward impulse and pitch/roll angular stabilization
            this.chassisBody.applyImpulse({ x: 0, y: -30.0 * dt, z: 0 }, true);
            const angvel = this.chassisBody.angvel();
            this.chassisBody.setAngvel(
                { x: angvel.x * 0.95, y: angvel.y, z: angvel.z * 0.95 },
                true
            );
        } else {
            // When wheels are grounded, apply subtle speed-dependent downforce to stay hugged to terrain
            const speed = Math.abs(this.vehicleController.currentVehicleSpeed() || 0);
            if (speed > 1.0) {
                this.chassisBody.applyImpulse({ x: 0, y: -speed * 0.4 * dt, z: 0 }, true);
            }
        }
    }

    private updateWheels(): void {
        this.wheels.forEach((wheel, index) => {
            const wheelAxleCs = this.vehicleController.wheelAxleCs(index) || { x: -1, y: 0, z: 0 };
            const connection = this.vehicleController.wheelChassisConnectionPointCs(index)?.y || 0;
            const suspension = this.vehicleController.wheelSuspensionLength(index) || 0;
            const steering = this.vehicleController.wheelSteering(index) || 0;
            const rotationRad = this.vehicleController.wheelRotation(index) || 0;

            // Update wheel position along suspension travel
            wheel.position.y = connection - suspension;

            // Update steering and axle rotation
            this._wheelSteeringQuat.setFromAxisAngle(this._up, steering);
            this._wheelRotationQuat.setFromAxisAngle(
                this._tempAxle.set(wheelAxleCs.x, wheelAxleCs.y, wheelAxleCs.z),
                rotationRad
            );

            wheel.quaternion.multiplyQuaternions(this._wheelSteeringQuat, this._wheelRotationQuat);
        });
    }

    private syncTransform(): void {
        const pos = this.chassisBody.translation();
        const rot = this.chassisBody.rotation();

        this.object.position.set(pos.x, pos.y, pos.z);
        this.object.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }

    /**
     * Follow camera logic accurately handling both:
     * 1. Camera as a direct child of the car.
     * 2. Camera as an independent node in the scene.
     */
    private updateCameraFollow(dt: number): void {
        if (!this.camera) return;

        // Case 1: Camera is a child of the car in the hierarchy
        if (this.camera.parent === this.object) {
            // Positioned behind the car (+Z) and above (+Y), looking forward (-Z)
            this.camera.position.set(0, this.camHeight, this.camDistance);
            this.camera.lookAt(new THREE.Vector3(0, 1.0, -this.camLookAhead));
            return;
        }

        // Case 2: Camera is in the scene root or another parent
        this.object.getWorldPosition(this._carWorldPos);
        this.object.getWorldQuaternion(this._carWorldQuat);

        // Car forward is -Z, backward is +Z
        this._carForward.set(0, 0, -1).applyQuaternion(this._carWorldQuat);
        this._carBackward.set(0, 0, 1).applyQuaternion(this._carWorldQuat);

        const linvel = this.chassisBody.linvel();
        const speed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z);

        // Camera target position: behind car (+Z) + elevated (+Y)
        const currentDist = this.camDistance + Math.min(speed * 0.08, 3.5);
        const currentHeight = this.camHeight + Math.min(speed * 0.03, 1.2);

        this._camTargetPos.copy(this._carWorldPos)
            .addScaledVector(this._carBackward, currentDist)
            .add(new THREE.Vector3(0, currentHeight, 0));

        // Look target: slightly in front of the car (-Z)
        this._camLookAtPos.copy(this._carWorldPos)
            .addScaledVector(this._carForward, this.camLookAhead + speed * 0.1)
            .add(new THREE.Vector3(0, 1.0, 0));

        // Smooth camera movement
        if (this.camera.parent) {
            this.camera.parent.worldToLocal(this._camLocalPos.copy(this._camTargetPos));
            this.camera.position.lerp(this._camLocalPos, 1 - Math.exp(-12 * dt));
        } else {
            this.camera.position.lerp(this._camTargetPos, 1 - Math.exp(-12 * dt));
        }

        // Accurately orient camera to look at the front of the car
        this.camera.lookAt(this._camLookAtPos);
    }

    onDestroy(): void {
        console.log('[Car] Tearing down Rapier Vehicle Controller...');

        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.vehicleController) {
            try {
                this.vehicleController.free();
            } catch (err) {
                console.warn('[Car] Error freeing vehicle controller:', err);
            }
            this.vehicleController = null;
        }

        if (this.world) {
            if (this.chassisCollider) {
                this.world.removeCollider(this.chassisCollider, false);
                this.chassisCollider = null;
            }
            if (this.chassisBody) {
                this.world.removeRigidBody(this.chassisBody);
                this.chassisBody = null;
            }
        }

        // Clean up visual meshes
        if (this.carBodyMesh && this.carBodyMesh.parent === this.object) {
            this.object.remove(this.carBodyMesh);
            this.carBodyMesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
                    else child.material?.dispose();
                }
            });
            this.carBodyMesh = null;
        }

        for (const wheel of this.wheels) {
            if (wheel.parent === this.object) this.object.remove(wheel);
            wheel.geometry?.dispose();
            if (Array.isArray(wheel.material)) wheel.material.forEach((m) => m.dispose());
            else wheel.material?.dispose();
        }
        this.wheels = [];
    }
}