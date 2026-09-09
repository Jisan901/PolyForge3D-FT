import { THREE } from '@/Core/lib/THREE';
import { Instance } from "@/Core/PolyForge";
import type { BaseScript } from '@/Core/Script/ScriptExecutor';
import type { Entity } from '@/Core/ECS/Entity';
import type { RefInput, ScriptConstructor } from './types';
import { getRef } from './ref';

// ---------------------------------------------------------------------------
// Script Retrieval
// ---------------------------------------------------------------------------

/**
 * Retrieve a script attached to an entity/object matching the given constructor.
 * Automatically infers the return type as the script class instance.
 *
 * @example
 * const controller = getScript(this.playerEntity, PlayerController);
 * // controller is typed as PlayerController | undefined
 */
export function getScript<T extends BaseScript>(
  target: THREE.Object3D | Entity | RefInput,
  ctor: ScriptConstructor<T>
): T | undefined;

/**
 * Retrieve a script of the given constructor type on an optional target entity.
 *
 * @example
 * const controller = getScript(PlayerController, this.playerEntity);
 * // controller is typed as PlayerController | undefined
 */
export function getScript<T extends BaseScript>(
  ctor: ScriptConstructor<T>,
  target?: THREE.Object3D | Entity | RefInput | null
): T | undefined;

/**
 * Retrieve a script by script ID or UUID string.
 *
 * @example
 * const script = getScript<PlayerController>(uuid);
 */
export function getScript<T extends BaseScript = BaseScript>(
  id: string
): T | undefined;

/**
 * Retrieve the first script attached to an object or Entity.
 *
 * @example
 * const script = getScript(this.playerEntity);
 */
export function getScript<T extends BaseScript = BaseScript>(
  target: THREE.Object3D | Entity
): T | undefined;

export function getScript<T extends BaseScript = BaseScript>(
  arg1?: any,
  arg2?: any
): T | undefined {
  if (!arg1) return undefined;

  const executor = Instance.scriptExecutor;
  if (!executor) return undefined;

  // Case 1: getScript(ScriptCtor, target?)
  if (typeof arg1 === 'function') {
    const ctor = arg1 as ScriptConstructor<T>;
    if (arg2) {
      const obj = getRef(arg2);
      if (!obj) return undefined;
      for (const script of executor.getAllScripts()) {
        if (
          ((script as any).object === obj || (script as any).id === obj.uuid) &&
          script instanceof ctor
        ) {
          return script as T;
        }
      }
      return undefined;
    }
    return executor.getScriptByType(ctor as any) as T | undefined;
  }

  // Case 2: getScript(target, ScriptCtor)
  if (typeof arg2 === 'function') {
    const ctor = arg2 as ScriptConstructor<T>;
    const obj = getRef(arg1);
    if (obj) {
      for (const script of executor.getAllScripts()) {
        if (
          ((script as any).object === obj || (script as any).id === obj.uuid) &&
          script instanceof ctor
        ) {
          return script as T;
        }
      }
    }
    // Also check if arg1 was a script ID string directly
    if (typeof arg1 === 'string') {
      const script = executor.getScript(arg1);
      if (script instanceof ctor) {
        return script as T;
      }
    }
    return undefined;
  }

  // Case 3: getScript(idOrTarget)
  if (typeof arg1 === 'string') {
    const byId = executor.getScript<T>(arg1);
    if (byId) return byId;

    // If not found directly by ID, check if string is a UUID or name of an object
    const obj = getRef(arg1);
    if (obj) {
      for (const script of executor.getAllScripts()) {
        if ((script as any).object === obj || (script as any).id === obj.uuid) {
          return script as T;
        }
      }
    }
    return undefined;
  }

  // Case 4: getScript(object3D | Entity)
  const obj = getRef(arg1);
  if (obj) {
    for (const script of executor.getAllScripts()) {
      if ((script as any).object === obj || (script as any).id === obj.uuid) {
        return script as T;
      }
    }
  }

  return undefined;
}

/**
 * Retrieve ALL scripts attached to an entity, or all scripts of a given class type.
 *
 * @example
 * const scripts = getScripts(this.playerEntity, CustomScript); // CustomScript[]
 * const allScripts = getScripts(this.playerEntity); // BaseScript[]
 */
export function getScripts<T extends BaseScript>(
  target: THREE.Object3D | Entity | RefInput,
  ctor: ScriptConstructor<T>
): T[];
export function getScripts<T extends BaseScript>(
  ctor: ScriptConstructor<T>,
  target?: THREE.Object3D | Entity | RefInput | null
): T[];
export function getScripts<T extends BaseScript = BaseScript>(
  target?: THREE.Object3D | Entity | RefInput | null
): T[];
export function getScripts<T extends BaseScript = BaseScript>(
  arg1?: any,
  arg2?: any
): T[] {
  const executor = Instance.scriptExecutor;
  if (!executor) return [];

  // Case 1: getScripts(ScriptCtor, target?)
  if (typeof arg1 === 'function') {
    const ctor = arg1 as ScriptConstructor<T>;
    if (arg2) {
      const obj = getRef(arg2);
      if (!obj) return [];
      const results: T[] = [];
      for (const script of executor.getAllScripts()) {
        if (
          ((script as any).object === obj || (script as any).id === obj.uuid) &&
          script instanceof ctor
        ) {
          results.push(script as T);
        }
      }
      return results;
    }
    return executor.getScriptsByType(ctor as any) as T[];
  }

  // Case 2: getScripts(target, ScriptCtor)
  if (typeof arg2 === 'function') {
    const ctor = arg2 as ScriptConstructor<T>;
    const obj = getRef(arg1);
    const results: T[] = [];
    if (obj) {
      for (const script of executor.getAllScripts()) {
        if (
          ((script as any).object === obj || (script as any).id === obj.uuid) &&
          script instanceof ctor
        ) {
          results.push(script as T);
        }
      }
    }
    return results;
  }

  // Case 3: getScripts(target)
  if (arg1) {
    const obj = getRef(arg1);
    const results: T[] = [];
    if (obj) {
      for (const script of executor.getAllScripts()) {
        if ((script as any).object === obj || (script as any).id === obj.uuid) {
          results.push(script as T);
        }
      }
    }
    return results;
  }

  return executor.getAllScripts() as T[];
}
