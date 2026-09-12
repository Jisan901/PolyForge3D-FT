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

  /** Currently active object root if an object/model is mounted in the viewport */
  public activeObjectRoot?: THREE.Object3D | null = null;

  /** Flag indicating whether the current viewport is hosting an isolated object asset */
  public isObjectMode: boolean = false;

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

   public readonly onBeforeSave = new Set<(scene: THREE.Scene) => void>();
   public readonly onAfterSave = new Set<(target: THREE.Object3D) => void>();
   public readonly onSceneLoaded = new Set<(scene: THREE.Scene) => void>();
   public readonly onBeforeSceneClear = new Set<() => void>();

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
      this.onBeforeSceneClear.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
      this.registry.clear();
    }

    this.activeScene = scene;

    // Register new scene tree
    this.registry.register(scene, true);
    
    this.onSceneLoad(scene);
    this.onSceneLoaded.forEach(cb => { try { cb(scene); } catch (e) { console.error(e); } });
  }

  // =====================================================
  // UTILS: SCENE VS OBJECT DETECTION & HELPER STRIPPING
  // =====================================================

  /**
   * Determines whether a given file path is a Scene file or an Object/Model asset.
   */
  public isScenePath(filePath?: string): boolean {
    if (!filePath) return true;
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('/Scenes/') || normalized.endsWith('.scene')) {
      return true;
    }
    if (
      normalized.endsWith('.object') ||
      normalized.endsWith('.object.bin') ||
      normalized.endsWith('.glb') ||
      normalized.endsWith('.gltf') ||
      normalized.endsWith('.fbx') ||
      normalized.endsWith('.mesh')
    ) {
      return false;
    }
    return true;
  }

  /**
   * Recursively strips any editor-only helper roots or markers from an object hierarchy.
   */
  public stripEditorHelpers(root: THREE.Object3D): void {
    if (!root) return;
    delete (root.userData as any)?.helperSceneId;

    if (root.children && Array.isArray(root.children)) {
      for (let i = root.children.length - 1; i >= 0; i--) {
        const child = root.children[i];
        if (
          child.name === 'Editor_Helpers_Root' ||
          child.userData?.hiddenOnEditor ||
          child.userData?.isEditorHelper
        ) {
          child.removeFromParent();
        } else {
          this.stripEditorHelpers(child);
        }
      }
    }
  }

  /**
   * Temporarily detaches all editor helper objects directly under root.
   */
  public detachEditorHelpers(root: THREE.Object3D): THREE.Object3D[] {
    if (!root || !root.children) return [];
    const helpers: THREE.Object3D[] = [];
    for (let i = root.children.length - 1; i >= 0; i--) {
      const child = root.children[i];
      if (
        child.name === 'Editor_Helpers_Root' ||
        child.userData?.hiddenOnEditor ||
        child.userData?.isEditorHelper
      ) {
        child.removeFromParent();
        helpers.push(child);
      }
    }
    return helpers;
  }

  // =====================================================
  // FILE SAVE
  // =====================================================

  /**
   * Save scene or object asset to disk.
   *
   * Automatically:
   * - Saves the raw Object3D directly if an object asset is active (does NOT wrap in Scene)
   * - Temporarily detaches editor helpers (Editor_Helpers_Root) so they are NEVER saved
   *
   * @param filePath Destination path
   * @param targetOverride Optional specific Object3D or Scene to save
   */
  public async saveScene(filePath: string, targetOverride?: THREE.Object3D): Promise<void> {
    const isObj = !this.isScenePath(filePath);

    let target: THREE.Object3D;
    if (targetOverride) {
      target = targetOverride;
    } else if (isObj && this.activeObjectRoot) {
      // Saving an isolated object asset: save the object itself, NOT the wrapper Scene!
      target = this.activeObjectRoot;
    } else {
      target = this.activeScene;
    }

    // Detach all helpers from activeScene and target before exporting
    const detachedHelpers = this.detachEditorHelpers(this.activeScene);
    if (target !== this.activeScene) {
      this.stripEditorHelpers(target);
    }

    try {
      this.onBeforeSave.forEach(cb => { try { cb(target as any); } catch (e) { console.error(e); } });

      await this.exporter.export(target, DEFINITION.scenesDir, '', filePath);

      this.activeUrl = filePath;
    } finally {
      // Re-attach editor helpers to activeScene so viewport editing continues uninterrupted
      detachedHelpers.forEach(h => this.activeScene.add(h));
      this.onAfterSave.forEach(cb => { try { cb(target); } catch (e) { console.error(e); } });
    }
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
   * Load scene or object asset from disk.
   *
   * Automatically:
   * - Strips any previously saved Editor_Helpers_Root
   * - If an Object asset was previously saved wrapped in a Scene, unwraps it
   * - Sets up an ephemeral wrapper Scene for viewport rendering without modifying the asset
   *
   * @param filePath Scene or Object file path
   * @param setActive Set loaded scene as active
   */
  public async loadScene(filePath: string, setActive = true): Promise<THREE.Scene> {
    let loaded: any = await this.loader.loadObject(filePath);

    // 1. Strip any legacy Editor_Helpers_Root that may have been saved into the file
    this.stripEditorHelpers(loaded);

    const isScene = this.isScenePath(filePath);
    let finalScene: THREE.Scene;

    if (!isScene) {
      // We are opening an isolated Object asset!
      this.isObjectMode = true;

      // If the object was previously saved wrapped in a Scene due to the earlier bug, unwrap it
      if (loaded.isScene) {
        const userObjects = (loaded.children || []).filter(
          (c: any) => c.name !== 'Editor_Helpers_Root' && !c.userData?.hiddenOnEditor && !c.userData?.isEditorHelper
        );

        if (userObjects.length === 1) {
          loaded = userObjects[0];
          loaded.removeFromParent();
        } else if (userObjects.length > 1) {
          const group = new THREE.Group();
          const baseName = filePath.split('/').pop()?.replace(/\.(object|bin)+$/, '') || 'Object';
          group.name = baseName;
          while (userObjects.length > 0) {
            group.add(userObjects.shift()!);
          }
          loaded = group;
        }
      }

      this.activeObjectRoot = loaded;

      // Create an ephemeral host Scene for viewport rendering
      const wrapper = new THREE.Scene();
      const baseName = loaded.name || filePath.split('/').pop()?.replace(/\.(object|bin)+$/, '') || 'Object';
      wrapper.name = baseName;
      wrapper.userData.isEphemeralWrapper = true;
      wrapper.add(loaded);
      finalScene = wrapper;
    } else {
      // We are opening a full Scene file!
      this.isObjectMode = false;
      this.activeObjectRoot = null;

      if (!loaded.isScene) {
        const temp = new THREE.Scene();
        temp.add(loaded);
        loaded = temp;
      }
      finalScene = loaded as THREE.Scene;
    }

    if (setActive) {
      this.setScene(finalScene);
      this.activeUrl = filePath;
    }

    localStorage.setItem('lastActive', filePath);

    return finalScene;
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
    this.activeObjectRoot = null
    this.isObjectMode = false
  }
}