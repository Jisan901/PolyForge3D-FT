import { System } from "@/Core/Systems/System";
import { getComponent, getComponents, getEntities, syncEntityTransform } from '@/Core/Functions';
import { Components } from "@/Core/Types/Components";
import type { Query } from "@/Core/ECS/Query";

export interface RaycastHit {
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
  collider: any;
  entity: any;
  entityUuid: string | null;
}

interface PhysicsData {
  rigidBody: any; // RAPIER.RigidBody
  colliders: any[]; // RAPIER.Collider[]
  entity: any;
}

export default class PhysicsSystem extends System {
  entities: any[] = [];
  name = 'PhysicsSystem';
  isSystem = true;

  public static instance: PhysicsSystem | null = null;

  private RAPIER: any;
  private world: any;
  private eventQueue: any = null;
  private physicsObjects: Map<string, PhysicsData> = new Map();
  private colliderToEntity: Map<number, string> = new Map();
  private physicsQuery: Query | null = null;
  private getComponent: (entity: any, nameCode: number) => any;
  private syncEntityTransform: (object3d: any, p: any, r: any, s: any) => void;

  constructor(public override app: any) {
    super(app);
    PhysicsSystem.instance = this;
    this.RAPIER = app.pluginData.physics.RAPIER;
    this.world = app.pluginData.physics.world;
    this.getComponent = (e, i) => getComponent(i, e);
    this.syncEntityTransform = syncEntityTransform;
  }

  onStart(): void {
    console.log('PhysicsSystem started');
    PhysicsSystem.instance = this;

    if (this.RAPIER && !this.eventQueue) {
      this.eventQueue = new this.RAPIER.EventQueue(true);
      if (this.app.pluginData?.physics) {
        this.app.pluginData.physics.eventQueue = this.eventQueue;
      }
    }

    if (this.app.entityManager) {
      this.physicsQuery = this.app.entityManager.createQuery([Components.RIGIDBODY, Components.COLLIDER]);
      this.physicsQuery.onEntityRemoved.add((e: any) => {
        this.removePhysicsObject(e.id);
      });
    }
  }

  onUpdate(): void {
    if (this.physicsQuery) {
      const qEntities = this.physicsQuery.entities;
      for (let i = 0; i < qEntities.length; i++) {
        this.updatePhysicsObject(qEntities[i].object3d);
      }
    } else {
      // Fallback if query not ready
      this.entities = getEntities(Components.RIGIDBODY, Components.COLLIDER);
      for (const entity of this.entities) {
        this.updatePhysicsObject(entity);
      }
      const physicsIds = new Set(this.entities.map((e) => e.uuid));
      for (const uuid of this.physicsObjects.keys()) {
        if (!physicsIds.has(uuid)) {
          this.removePhysicsObject(uuid);
        }
      }
    }

    // Process Rapier collision and trigger events
    this.processEvents();

    // Sync transforms from Rapier back to Three.js Object3Ds
    this.syncTransforms();
  }

  private processEvents(): void {
    if (!this.eventQueue || typeof this.eventQueue.drainCollisionEvents !== 'function') return;

    // Drain contact & sensor/trigger events
    this.eventQueue.drainCollisionEvents((h1: number, h2: number, started: boolean) => {
      const uuid1 = this.colliderToEntity.get(h1);
      const uuid2 = this.colliderToEntity.get(h2);
      if (!uuid1 || !uuid2) return;

      const obj1 = this.physicsObjects.get(uuid1)?.entity;
      const obj2 = this.physicsObjects.get(uuid2)?.entity;
      if (!obj1 || !obj2) return;

      // Check if either collider is a sensor/trigger
      const col1 = this.world?.getCollider?.(h1);
      const col2 = this.world?.getCollider?.(h2);
      const isSensor = (col1 && typeof col1.isSensor === 'function' && col1.isSensor()) ||
                       (col2 && typeof col2.isSensor === 'function' && col2.isSensor());

      if (isSensor) {
        this.dispatchLifecycle(obj1, started ? 'onTriggerEnter' : 'onTriggerExit', obj2);
        this.dispatchLifecycle(obj2, started ? 'onTriggerEnter' : 'onTriggerExit', obj1);
      } else {
        this.dispatchLifecycle(obj1, started ? 'onCollisionEnter' : 'onCollisionExit', obj2);
        this.dispatchLifecycle(obj2, started ? 'onCollisionEnter' : 'onCollisionExit', obj1);
      }
    });
  }

  private dispatchLifecycle(entity: any, method: string, other: any): void {
    try {
      const scripts = this.app.scriptExecutor?.getScriptsByObject?.(entity);
      if (Array.isArray(scripts)) {
        for (const s of scripts) {
          if (typeof s[method] === 'function') {
            s[method](other);
          }
        }
      }
    } catch (err) {
      console.error(`Error dispatching ${method}:`, err);
    }
  }

  private updatePhysicsObject(entity: any): void {
    const rigidbodyData = this.getComponent(entity, Components.RIGIDBODY);
    const colliderDataList = getComponents(Components.COLLIDER, entity);

    if (!rigidbodyData) return;

    const uuid = entity.uuid;

    // Create or update physics object
    if (!this.physicsObjects.has(uuid)) {
      this.createPhysicsObject(entity, rigidbodyData, colliderDataList);
    } else {
      this.updatePhysicsProperties(entity, rigidbodyData, colliderDataList);
    }
  }

  private createPhysicsObject(entity: any, rigidbodyData: any, colliderDataList: any[]): void {
    const uuid = entity.uuid;

    const position = entity?.position || { x: 0, y: 0, z: 0 };
    const rotation = entity?.quaternion || { x: 0, y: 0, z: 0, w: 1 };

    // Create rigid body description
    let rigidBodyDesc;
    if (rigidbodyData.isStatic) {
      rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    } else if (rigidbodyData.isKinematic) {
      rigidBodyDesc = rigidbodyData.updateKinematic
        ? this.RAPIER.RigidBodyDesc.kinematicPositionBased()
        : this.RAPIER.RigidBodyDesc.kinematicVelocityBased();
    } else {
      rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
    }

    // Set position and rotation
    rigidBodyDesc.setTranslation(position.x, position.y, position.z);
    if (rotation.w !== undefined) {
      rigidBodyDesc.setRotation({
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w
      });
    }

    // Constraints (Axis Lock)
    const lockX = !!rigidbodyData.lockTranslationX;
    const lockY = !!rigidbodyData.lockTranslationY;
    const lockZ = !!rigidbodyData.lockTranslationZ;
    if (lockX || lockY || lockZ) {
      rigidBodyDesc.setEnabledTranslations(!lockX, !lockY, !lockZ);
    }

    const lockRotX = !!rigidbodyData.lockRotationX;
    const lockRotY = !!rigidbodyData.lockRotationY;
    const lockRotZ = !!rigidbodyData.lockRotationZ;
    if (lockRotX || lockRotY || lockRotZ) {
      rigidBodyDesc.setEnabledRotations(!lockRotX, !lockRotY, !lockRotZ);
    }

    // Auto-sleep & CCD
    if (rigidbodyData.canSleep !== undefined) {
      rigidBodyDesc.setCanSleep(!!rigidbodyData.canSleep);
    }
    if (rigidbodyData.ccdEnabled && typeof rigidBodyDesc.setCcdEnabled === 'function') {
      rigidBodyDesc.setCcdEnabled(true);
    }

    // Create rigid body in Rapier world
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // Apply mass, damping, gravity scale
    if (!rigidbodyData.isStatic && !rigidbodyData.isKinematic) {
      rigidBody.setAdditionalMass(rigidbodyData.mass ?? 1.0);
      rigidBody.setLinearDamping(rigidbodyData.drag ?? 0.0);
      rigidBody.setAngularDamping(rigidbodyData.angularDrag ?? 0.05);

      const gravScale = rigidbodyData.useGravity ? (rigidbodyData.gravityScale ?? 1.0) : 0.0;
      rigidBody.setGravityScale(gravScale);

      if (rigidbodyData.dominance !== undefined && typeof rigidBody.setDominanceGroup === 'function') {
        rigidBody.setDominanceGroup(rigidbodyData.dominance);
      }
    }

    // Create all attached colliders (compound collider support)
    const colliders: any[] = [];
    if (Array.isArray(colliderDataList) && colliderDataList.length > 0) {
      for (const cData of colliderDataList) {
        const col = this.createCollider(rigidBody, cData, entity);
        if (col) {
          colliders.push(col);
          this.colliderToEntity.set(col.handle, uuid);
        }
      }
    } else {
      // Fallback single collider if not found as array
      const singleColData = this.getComponent(entity, Components.COLLIDER);
      if (singleColData) {
        const col = this.createCollider(rigidBody, singleColData, entity);
        if (col) {
          colliders.push(col);
          this.colliderToEntity.set(col.handle, uuid);
        }
      }
    }

    // Store physics data
    this.physicsObjects.set(uuid, {
      rigidBody,
      colliders,
      entity
    });
  }

  private createCollider(rigidBody: any, colliderData: any, entity: any): any {
    let colliderDesc;

    switch (colliderData.shape) {
      case 'box': {
        const size = colliderData.size || { x: 1, y: 1, z: 1 };
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
          Math.max(0.01, size.x / 2),
          Math.max(0.01, size.y / 2),
          Math.max(0.01, size.z / 2)
        );
        break;
      }

      case 'sphere': {
        const radius = Math.max(0.01, colliderData.radius || 0.5);
        colliderDesc = this.RAPIER.ColliderDesc.ball(radius);
        break;
      }

      case 'capsule': {
        const height = Math.max(0.02, colliderData.height || 2);
        const capRadius = Math.max(0.01, colliderData.radius || 0.5);
        const halfHeight = Math.max(0.01, (height - capRadius * 2) / 2);
        colliderDesc = this.RAPIER.ColliderDesc.capsule(halfHeight, capRadius);
        break;
      }

      case 'cylinder': {
        const cylHeight = Math.max(0.02, colliderData.height || 2);
        const cylRadius = Math.max(0.01, colliderData.radius || 0.5);
        colliderDesc = this.RAPIER.ColliderDesc.cylinder(cylHeight / 2, cylRadius);
        break;
      }

      case 'cone': {
        const coneHeight = Math.max(0.02, colliderData.height || 2);
        const coneRadius = Math.max(0.01, colliderData.radius || 0.5);
        if (typeof this.RAPIER.ColliderDesc.cone === 'function') {
          colliderDesc = this.RAPIER.ColliderDesc.cone(coneHeight / 2, coneRadius);
        } else {
          colliderDesc = this.RAPIER.ColliderDesc.cylinder(coneHeight / 2, coneRadius);
        }
        break;
      }

      case 'mesh': {
        const object3d = entity;
        if (object3d && object3d.isMesh && object3d.geometry) {
          const geometry = object3d.geometry;
          const meshType = colliderData.meshType || 'convexHull';

          if (meshType === 'trimesh' && geometry.attributes?.position) {
            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;
            if (indices) {
              colliderDesc = this.RAPIER.ColliderDesc.trimesh(vertices, indices);
            } else if (typeof this.RAPIER.ColliderDesc.convexHull === 'function') {
              colliderDesc = this.RAPIER.ColliderDesc.convexHull(vertices);
            }
          } else if (meshType === 'convexHull' && geometry.attributes?.position && typeof this.RAPIER.ColliderDesc.convexHull === 'function') {
            const vertices = geometry.attributes.position.array;
            colliderDesc = this.RAPIER.ColliderDesc.convexHull(vertices);
          }

          if (!colliderDesc) {
            // Fallback to bounding box
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const width = Math.max(0.01, box.max.x - box.min.x);
            const height = Math.max(0.01, box.max.y - box.min.y);
            const depth = Math.max(0.01, box.max.z - box.min.z);
            colliderDesc = this.RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2);
          }
        } else {
          colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        }
        break;
      }

      default:
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }

    if (!colliderDesc) return null;

    // Center offset translation
    if (colliderData.center) {
      const cx = colliderData.center.x ?? 0;
      const cy = colliderData.center.y ?? 0;
      const cz = colliderData.center.z ?? 0;
      if (cx !== 0 || cy !== 0 || cz !== 0) {
        colliderDesc.setTranslation(cx, cy, cz);
      }
    }

    // Trigger / Sensor mode
    if (colliderData.isTrigger) {
      colliderDesc.setSensor(true);
    }

    // Material properties: Friction & Restitution
    if (colliderData.friction !== undefined) {
      colliderDesc.setFriction(colliderData.friction);
    }
    if (colliderData.frictionCombineRule && this.RAPIER.CoefficientCombineRule) {
      const rule = this.mapCombineRule(colliderData.frictionCombineRule);
      colliderDesc.setFrictionCombineRule(rule);
    }

    if (colliderData.restitution !== undefined) {
      colliderDesc.setRestitution(colliderData.restitution);
    }
    if (colliderData.restitutionCombineRule && this.RAPIER.CoefficientCombineRule) {
      const rule = this.mapCombineRule(colliderData.restitutionCombineRule);
      colliderDesc.setRestitutionCombineRule(rule);
    }

    // Density
    if (colliderData.density !== undefined) {
      colliderDesc.setDensity(colliderData.density);
    }

    // Collision layer / groups filtering
    if (colliderData.collisionLayer !== undefined || colliderData.collisionMask !== undefined) {
      const layer = colliderData.collisionLayer ?? 0;
      const mask = colliderData.collisionMask ?? 0xffff;
      const membership = 1 << Math.min(15, Math.max(0, layer));
      const interactionGroups = (membership << 16) | (mask & 0xffff);
      colliderDesc.setCollisionGroups(interactionGroups);
    }

    // Active collision & trigger events for eventQueue
    colliderDesc.setActiveEvents(
      this.RAPIER.ActiveEvents.COLLISION_EVENTS
    );

    return this.world.createCollider(colliderDesc, rigidBody);
  }

  private mapCombineRule(ruleName: string): any {
    switch (ruleName) {
      case 'min': return this.RAPIER.CoefficientCombineRule.Min;
      case 'multiply': return this.RAPIER.CoefficientCombineRule.Multiply;
      case 'max': return this.RAPIER.CoefficientCombineRule.Max;
      default: return this.RAPIER.CoefficientCombineRule.Average;
    }
  }

  private updatePhysicsProperties(entity: any, rigidbodyData: any, colliderDataList: any[]): void {
    const uuid = entity.uuid;
    const physicsData = this.physicsObjects.get(uuid);

    if (!physicsData) return;

    const { rigidBody } = physicsData;

    // Update rigid body dynamic properties
    if (!rigidbodyData.isStatic && !rigidbodyData.isKinematic) {
      rigidBody.setAdditionalMass(rigidbodyData.mass ?? 1.0);
      rigidBody.setLinearDamping(rigidbodyData.drag ?? 0.0);
      rigidBody.setAngularDamping(rigidbodyData.angularDrag ?? 0.05);

      const gravScale = rigidbodyData.useGravity ? (rigidbodyData.gravityScale ?? 1.0) : 0.0;
      rigidBody.setGravityScale(gravScale);

      if (typeof rigidBody.enableCcd === 'function') {
        rigidBody.enableCcd(!!rigidbodyData.ccdEnabled);
      }
      if (typeof rigidBody.setDominanceGroup === 'function' && rigidbodyData.dominance !== undefined) {
        rigidBody.setDominanceGroup(rigidbodyData.dominance);
      }
    }

    // Update constraints
    const lockX = !rigidbodyData.lockTranslationX;
    const lockY = !rigidbodyData.lockTranslationY;
    const lockZ = !rigidbodyData.lockTranslationZ;
    rigidBody.setEnabledTranslations(lockX, lockY, lockZ, true);

    const lockRotX = !rigidbodyData.lockRotationX;
    const lockRotY = !rigidbodyData.lockRotationY;
    const lockRotZ = !rigidbodyData.lockRotationZ;
    rigidBody.setEnabledRotations(lockRotX, lockRotY, lockRotZ, true);

    // Handle body type changes
    const currentType = rigidBody.bodyType();

    if (rigidbodyData.isStatic && currentType !== this.RAPIER.RigidBodyType.Fixed) {
      rigidBody.setBodyType(this.RAPIER.RigidBodyType.Fixed);
    } else if (rigidbodyData.isKinematic && currentType !== this.RAPIER.RigidBodyType.KinematicPositionBased) {
      rigidBody.setBodyType(
        rigidbodyData.updateKinematic
          ? this.RAPIER.RigidBodyType.KinematicPositionBased
          : this.RAPIER.RigidBodyType.KinematicVelocityBased
      );
    } else if (!rigidbodyData.isStatic && !rigidbodyData.isKinematic && currentType !== this.RAPIER.RigidBodyType.Dynamic) {
      rigidBody.setBodyType(this.RAPIER.RigidBodyType.Dynamic);
    }
  }

  private syncTransforms(): void {
    for (const [uuid, physicsData] of this.physicsObjects) {
      const { rigidBody, entity } = physicsData;
      const rigidbodyData = this.getComponent(entity, Components.RIGIDBODY);

      // Skip static bodies
      if (rigidbodyData?.isStatic) continue;

      // Handle kinematic bodies with updateKinematic flag
      if (rigidbodyData?.isKinematic && rigidbodyData?.updateKinematic) {
        const object3d = entity;
        if (object3d) {
          rigidBody.setTranslation(
            {
              x: object3d.position.x,
              y: object3d.position.y,
              z: object3d.position.z
            },
            true
          );
          rigidBody.setRotation(
            {
              x: object3d.quaternion.x,
              y: object3d.quaternion.y,
              z: object3d.quaternion.z,
              w: object3d.quaternion.w
            },
            true
          );
        }
        continue;
      }

      // Skip other kinematic bodies
      if (rigidbodyData?.isKinematic) continue;

      // Get position and rotation from physics
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();

      // Get current scale from entity
      const scale = entity?.scale || { x: 1, y: 1, z: 1 };

      // Sync to entity
      this.syncEntityTransform(
        entity,
        { x: translation.x, y: translation.y, z: translation.z },
        { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
        scale
      );
    }
  }

  // =========================================================================
  // PUBLIC PHYSICS API & QUERIES
  // =========================================================================

  /**
   * Casts a ray into the physics world and returns the closest hit, or null if no hit.
   */
  public raycast(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxToi = 1000,
    solid = true,
    filterGroups?: number
  ): RaycastHit | null {
    if (!this.world || !this.RAPIER) return null;

    const ray = new this.RAPIER.Ray(origin, direction);
    const hit = this.world.castRayAndGetNormal(ray, maxToi, solid, filterGroups);
    if (!hit) return null;

    const point = {
      x: origin.x + direction.x * hit.toi,
      y: origin.y + direction.y * hit.toi,
      z: origin.z + direction.z * hit.toi
    };

    const collider = hit.collider;
    const entityUuid = this.colliderToEntity.get(collider?.handle) ?? null;
    const entity = entityUuid ? this.physicsObjects.get(entityUuid)?.entity : null;

    return {
      point,
      normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
      distance: hit.toi,
      collider,
      entity,
      entityUuid
    };
  }

  /**
   * Casts a ray and returns all intersections up to maxToi.
   */
  public raycastAll(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxToi = 1000,
    solid = true,
    filterGroups?: number
  ): RaycastHit[] {
    if (!this.world || !this.RAPIER) return [];

    const hits: RaycastHit[] = [];
    const ray = new this.RAPIER.Ray(origin, direction);

    this.world.intersectionsWithRay(
      ray,
      maxToi,
      solid,
      (hit: any) => {
        const point = {
          x: origin.x + direction.x * hit.toi,
          y: origin.y + direction.y * hit.toi,
          z: origin.z + direction.z * hit.toi
        };
        const collider = hit.collider;
        const entityUuid = this.colliderToEntity.get(collider?.handle) ?? null;
        const entity = entityUuid ? this.physicsObjects.get(entityUuid)?.entity : null;

        hits.push({
          point,
          normal: hit.normal ? { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z } : { x: 0, y: 1, z: 0 },
          distance: hit.toi,
          collider,
          entity,
          entityUuid
        });
        return true; // Continue searching for all hits
      },
      filterGroups
    );

    return hits;
  }

  /**
   * Checks for any entities intersecting a sphere at the given center and radius.
   */
  public checkSphere(
    center: { x: number; y: number; z: number },
    radius: number,
    filterGroups?: number
  ): string[] {
    if (!this.world || !this.RAPIER) return [];

    const shape = new this.RAPIER.Ball(radius);
    const hitUuids = new Set<string>();

    this.world.intersectionsWithShape(
      center,
      { x: 0, y: 0, z: 0, w: 1 },
      shape,
      (collider: any) => {
        const uuid = this.colliderToEntity.get(collider.handle);
        if (uuid) hitUuids.add(uuid);
        return true;
      },
      filterGroups
    );

    return Array.from(hitUuids);
  }

  public applyForce(entityUuid: string, force: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.addForce({ x: force.x, y: force.y, z: force.z }, true);
  }

  public applyImpulse(entityUuid: string, impulse: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
  }

  public applyTorque(entityUuid: string, torque: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.addTorque({ x: torque.x, y: torque.y, z: torque.z }, true);
  }

  public applyTorqueImpulse(entityUuid: string, torqueImpulse: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.applyTorqueImpulse({ x: torqueImpulse.x, y: torqueImpulse.y, z: torqueImpulse.z }, true);
  }

  public setVelocity(entityUuid: string, velocity: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  public getVelocity(entityUuid: string): { x: number; y: number; z: number } | null {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return null;
    const vel = physicsData.rigidBody.linvel();
    return { x: vel.x, y: vel.y, z: vel.z };
  }

  public setAngularVelocity(entityUuid: string, angularVelocity: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.setAngvel({ x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z }, true);
  }

  public getAngularVelocity(entityUuid: string): { x: number; y: number; z: number } | null {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return null;
    const avel = physicsData.rigidBody.angvel();
    return { x: avel.x, y: avel.y, z: avel.z };
  }

  public setKinematicPosition(entityUuid: string, position: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
  }

  public setKinematicRotation(entityUuid: string, rotation: { x: number; y: number; z: number; w: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.setRotation(rotation, true);
  }

  public teleport(
    entityUuid: string,
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number; w: number }
  ): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    physicsData.rigidBody.setTranslation(position, true);
    if (rotation) {
      physicsData.rigidBody.setRotation(rotation, true);
    }
  }

  public removePhysicsObject(entityUuid: string): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;

    const { rigidBody, colliders } = physicsData;

    if (Array.isArray(colliders)) {
      for (const collider of colliders) {
        this.colliderToEntity.delete(collider.handle);
        this.world.removeCollider(collider, false);
      }
    }

    if (rigidBody) {
      this.world.removeRigidBody(rigidBody);
    }

    this.physicsObjects.delete(entityUuid);
  }

  onDestroy(): void {
    for (const uuid of Array.from(this.physicsObjects.keys())) {
      this.removePhysicsObject(uuid);
    }
    this.physicsObjects.clear();
    this.colliderToEntity.clear();

    console.log('PhysicsSystem destroyed');
  }
}