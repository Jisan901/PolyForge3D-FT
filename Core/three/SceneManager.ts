import { THREE } from '@/Core/lib/THREE';
import fs from '@/Core/lib/fs';
import { type ThreeRegistry } from '@/Core/three/ThreeRegistry';
import { ThreeHelpers } from '@/Core/three/Helper';
import {DEFINITION} from '@/Core/DEFINITION';
import { AdvancedLoader } from "@/Core/Loaders/AdvancedLoader"
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';

/**
 * SceneManager handles:
 *
 * - Active scene switching
 * - Scene serialization

 * - File IO
 * - Runtime registry syncing
 * - GPU resource cleanup
 *
 */
export class SceneManager {

  /** Currently active scene */
  public activeScene: THREE.Scene


  /** Global runtime registry */
  public registry: ThreeRegistry

  /** Path of currently active scene */
  public activeUrl?: string


  /**
   * Create SceneManager
   *
   * @param registry Shared ThreeRegistry instance
   *
   * @example
   * const registry = new ThreeRegistry()
   * const sceneManager = new SceneManager(registry)
   */
   
   public loader: AdvancedLoader;
   public exporter = new Baxporter();
  // pipe -> scene Manager -> engine
  constructor(registry: ThreeRegistry, loader: AdvancedLoader, private onSceneLoad:(e:THREE.Scene)=>void) {
    this.loader = loader;
    this.activeScene = new THREE.Scene()
    this.registry = registry
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
    let scene = loader.parse(json) as THREE.Scene
    if (!scene.isScene){
        let temp = new THREE.Scene();
        temp.add(scene)
        scene = temp
    } 
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
      this.registry.clear()
    }

    this.activeScene = scene

    // Register new scene tree
    this.registry.register(scene, true)
    
    this.onSceneLoad(scene);
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
    
    
    await this.exporter.export(target, DEFINITION.scenesDir, '', filePath);

    this.activeUrl = filePath
  }

  /**
   * Save primary scene shortcut.
   *
   * @example
   * await sceneManager.savePrimary()
   */
  public async savePrimary() {
    await this.saveScene(DEFINITION.primarySceneFile)
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
      
    let scene = await this.loader.loadObject(filePath, false); // clone false
    if (!scene.isScene){
        let temp = new THREE.Scene();
        temp.add(scene)
        scene = temp
    } 
    if (setActive) {
      this.setScene(scene)
    }

    
    if (setActive) {
      this.activeUrl = filePath
    }
    
    localStorage.setItem('lastActive', filePath)
    
    return scene
  }



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


    // Create new empty scene
    this.activeScene = new THREE.Scene()
    this.activeUrl = undefined
  }
}