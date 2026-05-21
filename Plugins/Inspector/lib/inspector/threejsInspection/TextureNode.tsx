import React, { useState, useEffect, useRef, useReducer } from 'react';
import * as THREE from 'three';
import { InspectorCategory } from '../components/InspectorPanel';
import { TextInput } from '../components/TextInput';
import { BooleanInput } from '../components/BooleanInput';
import { NumberInput } from '../components/NumberInput';
import { SelectInput } from '../components/SelectInput';
import { Vector2Input } from '../components/Vector2Input';

const mappingOptions = [
  { label: 'UVMapping', value: THREE.UVMapping },
  { label: 'CubeReflectionMapping', value: THREE.CubeReflectionMapping },
  { label: 'CubeRefractionMapping', value: THREE.CubeRefractionMapping },
  { label: 'EquirectangularReflectionMapping', value: THREE.EquirectangularReflectionMapping },
  { label: 'EquirectangularRefractionMapping', value: THREE.EquirectangularRefractionMapping },
  { label: 'CubeUVReflectionMapping', value: THREE.CubeUVReflectionMapping },
];

const wrapOptions = [
  { label: 'RepeatWrapping', value: THREE.RepeatWrapping },
  { label: 'ClampToEdgeWrapping', value: THREE.ClampToEdgeWrapping },
  { label: 'MirroredRepeatWrapping', value: THREE.MirroredRepeatWrapping },
];

const magFilterOptions = [
  { label: 'NearestFilter', value: THREE.NearestFilter },
  { label: 'LinearFilter', value: THREE.LinearFilter },
];

const minFilterOptions = [
  { label: 'NearestFilter', value: THREE.NearestFilter },
  { label: 'NearestMipmapNearestFilter', value: THREE.NearestMipmapNearestFilter },
  { label: 'NearestMipmapLinearFilter', value: THREE.NearestMipmapLinearFilter },
  { label: 'LinearFilter', value: THREE.LinearFilter },
  { label: 'LinearMipmapNearestFilter', value: THREE.LinearMipmapNearestFilter },
  { label: 'LinearMipmapLinearFilter', value: THREE.LinearMipmapLinearFilter },
];

const formatOptions = [
  { label: 'AlphaFormat', value: THREE.AlphaFormat },
  { label: 'RGBFormat', value: THREE.RGBFormat },
  { label: 'RGBAFormat', value: THREE.RGBAFormat },
  { label: 'DepthFormat', value: THREE.DepthFormat },
  { label: 'DepthStencilFormat', value: THREE.DepthStencilFormat },
  { label: 'RedFormat', value: THREE.RedFormat },
  { label: 'RedIntegerFormat', value: THREE.RedIntegerFormat },
  { label: 'RGFormat', value: THREE.RGFormat },
  { label: 'RGIntegerFormat', value: THREE.RGIntegerFormat },
  { label: 'RGBIntegerFormat', value: THREE.RGBIntegerFormat },
  { label: 'RGBAIntegerFormat', value: THREE.RGBAIntegerFormat },
];

const typeOptions = [
  { label: 'UnsignedByteType', value: THREE.UnsignedByteType },
  { label: 'ByteType', value: THREE.ByteType },
  { label: 'ShortType', value: THREE.ShortType },
  { label: 'UnsignedShortType', value: THREE.UnsignedShortType },
  { label: 'IntType', value: THREE.IntType },
  { label: 'UnsignedIntType', value: THREE.UnsignedIntType },
  { label: 'FloatType', value: THREE.FloatType },
  { label: 'HalfFloatType', value: THREE.HalfFloatType },
  { label: 'UnsignedShort4444Type', value: THREE.UnsignedShort4444Type },
  { label: 'UnsignedShort5551Type', value: THREE.UnsignedShort5551Type },
  { label: 'UnsignedInt248Type', value: THREE.UnsignedInt248Type },
];

const colorSpaceOptions = [
  { label: 'NoColorSpace', value: THREE.NoColorSpace },
  { label: 'SRGBColorSpace', value: THREE.SRGBColorSpace },
  { label: 'LinearSRGBColorSpace', value: THREE.LinearSRGBColorSpace },
];

export const TextureNode = ({ obj, title = "Texture", expanded = true }: { obj: any, title?: string, expanded?: boolean }) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const imgSource = Array.isArray(obj.image) ? obj.image[0] : obj.image;
    
    if (!imgSource) {
      setPreviewUrl(null);
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgSource.width || 128;
      canvas.height = imgSource.height || 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);
        if (active) setPreviewUrl(canvas.toDataURL());
      }
    } catch (e) {
      console.warn("Could not generate texture preview", e);
      if (active) setPreviewUrl(null);
    }

    return () => { active = false; };
  }, [obj, obj.image, obj.uuid]);

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      obj.image = img;
      obj.needsUpdate = true;
      forceUpdate();
    };
    img.src = url;
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const imgSource = Array.isArray(obj.image) ? obj.image[0] : obj.image;
    if (!imgSource) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgSource.width || 128;
      canvas.height = imgSource.height || 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgSource, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = (obj.name || 'texture') + '.png';
        a.click();
      }
    } catch (e) {
      console.error("Failed to export texture", e);
    }
  };

  const handleRemove = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillRect(0, 0, 1, 1);
    }
    obj.image = canvas;
    obj.needsUpdate = true;
    forceUpdate();
  };

  const handlePropertyChange = () => {
    obj.needsUpdate = true;
    forceUpdate();
  };

  return (
    <InspectorCategory title={title} defaultExpanded={expanded}>
      <TextInput label="UUID" obj={obj} prop="uuid" disabled={true} />
      <TextInput label="Name" obj={obj} prop="name" />
      
      <div className="mt-2 mb-3">
        <div className="text-xs text-gray-400 mb-1">Preview & Actions</div>
        <div className="flex gap-2">
          <div className="w-[128px] bg-[#141414] border border-[#333] rounded flex items-center justify-center overflow-hidden" style={{ minHeight: '64px' }}>
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" style={{ width: '128px', height: 'auto', objectFit: 'contain' }} />
            ) : (
              <span className="text-gray-600 text-[10px]">No Image</span>
            )}
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleReplace} />
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#252525] hover:bg-[#333] text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors text-left">
              Replace
            </button>
            <button onClick={handleExport} disabled={!obj.image} className="bg-[#252525] hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors text-left">
              Export
            </button>
            <button onClick={handleRemove} disabled={!obj.image} className="bg-[#252525] hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs py-1 px-2 rounded border border-[#333] transition-colors text-left">
              Remove Source
            </button>
          </div>
        </div>
      </div>
      
      <SelectInput label="Mapping" obj={obj} prop="mapping" options={mappingOptions} onChange={handlePropertyChange} />
      <SelectInput label="Wrap S" obj={obj} prop="wrapS" options={wrapOptions} onChange={handlePropertyChange} />
      <SelectInput label="Wrap T" obj={obj} prop="wrapT" options={wrapOptions} onChange={handlePropertyChange} />
      
      <SelectInput label="Mag Filter" obj={obj} prop="magFilter" options={magFilterOptions} onChange={handlePropertyChange} />
      <SelectInput label="Min Filter" obj={obj} prop="minFilter" options={minFilterOptions} onChange={handlePropertyChange} />
      
      <NumberInput label="Anisotropy" obj={obj} prop="anisotropy" step={1} min={1} onChange={handlePropertyChange} />
      
      <SelectInput label="Format" obj={obj} prop="format" options={formatOptions} onChange={handlePropertyChange} />
      <SelectInput label="Type" obj={obj} prop="type" options={typeOptions} onChange={handlePropertyChange} />
      
      <Vector2Input label="Offset" obj={obj} prop="offset" step={0.01} onChange={handlePropertyChange} />
      <Vector2Input label="Repeat" obj={obj} prop="repeat" step={0.01} onChange={handlePropertyChange} />
      <Vector2Input label="Center" obj={obj} prop="center" step={0.01} onChange={handlePropertyChange} />
      
      <NumberInput label="Rotation" obj={obj} prop="rotation" step={0.01} onChange={handlePropertyChange} />
      
      <BooleanInput label="Generate Mipmaps" obj={obj} prop="generateMipmaps" onChange={handlePropertyChange} />
      <BooleanInput label="Premultiply Alpha" obj={obj} prop="premultiplyAlpha" onChange={handlePropertyChange} />
      <BooleanInput label="Flip Y" obj={obj} prop="flipY" onChange={handlePropertyChange} />
      
      <NumberInput label="Unpack Alignment" obj={obj} prop="unpackAlignment" step={1} min={1} max={8} onChange={handlePropertyChange} />
      
      <SelectInput label="Color Space" obj={obj} prop="colorSpace" options={colorSpaceOptions} onChange={handlePropertyChange} />
    </InspectorCategory>
  );
};
