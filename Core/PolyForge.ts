import { DEFINITION } from '@/Core/DEFINITION';

import { Time } from "@/Core/Utils/Time";
import { Settings } from "@/Core/Utils/Settings";
import { ConfigS } from "@/Core/Utils/ConfigS";
import { ComponentManager } from "@/Core/Utils/ComponentManager";

import { ThreadPool } from "@/Core/Parallelism/ThreadPool";

import { ThreeRegistry } from '@/Core/three/ThreeRegistry';
import { Engine } from "@/Core/three/Engine";
import { SceneManager } from "@/Core/three/SceneManager";
import { ThreeHelpers } from "@/Core/three/Helper";
import { MeshBuilder } from "@/Core/three/MeshBuilder";

import { Loaders } from "@/Core/Loaders";
import { ScriptExecutor } from "@/Core/Script/ScriptExecutor";
import { EntityManager } from "@/Core/ECS/EntityManager";
import { 
    TransformComponent, 
    ScriptComponent, 
    RigidbodyComponent, 
    ColliderComponent 
} from "@/Core/ECS/Components";
import { Components } from "@/Core/Types/Components";
import { ECSScenePlugin } from "@/Core/ECS/ECSScenePlugin";

export class PolyForge {
    static instance: PolyForge;
    public pluginData: Record<string, any> = {};


    readonly time: Time;
    readonly settings: Settings;
    readonly componentManager: ComponentManager;
    readonly entityManager: EntityManager;
    readonly ecsScenePlugin: ECSScenePlugin;
    readonly cfg: ConfigS;
    
    readonly JobSystem: ThreadPool;

    readonly scriptExecutor: ScriptExecutor;

    readonly engine: Engine;
    readonly threeRegistry: ThreeRegistry;
    readonly sceneManager: SceneManager;
    readonly builder: MeshBuilder;


    readonly loaders: Loaders;



    constructor() {
        PolyForge.instance = this;


        this.time = new Time();
        this.JobSystem = new ThreadPool(3);
        this.cfg = new ConfigS({ path: DEFINITION.configFile, autoSave: true });
        this.cfg.load();
        this.settings = Settings.getInstance(DEFINITION.settingsFile);
        this.componentManager = new ComponentManager(DEFINITION.componentTemplateFile);

        // Initialize Hybrid ECS Manager
        this.entityManager = new EntityManager();
        this.entityManager.registerComponent(TransformComponent, Components.TRANSFORM);
        this.entityManager.registerComponent(RigidbodyComponent, Components.RIGIDBODY);
        this.entityManager.registerComponent(ColliderComponent, Components.COLLIDER);
        this.entityManager.registerComponent(ScriptComponent, Components.SCRIPT);

        this.scriptExecutor = new ScriptExecutor();

        this.threeRegistry = new ThreeRegistry(
            (item: any) => {
                if (item?.isObject3D && item.userData?.components) {
                    this.entityManager.getOrCreateEntity(item);
                }
                return true;
            },
            (item: any) => {
                if (item?.isObject3D) {
                    this.entityManager.removeEntity(item);
                }
                return true;
            }
        );
        this.engine = new Engine();
        this.loaders = new Loaders(this.threeRegistry);
        this.sceneManager = new SceneManager(this.threeRegistry, this.loaders.objectLoader , scene => this.engine.setScene(scene));
        this.builder = new MeshBuilder(this.threeRegistry);
        this.ecsScenePlugin = new ECSScenePlugin(this);
    }


    /**
    * init
    */
    public async init(initScripting: boolean) {
        await this.settings.init();
        await this.componentManager.loadTemplates();
        await this.engine.init();
        this.ecsScenePlugin.init();
        try{
            await this.sceneManager.loadScene(localStorage.getItem('lastActive')||DEFINITION.primaryScene);
        }catch(e){
            console.warn(e);
        }
        
        if(initScripting){
            await this.initScripting();
            this.settings.applySettings(this);
        }
    }
    
    public async initScripting(autoStart: boolean = true){
        const instances = await this.loaders.scriptLoader.initGlobalSystems(this);
        instances.forEach(instance => {
            this.scriptExecutor.addScript(instance);
        });
        if (autoStart) {
            this.scriptExecutor.init();
        }
    }
    

    /**
    * update
    */
    public update(rawDelta: number) {
        this.alwaysUpdate(rawDelta);
        this.JobSystem.update(this.time.deltaTime);
        this.scriptExecutor.update(this.time.deltaTime)
    }
    /**
    * update
    */
    public alwaysUpdate(rawDelta: number) {
        this.time.update(rawDelta);
        this.engine.update();
        ThreeHelpers.disposeQueue.update()
    }
    /**
    * dispose
    */
    public dispose() {

    }
}

export const Instance = new PolyForge();

//////////#endregion


import { LightGamePad } from "@/Core/Utils/GamePad";



export function boot() {
    const gamePad = new LightGamePad();
    (window as any).gamePad = gamePad;
    window.document.body.appendChild(gamePad.domElement);

    let lastTime = performance.now();
    function tick(now: number) {
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        Instance.update(delta);
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}