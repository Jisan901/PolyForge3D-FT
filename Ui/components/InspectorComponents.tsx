import React, { useState } from 'react';
import * as THREE from 'three';
import { PropertySection } from './PropertySection';
import { Vector3Input, Checkbox, ColorInput, NumberInput, TextInput, TextureInput, RefInput, AssetInput, MaterialGeoRefInput } from './PropertyInputs';

import { Box, Layers, Palette, Grid3x3, Image as ImageIcon, Plus, RefreshCw } from 'lucide-react';
import { useObserver, useRawProperty } from "../Hooks";

import { Editor } from "@/Editor/Editor";

const editor = Editor;





/* ============================================================================
   MATERIAL MAP MANAGER
============================================================================ */

interface MaterialMapManagerProps {
    material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
    parentPath?: string;
    parentObject?: any;
}

export const MaterialMapManager: React.FC<MaterialMapManagerProps> = ({
    material,
    parentPath = '',
    parentObject
}) => {
    const [showAddMap, setShowAddMap] = useState(false);
    const basePath = parentPath ? `${parentPath}.` : '';
    const target = parentObject || material;

    const availableMaps = [
        { key: 'map', label: 'Albedo Map', available: !material.map },
        { key: 'normalMap', label: 'Normal Map', available: !material.normalMap },
        { key: 'roughnessMap', label: 'Roughness Map', available: !material.roughnessMap },
        { key: 'metalnessMap', label: 'Metalness Map', available: !material.metalnessMap },
        { key: 'aoMap', label: 'AO Map', available: !material.aoMap },
        { key: 'emissiveMap', label: 'Emissive Map', available: !material.emissiveMap },
        { key: 'alphaMap', label: 'Alpha Map', available: !material.alphaMap },
        { key: 'bumpMap', label: 'Bump Map', available: !material.bumpMap },
        { key: 'displacementMap', label: 'Displacement Map', available: !material.displacementMap },
    ];

    const addMap = (mapKey: string) => {
        const texture = new THREE.Texture();
        editor.setProperty(target, `${basePath}${mapKey}`, texture);
        material.needsUpdate = true;
        mutationCall(target, `${basePath}${mapKey}`); // Trigger mutation
        setShowAddMap(false);
    };

    return (
        <div className="mt-2">
            <button
                onClick={() => setShowAddMap(!showAddMap)}
                className="w-full px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
            >
                <Plus size={12} />
                Add Texture Map
            </button>

            {showAddMap && (
                <div className="mt-2 space-y-1 border border-[#3f3f46] rounded p-2 bg-[#18181b]">
                    {availableMaps.filter(m => m.available).map(map => (
                        <button
                            key={map.key}
                            onClick={() => addMap(map.key)}
                            className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                        >
                            {map.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ============================================================================
   GEOMETRY PROPERTY EDITOR
============================================================================ */

interface GeometryEditorProps {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
}

export const GeometryEditor: React.FC<GeometryEditorProps> = ({ geometry, mesh }) => {
    const [showGeometrySelector, setShowGeometrySelector] = useState(false);

    const geometryTypes = [
        { type: 'BoxGeometry', label: 'Box', params: [1, 1, 1] },
        { type: 'SphereGeometry', label: 'Sphere', params: [0.5, 32, 32] },
        { type: 'CylinderGeometry', label: 'Cylinder', params: [0.5, 0.5, 1, 32] },
        { type: 'PlaneGeometry', label: 'Plane', params: [1, 1] },
        { type: 'ConeGeometry', label: 'Cone', params: [0.5, 1, 32] },
        { type: 'TorusGeometry', label: 'Torus', params: [0.5, 0.2, 16, 100] },
        { type: 'TorusKnotGeometry', label: 'Torus Knot', params: [0.4, 0.15, 100, 16] },
    ];

    const changeGeometry = (type: string, params: number[]) => {
        const newGeometry = new THREE[type](...params);
        const oldGeometry = mesh.geometry;
        editor.setProperty(mesh, 'geometry', newGeometry);
        oldGeometry.dispose();
        mutationCall(mesh, 'geometry'); // Trigger mutation
        setShowGeometrySelector(false);
    };

    const computeNormals = () => {
        geometry.computeVertexNormals();
        geometry.attributes.normal.needsUpdate = true;
        mutationCall(mesh, 'geometry'); // Trigger mutation
    };

    const computeBoundingBox = () => {
        geometry.computeBoundingBox();
        mutationCall(mesh, 'geometry'); // Trigger mutation
    };

    const computeBoundingSphere = () => {
        geometry.computeBoundingSphere();
        mutationCall(mesh, 'geometry'); // Trigger mutation
    };

    const centerGeometry = () => {
        geometry.center();
        mutationCall(mesh, 'geometry'); // Trigger mutation
    };


    return (
        <div className="mt-2 space-y-2">
            {/* Geometry Actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={computeNormals}
                    className="px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                >
                    Compute Normals
                </button>
                <button
                    onClick={centerGeometry}
                    className="px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                >
                    Center
                </button>
                <button
                    onClick={computeBoundingBox}
                    className="px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                >
                    Compute BBox
                </button>
                <button
                    onClick={computeBoundingSphere}
                    className="px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                >
                    Compute BSphere
                </button>
            </div>

            {/* Change Geometry Type */}
            <button
                onClick={() => setShowGeometrySelector(!showGeometrySelector)}
                className="w-full px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
            >
                <RefreshCw size={12} />
                Change Geometry
            </button>

            {showGeometrySelector && (
                <div className="space-y-1 border border-[#3f3f46] rounded p-2 bg-[#18181b]">
                    {geometryTypes.map(geo => (
                        <button
                            key={geo.type}
                            onClick={() => changeGeometry(geo.type, geo.params)}
                            className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                        >
                            {geo.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ============================================================================
   GEOMETRY TRANSFORM EDITOR
============================================================================ */

interface GeometryTransformProps {
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
}

const GeometryTransform: React.FC<GeometryTransformProps> = ({ geometry, mesh }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [translate, setTranslate] = useState({ x: 0, y: 0, z: 0 });
    const [rotate, setRotate] = useState({ x: 0, y: 0, z: 0 });
    const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });

    const applyTranslate = () => {
        geometry.translate(translate.x, translate.y, translate.z);
        mutationCall(mesh, 'geometry');
        setTranslate({ x: 0, y: 0, z: 0 });
    };

    const applyRotate = () => {
        geometry.rotateX(THREE.MathUtils.degToRad(rotate.x));
        geometry.rotateY(THREE.MathUtils.degToRad(rotate.y));
        geometry.rotateZ(THREE.MathUtils.degToRad(rotate.z));
        mutationCall(mesh, 'geometry');
        setRotate({ x: 0, y: 0, z: 0 });
    };

    const applyScale = () => {
        geometry.scale(scale.x, scale.y, scale.z);
        mutationCall(mesh, 'geometry');
        setScale({ x: 1, y: 1, z: 1 });
    };

    return (
        <div className="mt-2 border-t border-editor-border/20 pt-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] text-editor-textDim hover:text-editor-text"
            >
                <span className="uppercase font-medium">Geometry Transform</span>
                <span className="text-[8px]">{isExpanded ? '▼' : '▶'}</span>
            </button>

            {isExpanded && (
                <div className="mt-2 space-y-3 pl-2">
                    {/* Translate */}
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase">Translate</div>
                        <div className="grid grid-cols-3 gap-1">
                            <input
                                type="number"
                                value={translate.x}
                                onChange={(e) => setTranslate({ ...translate, x: parseFloat(e.target.value) || 0 })}
                                placeholder="X"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                            <input
                                type="number"
                                value={translate.y}
                                onChange={(e) => setTranslate({ ...translate, y: parseFloat(e.target.value) || 0 })}
                                placeholder="Y"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                            <input
                                type="number"
                                value={translate.z}
                                onChange={(e) => setTranslate({ ...translate, z: parseFloat(e.target.value) || 0 })}
                                placeholder="Z"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                        </div>
                        <button
                            onClick={applyTranslate}
                            className="w-full px-2 py-1 text-[9px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                        >
                            Apply Translate
                        </button>
                    </div>

                    {/* Rotate */}
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase">Rotate (degrees)</div>
                        <div className="grid grid-cols-3 gap-1">
                            <input
                                type="number"
                                value={rotate.x}
                                onChange={(e) => setRotate({ ...rotate, x: parseFloat(e.target.value) || 0 })}
                                placeholder="X"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="1"
                            />
                            <input
                                type="number"
                                value={rotate.y}
                                onChange={(e) => setRotate({ ...rotate, y: parseFloat(e.target.value) || 0 })}
                                placeholder="Y"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="1"
                            />
                            <input
                                type="number"
                                value={rotate.z}
                                onChange={(e) => setRotate({ ...rotate, z: parseFloat(e.target.value) || 0 })}
                                placeholder="Z"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="1"
                            />
                        </div>
                        <button
                            onClick={applyRotate}
                            className="w-full px-2 py-1 text-[9px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                        >
                            Apply Rotate
                        </button>
                    </div>

                    {/* Scale */}
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase">Scale</div>
                        <div className="grid grid-cols-3 gap-1">
                            <input
                                type="number"
                                value={scale.x}
                                onChange={(e) => setScale({ ...scale, x: parseFloat(e.target.value) || 1 })}
                                placeholder="X"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                            <input
                                type="number"
                                value={scale.y}
                                onChange={(e) => setScale({ ...scale, y: parseFloat(e.target.value) || 1 })}
                                placeholder="Y"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                            <input
                                type="number"
                                value={scale.z}
                                onChange={(e) => setScale({ ...scale, z: parseFloat(e.target.value) || 1 })}
                                placeholder="Z"
                                className="px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                                step="0.1"
                            />
                        </div>
                        <button
                            onClick={applyScale}
                            className="w-full px-2 py-1 text-[9px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                        >
                            Apply Scale
                        </button>
                    </div>

                    {/* Uniform Scale Helper */}
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={scale.x === scale.y && scale.y === scale.z ? scale.x : 1}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 1;
                                setScale({ x: val, y: val, z: val });
                            }}
                            placeholder="Uniform"
                            className="flex-1 px-1 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                            step="0.1"
                        />
                        <button
                            onClick={() => {
                                const val = scale.x === scale.y && scale.y === scale.z ? scale.x : 1;
                                geometry.scale(val, val, val);
                                mutationCall(mesh, 'geometry');
                                setScale({ x: 1, y: 1, z: 1 });
                            }}
                            className="px-2 py-0.5 text-[9px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded"
                        >
                            Uniform Scale
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};



/* ============================================================================
   BASE PROPERTY RENDERER
============================================================================ */

interface PropertyRendererProps {
    object: any;
    path: string;
    value: any;
    label?: string;
}

export const PropertyRenderer: React.FC<PropertyRendererProps> = ({ object, path, value: v1, label }) => {
    const displayLabel = label || path.slice(path.lastIndexOf('.') + 1);
    const value = useObserver(object, path);
    const handleChange = (val: any) => {
        editor.setProperty(object, path, val);
    };

    // Boolean
    if (typeof value === 'boolean') {
        return <Checkbox label={displayLabel} checked={value} onChange={handleChange} />;
    }

    // Number
    if (typeof value === 'number') {
        return <NumberInput label={displayLabel} value={value} onChange={handleChange} />;
    }

    // String
    if (typeof value === 'string') {
        return <TextInput label={displayLabel} value={value} onChange={handleChange} />;
    }

    // Color
    if (typeof value === 'object' && value?.isColor) {
        return (
            <ColorInput
                label={displayLabel}
                value={value}
                onChange={(vec) => {
                    editor.setProperty(object, `${path}.r`, vec.r / 255);
                    editor.setProperty(object, `${path}.g`, vec.g / 255);
                    editor.setProperty(object, `${path}.b`, vec.b / 255);
                }}
            />
        );
    }

    // Vector3
    if (typeof value === 'object' && value?.isVector3) {
        return (
            <Vector3Input
                key={`${path}-${value.x}-${value.y}-${value.z}`}
                label={displayLabel}
                value={value}
                onChange={(vec) => {
                    editor.setProperty(object, `${path}.x`, vec.x);
                    editor.setProperty(object, `${path}.y`, vec.y);
                    editor.setProperty(object, `${path}.z`, vec.z);
                }}
            />
        );
    }

    // Euler
    if (typeof value === 'object' && value?.isEuler) {
        return (
            <Vector3Input
                label={displayLabel}
                value={{
                    x: THREE.MathUtils.radToDeg(value.x),
                    y: THREE.MathUtils.radToDeg(value.y),
                    z: THREE.MathUtils.radToDeg(value.z),
                }}
                onChange={(vec) => {
                    editor.setProperty(object, `${path}.x`, THREE.MathUtils.degToRad(vec.x));
                    editor.setProperty(object, `${path}.y`, THREE.MathUtils.degToRad(vec.y));
                    editor.setProperty(object, `${path}.z`, THREE.MathUtils.degToRad(vec.z));
                }}
            />
        );
    }

    // Texture
    if (typeof value === 'object' && value?.isTexture) {
        return (
            <TextureInput
                label={displayLabel}
                value={value}
                onChange={(texture) => {
                    handleChange(texture);
                    mutationCall(object, path); // Trigger mutation
                }}
                onPropertyChange={(prop, val) => {
                    editor.setProperty(object, `${path}.${prop}`, val);
                    mutationCall(object, `${path}.${prop}`); // Trigger mutation
                    value.needsUpdate = true;
                }}
            />
        );
    }
    if (typeof value === 'object' && value?.isFile) {
        return (
            <AssetInput
                key={`${path}.${value.value}`}
                label={displayLabel}
                value={value}
                onChange={(e) => {
                    editor.setProperty(object, path, e);
                    mutationCall(object, 'userData.components.7');
                }}
            />
        );
    }

    // Handle Ref type
    if (typeof value === 'object' && value?.isRef) {
        return (
            <RefInput
                key={`${path}.${value.ref}`}
                label={displayLabel}
                value={value}
                onChange={(e) => {
                    editor.setProperty(object, path, e);
                }}
            />
        );
    }

    // Handle Material/Geometry Ref
    if (typeof value === 'object' && (value?.isMaterial || value?.isBufferGeometry)) {
        return (
            <MaterialGeoRefInput
                key={`${path}.${value.ref}`}
                label={displayLabel}
                value={value}
                onChange={(e) => {
                    editor.setProperty(object, path, e);
                }}
            />
        );
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && path.includes('userData') && path.includes('components')) {
        return (
            <div key={path} className="pl-2 border-l border-editor-border/20 ml-1 mb-2">
                <div className="text-[9px] uppercase text-editor-textDim mb-1 tracking-tighter opacity-50">
                    {displayLabel}
                </div>
                {Object.entries(value).map(([subKey, subVal]) => <PropertyRenderer key={subKey}
                    object={value}
                    path={subKey}
                    value={subVal}
                    label={subKey}
                />/*renderProperty(subKey, subVal) (
                    <RenderPropertyInput key={typeof subVal === 'object' ? subKey + Object.keys(subVal ?? {}).join('') : subKey} path={path + '.' + subKey} val={subVal} />
                )*/)}
            </div>
        );
    }

    return null;
};

/* ============================================================================
   MESH INSPECTOR
============================================================================ */

interface MeshInspectorProps {
    mesh: THREE.Mesh;
}

export const MeshInspector: React.FC<MeshInspectorProps> = ({ mesh }) => {
    return (
        <>
            <PropertySection title="Transform" icon={Layers}>
                <PropertyRenderer object={mesh} path="position" value={mesh.position} label="Position" />
                <PropertyRenderer object={mesh} path="rotation" value={mesh.rotation} label="Rotation" />
                <PropertyRenderer object={mesh} path="scale" value={mesh.scale} label="Scale" />
            </PropertySection>

            <PropertySection title="Mesh Properties" icon={Box}>
                <PropertyRenderer object={mesh} path="visible" value={mesh.visible} label="Visible" />
                <PropertyRenderer object={mesh} path="castShadow" value={mesh.castShadow} label="Cast Shadow" />
                <PropertyRenderer object={mesh} path="receiveShadow" value={mesh.receiveShadow} label="Receive Shadow" />
                <PropertyRenderer object={mesh} path="frustumCulled" value={mesh.frustumCulled} label="Frustum Culled" />
                <PropertyRenderer object={mesh} path="renderOrder" value={mesh.renderOrder} label="Render Order" />
            </PropertySection>

            {mesh.material && <MaterialInspector material={mesh.material as THREE.Material} parentPath="material" parentObject={mesh} />}
            {mesh.geometry && <GeometryInspector geometry={mesh.geometry} parentPath="geometry" parentObject={mesh} />}
        </>
    );
};

/* ============================================================================
   MATERIAL INSPECTOR
============================================================================ */

interface MaterialInspectorProps {
    material: THREE.Material;
    parentPath?: string;
    parentObject?: any;
}

export const MaterialInspector: React.FC<MaterialInspectorProps> = ({
    material,
    parentPath = '',
    parentObject
}) => {
    const basePath = parentPath ? `${parentPath}.` : '';
    const target = parentObject || material;

    return (
        <PropertySection title="Material" icon={Palette}>
            <div className="text-[9px] text-editor-textDim mb-2">{material.type}</div>

            {/* Common Material Properties */}
            <PropertyRenderer object={target} path={`${basePath}opacity`} value={material.opacity} label="Opacity" />
            <PropertyRenderer object={target} path={`${basePath}transparent`} value={material.transparent} label="Transparent" />
            <PropertyRenderer object={target} path={`${basePath}visible`} value={material.visible} label="Visible" />
            <PropertyRenderer object={target} path={`${basePath}side`} value={material.side} label="Side" />
            <PropertyRenderer object={target} path={`${basePath}depthTest`} value={material.depthTest} label="Depth Test" />
            <PropertyRenderer object={target} path={`${basePath}depthWrite`} value={material.depthWrite} label="Depth Write" />

            {/* MeshStandardMaterial / MeshPhysicalMaterial */}
            {(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) && (
                <>
                    <PropertyRenderer object={target} path={`${basePath}color`} value={material.color} label="Color" />
                    <PropertyRenderer object={target} path={`${basePath}roughness`} value={material.roughness} label="Roughness" />
                    <PropertyRenderer object={target} path={`${basePath}metalness`} value={material.metalness} label="Metalness" />
                    <PropertyRenderer object={target} path={`${basePath}emissive`} value={material.emissive} label="Emissive" />
                    <PropertyRenderer object={target} path={`${basePath}emissiveIntensity`} value={material.emissiveIntensity} label="Emissive Intensity" />

                    {material.map && <PropertyRenderer object={target} path={`${basePath}map`} value={material.map} label="Albedo Map" />}
                    {material.normalMap && <PropertyRenderer object={target} path={`${basePath}normalMap`} value={material.normalMap} label="Normal Map" />}
                    {material.roughnessMap && <PropertyRenderer object={target} path={`${basePath}roughnessMap`} value={material.roughnessMap} label="Roughness Map" />}
                    {material.metalnessMap && <PropertyRenderer object={target} path={`${basePath}metalnessMap`} value={material.metalnessMap} label="Metalness Map" />}
                </>
            )}

            {/* MeshBasicMaterial */}
            {material instanceof THREE.MeshBasicMaterial && (
                <>
                    <PropertyRenderer object={target} path={`${basePath}color`} value={material.color} label="Color" />
                    {material.map && <PropertyRenderer object={target} path={`${basePath}map`} value={material.map} label="Map" />}
                </>
            )}

            {/* MeshPhongMaterial */}
            {material instanceof THREE.MeshPhongMaterial && (
                <>
                    <PropertyRenderer object={target} path={`${basePath}color`} value={material.color} label="Color" />
                    <PropertyRenderer object={target} path={`${basePath}specular`} value={material.specular} label="Specular" />
                    <PropertyRenderer object={target} path={`${basePath}shininess`} value={material.shininess} label="Shininess" />
                    <PropertyRenderer object={target} path={`${basePath}emissive`} value={material.emissive} label="Emissive" />
                </>
            )}

            {/* Add Map Manager for Standard/Physical materials */}
            {(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) && (
                <MaterialMapManager
                    material={material}
                    parentPath={parentPath}
                    parentObject={parentObject}
                />
            )}

        </PropertySection>
    );
};

/* ============================================================================
   GEOMETRY INSPECTOR
============================================================================ */

interface GeometryInspectorProps {
    geometry: THREE.BufferGeometry;
    parentPath?: string;
    parentObject?: any;
}

export const GeometryInspector: React.FC<GeometryInspectorProps> = ({
    geometry,
    parentPath = '',
    parentObject
}) => {
    const observedGeometry = useObserver(parentObject, parentPath || 'geometry');
    const vertexCount = geometry.attributes.position?.count || 0;
    const triangleCount = geometry.index
        ? geometry.index.count / 3
        : vertexCount / 3;

    return (
        <PropertySection title="Geometry" icon={Grid3x3}>
            <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-editor-textDim">
                    <span>Type</span>
                    <span className="text-editor-text">{geometry.type}</span>
                </div>
                <div className="flex justify-between text-editor-textDim">
                    <span>Vertices</span>
                    <span className="text-editor-text">{vertexCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-editor-textDim">
                    <span>Triangles</span>
                    <span className="text-editor-text">{Math.floor(triangleCount).toLocaleString()}</span>
                </div>

                {/* Attributes */}
                <div className="pt-2 border-t border-editor-border/20">
                    <div className="text-[9px] text-editor-textDim uppercase mb-1">Attributes</div>
                    {Object.keys(geometry.attributes).map(attr => (
                        <div key={attr} className="flex justify-between text-editor-textDim">
                            <span>{attr}</span>
                            <span className="text-editor-text text-[9px]">
                                {geometry.attributes[attr].itemSize}D
                            </span>
                        </div>
                    ))}
                </div>

                {/* Bounding Box/Sphere */}
                {geometry.boundingBox && (
                    <div className="pt-2 border-t border-editor-border/20">
                        <div className="text-[9px] text-editor-textDim uppercase mb-1">Bounding Box</div>
                        <div className="text-[9px] text-editor-textDim">
                            Min: ({geometry.boundingBox.min.x.toFixed(2)}, {geometry.boundingBox.min.y.toFixed(2)}, {geometry.boundingBox.min.z.toFixed(2)})
                        </div>
                        <div className="text-[9px] text-editor-textDim">
                            Max: ({geometry.boundingBox.max.x.toFixed(2)}, {geometry.boundingBox.max.y.toFixed(2)}, {geometry.boundingBox.max.z.toFixed(2)})
                        </div>
                    </div>
                )}
            </div>
            {/* Add Geometry Transform (folded by default) */}
            {geometry instanceof THREE.BufferGeometry && (
                <GeometryTransform geometry={geometry} mesh={parentObject} />
            )}
            {/* Add Geometry Editor */}
            {geometry instanceof THREE.BufferGeometry && (
                <GeometryEditor geometry={geometry} mesh={parentObject} />
            )}
        </PropertySection>
    );
};

/* ============================================================================
   LIGHT INSPECTOR
============================================================================ */

interface LightInspectorProps {
    light: THREE.Light;
}

export const LightInspector: React.FC<LightInspectorProps> = ({ light }) => {
    return (
        <>
            <PropertySection title="Transform" icon={Layers}>
                <PropertyRenderer object={light} path="position" value={light.position} label="Position" />
                <PropertyRenderer object={light} path="rotation" value={light.rotation} label="Rotation" />
            </PropertySection>

            <PropertySection title="Light Properties" icon={ImageIcon}>
                <PropertyRenderer object={light} path="color" value={light.color} label="Color" />
                <PropertyRenderer object={light} path="intensity" value={light.intensity} label="Intensity" />

                {light instanceof THREE.PointLight && (
                    <>
                        <PropertyRenderer object={light} path="distance" value={light.distance} label="Distance" />
                        <PropertyRenderer object={light} path="decay" value={light.decay} label="Decay" />
                    </>
                )}

                {light instanceof THREE.SpotLight && (
                    <>
                        <PropertyRenderer object={light} path="distance" value={light.distance} label="Distance" />
                        <PropertyRenderer object={light} path="angle" value={THREE.MathUtils.radToDeg(light.angle)} label="Angle (deg)" />
                        <PropertyRenderer object={light} path="penumbra" value={light.penumbra} label="Penumbra" />
                        <PropertyRenderer object={light} path="decay" value={light.decay} label="Decay" />

                        <PropertyRenderer object={light} path="target.position" value={light.target.position} label="Target" />
                    </>
                )}

                {light instanceof THREE.DirectionalLight && (
                    <PropertyRenderer object={light} path="target.position" value={light.target.position} label="Target Position" />
                )}

                <PropertyRenderer object={light} path="castShadow" value={light.castShadow} label="Cast Shadow" />
            </PropertySection>
        </>
    );
};

/* ============================================================================
   CAMERA INSPECTOR
============================================================================ */

interface CameraInspectorProps {
    camera: THREE.Camera;
}

export const CameraInspector: React.FC<CameraInspectorProps> = ({ camera }) => {
    return (
        <>
            <PropertySection title="Transform" icon={Layers}>
                <PropertyRenderer object={camera} path="position" value={camera.position} label="Position" />
                <PropertyRenderer object={camera} path="rotation" value={camera.rotation} label="Rotation" />
            </PropertySection>

            <PropertySection title="Camera Properties" icon={ImageIcon}>
                {camera instanceof THREE.PerspectiveCamera && (
                    <>
                        <PropertyRenderer object={camera} path="fov" value={camera.fov} label="Field of View" />
                        <PropertyRenderer object={camera} path="aspect" value={camera.aspect} label="Aspect Ratio" />
                        <PropertyRenderer object={camera} path="near" value={camera.near} label="Near Plane" />
                        <PropertyRenderer object={camera} path="far" value={camera.far} label="Far Plane" />
                        <PropertyRenderer object={camera} path="zoom" value={camera.zoom} label="Zoom" />
                    </>
                )}

                {camera instanceof THREE.OrthographicCamera && (
                    <>
                        <PropertyRenderer object={camera} path="left" value={camera.left} label="Left" />
                        <PropertyRenderer object={camera} path="right" value={camera.right} label="Right" />
                        <PropertyRenderer object={camera} path="top" value={camera.top} label="Top" />
                        <PropertyRenderer object={camera} path="bottom" value={camera.bottom} label="Bottom" />
                        <PropertyRenderer object={camera} path="near" value={camera.near} label="Near Plane" />
                        <PropertyRenderer object={camera} path="far" value={camera.far} label="Far Plane" />
                        <PropertyRenderer object={camera} path="zoom" value={camera.zoom} label="Zoom" />
                    </>
                )}
            </PropertySection>
        </>
    );
};


/* ============================================================================
   SCENE INSPECTOR
============================================================================ */

interface SceneInspectorProps {
    scene: THREE.Scene;
}

export const SceneInspector: React.FC<SceneInspectorProps> = ({ scene }) => {
    const [showBackgroundOptions, setShowBackgroundOptions] = useState(false);
    const [showEnvOptions, setShowEnvOptions] = useState(false);
    const [showFogOptions, setShowFogOptions] = useState(false);



    const addBackgroundColor = () => {
        const color = new THREE.Color(0x000000);
        editor.setProperty(scene, 'background', color);
        mutationCall(scene, 'background');
        setShowBackgroundOptions(false);
    };

    const addBackgroundTexture = () => {
        const texture = new THREE.Texture();
        texture.mapping = THREE.EquirectangularReflectionMapping
        editor.setProperty(scene, 'environment', texture);
        editor.setProperty(scene, 'background', texture);
        mutationCall(scene, 'background');
        mutationCall(scene, 'environment');
        setShowBackgroundOptions(false);
    };

    const addEnvironmentMap = () => {
        const texture = new THREE.Texture();
        texture.mapping = THREE.EquirectangularReflectionMapping
        editor.setProperty(scene, 'environment', texture);
        mutationCall(scene, 'environment');
        setShowEnvOptions(false);
    };

    const addLinearFog = () => {
        const fog = new THREE.Fog(0xcccccc, 1, 100);
        editor.setProperty(scene, 'fog', fog);
        mutationCall(scene, 'fog');
        setShowFogOptions(false);
    };

    const addExponentialFog = () => {
        const fog = new THREE.FogExp2(0xcccccc, 0.002);
        editor.setProperty(scene, 'fog', fog);
        mutationCall(scene, 'fog');
        setShowFogOptions(false);
    };

    const removeBackground = () => {
        editor.setProperty(scene, 'background', null);
        mutationCall(scene, 'background');
    };

    const removeEnvironment = () => {
        editor.setProperty(scene, 'environment', null);
        mutationCall(scene, 'environment');
    };

    const removeFog = () => {
        editor.setProperty(scene, 'fog', null);
        mutationCall(scene, 'fog');
    };

    return (
        <>
            <PropertySection title="Scene Properties" icon={Box}>
                {/* Background */}
                {scene.background ? (
                    <div className="space-y-1">
                        <PropertyRenderer
                            object={scene}
                            path="background"
                            value={scene.background}
                            label="Background"
                        />
                        <button
                            onClick={removeBackground}
                            className="w-full px-2 py-1 text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded"
                        >
                            Remove Background
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase mb-1">Background</div>
                        <button
                            onClick={() => setShowBackgroundOptions(!showBackgroundOptions)}
                            className="w-full px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
                        >
                            <Plus size={12} />
                            Add Background
                        </button>
                        {showBackgroundOptions && (
                            <div className="space-y-1 border border-[#3f3f46] rounded p-2 bg-[#18181b]">
                                <button
                                    onClick={addBackgroundColor}
                                    className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                                >
                                    Solid Color
                                </button>
                                <button
                                    onClick={addBackgroundTexture}
                                    className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                                >
                                    Texture/Image
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Fog */}
                {scene.fog ? (
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase mb-1">
                            Fog ({scene.fog instanceof THREE.Fog ? 'Linear' : 'Exponential'})
                        </div>
                        <PropertyRenderer
                            object={scene}
                            path="fog.color"
                            value={scene.fog.color}
                            label="Fog Color"
                        />
                        {scene.fog instanceof THREE.Fog && (
                            <>
                                <PropertyRenderer
                                    object={scene}
                                    path="fog.near"
                                    value={scene.fog.near}
                                    label="Near Distance"
                                />
                                <PropertyRenderer
                                    object={scene}
                                    path="fog.far"
                                    value={scene.fog.far}
                                    label="Far Distance"
                                />
                            </>
                        )}
                        {scene.fog instanceof THREE.FogExp2 && (
                            <PropertyRenderer
                                object={scene}
                                path="fog.density"
                                value={scene.fog.density}
                                label="Density"
                            />
                        )}
                        <button
                            onClick={removeFog}
                            className="w-full px-2 py-1 text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded"
                        >
                            Remove Fog
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase mb-1">Fog</div>
                        <button
                            onClick={() => setShowFogOptions(!showFogOptions)}
                            className="w-full px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
                        >
                            <Plus size={12} />
                            Add Fog
                        </button>
                        {showFogOptions && (
                            <div className="space-y-1 border border-[#3f3f46] rounded p-2 bg-[#18181b]">
                                <button
                                    onClick={addLinearFog}
                                    className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                                >
                                    Linear Fog (Near/Far)
                                </button>
                                <button
                                    onClick={addExponentialFog}
                                    className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                                >
                                    Exponential Fog (Density)
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <PropertyRenderer
                    object={scene}
                    path="overrideMaterial"
                    value={scene.overrideMaterial}
                    label="Override Material"
                />
                <PropertyRenderer
                    object={scene}
                    path="autoUpdate"
                    value={scene.autoUpdate}
                    label="Auto Update"
                />

                <div className="pt-2 border-t border-editor-border/20">
                    <div className="text-[9px] text-editor-textDim uppercase mb-1">Statistics</div>
                    <div className="flex justify-between text-[10px] text-editor-textDim">
                        <span>Children</span>
                        <span className="text-editor-text">{scene.children.length}</span>
                    </div>
                </div>
            </PropertySection>

            <PropertySection title="Environment" icon={Palette}>
                {/* Environment Map */}
                {scene.environment ? (
                    <div className="space-y-1">
                        <PropertyRenderer
                            object={scene}
                            path="environment"
                            value={scene.environment}
                            label="Environment Map"
                        />
                        <button
                            onClick={removeEnvironment}
                            className="w-full px-2 py-1 text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded"
                        >
                            Remove Environment Map
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="text-[9px] text-editor-textDim uppercase mb-1">Environment Map</div>
                        <button
                            onClick={() => setShowEnvOptions(!showEnvOptions)}
                            className="w-full px-2 py-1 text-[10px] bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
                        >
                            <Plus size={12} />
                            Add Environment Map
                        </button>
                        {showEnvOptions && (
                            <div className="space-y-1 border border-[#3f3f46] rounded p-2 bg-[#18181b]">
                                <button
                                    onClick={addEnvironmentMap}
                                    className="w-full px-2 py-1 text-[10px] bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] rounded text-left"
                                >
                                    Texture Map
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {scene.background && (
                    <>
                        <PropertyRenderer
                            object={scene}
                            path="backgroundBlurriness"
                            value={scene.backgroundBlurriness}
                            label="Background Blur"
                        />
                        <PropertyRenderer
                            object={scene}
                            path="backgroundIntensity"
                            value={scene.backgroundIntensity}
                            label="Background Intensity"
                        />
                    </>
                )}
            </PropertySection>
        </>
    );
};

/* ============================================================================
   OBJECT3D INSPECTOR (Generic/Fallback)
============================================================================ */

interface Object3DInspectorProps {
    object: THREE.Object3D;
}

export const Object3DInspector: React.FC<Object3DInspectorProps> = ({ object }) => {
    return (
        <PropertySection title="Transform" icon={Layers}>
            <PropertyRenderer object={object} path="position" value={object.position} label="Position" />
            <PropertyRenderer object={object} path="rotation" value={object.rotation} label="Rotation" />
            <PropertyRenderer object={object} path="scale" value={object.scale} label="Scale" />
            <PropertyRenderer object={object} path="visible" value={object.visible} label="Visible" />
        </PropertySection>
    );
};

/* ============================================================================
   MAIN TYPE ROUTER
============================================================================ */

interface TypedInspectorProps {
    object: THREE.Object3D;
}

export const TypedInspector: React.FC<TypedInspectorProps> = ({ object }) => {
    // Mesh
    if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        return <MeshInspector mesh={object} />;
    }

    // Scene

    if (object instanceof THREE.Scene) {
        return <SceneInspector scene={object} />;
    }

    // Light
    if (object instanceof THREE.Light) {
        return <LightInspector light={object} />;
    }

    // Camera
    if (object instanceof THREE.Camera) {
        return <CameraInspector camera={object} />;
    }

    // Generic Object3D
    return <Object3DInspector object={object} />;
};