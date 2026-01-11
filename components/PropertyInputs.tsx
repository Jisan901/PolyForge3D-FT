import React from 'react';
import { Target, File } from 'lucide-react';
import { DragAndDropZone } from "./Utils/DragNDrop";
import { PolyForge } from "/PolyForge"
const editor = PolyForge.editor


export const Vector3Input: React.FC<{
    label: string;
    value: { x: number; y: number; z: number };
    onChange?: (v: { x: number; y: number; z: number }) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState({ x: value.x, y: value.y, z: value.z });


    const update = (key: "x" | "y" | "z", newVal: number) => {
        const next = { ...state, [key]: newVal };
        setState(next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center mb-1">
            <div className="w-16 text-[10px] text-editor-textDim flex items-center">
                {label}
            </div>

            <div className="flex-1 flex gap-1">
                {/* X */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-red-400 cursor-ew-resize bg-white/5 h-full">X</div>
                    <input
                        type="number"
                        defaultValue={state.x}
                        onBlur={(e) => update("x", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>

                {/* Y */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-green-400 cursor-ew-resize bg-white/5 h-full">Y</div>
                    <input
                        type="number"
                        defaultValue={state.y}
                        onBlur={(e) => update("y", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>

                {/* Z */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-blue-400 cursor-ew-resize bg-white/5 h-full">Z</div>
                    <input
                        type="number"
                        defaultValue={state.z}
                        onBlur={(e) => update("z", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>
            </div>
        </div>
    );
};

export const Vector2Input: React.FC<{
    label: string;
    value: { x: number; y: number };
    onChange?: (v: { x: number; y: number }) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState({ x: value.x, y: value.y });


    const update = (key: "x" | "y", newVal: number) => {
        const next = { ...state, [key]: newVal };
        setState(next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center mb-1">
            <div className="w-16 text-[10px] text-editor-textDim flex items-center">
                {label}
            </div>

            <div className="flex-1 flex gap-1">
                {/* X */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-red-400 cursor-ew-resize bg-white/5 h-full">X</div>
                    <input
                        type="number"
                        defaultValue={state.x}
                        onBlur={(e) => update("x", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>

                {/* Y */}
                <div className="flex-1 flex items-center bg-editor-input rounded border border-editor-border overflow-hidden">
                    <div className="w-4 flex items-center justify-center text-[9px] font-bold text-green-400 cursor-ew-resize bg-white/5 h-full">Y</div>
                    <input
                        type="number"
                        defaultValue={state.y}
                        onBlur={(e) => update("y", parseFloat(e.target.value))}
                        className="w-full bg-transparent text-[10px] px-1 py-1 focus:outline-none text-white no-spinner"
                    />
                </div>
            </div>
        </div>
    );
};




export const Checkbox: React.FC<{
    label: string;
    checked?: boolean;
    onChange?: (v: boolean) => void;
}> = ({ label, checked = false, onChange }) => {

    const [state, setState] = React.useState(checked);

    const toggle = () => {
        const v = !state;
        setState(v);
        onChange?.(v);
    };

    return (
        <div className="flex items-center mb-2 mt-1 cursor-pointer select-none" onClick={toggle}>
            <div className="w-4 h-4 mr-2 border border-editor-border bg-editor-input rounded flex items-center justify-center">
                {state && <div className="w-2 h-2 bg-editor-accent rounded-[1px]" />}
            </div>
            <span className="text-[11px] text-editor-text">{label}</span>
        </div>
    );
};


function hexToRgb(hex: string) {
    const parsed = hex.replace("#", "");
    const r = parseInt(parsed.substring(0, 2), 16);
    const g = parseInt(parsed.substring(2, 4), 16);
    const b = parseInt(parsed.substring(4, 6), 16);
    return { r, g, b };
}

export const ColorInput: React.FC<{
    label: string;
    value: { r: number; g: number; b: number };
    onChange?: (v: { r: number; g: number; b: number }) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState({
        r: value.r * 255,
        b: value.b * 255,
        g: value.g * 255,
    });


    const rgbToHex = (v: typeof value) =>
        "#" + [v.r, v.g, v.b].map((n) => n.toString(16).padStart(2, "0")).join("");

    const hexValue = rgbToHex(state);

    const apply = (hex: string) => {
        const parsed = hex.replace("#", "");
        const next = {
            r: parseInt(parsed.slice(0, 2), 16),
            g: parseInt(parsed.slice(2, 4), 16),
            b: parseInt(parsed.slice(4, 6), 16),
        };
        setState(next);
        onChange?.(next);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim">{label}</span>

            <label
                className="flex-1 h-5 rounded border border-editor-border cursor-pointer flex items-center px-1"
                style={{ background: hexValue }}
            >
                <span className="text-[9px] mix-blend-difference text-white ml-auto">
                    {`rgb(${state.r}, ${state.g}, ${state.b})`}
                </span>

                <input
                    type="color"
                    defaultValue={hexValue}
                    onChange={(e) => apply(e.target.value)}
                    className="hidden"
                />
            </label>
        </div>
    );
};

export const NumberInput: React.FC<{
    label: string;
    value: number;
    onChange?: (v: number) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState(value);

    const update = (v: string) => {
        const n = parseFloat(v);
        setState(n);
        onChange?.(n);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim">{label}</span>
            <input
                type="number"
                defaultValue={state}
                onBlur={(e) => update(e.target.value)}
                className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent"
            />
        </div>
    );
};


export const TextInput: React.FC<{
    label: string;
    value: string;
    onChange?: (v: string) => void;
}> = ({ label, value, onChange }) => {

    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };

    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <input
                type="text"
                defaultValue={state}
                onBlur={(e) => update(e.target.value)}
                className="flex-1 bg-editor-input border border-editor-border rounded px-2 py-1 text-[10px] focus:outline-none focus:border-editor-accent"
            />
        </div>
    );
};


export const AssetInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };
    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <DragAndDropZone
                highlight={false}
                onDrop={(e) => {
                    if (e.type === 'Asset') update({ ...state, value: e.data.id })
                }} className="flex-1 flex items-center bg-editor-input border border-editor-border rounded overflow-hidden group">
                <div className="px-2 py-1 flex-1 text-[10px] text-editor-text truncate">
                    {state.value || 'None'}
                </div>
                <div
                    className="px-1.5 py-1 bg-white/5 border-l border-editor-border hover:bg-editor-accent hover:text-green-200 transition-colors text-green-800"
                >
                    <Target size={12} />
                </div>
            </DragAndDropZone>
        </div>
    );
}


export const RefInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };
    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <DragAndDropZone
                highlight={false}
                onDrop={(e) => {
                    if (e.type === 'Object') update({ ...state, ref: e.data.uuid, name: e.data.name })
                }} className="flex-1 flex items-center bg-editor-input border border-editor-border rounded overflow-hidden group">
                <div className="px-2 py-1 flex-1 text-[10px] text-editor-text truncate">
                    {state.name || 'None'}
                </div>
                <div
                    className="px-1.5 py-1 bg-transparent border-l border-editor-border hover:bg-editor-accent hover:text-blue-200 transition-colors text-blue-800"
                >
                    <Target size={12} />
                </div>
            </DragAndDropZone>
        </div>
    );
}



import fs from "@/lib/fs";

const loader = new THREE.ObjectLoader();

/**
 * Load geometry JSON file and return THREE.BufferGeometry
 */
export async function loadGeometry(url) {
  const jsonText = await fs.readFile(url, 'utf8');
  const json = JSON.parse(jsonText);

  // shapes (optional)
  const shapes = loader.parseShapes?.(json.shapes || []);

  // geometries
  const geometries = loader.parseGeometries([json], shapes);

  // usually only one geometry – return the first
  return Object.values(geometries)[0];
}

/**
 * Load material JSON file and return THREE.Material
 */
export async function loadMaterial(url) {
  const jsonText = await fs.readFile(url, 'utf8');
  const json = JSON.parse(jsonText);

  // load images (async supports base64 or URLs)
  const images = await loader.parseImagesAsync(json.images || []);

  // build textures from images
  const textures = loader.parseTextures(json.textures || [], images);

  // build materials from textures
  const materials = loader.parseMaterials([json] || [], textures);

  // usually only one material – return the first
  return Object.values(materials)[0];
}



export const MaterialGeoRefInput: React.FC<{ label: string; value: string; onChange?: (v: string) => void; }> = ({ label, value, onChange }) => {
    const [state, setState] = React.useState(value);


    const update = (v: string) => {
        setState(v);
        onChange?.(v);
    };
    return (
        <div className="flex items-center mb-2">
            <span className="w-24 text-[10px] text-editor-textDim capitalize">{label}</span>
            <DragAndDropZone
                highlight={true}
                payload={{ type: 'GeoMat', data: value }}
                onDrop={async (e) => {
                    if (e.type === 'GeoMat' && (e.data.isMaterial || e.data.isBufferGeometry)) {
                        if ((e.data.isMaterial && state.isMaterial) || (e.data.isBufferGeometry && state.isBufferGeometry)) {
                            update(e.data)
                        }
                    }
                    
                    if (e.type === 'Asset') {
                        const materialLoader = new THREE.MaterialLoader();
                        const geometryLoader = new THREE.BufferGeometryLoader();
                        //materialLoader.setTextureLoader(new THREE.TextureLoader());
                        // ---------- MATERIAL ----------
                        if (e.data.type === 'material') {
                            const material = await loadMaterial(e.data.fullPath);
                            if (material && material.isMaterial && state.isMaterial) {
                                update(material);   // your hot reload handler
                            }


                        }

                        // ---------- GEOMETRY ----------
                        if (e.data.type === 'geometry') {
                            const geometry = await loadGeometry(e.data.fullPath);

                            if (geometry && geometry.isBufferGeometry && state.isBufferGeometry) {
                                update(geometry);
                            }
                            
                        }
                    }

                }} className="flex-1 flex items-center bg-editor-input border border-state-800 rounded overflow-hidden group">
                <div className="px-2 py-1 flex-1 text-[10px] text-editor-text truncate">
                    {state.name || state.type || 'None'}
                </div>
                <div
                    className="px-1.5 py-1 bg-transparent border-l border-editor-border hover:bg-editor-accent hover:text-red-200 transition-colors text-red-800"
                    onClick={e => {
                        editor.api.buses.selectionUpdate.emit(state)
                    }}
                >
                    <Target size={12} />
                </div>
            </DragAndDropZone>
        </div>
    );
}




import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, RefreshCw } from 'lucide-react';
import * as THREE from 'three';

interface TextureInputProps {
    label: string;
    value: THREE.Texture | null;
    onChange: (texture: THREE.Texture | null) => void;
    onPropertyChange?: (property: string, value: any) => void;
}

export const TextureInput: React.FC<TextureInputProps> = ({
    label,
    value,
    onChange,
    onPropertyChange
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    // Generate preview when texture changes
    React.useEffect(() => {
        if (value?.image) {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const img = value.image;
                const maxSize = 64;
                const scale = Math.min(maxSize / img.width, maxSize / img.height);

                canvas.width = img.width * scale;
                canvas.height = img.height * scale;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setPreview(canvas.toDataURL());
            } catch (e) {
                console.warn('Failed to generate texture preview', e);
            }
        } else {
            setPreview(null);
        }
    }, [value]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.name = file.name;
                onChange(texture);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClear = () => {
        onChange(null);
        setPreview(null);
    };

    const handleWrapChange = (axis: 'wrapS' | 'wrapT', value: string) => {
        if (!value || !onPropertyChange) return;

        const wrapValue = value === 'repeat' ? THREE.RepeatWrapping :
            value === 'clamp' ? THREE.ClampToEdgeWrapping :
                THREE.MirroredRepeatWrapping;

        onPropertyChange(axis, wrapValue);
    };

    const handleFilterChange = (type: 'minFilter' | 'magFilter', value: string) => {
        if (!value || !onPropertyChange) return;

        let filterValue;
        if (type === 'magFilter') {
            filterValue = value === 'linear' ? THREE.LinearFilter : THREE.NearestFilter;
        } else {
            filterValue = value === 'linear' ? THREE.LinearFilter :
                value === 'nearest' ? THREE.NearestFilter :
                    value === 'linear-mipmap-linear' ? THREE.LinearMipmapLinearFilter :
                        value === 'linear-mipmap-nearest' ? THREE.LinearMipmapNearestFilter :
                            value === 'nearest-mipmap-linear' ? THREE.NearestMipmapLinearFilter :
                                THREE.NearestMipmapNearestFilter;
        }

        onPropertyChange(type, filterValue);
    };

    return (
        <div className="flex flex-col gap-2 py-2 border-b border-[#3f3f46]">
            <div className="flex items-center justify-between">
                <label className="text-xs text-[#a1a1aa] font-medium">{label}</label>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] text-[#71717a] hover:text-[#d4d4d8]"
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
            </div>

            <div className="flex items-center gap-2">
                {/* Preview */}
                <div className="w-16 h-16 bg-[#18181b] border border-[#3f3f46] rounded flex items-center justify-center overflow-hidden">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Texture preview"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <ImageIcon size={24} className="text-[#52525b]" />
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 flex flex-col gap-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-xs bg-[#3f3f46] hover:bg-[#52525b] text-[#d4d4d8] rounded flex items-center justify-center gap-1"
                    >
                        <Upload size={12} />
                        {value ? 'Replace' : 'Upload'}
                    </button>

                    {value && (
                        <button
                            onClick={handleClear}
                            className="px-2 py-1 text-xs bg-[#3f3f46] hover:bg-red-900/50 text-red-400 rounded flex items-center justify-center gap-1"
                        >
                            <X size={12} />
                            Clear
                        </button>
                    )}

                    {value?.name && (
                        <div className="text-[10px] text-[#71717a] truncate">
                            {value.name}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Properties */}
            {isExpanded && value && (
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-[#3f3f46]">
                    {/* Wrap S */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#71717a]">Wrap S</label>
                        <select
                            defaultValue={
                                value.wrapS === THREE.RepeatWrapping ? 'repeat' :
                                    value.wrapS === THREE.ClampToEdgeWrapping ? 'clamp' : 'mirror'
                            }
                            onInput={(e) => handleWrapChange('wrapS', e.target.value)}
                            className="px-2 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                        >
                            <option value="repeat">Repeat</option>
                            <option value="clamp">Clamp</option>
                            <option value="mirror">Mirror</option>
                        </select>
                    </div>

                    {/* Wrap T */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#71717a]">Wrap T</label>
                        <select
                            defaultValue={
                                value.wrapT === THREE.RepeatWrapping ? 'repeat' :
                                    value.wrapT === THREE.ClampToEdgeWrapping ? 'clamp' : 'mirror'
                            }
                            onInput={(e) => handleWrapChange('wrapT', e.target.value)}
                            className="px-2 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                        >
                            <option value="repeat">Repeat</option>
                            <option value="clamp">Clamp</option>
                            <option value="mirror">Mirror</option>
                        </select>
                    </div>

                    {/* Min Filter */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#71717a]">Min Filter</label>
                        <select
                            defaultValue={
                                value.minFilter === THREE.LinearFilter ? 'linear' :
                                    value.minFilter === THREE.NearestFilter ? 'nearest' :
                                        value.minFilter === THREE.LinearMipmapLinearFilter ? 'linear-mipmap-linear' :
                                            value.minFilter === THREE.LinearMipmapNearestFilter ? 'linear-mipmap-nearest' :
                                                value.minFilter === THREE.NearestMipmapLinearFilter ? 'nearest-mipmap-linear' :
                                                    'nearest-mipmap-nearest'
                            }
                            onInput={(e) => handleFilterChange('minFilter', e.target.value)}
                            className="px-2 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                        >
                            <option value="linear">Linear</option>
                            <option value="nearest">Nearest</option>
                            <option value="linear-mipmap-linear">Linear Mipmap Linear</option>
                            <option value="linear-mipmap-nearest">Linear Mipmap Nearest</option>
                            <option value="nearest-mipmap-linear">Nearest Mipmap Linear</option>
                            <option value="nearest-mipmap-nearest">Nearest Mipmap Nearest</option>
                        </select>
                    </div>

                    {/* Mag Filter */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#71717a]">Mag Filter</label>
                        <select
                            defaultValue={value.magFilter === THREE.LinearFilter ? 'linear' : 'nearest'}
                            onInput={(e) => handleFilterChange('magFilter', e.target.value)}
                            className="px-2 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                        >
                            <option value="linear">Linear</option>
                            <option value="nearest">Nearest</option>
                        </select>
                    </div>

                    {/* Repeat */}

                    <Vector2Input label="Repeat" value={value.repeat} onChange={(e) => {
                        onPropertyChange?.('repeat.x', parseFloat(e.x))
                        onPropertyChange?.('repeat.y', parseFloat(e.y))
                    }} />


                    {/* Offset */}
                    <Vector2Input label="Offset" value={value.offset} onChange={(e) => {
                        onPropertyChange?.('offset.x', parseFloat(e.x))
                        onPropertyChange?.('offset.y', parseFloat(e.y))
                    }} />


                    {/* Center */}
                    <Vector2Input label="Center" value={value.center} onChange={(e) => {
                        onPropertyChange?.('center.x', parseFloat(e.x))
                        onPropertyChange?.('center.y', parseFloat(e.y))
                    }} />

                    {/* Rotation */}
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#71717a]">Rotation</label>
                        <input
                            type="number"
                            defaultValue={(value.rotation * 180 / Math.PI).toFixed(1)}
                            onBlur={(e) => onPropertyChange?.('rotation', parseFloat(e.target.value) * Math.PI / 180)}
                            className="w-16 px-2 py-0.5 text-[10px] bg-[#27272a] border border-[#3f3f46] text-[#d4d4d8] rounded"
                            step="1"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Usage in inspector:
// if (typeof val === 'object' && val?.isTexture) {
//     return <TextureInput
//         key={`${key}-texture`}
//         label={label}
//         value={val}
//         onChange={(texture) => {
//             editor.setProperty(object, key, texture);
//         }}
//         onPropertyChange={(prop, value) => {
//             editor.setProperty(object, `${key}.${prop}`, value);
//         }}
//     />;
// }