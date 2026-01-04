import {System} from "./System"
import { getComponent, getEntities, Components , syncEntityTransform} from '@/PolyModule/Runtime/Utility';

interface PhysicsData {
  rigidBody: any; // RAPIER.RigidBody
  collider: any; // RAPIER.Collider
  entity: any;
}

export class PhysicsSystem implements System {
  entities: any[] = [];
  name = 'PhysicsSystem';
  isSystem=true;
  
  private RAPIER: any;
  private world: any;
  private physicsObjects: Map<string, PhysicsData> = new Map();
  private getComponent: (entity: any, nameCode: number) => any;
  private syncEntityTransform: (uuid: string, p: any, r: any, s: any) => void;
  
  constructor(
    public app:any
  ) {
      
    this.RAPIER = app.pluginData.physics.RAPIER;
    this.world = app.pluginData.physics.world;
    this.getComponent = (e,i)=>getComponent(i,e);
    this.syncEntityTransform = syncEntityTransform;
    this.entities = getEntities(this);
  }
  
  onStart(): void {
    console.log('PhysicsSystem started');
    this.entities = getEntities(this);
  }
  
  query(...types: any[]): void {
    // Query implementation would be called externally
    // This method signature matches the interface
  }
  
  update(): void {
    // Step the physics world
    
    
    // Query entities with both rigidbody and transform components
    const physicsEntities = this.entities.filter(entity => {
      const rigidbody = this.getComponent(entity, Components.RIGIDBODY); // nameCode 5 for Rigidbody
      return rigidbody !== null && rigidbody !== undefined;
    });
    
    // Update physics objects
    for (const entity of physicsEntities) {
      this.updatePhysicsObject(entity);
    }
    
    // Sync transforms back to entities
    this.syncTransforms();
  }
  
  private updatePhysicsObject(entity: any): void {
    const rigidbodyData = this.getComponent(entity, Components.RIGIDBODY); // Rigidbody
    const colliderData = this.getComponent(entity, Components.COLLIDER); // Collider
    
    if (!rigidbodyData) return;
    
    const uuid = entity.uuid;
    
    // Create or update physics object
    if (!this.physicsObjects.has(uuid)) {
      this.createPhysicsObject(entity, rigidbodyData, colliderData);
    } else {
      this.updatePhysicsProperties(entity, rigidbodyData, colliderData);
    }
  }
  
  private createPhysicsObject(entity: any, rigidbodyData: any, colliderData: any): void {
    const uuid = entity.uuid;
    
    // Get entity transform (assuming it has position, rotation, scale)
    //const transform = this.getComponent(entity, 0); // Assuming transform is nameCode 0
    const position = entity?.position || { x: 0, y: 0, z: 0 };
    const rotation = entity?.quaternion || { x: 0, y: 0, z: 0, w: 1 };
    
    // Create rigid body description
    let rigidBodyDesc;
    if (rigidbodyData.isStatic) {
      rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    } else if (rigidbodyData.isKinematic) {
      rigidBodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased();
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
    
    // Create rigid body
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);
    
    // Set mass and other properties
    if (!rigidbodyData.isStatic && !rigidbodyData.isKinematic) {
      rigidBody.setAdditionalMass(rigidbodyData.mass || 1);
      rigidBody.setLinearDamping(rigidbodyData.drag || 0);
      rigidBody.setAngularDamping(rigidbodyData.angularDrag || 0.05);
      rigidBody.setGravityScale(rigidbodyData.useGravity ? 1.0 : 0.0);
    }
    
    // Create collider if collider data exists
    let collider = null;
    if (colliderData) {
      collider = this.createCollider(rigidBody, colliderData, entity);
    }
    
    // Store physics data
    this.physicsObjects.set(uuid, {
      rigidBody,
      collider,
      entity
    });
  }
  
  private createCollider(rigidBody: any, colliderData: any, entity: any): any {
    let colliderDesc;
    
    switch (colliderData.shape) {
      case 'box':
        const size = colliderData.size || { x: 1, y: 1, z: 1 };
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
          size.x / 2,
          size.y / 2,
          size.z / 2
        );
        break;
        
      case 'sphere':
        const radius = colliderData.radius || 0.5;
        colliderDesc = this.RAPIER.ColliderDesc.ball(radius);
        break;
        
      case 'capsule':
        const height = colliderData.height || 2;
        const capRadius = colliderData.radius || 0.5;
        colliderDesc = this.RAPIER.ColliderDesc.capsule(
          (height - capRadius * 2) / 2,
          capRadius
        );
        break;
        
      case 'cylinder':
        const cylHeight = colliderData.height || 2;
        const cylRadius = colliderData.radius || 0.5;
        colliderDesc = this.RAPIER.ColliderDesc.cylinder(
          cylHeight / 2,
          cylRadius
        );
        break;
      case 'mesh':
        const object3d = entity;
        
        if (object3d && object3d.isMesh) {
          // Auto-detect shape from Three.js geometry
          const geometry = object3d.geometry;
          
          if (geometry.type === 'BoxGeometry') {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const width = box.max.x - box.min.x;
            const height = box.max.y - box.min.y;
            const depth = box.max.z - box.min.z;
            colliderDesc = this.RAPIER.ColliderDesc.cuboid(
              width / 2,
              height / 2,
              depth / 2
            );
          } else if (geometry.type === 'SphereGeometry') {
            geometry.computeBoundingSphere();
            const radius = geometry.boundingSphere.radius;
            colliderDesc = this.RAPIER.ColliderDesc.ball(radius);
          } else if (geometry.type === 'CylinderGeometry') {
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const height = box.max.y - box.min.y;
            const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
            colliderDesc = this.RAPIER.ColliderDesc.cylinder(
              height / 2,
              radius
            );
          } else {
            // For complex meshes, use convex hull or trimesh
            const vertices = geometry.attributes.position.array;
            const indices = geometry.index ? geometry.index.array : null;
            
            if (indices) {
              // Use trimesh for complex geometry
              colliderDesc = this.RAPIER.ColliderDesc.trimesh(
                vertices,
                indices
              );
            } else {
              // Fallback to bounding box
              geometry.computeBoundingBox();
              const box = geometry.boundingBox;
              const width = box.max.x - box.min.x;
              const height = box.max.y - box.min.y;
              const depth = box.max.z - box.min.z;
              colliderDesc = this.RAPIER.ColliderDesc.cuboid(
                width / 2,
                height / 2,
                depth / 2
              );
            }
          }
        } else {
          // No mesh found, use default box
          colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        }
        break;
        
      default:
        // Default to box
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }
    
    // Set trigger mode
    if (colliderData.isTrigger) {
      colliderDesc.setSensor(true);
    }
    
    return this.world.createCollider(colliderDesc, rigidBody);
  }
  
  private updatePhysicsProperties(entity: any, rigidbodyData: any, colliderData: any): void {
    const uuid = entity.uuid;
    const physicsData = this.physicsObjects.get(uuid);
    
    if (!physicsData) return;
    
    const { rigidBody } = physicsData;
    
    // Update rigid body properties (only for dynamic bodies)
    if (!rigidbodyData.isStatic && !rigidbodyData.isKinematic) {
      rigidBody.setAdditionalMass(rigidbodyData.mass || 1);
      rigidBody.setLinearDamping(rigidbodyData.drag || 0);
      rigidBody.setAngularDamping(rigidbodyData.angularDrag || 0.05);
      rigidBody.setGravityScale(rigidbodyData.useGravity ? 1.0 : 0.0);
    }
    
    
    // Handle body type changes
    const currentType = rigidBody.bodyType();
    
    if (rigidbodyData.isStatic && currentType !== this.RAPIER.RigidBodyType.Fixed) {
      rigidBody.setBodyType(this.RAPIER.RigidBodyType.Fixed);
    } else if (rigidbodyData.isKinematic && currentType !== this.RAPIER.RigidBodyType.KinematicPositionBased) {
      rigidBody.setBodyType(this.RAPIER.RigidBodyType.KinematicPositionBased);
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
          rigidBody.setTranslation({
            x: object3d.position.x,
            y: object3d.position.y,
            z: object3d.position.z
          }, true);
          rigidBody.setRotation({
            x: object3d.quaternion.x,
            y: object3d.quaternion.y,
            z: object3d.quaternion.z,
            w: object3d.quaternion.w
          }, true);
        }
        continue;
      }
      
      // Skip other kinematic bodies
      if (rigidbodyData?.isKinematic) continue;
      
      // Get position and rotation from physics
      const translation = rigidBody.translation();
      const rotation = rigidBody.rotation();
      
      // Get current scale from entity
    //   const transform = this.getComponent(entity, 0);
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
  
  // Public methods for external control
  
  public applyForce(entityUuid: string, force: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    
    const { rigidBody } = physicsData;
    rigidBody.addForce({ x: force.x, y: force.y, z: force.z }, true);
  }
  
  public applyImpulse(entityUuid: string, impulse: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    
    const { rigidBody } = physicsData;
    rigidBody.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
  }
  
  public setVelocity(entityUuid: string, velocity: { x: number; y: number; z: number }): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    
    const { rigidBody } = physicsData;
    rigidBody.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }
  
  public getVelocity(entityUuid: string): { x: number; y: number; z: number } | null {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return null;
    
    const { rigidBody } = physicsData;
    const vel = rigidBody.linvel();
    return { x: vel.x, y: vel.y, z: vel.z };
  }
  
  public setKinematicPosition(
    entityUuid: string, 
    position: { x: number; y: number; z: number }
  ): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    
    const { rigidBody } = physicsData;
    rigidBody.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
  }
  
  public removePhysicsObject(entityUuid: string): void {
    const physicsData = this.physicsObjects.get(entityUuid);
    if (!physicsData) return;
    
    const { rigidBody, collider } = physicsData;
    
    if (collider) {
      this.world.removeCollider(collider, false);
    }
    if (rigidBody) {
      this.world.removeRigidBody(rigidBody);
    }
    
    this.physicsObjects.delete(entityUuid);
  }
  
  onDestroy(): void {
    // Clean up all physics objects
    for (const uuid of this.physicsObjects.keys()) {
      this.removePhysicsObject(uuid);
    }
    this.physicsObjects.clear();
    console.log('PhysicsSystem destroyed');
  }
}