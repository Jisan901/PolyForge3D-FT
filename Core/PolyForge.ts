import { DEFINITION } from '@/Core/DEFINITION';

import { Time } from "@/Core/Utils/Time";
import { Settings } from "@/Core/Utils/Settings";
import { ComponentManager } from "@/Core/Utils/ComponentManager";

import { ThreadPool } from "@/Core/Parallelism/ThreadPool";

import { ThreeRegistry } from '@/Core/three/ThreeRegistry';
import { Engine } from "@/Core/three/Engine";
import { SceneManager } from "@/Core/three/SceneManager";
import { ThreeHelpers } from "@/Core/three/Helper";
import { MeshBuilder } from "@/Core/three/MeshBuilder";

import { Loaders } from "@/Core/Loaders";
import { ScriptExecutor } from "@/Core/Script/ScriptExecutor";

export class PolyForge {
    static instance: PolyForge;
    public pluginData = {};


    readonly time: Time;
    readonly settings: Settings;
    readonly componentManager: ComponentManager;
    
    readonly JobSystem: ThradePool;

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
        this.settings = new Settings(DEFINITION.settingsFile);
        this.componentManager = new ComponentManager(DEFINITION.componentTemplateFile) 


        this.scriptExecutor = new ScriptExecutor();

        this.threeRegistry = new ThreeRegistry(() => true, () => true); // on register , unregister 
        this.engine = new Engine();
        this.sceneManager = new SceneManager(this.threeRegistry, scene => this.engine.setScene(scene));
        this.builder = new MeshBuilder(this.threeRegistry);

        this.loaders = new Loaders(this.threeRegistry);


    }


    /**
    * init
    */
    public async init(initScripting: boolean) {
        await this.settings.init();
        await this.componentManager.loadTemplates();
        await this.engine.init();
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
    
    public async initScripting(){
        const instances = await this.loaders.scriptLoader.initGlobalSystems(this);
        instances.forEach(instance => {
            this.scriptExecutor.addScript(instance);
        });
        this.scriptExecutor.init();
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