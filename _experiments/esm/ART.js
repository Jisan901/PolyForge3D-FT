/**
 * ART.js — Abstract Rapier3D + Three.js layer
 * ============================================
 * Single unified API for physics + rendering.
 *
 * NEW IN THIS VERSION
 * ───────────────────
 *  • Force fields / attractors  — ART.createField()
 *  • Constraint helpers         — ART.makeRope(), ART.makeChain(), ART.makeRagdoll()
 *  • Debug wireframe overlay    — ART.debug.enable() / .disable() / .toggle()
 *  • Compound shapes / groups   — ART.createGroup() → ARTGroup
 *
 * Basic usage:
 *   await RAPIER.init();
 *   const world = new RAPIER.World({ x:0, y:-9.81, z:0 });
 *   ART.init(scene, world, RAPIER);
 *
 *   const box  = ART.create(ART.BOX, 1, 1, 1, { mass: 1 });
 *   const ball = ART.create(ART.SPHERE, 0.5, null, null, { mass: 1 });
 *   const joint = ART.join(ART.JOINT_SPHERICAL, box, ball, { anchor1:[0,1,0], anchor2:[0,-1,0] });
 *   joint.motor.setVelocity(2, 0.5);
 *   ART.step(deltaTime);
 */

import * as THREE from 'three';
// import RAPIER from '@dimforge/rapier3d-compat'; // peer dep

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */

// Shapes
export const BOX      = 'BOX';
export const SPHERE   = 'SPHERE';
export const CAPSULE  = 'CAPSULE';
export const CYLINDER = 'CYLINDER';
export const CONE     = 'CONE';
export const TRIMESH  = 'TRIMESH';
export const HULL     = 'HULL';
export const PLANE    = 'PLANE';

// Joints
export const JOINT_FIXED      = 'JOINT_FIXED';
export const JOINT_REVOLUTE   = 'JOINT_REVOLUTE';
export const JOINT_PRISMATIC  = 'JOINT_PRISMATIC';
export const JOINT_SPHERICAL  = 'JOINT_SPHERICAL';
export const JOINT_ROPE       = 'JOINT_ROPE';
export const JOINT_SPRING     = 'JOINT_SPRING';

// Body types
export const DYNAMIC   = 'dynamic';
export const FIXED     = 'fixed';
export const KINEMATIC = 'kinematicPositionBased';

// Force field types
export const FIELD_SPHERE = 'FIELD_SPHERE';  // attract/repel inside sphere zone
export const FIELD_BOX    = 'FIELD_BOX';     // attract/repel inside box zone
export const FIELD_WORLD  = 'FIELD_WORLD';   // constant directional (wind, etc.)
export const FIELD_POINT  = 'FIELD_POINT';   // attract/repel from point (no distance limit)
export const FIELD_VORTEX = 'FIELD_VORTEX';  // orbital swirl around an axis

/* ═══════════════════════════════════════════════════════
   INTERNAL STATE
═══════════════════════════════════════════════════════ */

let _rapier  = null;
let _world   = null;
let _scene   = null;

const _objects = new Set();  // ARTObject
const _joints  = new Set();  // ARTJoint
const _fields  = new Set();  // ARTField
const _groups  = new Set();  // ARTGroup

/* ═══════════════════════════════════════════════════════
   ARTObject
═══════════════════════════════════════════════════════ */
class ARTObject {
  constructor(mesh, body, collider, bodyType = DYNAMIC) {
    this.mesh       = mesh;
    this.body       = body;
    this.collider   = collider;
    this.userData   = {};
    this._bodyType  = bodyType;
    this._debugMesh = null;
  }

  /* ── Body type ── */

  get type()        { return this._bodyType; }
  get isDynamic()   { return this._bodyType === DYNAMIC;   }
  get isFixed()     { return this._bodyType === FIXED;     }
  get isKinematic() { return this._bodyType === KINEMATIC; }

  /**
   * Switch body type at runtime (no body recreation needed).
   * @param {string} newType  ART.DYNAMIC | ART.FIXED | ART.KINEMATIC
   * @returns {this}
   *
   * @example
   * box.to(ART.FIXED);                    // freeze in place
   * box.to(ART.DYNAMIC).applyImpulse(…);  // unfreeze + chain
   * box.freeze() / .unfreeze() / .kinematic()  // named aliases
   */
  to(newType) {
    if (newType === this._bodyType) return this;
    switch (newType) {
      case DYNAMIC:
        this.body.setBodyType(_rapier.RigidBodyType.Dynamic,                true); break;
      case FIXED:
        this.body.setBodyType(_rapier.RigidBodyType.Fixed,                  true); break;
      case KINEMATIC:
        this.body.setBodyType(_rapier.RigidBodyType.KinematicPositionBased, true); break;
      default:
        throw new Error(`[ART] Unknown body type: "${newType}"`);
    }
    this._bodyType = newType;
    return this;
  }

  freeze()    { return this.to(FIXED);     }
  unfreeze()  { return this.to(DYNAMIC);   }
  kinematic() { return this.to(KINEMATIC); }

  /* ── Transform ── */

  setPosition(x, y, z) {
    this.body.setTranslation({ x, y, z }, true);
    this.mesh.position.set(x, y, z);
    return this;
  }

  setRotation(x, y, z, w = 1) {
    this.body.setRotation({ x, y, z, w }, true);
    this.mesh.quaternion.set(x, y, z, w);
    return this;
  }

  getPosition() {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  getRotation() {
    const r = this.body.rotation();
    return new THREE.Quaternion(r.x, r.y, r.z, r.w);
  }

  /* ── Velocity / Forces ── */

  setLinearVelocity(x, y, z)  { this.body.setLinvel({ x, y, z }, true);   return this; }
  setAngularVelocity(x, y, z) { this.body.setAngvel({ x, y, z }, true);   return this; }
  applyImpulse(x, y, z)       { this.body.applyImpulse({ x, y, z }, true); return this; }
  applyTorqueImpulse(x, y, z) { this.body.applyTorqueImpulse({ x, y, z }, true); return this; }
  applyForce(x, y, z)         { this.body.addForce({ x, y, z }, true);    return this; }

  applyForceAtPoint(fx, fy, fz, px, py, pz) {
    this.body.addForceAtPoint({ x:fx, y:fy, z:fz }, { x:px, y:py, z:pz }, true);
    return this;
  }

  getLinearVelocity() {
    const v = this.body.linvel();
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  /* ── Visual ── */

  setMaterial(m)  { this.mesh.material = m; return this; }
  setColor(c)     { this.mesh.material.color.set(c); return this; }
  setVisible(v)   { this.mesh.visible = v; return this; }
  setOpacity(v)   {
    this.mesh.material.transparent = v < 1;
    this.mesh.material.opacity = v;
    return this;
  }

  /* ── Physics props ── */

  setFriction(v)       { this.collider.setFriction(v);       return this; }
  setRestitution(v)    { this.collider.setRestitution(v);     return this; }
  setGravityScale(v)   { this.body.setGravityScale(v, true); return this; }
  setLinearDamping(v)  { this.body.setLinearDamping(v);      return this; }
  setAngularDamping(v) { this.body.setAngularDamping(v);     return this; }

  setMass(v) {
    const p = _rapier.MassProperties.zero();
    p.mass = v;
    this.body.setAdditionalMassProperties(p, true);
    return this;
  }

  lockTranslations(x = true, y = true, z = true) {
    this.body.setEnabledTranslations(!x, !y, !z, true);
    return this;
  }

  lockRotations(x = true, y = true, z = true) {
    this.body.setEnabledRotations(!x, !y, !z, true);
    return this;
  }

  sleep()  { this.body.sleep();  return this; }
  wakeUp() { this.body.wakeUp(); return this; }

  /* ── Internal ── */

  _sync() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    if (this._debugMesh) {
      this._debugMesh.position.copy(this.mesh.position);
      this._debugMesh.quaternion.copy(this.mesh.quaternion);
    }
  }

  dispose() { ART.dispose(this); }
}

/* ═══════════════════════════════════════════════════════
   ARTGroup  — compound body (one rigid body, many colliders + meshes)
═══════════════════════════════════════════════════════ */
class ARTGroup {
  constructor(body, bodyType = DYNAMIC) {
    this.body      = body;
    this._bodyType = bodyType;
    this.userData  = {};
    this.parts     = [];  // { mesh, collider }
    this._pivot    = new THREE.Object3D();
    _scene.add(this._pivot);
  }

  /**
   * Add a shape to this compound body.
   * All shapes share one rigid body — automatic compound collision.
   *
   * @param {string} shape   ART.BOX | ART.SPHERE | ART.CAPSULE …
   * @param {number} a / b / c  — same semantics as ART.create()
   * @param {object} [opts]
   * @param {number[]}       [opts.offset]      local translation [x,y,z]
   * @param {number[]}       [opts.rotation]    local quaternion  [x,y,z,w]
   * @param {THREE.Material} [opts.material]
   * @param {number}         [opts.friction]
   * @param {number}         [opts.restitution]
   * @param {number}         [opts.density]
   * @param {boolean}        [opts.sensor]
   * @returns {this}  — chainable
   *
   * @example
   * const vehicle = ART.createGroup({ position:[0,2,0] })
   *   .addShape(ART.BOX,      2, 0.5, 4)
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[ 1,-0.4, 1.5] })
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[-1,-0.4, 1.5] })
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[ 1,-0.4,-1.5] })
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[-1,-0.4,-1.5] });
   */
  addShape(shape, a = 1, b = 1, c = 1, opts = {}) {
    const {
      offset        = [0, 0, 0],
      rotation      = [0, 0, 0, 1],
      material,
      friction      = 0.5,
      restitution   = 0.0,
      density       = 1.0,
      sensor        = false,
      castShadow    = true,
      receiveShadow = true,
    } = opts;

    const desc = _buildColliderDesc(shape, a, b, c, opts.geometry)
      .setTranslation(...offset)
      .setRotation({ x:rotation[0], y:rotation[1], z:rotation[2], w:rotation[3] })
      .setDensity(density)
      .setFriction(friction)
      .setRestitution(restitution)
      .setSensor(sensor);

    const collider = _world.createCollider(desc, this.body);

    const geo  = _buildThreeGeometry(shape, a, b, c);
    const mat  = material ?? new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.position.set(...offset);
    mesh.quaternion.set(...rotation);
    this._pivot.add(mesh);

    this.parts.push({ mesh, collider });
    return this;
  }

  /* ── Body type (mirrors ARTObject) ── */

  get type()        { return this._bodyType; }
  get isDynamic()   { return this._bodyType === DYNAMIC;   }
  get isFixed()     { return this._bodyType === FIXED;     }
  get isKinematic() { return this._bodyType === KINEMATIC; }

  to(newType) {
    if (newType === this._bodyType) return this;
    switch (newType) {
      case DYNAMIC:
        this.body.setBodyType(_rapier.RigidBodyType.Dynamic,                true); break;
      case FIXED:
        this.body.setBodyType(_rapier.RigidBodyType.Fixed,                  true); break;
      case KINEMATIC:
        this.body.setBodyType(_rapier.RigidBodyType.KinematicPositionBased, true); break;
      default:
        throw new Error(`[ART] Unknown body type: "${newType}"`);
    }
    this._bodyType = newType;
    return this;
  }

  freeze()    { return this.to(FIXED);     }
  unfreeze()  { return this.to(DYNAMIC);   }
  kinematic() { return this.to(KINEMATIC); }

  /* ── Transform ── */

  setPosition(x, y, z) {
    this.body.setTranslation({ x, y, z }, true);
    this._pivot.position.set(x, y, z);
    return this;
  }

  setRotation(x, y, z, w = 1) {
    this.body.setRotation({ x, y, z, w }, true);
    this._pivot.quaternion.set(x, y, z, w);
    return this;
  }

  getPosition() {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  applyImpulse(x, y, z)       { this.body.applyImpulse({ x, y, z }, true);  return this; }
  applyForce(x, y, z)         { this.body.addForce({ x, y, z }, true);       return this; }
  setLinearVelocity(x, y, z)  { this.body.setLinvel({ x, y, z }, true);      return this; }
  setGravityScale(v)           { this.body.setGravityScale(v, true);          return this; }
  setLinearDamping(v)          { this.body.setLinearDamping(v);               return this; }
  setAngularDamping(v)         { this.body.setAngularDamping(v);              return this; }

  lockTranslations(x=true,y=true,z=true) { this.body.setEnabledTranslations(!x,!y,!z,true); return this; }
  lockRotations(x=true,y=true,z=true)    { this.body.setEnabledRotations(!x,!y,!z,true);    return this; }
  sleep()  { this.body.sleep();  return this; }
  wakeUp() { this.body.wakeUp(); return this; }

  _sync() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this._pivot.position.set(t.x, t.y, t.z);
    this._pivot.quaternion.set(r.x, r.y, r.z, r.w);
  }

  dispose() { ART.disposeGroup(this); }
}

/* ═══════════════════════════════════════════════════════
   Motor
═══════════════════════════════════════════════════════ */
class Motor {
  constructor(joint, jointType) {
    this._joint     = joint;
    this._jointType = jointType;
  }

  setVelocity(velocity, factor = 1.0, axis = 'x') {
    const j = this._joint;
    
    console.log(j)
    
    if (this._jointType === JOINT_REVOLUTE || this._jointType === JOINT_PRISMATIC) {
      j.configureMotorVelocity(velocity, factor);
    } else if (this._jointType === JOINT_SPHERICAL) {
      const m = { x:_rapier.JointAxesMask.AngX, y:_rapier.JointAxesMask.AngY, z:_rapier.JointAxesMask.AngZ };
      j.configureMotorVelocity(m[axis] ?? m.x, velocity, factor);
    }
    return this;
  }

  setPosition(target, stiffness = 100, damping = 10, axis = 'x') {
    const j = this._joint;
    if (this._jointType === JOINT_REVOLUTE || this._jointType === JOINT_PRISMATIC) {
      j.configureMotorPosition(target, stiffness, damping);
    } else if (this._jointType === JOINT_SPHERICAL) {
      const m = { x:_rapier.JointAxesMask.AngX, y:_rapier.JointAxesMask.AngY, z:_rapier.JointAxesMask.AngZ };
      j.configureMotorPosition(m[axis] ?? m.x, target, stiffness, damping);
    }
    return this;
  }

  setSpring(stiffness, damping) {
    if (this._jointType === JOINT_REVOLUTE || this._jointType === JOINT_PRISMATIC) {
      this._joint.configureMotor(0, 0, stiffness, damping);
    }
    return this;
  }

  disable() { return this.setVelocity(0, 0); }
}

/* ═══════════════════════════════════════════════════════
   ARTJoint
═══════════════════════════════════════════════════════ */
class ARTJoint {
  constructor(rawJoint, jointType, objA, objB) {
    this._joint   = rawJoint;
    this._type    = jointType;
    this.objA     = objA;
    this.objB     = objB;
    this.motor    = new Motor(rawJoint, jointType);
    this.userData = {};
  }

  setLimits(min, max) {
    if (this._type === JOINT_REVOLUTE || this._type === JOINT_PRISMATIC) {
      this._joint.setLimits(min, max);
    }
    return this;
  }

  setContactsEnabled(v) { this._joint.setContactsEnabled(v); return this; }

  dispose() { ART.disposeJoint(this); }
}

/* ═══════════════════════════════════════════════════════
   ARTField  — force field / attractor
═══════════════════════════════════════════════════════ */
class ARTField {
  constructor(type, opts = {}) {
    this.type     = type;
    this.enabled  = true;
    this.userData = {};

    this.strength           = opts.strength         ?? 10;
    this.falloff            = opts.falloff           ?? 'linear'; // 'none'|'linear'|'quadratic'
    this.maxForce           = opts.maxForce          ?? Infinity;
    this.affectStatic       = opts.affectStatic      ?? false;
    this.affectSleeping     = opts.affectSleeping    ?? false;

    this.position = new THREE.Vector3(...(opts.position ?? [0,0,0]));
    this.axis     = new THREE.Vector3(...(opts.axis     ?? [0,1,0])).normalize();
    this.radius   = opts.radius ?? 5;
    this.size     = new THREE.Vector3(...(opts.size     ?? [5,5,5]));

    // Restrict to a specific Set of ARTObjects/ARTGroups (null = all dynamic bodies)
    this.filter   = opts.filter ?? null;

    this._helperMesh = null;
    if (opts.showHelper) this._buildHelper();
  }

  /* ── Controls ── */

  enable()  { this.enabled = true;  return this; }
  disable() { this.enabled = false; return this; }
  toggle()  { this.enabled = !this.enabled; return this; }

  setStrength(v)       { this.strength = v; return this; }
  setFalloff(v)        { this.falloff  = v; return this; }
  setRadius(v)         {
    this.radius = v;
    if (this._helperMesh) this._helperMesh.scale.setScalar(v / 5);
    return this;
  }
  setPosition(x, y, z) {
    this.position.set(x, y, z);
    if (this._helperMesh) this._helperMesh.position.set(x, y, z);
    return this;
  }

  /* ── Per-step force application (called by ART.step) ── */

  _tick(allBodies) {
    if (!this.enabled) return;

    for (const obj of allBodies) {
      if (this.filter && !this.filter.has(obj)) continue;
      const body = obj.body;
      if (!body)                                              continue;
      if (!this.affectStatic   && obj._bodyType === FIXED)   continue;
      if (!this.affectSleeping && body.isSleeping())         continue;

      const t   = body.translation();
      const pos = new THREE.Vector3(t.x, t.y, t.z);

      switch (this.type) {

        case FIELD_WORLD: {
          // Constant directional (wind, antigravity zone, etc.)
          const f = this.axis.clone().multiplyScalar(this.strength);
          body.addForce({ x:f.x, y:f.y, z:f.z }, true);
          break;
        }

        case FIELD_POINT:
        case FIELD_SPHERE: {
          const delta = this.position.clone().sub(pos);
          const dist  = delta.length();
          if (this.type === FIELD_SPHERE && dist > this.radius) break;
          if (dist < 0.01) break;
          const mag   = _falloffScale(this.falloff, dist, this.radius, this.strength);
          const force = delta.normalize().multiplyScalar(Math.min(mag, this.maxForce));
          body.addForce({ x:force.x, y:force.y, z:force.z }, true);
          break;
        }

        case FIELD_BOX: {
          const local = pos.clone().sub(this.position);
          if (Math.abs(local.x) > this.size.x/2 ||
              Math.abs(local.y) > this.size.y/2 ||
              Math.abs(local.z) > this.size.z/2) break;
          const delta = this.position.clone().sub(pos);
          const dist  = delta.length();
          if (dist < 0.01) break;
          const mag   = _falloffScale(this.falloff, dist, this.size.length()/2, this.strength);
          const force = delta.normalize().multiplyScalar(Math.min(mag, this.maxForce));
          body.addForce({ x:force.x, y:force.y, z:force.z }, true);
          break;
        }

        case FIELD_VORTEX: {
          const delta = pos.clone().sub(this.position);
          const dist  = delta.length();
          if (dist > this.radius || dist < 0.01) break;
          // Tangential force (perpendicular to axis × radial direction)
          const radial     = delta.clone().projectOnPlane(this.axis).normalize();
          const tangential = new THREE.Vector3().crossVectors(this.axis, radial);
          const mag        = _falloffScale(this.falloff, dist, this.radius, this.strength);
          const spin       = tangential.multiplyScalar(Math.min(mag, this.maxForce));
          // Slight inward pull to keep objects in the vortex
          const pull       = radial.clone().negate().multiplyScalar(mag * 0.3);
          body.addForce({ x:spin.x+pull.x, y:spin.y+pull.y, z:spin.z+pull.z }, true);
          break;
        }
      }
    }
  }

  _buildHelper() {
    const mat = new THREE.MeshBasicMaterial({ color:0x00ffcc, wireframe:true, transparent:true, opacity:0.2 });
    let geo;
    switch (this.type) {
      case FIELD_BOX:    geo = new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z); break;
      default:           geo = new THREE.SphereGeometry(this.radius, 16, 8);
    }
    this._helperMesh = new THREE.Mesh(geo, mat);
    this._helperMesh.position.copy(this.position);
    _scene.add(this._helperMesh);
  }

  dispose() { ART.disposeField(this); }
}

function _falloffScale(mode, dist, maxDist, strength) {
  switch (mode) {
    case 'none':      return strength;
    case 'quadratic': return strength / Math.max(dist * dist, 0.0001);
    default:          return strength * Math.max(0, 1 - dist / Math.max(maxDist, 0.001));
  }
}

/* ═══════════════════════════════════════════════════════
   DEBUG OVERLAY
═══════════════════════════════════════════════════════ */
const _debug = {
  _enabled : false,
  _meshes  : new Map(),  // ARTObject → THREE.Mesh (wireframe)
  _mat     : null,

  _getMat() {
    if (!this._mat) this._mat = new THREE.MeshBasicMaterial({
      color:0x00ff88, wireframe:true, transparent:true, opacity:0.45, depthTest:false,
    });
    return this._mat;
  },

  /**
   * Show wireframe debug overlay over all existing + future objects.
   * @returns {this}
   */
  enable() {
    if (this._enabled) return this;
    this._enabled = true;
    for (const obj of _objects) this._attach(obj);
    for (const grp of _groups)  this._attachGroup(grp);
    return this;
  },

  /**
   * Hide and remove all debug wireframes.
   * @returns {this}
   */
  disable() {
    if (!this._enabled) return this;
    this._enabled = false;
    for (const [, wf] of this._meshes) {
      if (wf.parent) wf.parent.remove(wf);
      wf.geometry.dispose();
    }
    this._meshes.clear();
    for (const obj of _objects) obj._debugMesh = null;
    return this;
  },

  /** @returns {this} */
  toggle() { return this._enabled ? this.disable() : this.enable(); },

  /** @type {boolean} */
  get isEnabled() { return this._enabled; },

  _attach(obj) {
    if (this._meshes.has(obj)) return;
    const wf = new THREE.Mesh(obj.mesh.geometry, this._getMat());
    wf.position.copy(obj.mesh.position);
    wf.quaternion.copy(obj.mesh.quaternion);
    _scene.add(wf);
    this._meshes.set(obj, wf);
    obj._debugMesh = wf;
  },

  _attachGroup(grp) {
    for (const part of grp.parts) {
      if (this._meshes.has(part)) continue;
      const wf = new THREE.Mesh(part.mesh.geometry, this._getMat());
      wf.position.copy(part.mesh.position);
      wf.quaternion.copy(part.mesh.quaternion);
      grp._pivot.add(wf);
      this._meshes.set(part, wf);
    }
  },

  _detach(obj) {
    const wf = this._meshes.get(obj);
    if (!wf) return;
    if (wf.parent) wf.parent.remove(wf);
    wf.geometry.dispose();
    this._meshes.delete(obj);
    obj._debugMesh = null;
  },
};

/* ═══════════════════════════════════════════════════════
   ART — main namespace
═══════════════════════════════════════════════════════ */
export const ART = {

  /* Constants on namespace */
  BOX, SPHERE, CAPSULE, CYLINDER, CONE, TRIMESH, HULL, PLANE,
  JOINT_FIXED, JOINT_REVOLUTE, JOINT_PRISMATIC,
  JOINT_SPHERICAL, JOINT_ROPE, JOINT_SPRING,
  DYNAMIC, FIXED, KINEMATIC,
  FIELD_SPHERE, FIELD_BOX, FIELD_WORLD, FIELD_POINT, FIELD_VORTEX,

  /* ── init ─────────────────────────────────────── */

  init(scene, world, rapierInstance) {
    _scene  = scene;
    _world  = world;
    _rapier = rapierInstance;
  },

  /* ── create ───────────────────────────────────── */

  /**
   * @param {string} shape
   * @param {number} a / b / c
   * @param {object} [opts]
   * @param {string}         [opts.bodyType]
   * @param {number[]}       [opts.position]
   * @param {number[]}       [opts.rotation]     quaternion [x,y,z,w]
   * @param {number}         [opts.mass]
   * @param {number}         [opts.friction]
   * @param {number}         [opts.restitution]
   * @param {number}         [opts.density]
   * @param {number}         [opts.linearDamping]
   * @param {number}         [opts.angularDamping]
   * @param {number}         [opts.gravityScale]
   * @param {boolean}        [opts.sensor]
   * @param {THREE.Material} [opts.material]
   * @param {boolean}        [opts.castShadow]
   * @param {boolean}        [opts.receiveShadow]
   * @returns {ARTObject}
   */
  create(shape, a = 1, b = 1, c = 1, opts = {}) {
    const {
      bodyType       = DYNAMIC,
      position       = [0, 0, 0],
      rotation       = [0, 0, 0, 1],
      mass,
      friction       = 0.5,
      restitution    = 0.0,
      density        = 1.0,
      linearDamping  = 0,
      angularDamping = 0,
      gravityScale   = 1,
      sensor         = false,
      material,
      castShadow     = true,
      receiveShadow  = true,
      geometry: customGeo,
      visualGeometry,
    } = opts;

    let bodyDesc;
    switch (bodyType) {
      case FIXED:     bodyDesc = _rapier.RigidBodyDesc.fixed();                  break;
      case KINEMATIC: bodyDesc = _rapier.RigidBodyDesc.kinematicPositionBased(); break;
      default:        bodyDesc = _rapier.RigidBodyDesc.dynamic();
    }

    bodyDesc
      .setTranslation(...position)
      .setRotation({ x:rotation[0], y:rotation[1], z:rotation[2], w:rotation[3] })
      .setLinearDamping(linearDamping)
      .setAngularDamping(angularDamping)
      .setGravityScale(gravityScale);

    const body = _world.createRigidBody(bodyDesc);

    const cdesc = _buildColliderDesc(shape, a, b, c, customGeo)
      .setDensity(density).setFriction(friction).setRestitution(restitution).setSensor(sensor);
    if (mass !== undefined) cdesc.setMass(mass);
    const collider = _world.createCollider(cdesc, body);

    const geo  = visualGeometry ?? _buildThreeGeometry(shape, a, b, c);
    const mat  = material ?? new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = castShadow;
    mesh.receiveShadow = receiveShadow;
    mesh.position.set(...position);
    mesh.quaternion.set(...rotation);
    _scene.add(mesh);

    const obj = new ARTObject(mesh, body, collider, bodyType);
    _objects.add(obj);
    if (_debug._enabled) _debug._attach(obj);
    return obj;
  },

  /* ── createGroup ──────────────────────────────── */

  /**
   * Create a compound body — one rigid body, multiple shapes.
   * Chain .addShape() calls to build the object up.
   *
   * @param {object} [opts]
   * @param {string}   [opts.bodyType]
   * @param {number[]} [opts.position]
   * @param {number[]} [opts.rotation]
   * @param {number}   [opts.linearDamping]
   * @param {number}   [opts.angularDamping]
   * @param {number}   [opts.gravityScale]
   * @returns {ARTGroup}
   *
   * @example
   * // T-shaped compound collider
   * const tShape = ART.createGroup({ position:[0,3,0] })
   *   .addShape(ART.BOX, 2, 0.4, 0.4)                         // horizontal bar
   *   .addShape(ART.BOX, 0.4, 1.2, 0.4, { offset:[0,-0.8,0] }); // vertical bar
   *
   * // Vehicle with wheels
   * const car = ART.createGroup({ position:[0,1,0] })
   *   .addShape(ART.BOX,      2, 0.5, 4)
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[ 1.1,-0.3, 1.5], rotation:[0,0,1,1] })
   *   .addShape(ART.CYLINDER, 0.4, 0.3, null, { offset:[-1.1,-0.3, 1.5], rotation:[0,0,1,1] });
   */
  createGroup(opts = {}) {
    const {
      bodyType       = DYNAMIC,
      position       = [0, 0, 0],
      rotation       = [0, 0, 0, 1],
      linearDamping  = 0,
      angularDamping = 0,
      gravityScale   = 1,
    } = opts;

    let bodyDesc;
    switch (bodyType) {
      case FIXED:     bodyDesc = _rapier.RigidBodyDesc.fixed();                  break;
      case KINEMATIC: bodyDesc = _rapier.RigidBodyDesc.kinematicPositionBased(); break;
      default:        bodyDesc = _rapier.RigidBodyDesc.dynamic();
    }

    bodyDesc
      .setTranslation(...position)
      .setRotation({ x:rotation[0], y:rotation[1], z:rotation[2], w:rotation[3] })
      .setLinearDamping(linearDamping)
      .setAngularDamping(angularDamping)
      .setGravityScale(gravityScale);

    const body  = _world.createRigidBody(bodyDesc);
    const group = new ARTGroup(body, bodyType);
    group._pivot.position.set(...position);
    group._pivot.quaternion.set(...rotation);
    _groups.add(group);
    if (_debug._enabled) _debug._attachGroup(group);
    return group;
  },

  /* ── join ─────────────────────────────────────── */

  /**
   * @param {string}               type
   * @param {ARTObject|ARTGroup}   objA
   * @param {ARTObject|ARTGroup}   objB
   * @param {object}               [params]
   * @returns {ARTJoint}
   */
  join(type, objA, objB, params = {}) {
    const {
      anchor1   = [0,0,0], anchor2 = [0,0,0],
      axis      = [0,1,0],
      minLimit, maxLimit,
      distance  = 1, stiffness = 100, damping = 10,
      contacts  = false,
    } = params;

    const a1 = { x:anchor1[0], y:anchor1[1], z:anchor1[2] };
    const a2 = { x:anchor2[0], y:anchor2[1], z:anchor2[2] };
    const ax = { x:axis[0],    y:axis[1],    z:axis[2]    };

    let jointData;
    switch (type) {
      case JOINT_FIXED:
        jointData = _rapier.JointData.fixed(a1, {x:0,y:0,z:0,w:1}, a2, {x:0,y:0,z:0,w:1}); break;
      case JOINT_REVOLUTE:
        jointData = _rapier.JointData.revolute(a1, a2, ax); break;
      case JOINT_PRISMATIC:
        jointData = _rapier.JointData.prismatic(a1, a2, ax); break;
      case JOINT_SPHERICAL:
        jointData = _rapier.JointData.spherical(a1, a2); break;
      case JOINT_ROPE:
        jointData = _rapier.JointData.rope(distance, a1, a2); break;
      case JOINT_SPRING:
        jointData = _rapier.JointData.spring(distance, stiffness, damping, a1, a2); break;
      default:
        throw new Error(`[ART] Unknown joint type: "${type}"`);
    }

    const raw = _world.createImpulseJoint(jointData, objA.body, objB.body, contacts);

    if (minLimit !== undefined && maxLimit !== undefined) {
      if (type === JOINT_REVOLUTE || type === JOINT_PRISMATIC) raw.setLimits(minLimit, maxLimit);
    }

    const joint = new ARTJoint(raw, type, objA, objB);
    _joints.add(joint);
    return joint;
  },

  /* ══════════════════════════════════════════════
     ★  FORCE FIELDS
  ══════════════════════════════════════════════ */

  /**
   * Create a force field that automatically applies forces each step.
   *
   * @param {string} type  ART.FIELD_SPHERE | FIELD_BOX | FIELD_POINT | FIELD_VORTEX | FIELD_WORLD
   * @param {object} [opts]
   * @param {number}    [opts.strength=10]
   * @param {string}    [opts.falloff='linear']  'none' | 'linear' | 'quadratic'
   * @param {number}    [opts.maxForce=Infinity]
   * @param {number[]}  [opts.position=[0,0,0]]
   * @param {number[]}  [opts.axis=[0,1,0]]      direction axis (FIELD_WORLD / FIELD_VORTEX)
   * @param {number}    [opts.radius=5]          sphere / vortex influence radius
   * @param {number[]}  [opts.size=[5,5,5]]      box zone dimensions
   * @param {boolean}   [opts.showHelper=false]  render semi-transparent zone mesh
   * @param {Set}       [opts.filter]            restrict to specific ARTObjects
   * @returns {ARTField}
   *
   * @example
   * // Gravitational black hole
   * const hole = ART.createField(ART.FIELD_SPHERE, {
   *   position:[0,5,0], radius:8, strength:40, falloff:'quadratic', showHelper:true,
   * });
   *
   * // Constant wind from the left
   * const wind = ART.createField(ART.FIELD_WORLD, { axis:[1,0,0], strength:6 });
   *
   * // Tornado / vortex
   * const tornado = ART.createField(ART.FIELD_VORTEX, {
   *   position:[0,0,0], radius:5, strength:20, axis:[0,1,0], showHelper:true,
   * });
   *
   * // Repel / explosion zone (negative strength = repel)
   * const repel = ART.createField(ART.FIELD_POINT, {
   *   position:[0,2,0], strength:-25, falloff:'quadratic',
   * });
   *
   * // Change at runtime
   * hole.setStrength(80).setPosition(3, 5, 0);
   * wind.disable();
   * tornado.toggle();
   */
  createField(type, opts = {}) {
    const f = new ARTField(type, opts);
    _fields.add(f);
    return f;
  },

  /* ══════════════════════════════════════════════
     ★  DEBUG OVERLAY
  ══════════════════════════════════════════════ */

  /**
   * Debug wireframe overlay — draws a green wireframe over every physics object.
   * Auto-attaches to new objects as they are created.
   *
   * @example
   * ART.debug.enable();
   * ART.debug.disable();
   * ART.debug.toggle();
   * console.log(ART.debug.isEnabled);  // → boolean
   */
  debug: _debug,

  /* ══════════════════════════════════════════════
     ★  CONSTRAINT HELPERS
  ══════════════════════════════════════════════ */

  /**
   * Build a physics rope between two points.
   * Creates N capsule links chained with spherical joints.
   *
   * @param {object} opts
   * @param {number[]} opts.from            world-space start  [x,y,z]
   * @param {number[]} opts.to              world-space end    [x,y,z]
   * @param {number}   [opts.segments=8]
   * @param {number}   [opts.radius=0.05]   link capsule radius
   * @param {number}   [opts.mass=0.2]      per-link mass
   * @param {number}   [opts.angularDamping=0.8]
   * @param {number}   [opts.linearDamping=0.2]
   * @param {ARTObject|ARTGroup|null} [opts.attachA]  pin start to this body
   * @param {ARTObject|ARTGroup|null} [opts.attachB]  pin end   to this body
   * @param {THREE.Material} [opts.material]
   * @returns {{ links: ARTObject[], joints: ARTJoint[] }}
   *
   * @example
   * const { links, joints } = ART.makeRope({
   *   from: [0,10,0], to: [3,5,0], segments:10,
   *   attachA: ceilingAnchor, attachB: heavyBall,
   * });
   */
  makeRope(opts = {}) {
    const {
      from           = [0,5,0],   to          = [0,0,0],
      segments       = 8,         radius      = 0.05,
      mass           = 0.2,       angularDamping = 0.8,
      linearDamping  = 0.2,       attachA     = null,
      attachB        = null,      material,
    } = opts;

    const start  = new THREE.Vector3(...from);
    const end    = new THREE.Vector3(...to);
    const segLen = start.distanceTo(end) / segments;
    const dir    = end.clone().sub(start).normalize();
    const q      = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    const mat    = material ?? new THREE.MeshStandardMaterial({ color:0x886644, roughness:0.9 });
    const half   = segLen * 0.5;

    const links  = [];
    const joints = [];

    for (let i = 0; i < segments; i++) {
      const t   = (i + 0.5) / segments;
      const pos = start.clone().lerp(end, t);
      const lnk = ART.create(CAPSULE, radius, segLen * 0.9, null, {
        position:[pos.x, pos.y, pos.z], mass, angularDamping, linearDamping, material:mat, castShadow:false,
      });
      lnk.setRotation(q.x, q.y, q.z, q.w);
      links.push(lnk);
    }

    for (let i = 0; i < links.length - 1; i++) {
      joints.push(ART.join(JOINT_SPHERICAL, links[i], links[i+1], {
        anchor1:[0,-half,0], anchor2:[0,half,0], contacts:false,
      }));
    }

    if (attachA) joints.push(ART.join(JOINT_SPHERICAL, attachA, links[0], {
      anchor1:[0,0,0], anchor2:[0,half,0], contacts:false,
    }));
    if (attachB) joints.push(ART.join(JOINT_SPHERICAL, links[links.length-1], attachB, {
      anchor1:[0,-half,0], anchor2:[0,0,0], contacts:false,
    }));

    return { links, joints };
  },

  /**
   * Build a rigid metal chain between two points.
   * Uses alternating revolute axes on box links for a realistic chain look.
   *
   * @param {object} opts
   * @param {number[]} opts.from
   * @param {number[]} opts.to
   * @param {number}   [opts.links=8]
   * @param {number}   [opts.linkWidth=0.12]
   * @param {number}   [opts.linkHeight=0.28]
   * @param {number}   [opts.linkDepth=0.08]
   * @param {number}   [opts.mass=0.5]          per link
   * @param {ARTObject|ARTGroup|null} [opts.attachA]
   * @param {ARTObject|ARTGroup|null} [opts.attachB]
   * @param {THREE.Material} [opts.material]
   * @returns {{ links: ARTObject[], joints: ARTJoint[] }}
   *
   * @example
   * const chain = ART.makeChain({
   *   from: wall.getPosition().toArray(),
   *   to:   ball.getPosition().toArray(),
   *   links: 6, attachA: wall, attachB: ball,
   * });
   */
  makeChain(opts = {}) {
    const {
      from        = [0,5,0],   to         = [0,0,0],
      links       = 8,         linkWidth  = 0.12,
      linkHeight  = 0.28,      linkDepth  = 0.08,
      mass        = 0.5,       attachA    = null,
      attachB     = null,      material,
    } = opts;

    const start  = new THREE.Vector3(...from);
    const end    = new THREE.Vector3(...to);
    const dir    = end.clone().sub(start).normalize();
    const q      = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
    const mat    = material ?? new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.9, roughness:0.3 });
    const half   = linkHeight * 0.5;

    const linkObjs = [];
    const joints   = [];

    for (let i = 0; i < links; i++) {
      const t   = (i + 0.5) / links;
      const pos = start.clone().lerp(end, t);
      const lnk = ART.create(BOX, linkWidth, linkHeight, linkDepth, {
        position:[pos.x, pos.y, pos.z], mass, angularDamping:0.5, linearDamping:0.1, material:mat,
      });
      lnk.setRotation(q.x, q.y, q.z, q.w);
      linkObjs.push(lnk);
    }

    // Alternate revolute axes (X then Z) to give the classic chain twist pattern
    for (let i = 0; i < linkObjs.length - 1; i++) {
      const axis = i % 2 === 0 ? [1,0,0] : [0,0,1];
      joints.push(ART.join(JOINT_REVOLUTE, linkObjs[i], linkObjs[i+1], {
        anchor1:[0,-half*0.9,0], anchor2:[0,half*0.9,0],
        axis, minLimit:-Math.PI*0.25, maxLimit:Math.PI*0.25, contacts:false,
      }));
    }

    if (attachA) joints.push(ART.join(JOINT_SPHERICAL, attachA, linkObjs[0], {
      anchor1:[0,0,0], anchor2:[0,half*0.9,0], contacts:false,
    }));
    if (attachB) joints.push(ART.join(JOINT_SPHERICAL, linkObjs[linkObjs.length-1], attachB, {
      anchor1:[0,-half*0.9,0], anchor2:[0,0,0], contacts:false,
    }));

    return { links: linkObjs, joints };
  },

  /**
   * Build a humanoid ragdoll at a world position.
   *
   * Body hierarchy:
   *   head → torso → pelvis
   *   torso → upperArm L/R → lowerArm L/R
   *   pelvis → upperLeg L/R → lowerLeg L/R
   *
   * @param {object} [opts]
   * @param {number[]} [opts.position=[0,5,0]]  root (pelvis) world position
   * @param {number}   [opts.scale=1]           uniform scale
   * @param {object}   [opts.materials]         { torso, limbs, head }
   * @returns {{
   *   parts: { head, torso, pelvis, uArmL, uArmR, lArmL, lArmR, uLegL, uLegR, lLegL, lLegR },
   *   joints: ARTJoint[],
   *   applyImpulse(x,y,z): void,
   *   freeze(): void,
   *   unfreeze(): void,
   *   dispose(): void,
   * }}
   *
   * @example
   * const ragdoll = ART.makeRagdoll({ position:[0,5,0], scale:1 });
   *
   * // Punch it
   * ragdoll.applyImpulse(20, 5, 0);
   *
   * // Freeze mid-air
   * ragdoll.freeze();
   *
   * // Blow it up with a field
   * const explosion = ART.createField(ART.FIELD_POINT, {
   *   position:[0,5,0], strength:-80, falloff:'quadratic',
   *   filter: new Set(Object.values(ragdoll.parts)),
   * });
   *
   * // Teardown
   * ragdoll.dispose();
   */
  makeRagdoll(opts = {}) {
    const { position = [0,5,0], scale = 1, materials = {} } = opts;
    const s = scale;
    const [px, py, pz] = position;

    const matBody  = materials.torso ?? new THREE.MeshStandardMaterial({ color:0xddaa88 });
    const matLimb  = materials.limbs ?? new THREE.MeshStandardMaterial({ color:0xddaa88 });
    const matHead  = materials.head  ?? new THREE.MeshStandardMaterial({ color:0xffcc99 });

    const cap = (r,h, x,y,z, m) => ART.create(CAPSULE, r*s, h*s, null, {
      position:[px+x*s, py+y*s, pz+z*s], mass:1*s, angularDamping:0.8, linearDamping:0.05, material:m,
    });
    const sph = (r,   x,y,z, m) => ART.create(SPHERE, r*s, null, null, {
      position:[px+x*s, py+y*s, pz+z*s], mass:0.8*s, angularDamping:0.9, material:m,
    });
    const box = (w,h,d, x,y,z, m) => ART.create(BOX, w*s, h*s, d*s, {
      position:[px+x*s, py+y*s, pz+z*s], mass:2*s, angularDamping:0.7, material:m,
    });

    /* Segments */
    const pelvis = box(0.28,0.20,0.16,   0,    0,    0,  matBody);
    const torso  = box(0.28,0.36,0.16,   0,    0.28, 0,  matBody);
    const head   = sph(0.13,             0,    0.72, 0,  matHead);
    const uArmL  = cap(0.06,0.28,       -0.22, 0.25, 0,  matLimb);
    const uArmR  = cap(0.06,0.28,        0.22, 0.25, 0,  matLimb);
    const lArmL  = cap(0.05,0.26,       -0.22,-0.02, 0,  matLimb);
    const lArmR  = cap(0.05,0.26,        0.22,-0.02, 0,  matLimb);
    const uLegL  = cap(0.08,0.32,       -0.10,-0.26, 0,  matLimb);
    const uLegR  = cap(0.08,0.32,        0.10,-0.26, 0,  matLimb);
    const lLegL  = cap(0.07,0.30,       -0.10,-0.62, 0,  matLimb);
    const lLegR  = cap(0.07,0.30,        0.10,-0.62, 0,  matLimb);

    /* Joints — local helper */
    const sphJ  = (a,b, a1,a2) => ART.join(JOINT_SPHERICAL, a, b, { anchor1:a1, anchor2:a2, contacts:false });
    const revJ  = (a,b, a1,a2, ax, mn, mx) => ART.join(JOINT_REVOLUTE, a, b,
      { anchor1:a1, anchor2:a2, axis:ax, minLimit:mn, maxLimit:mx, contacts:false });

    const joints = [
      // spine
      sphJ(pelvis, torso,  [0, 0.10*s,0], [0,-0.18*s,0]),
      sphJ(torso,  head,   [0, 0.18*s,0], [0,-0.14*s,0]),
      // shoulders
      sphJ(torso, uArmL,  [-0.14*s, 0.15*s,0], [0, 0.14*s,0]),
      sphJ(torso, uArmR,  [ 0.14*s, 0.15*s,0], [0, 0.14*s,0]),
      // elbows
      revJ(uArmL, lArmL,  [0,-0.14*s,0], [0, 0.13*s,0], [1,0,0], -Math.PI*0.75, 0),
      revJ(uArmR, lArmR,  [0,-0.14*s,0], [0, 0.13*s,0], [1,0,0], -Math.PI*0.75, 0),
      // hips
      sphJ(pelvis, uLegL, [-0.08*s,-0.10*s,0], [0, 0.16*s,0]),
      sphJ(pelvis, uLegR, [ 0.08*s,-0.10*s,0], [0, 0.16*s,0]),
      // knees
      revJ(uLegL, lLegL,  [0,-0.16*s,0], [0, 0.15*s,0], [1,0,0], -Math.PI*0.9, 0),
      revJ(uLegR, lLegR,  [0,-0.16*s,0], [0, 0.15*s,0], [1,0,0], -Math.PI*0.9, 0),
    ];

    const parts = { head, torso, pelvis, uArmL, uArmR, lArmL, lArmR, uLegL, uLegR, lLegL, lLegR };

    return {
      parts,
      joints,
      applyImpulse(x,y,z) {
        torso.applyImpulse(x*0.6, y*0.6, z*0.6);
        pelvis.applyImpulse(x*0.4, y*0.4, z*0.4);
      },
      freeze()   { for (const p of Object.values(parts)) p.freeze(); },
      unfreeze() { for (const p of Object.values(parts)) p.unfreeze(); },
      dispose()  {
        for (const j of joints)             ART.disposeJoint(j);
        for (const p of Object.values(parts)) ART.dispose(p);
      },
    };
  },

  /* ── step ─────────────────────────────────────── */

  /**
   * Advance simulation + sync all meshes. Call once per animation frame.
   * @param {number} [dt]  optional timestep override
   */
  step(dt) {
    if (dt !== undefined) _world.timestep = dt;

    /* Apply force fields before physics tick */
    if (_fields.size > 0) {
      const all = [..._objects, ..._groups];
      for (const f of _fields) f._tick(all);
    }

    _world.step();

    for (const obj of _objects) {
      if (obj._bodyType === DYNAMIC && !obj.body.isSleeping()) obj._sync();
    }
    for (const grp of _groups) {
      if (grp._bodyType === DYNAMIC && !grp.body.isSleeping()) grp._sync();
    }
  },

  /* ── dispose ──────────────────────────────────── */

  dispose(obj) {
    if (_debug._enabled) _debug._detach(obj);
    _scene.remove(obj.mesh);
    obj.mesh.geometry.dispose();
    if (Array.isArray(obj.mesh.material)) obj.mesh.material.forEach(m => m.dispose());
    else obj.mesh.material.dispose();
    _world.removeCollider(obj.collider, false);
    _world.removeRigidBody(obj.body);
    _objects.delete(obj);
  },

  disposeGroup(grp) {
    for (const part of grp.parts) {
      _world.removeCollider(part.collider, false);
      part.mesh.geometry.dispose();
      if (Array.isArray(part.mesh.material)) part.mesh.material.forEach(m => m.dispose());
      else part.mesh.material.dispose();
    }
    _world.removeRigidBody(grp.body);
    _scene.remove(grp._pivot);
    _groups.delete(grp);
  },

  disposeJoint(joint) {
    _world.removeImpulseJoint(joint._joint, true);
    _joints.delete(joint);
  },

  disposeField(field) {
    if (field._helperMesh) {
      _scene.remove(field._helperMesh);
      field._helperMesh.geometry.dispose();
    }
    _fields.delete(field);
  },

  disposeAll() {
    for (const j of _joints)  ART.disposeJoint(j);
    for (const o of _objects) ART.dispose(o);
    for (const g of _groups)  ART.disposeGroup(g);
    for (const f of _fields)  ART.disposeField(f);
    _debug.disable();
  },

  /* ── utilities ────────────────────────────────── */

  raycast(origin, direction, maxToi = 100) {
    const ray = new _rapier.Ray(
      { x:origin.x,    y:origin.y,    z:origin.z    },
      { x:direction.x, y:direction.y, z:direction.z }
    );
    const hit = _world.castRay(ray, maxToi, true);
    if (!hit) return null;
    for (const obj of _objects) {
      if (obj.collider === hit.collider) return { object:obj, toi:hit.toi };
    }
    return null;
  },

  createGround(y = 0, size = 100) {
    return ART.create(BOX, size, 0.1, size, {
      bodyType:FIXED, position:[0,y,0], friction:0.8,
      material:new THREE.MeshStandardMaterial({ color:0x444444 }),
      receiveShadow:true, castShadow:false,
    });
  },

  setGravity(x, y, z) { _world.gravity = { x, y, z }; },

  get world()   { return _world;   },
  get scene()   { return _scene;   },
  get objects() { return _objects; },
  get joints()  { return _joints;  },
  get fields()  { return _fields;  },
  get groups()  { return _groups;  },
};

/* ═══════════════════════════════════════════════════════
   PRIVATE HELPERS
═══════════════════════════════════════════════════════ */

function _buildColliderDesc(shape, a, b, c, customGeo) {
  switch (shape) {
    case BOX:      return _rapier.ColliderDesc.cuboid(a/2, (b??a)/2, (c??a)/2);
    case SPHERE:   return _rapier.ColliderDesc.ball(a);
    case CAPSULE:  return _rapier.ColliderDesc.capsule((b??1)/2, a);
    case CYLINDER: return _rapier.ColliderDesc.cylinder((b??1)/2, a);
    case CONE:     return _rapier.ColliderDesc.cone((b??1)/2, a);
    case PLANE:    return _rapier.ColliderDesc.cuboid(a/2, 0.01, (c??a)/2);
    case TRIMESH: {
      if (!customGeo) throw new Error('[ART] TRIMESH requires opts.geometry');
      const pos = customGeo.attributes.position.array;
      const idx = customGeo.index?.array ?? _triIdx(pos.length/3);
      return _rapier.ColliderDesc.trimesh(new Float32Array(pos), new Uint32Array(idx));
    }
    case HULL: {
      if (!customGeo) throw new Error('[ART] HULL requires opts.geometry');
      return _rapier.ColliderDesc.convexHull(new Float32Array(customGeo.attributes.position.array));
    }
    default:
      throw new Error(`[ART] Unknown shape: "${shape}"`);
  }
}

function _buildThreeGeometry(shape, a, b, c) {
  switch (shape) {
    case BOX:      return new THREE.BoxGeometry(a, b??a, c??a);
    case SPHERE:   return new THREE.SphereGeometry(a, 32, 32);
    case CAPSULE:  return new THREE.CapsuleGeometry(a, b??1, 8, 16);
    case CYLINDER: return new THREE.CylinderGeometry(a, a, b??1, 32);
    case CONE:     return new THREE.ConeGeometry(a, b??1, 32);
    case PLANE:    return new THREE.PlaneGeometry(a, c??a);
    case TRIMESH:
    case HULL:     return new THREE.BufferGeometry();
    default:       return new THREE.BoxGeometry(1,1,1);
  }
}

function _triIdx(n) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(i);
  return arr;
}

export default ART;