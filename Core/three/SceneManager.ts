import { THREE } from '@/Core/lib/THREE';
import fs from '@/Core/lib/fs';
import { type ThreeRegistry } from '@/Core/three/ThreeRegistry';
import { ThreeHelpers } from '@/Core/three/Helper';
import {DEFINITION} from '@/Core/DEFINITION';

/**
 * SceneManager handles:
 *
 * - Active scene switching
 * - Scene serialization
 * - Scene streaming (sub-scenes)
 * - File IO
 * - Runtime registry syncing
 * - GPU resource cleanup
 *
 * Similar to:
 * Unity SceneManager / Unreal Level Streaming
 */
export class SceneManager {

  /** Currently active scene */
  public activeScene: THREE.Scene


  /** Global runtime registry */
  public registry: ThreeRegistry

  /** Path of currently active scene */
  public activeUrl?: string

  /**
   * Loaded sub-scenes (streamed scenes)
   * Key = file path
   */
  public subScenes = new Map<string, THREE.Scene>()

  /**
   * Create SceneManager
   *
   * @param registry Shared ThreeRegistry instance
   *
   * @example
   * const registry = new ThreeRegistry()
   * const sceneManager = new SceneManager(registry)
   */
   
  // pipe -> scene Manager -> engine
  constructor(registry: ThreeRegistry, private onSceneLoad:(e:THREE.Scene)=>void) {

    this.activeScene = new THREE.Scene()
    this.registry = registry
  }

  // =====================================================
  // SERIALIZATION
  // =====================================================

  /**
   * Convert active scene to Three.js JSON format.
   *
   * @returns Serialized scene object
   *
   * @example
   * const json = sceneManager.toJson()
   */
  public toJson(): any {
    return this.activeScene.toJSON()
  }

  /**
   * Create scene from JSON data.
   *
   * Optionally sets as active scene.
   *
   * @param json Scene JSON
   * @param setActive Set as active scene
   *
   * @example
   * const scene = sceneManager.fromJson(json, true)
   */
  public fromJson(json: any, setActive = true): THREE.Scene {

    const loader = new THREE.ObjectLoader()
    const scene = loader.parse(json) as THREE.Scene

    if (setActive) {
      this.setScene(scene)
    }

    return scene
  }

  // =====================================================
  // ACTIVE SCENE CONTROL
  // =====================================================

  /**
   * Replace active scene safely.
   *
   * Automatically:
   * - Clears previous registry references
   * - Registers new scene tree
   *
   * @param scene New scene
   *
   * @example
   * sceneManager.setScene(new THREE.Scene())
   */
  public setScene(scene: THREE.Scene) {

    // Remove previous scene objects from registry
    if (this.activeScene) {
      this.registry.unregisterTree(this.activeScene)
    }

    this.activeScene = scene

    // Register new scene tree
    this.registry.register(scene, true)
  }

  // =====================================================
  // FILE SAVE
  // =====================================================

  /**
   * Save scene to disk.
   *
   * @param filePath Destination path
   * @param scene Scene to save (default: activeScene)
   *
   * @example
   * await sceneManager.saveScene('/Scenes/Main.json')
   */
  public async saveScene(filePath: string, scene?: THREE.Scene): Promise<void> {

    const target = scene || this.activeScene

    const json = JSON.stringify(
      target.toJSON(),
      null,
      2
    )

    await fs.writeFile(filePath, json)

    this.activeUrl = filePath
  }

  /**
   * Save primary scene shortcut.
   *
   * @example
   * await sceneManager.savePrimary()
   */
  public async savePrimary() {
    await this.saveScene(DEFINITION.primaryScene)
  }

  /**
   * Save currently active scene to last loaded path.
   *
   * @example
   * await sceneManager.saveActive()
   */
  public async saveActive() {

    if (!this.activeUrl) return

    await this.saveScene(this.activeUrl)
  }

  // =====================================================
  // FILE LOAD
  // =====================================================

  /**
   * Load scene from disk.
   *
   * @param filePath Scene JSON file
   * @param setActive Set loaded scene as active
   *
   * @example
   * await sceneManager.loadScene('/Scenes/Level1.json')
   */
  public async loadScene(filePath: string, setActive = true): Promise<THREE.Scene> {

    const text = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(text)

    const scene = this.fromJson(json, setActive)

    if (setActive) {
      this.activeUrl = filePath
    }
    
    this.onSceneLoad(scene);
    
    return scene
  }

  // =====================================================
  // SUB SCENE STREAMING
  // =====================================================

  /**
   * Load a sub-scene without replacing active scene.
   *
   * Useful for:
   * - Level streaming
   * - Modular environments
   * - Additive loading
   *
   * @param filePath Scene file path
   *
   * @example
   * await sceneManager.loadSubScene('/Scenes/Town.json')
   */
  public async loadSubScene(filePath: string): Promise<THREE.Scene> {

    // Already loaded
    if (this.subScenes.has(filePath)) {
      return this.subScenes.get(filePath)!
    }

    const text = await fs.readFile(filePath, 'utf8')
    const json = JSON.parse(text)

    const loader = new THREE.ObjectLoader()
    const scene = loader.parse(json) as THREE.Scene

    // Add to active scene
    this.activeScene.add(scene)

    // Register to runtime registry
    this.registry.register(scene, true)

    this.subScenes.set(filePath, scene)

    return scene
  }

  /**
   * Unload a previously loaded sub-scene.
   *
   * Automatically:
   * - Removes from scene graph
   * - Unregisters from registry
   * - Disposes GPU memory
   *
   * @param filePath Sub-scene path
   *
   * @example
   * sceneManager.unloadSubScene('/Scenes/Town.json')
   */
  public unloadSubScene(filePath: string): boolean {

    const scene = this.subScenes.get(filePath)

    if (!scene) return false

    this.activeScene.remove(scene)

    // Remove from registry
    this.registry.unregisterTree(scene)

    // Dispose GPU resources
    this.disposeScene(scene)

    this.subScenes.delete(filePath)

    return true
  }

  // =====================================================
  // MEMORY MANAGEMENT
  // =====================================================

  /**
   * Dispose all GPU resources inside a scene.
   *
   * @param scene Scene to clean
   *
   * @example
   * sceneManager.disposeScene(scene)
   */
  public disposeScene(scene: THREE.Scene) {
    ThreeHelpers.freeGPU(scene);
  }


  /**
   * Fully reset SceneManager.
   *
   * Clears:
   * - Active scene
   * - Sub-scenes
   * - Registry references
   *
   * @example
   * sceneManager.clear()
   */
  public clear() {

    // Dispose active scene
    if (this.activeScene) {
      this.disposeScene(this.activeScene)
      this.registry.unregisterTree(this.activeScene)
    }

    // Dispose sub-scenes
    for (const [, scene] of this.subScenes) {
      this.disposeScene(scene)
      this.registry.unregisterTree(scene)
    }

    this.subScenes.clear()

    // Create new empty scene
    this.activeScene = new THREE.Scene()
    this.activeUrl = undefined
  }
}