class ObjectMapper {
    // Define allowed properties per object type
    static getMap(object: any) {
        if (!object) return null;

        // --------------------------
        // MESH
        // --------------------------
        if (object.isMesh) {
            return {
                uuid: true,
                name: true,
                type: true,
                position: true,
                rotation: true,
                scale: true,
                visible: true,

                //geometry: true,
                //material: true,
                castShadow: true,
                receiveShadow: true,

                //children: true,
            };
        }
        // --------------------------
        // LIGHT
        // --------------------------
        if (object.isLight) {
            return {
                uuid: true,
                name: true,
                type: true,
                color: true,
                intensity: true,
                position: true,
                distance: true,
                angle: true,
                penumbra: true,
                decay: true,
            };
        }

        // --------------------------
        // CAMERA
        // --------------------------
        if (object.isCamera) {
            return {
                uuid: true,
                name: true,
                type: true,
                position: true,

                fov: true,
                zoom: true,
                near: true,
                far: true,

                focus: true,

                aspect: true,
            };
        }

        // --------------------------
        // SCENE
        // --------------------------
        if (object.isScene) {
            return {
                uuid: true,
                name: true,
                type: true,
                background: true,
                //children: true,
            };
        }

        // --------------------------
        // OBJECT3D / GROUP / EMPTY
        // --------------------------
        if (object.isObject3D) {
            return {
                uuid: true,
                name: true,
                type: true,
                position: true,
                rotation: true,
                scale: true,
                visible: true,
                //children: true,
            };
        }

        // --------------------------
        // MATERIAL
        // --------------------------
        if (object.isMaterial) {
            return {
                uuid: true,
                name: true,
                type: true,

                color: true,
                opacity: true,
                transparent: true,
                roughness: true,
                metalness: true,
                emissive: true,

                side: true,
                depthWrite: true,
                depthTest: true,

                map: true,
                emissiveMap: true,
                normalMap: true,
                roughnessMap: true,
                metalnessMap: true,
            };
        }

        // --------------------------
        // GEOMETRY
        // --------------------------
        if (object.isBufferGeometry) {
            return {
                uuid: true,
                type: true,
                parameters: true,     // Only serializable part
            };
        }

        // --------------------------
        // TEXTURE (safe minimal info)
        // --------------------------
        if (object.isTexture) {
            return {
                uuid: true,
                name: true,
                image: 'src', // You can extract base64 separately
                wrapS: true,
                wrapT: true,
            };
        }


        // Fallback: include primitives only
        return null;
    }

    // Map an object recursively
    static mapObject(object: any): any {
        if (!IsAllowed(object)) return;

        const map = ObjectMapper.getMap(object);
        
        const result: any = {};

        for (const key in map) {
            const value = object[key];
            const mapValue = map[key];

            if (key.startsWith('is')||!value) {
                continue
            } else{
                result[key] = value;
            }
            
            if (Array.isArray(mapValue) && typeof value === 'object') {
                // Only include allowed sub-properties
                result[key] = {};
                for (const subKey of mapValue) {
                    if (value[subKey] !== undefined) {
                        result[key][subKey] = value[subKey];
                    }
                }
            }
            
        }
        
        if (true) {
            // If no map is defined, include primitives only
            for (const key in object) {
                const value = object[key];
                if (key.startsWith('is')) {
                continue
            } 
                if (isPrimitive(value)) {
                    result[key] = value;
                }
                
            }
          //  return result;
        }


        return result;
    }
}

export class MappedObject {
    constructor(private target: any, private map?: object) {
        this.map = ObjectMapper.mapObject(this.target);
    }
}

// Utility functions
export function isPrimitive(v: any): boolean {
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean" ;
}

function IsAllowed(object: any): boolean {
    return object && (object.isMesh || object.isObject3D || object.isMaterial || object.isGeometry);
}