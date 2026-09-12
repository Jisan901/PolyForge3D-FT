import { Plugin } from "@/Core/Plugins/Plugin"
import { THREE } from '@/Core/lib/THREE';
import { Baxporter } from '@/Core/Plugins/Binary/Baxporter';
import { Editor } from "@/Editor/Editor";
import { mutationCall, toast } from '@/Editor/Mutation';

export default class DragAndDropHandlersPlugin extends Plugin {
    name = "DragAndDropHandlersPlugin"
    exporter = new Baxporter()
    async init() {
        const editor = Editor;
        const core = Editor.core;
        const three = editor.api.three;

        Editor.api.buses.assetPanelDrop.subscribe((e: any, mouseEvent: MouseEvent) => {
            console.log(e,mouseEvent,'from')
            if (e.type === 'Export' || e.type === 'Object' || e.type === 'RuntimeResource'){
            const obj = e.data.obj;
            this.exporter.export(obj, editor.assetBrowser.activeDirName, obj.name||obj.type ).then(e=>editor.assetBrowser.reload())
            }
            
        })
        
        
        Editor.api.buses.viewportDrop.subscribe(async (e: any, mouseEvent: MouseEvent) => {
            if (e.type === 'Asset' && e.data) {
                const scene = editor.core.sceneManager.activeScene;
                const hit = mouseEvent ? three.getHitFromMouse(mouseEvent) : null;
                const target: any = three.selectedObject;

                if (e.data.type === 'model') {
                    let object = await editor.api.loadObjectFile(e.data.fullPath, false);
                    if (!object) return;

                    // Unwrap if legacy Scene wrapper
                    if ((object as any).isScene) {
                        const userObjects = (object.children || []).filter(
                            (c: any) => c.name !== 'Editor_Helpers_Root' && !c.userData?.hiddenOnEditor && !c.userData?.isEditorHelper
                        );
                        if (userObjects.length === 1) {
                            object = userObjects[0];
                            object.removeFromParent();
                        } else if (userObjects.length > 1) {
                            const group = new THREE.Group();
                            const baseName = e.data.name?.replace(/\.(object|bin)+$/, '') || 'Object';
                            group.name = baseName;
                            while (userObjects.length > 0) {
                                group.add(userObjects.shift()!);
                            }
                            object = group;
                        }
                    }

                    // Remove any legacy Editor_Helpers_Root
                    const helperChild = object.getObjectByName('Editor_Helpers_Root');
                    if (helperChild) helperChild.removeFromParent();

                    // Position object at hit point or ground plane (Y=0)
                    if (hit) {
                        object.position.copy(hit.point);
                    } else {
                        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                        const dropPoint = new THREE.Vector3();
                        const raycaster = (three as any)._raycaster;
                        if (raycaster && raycaster.ray.intersectPlane(groundPlane, dropPoint)) {
                            object.position.copy(dropPoint);
                        } else if (three.editorCamera) {
                            const dir = new THREE.Vector3();
                            three.editorCamera.getWorldDirection(dir);
                            object.position.copy(three.editorCamera.position).add(dir.multiplyScalar(5));
                        }
                    }

                    // Add to active scene and select it
                    editor.addObject(scene, object);
                    three.selectObject(object);
                    mutationCall(scene, 'children');
                    toast(`Loaded "${object.name || e.data.name || 'Object'}"`);
                }
                else if (e.data.type === 'material') {
                    const material = await core.loaders.objectLoader.loadMaterial(e.data.fullPath);
                    const meshTarget = (hit?.object as any) || target;
                    if (meshTarget) {
                        meshTarget.material = material;
                        if (meshTarget.material) meshTarget.material.needsUpdate = true;
                        mutationCall(meshTarget, 'material');
                        toast('Material placed');
                    }
                }
                else if (e.data.type === 'geometry') {
                    const geometry = await core.loaders.objectLoader.loadGeometry(e.data.fullPath);
                    const meshTarget = (hit?.object as any) || target;
                    if (meshTarget && 'geometry' in meshTarget) {
                        meshTarget.geometry = geometry;
                        mutationCall(meshTarget, 'geometry');
                        toast('Geometry placed');
                    }
                }
                else if (e.data.type === 'texture' || e.data.type === 'image') {
                    const map = await core.loaders.objectLoader.loadTexture(e.data.fullPath);
                    const meshTarget = (hit?.object as any) || target;
                    if (meshTarget?.material) {
                        meshTarget.material.map = map;
                        meshTarget.material.needsUpdate = true;
                        mutationCall(meshTarget.material, 'material.map');
                        toast('Texture placed');
                    }
                }
                else if (e.data.type === 'animation') {
                    const anims = await core.loaders.objectLoader.loadAnimation(e.data.fullPath);
                    const meshTarget = (hit?.object as any) || target;
                    if (meshTarget) {
                        meshTarget.animations = meshTarget.animations || [];
                        meshTarget.animations.push(...Object.values(anims));
                        mutationCall(meshTarget, 'animations');
                        toast('Animations added');
                    }
                }
            }
        })
    }
}


// const baxporter = new Baxporter()

// await baxporter.export(mesh,          './assets', 'Character')
// await baxporter.export(geometry,      './assets', 'CharacterGeo')
// await baxporter.export(material,      './assets', 'CharacterMat')
// await baxporter.export(texture,       './assets', 'CharacterTex')
// await baxporter.export(clip,          './assets', 'Idle')
// await baxporter.export([idle, walk],  './assets', 'CharacterAnims')