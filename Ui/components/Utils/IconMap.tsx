import React from 'react';
import {
  // Primitives & 3D Objects
  Box,
  Circle,
  Cylinder,
  Square,
  Layers,
  Folder,
  FolderOpen,
  Move3d,
  Sparkles,
  Volume2,
  HelpCircle,
  Bone,
  GitBranch,
  PersonStanding,

  // Lights & Environment
  Sun,
  Lightbulb,
  Zap,
  CloudSun,

  // Cameras
  Camera,
  Video,

  // Assets & Resources
  Palette,
  Image as ImageIcon,
  FileImage,
  FileCode,
  FileText,
  Film,
  Grid3x3,
  Globe,
  Binary,
  Code2,
  FileCog,
  Component,
  Sliders
} from 'lucide-react';
import { ObjectType } from '../../types';

export interface IconOptions {
  size?: number;
  className?: string;
  isExpanded?: boolean;
}

// ----------------------------------------------------------------------
// 1. Hierarchy & Scene Object Icon Resolver
// ----------------------------------------------------------------------
export function getHierarchyIcon(node: any, options: IconOptions = {}): React.ReactElement {
  const size = options.size ?? 12;
  const customClass = options.className ?? '';
  const isExpanded = options.isExpanded ?? (node?.userData?.expanded !== false);

  if (!node) {
    return <HelpCircle size={size} className={`text-zinc-500 shrink-0 ${customClass}`} />;
  }

  const type = node?.userData?.type || node?.type || '';
  const typeLower = String(type).toLowerCase();

  // Scene Root
  if (node?.isScene || type === ObjectType.SCENE || typeLower === 'scene') {
    return <Layers size={size} className={`text-amber-400 shrink-0 ${customClass}`} />;
  }

  // Camera
  if (node?.isCamera || type === ObjectType.CAMERA || typeLower.includes('camera')) {
    return <Camera size={size} className={`text-sky-400 shrink-0 ${customClass}`} />;
  }

  // Directional Light
  if (type === ObjectType.DIRECTIONAL_LIGHT || typeLower === 'directionallight') {
    return <Sun size={size} className={`text-amber-300 shrink-0 ${customClass}`} />;
  }

  // Spot Light
  if (type === ObjectType.SPOT_LIGHT || typeLower === 'spotlight') {
    return <Zap size={size} className={`text-yellow-400 shrink-0 ${customClass}`} />;
  }

  // Ambient Light
  if (type === ObjectType.AMBIENT_LIGHT || typeLower === 'ambientlight') {
    return <CloudSun size={size} className={`text-amber-200 shrink-0 ${customClass}`} />;
  }

  // Point Light & General Lights
  if (node?.isLight || type === ObjectType.POINTLIGHT || typeLower.includes('light')) {
    return <Lightbulb size={size} className={`text-yellow-400 shrink-0 ${customClass}`} />;
  }

  // Group / Folder
  if (type === ObjectType.FOLDER || node?.isGroup || typeLower === 'group' || typeLower === 'folder') {
    return isExpanded ? (
      <FolderOpen size={size} className={`text-amber-400 shrink-0 ${customClass}`} />
    ) : (
      <Folder size={size} className={`text-amber-400 shrink-0 ${customClass}`} />
    );
  }

  // Basic Primitives
  if (type === ObjectType.SPHERE || typeLower === 'sphere') {
    return <Circle size={size} className={`text-emerald-400 shrink-0 ${customClass}`} />;
  }
  if (type === ObjectType.CYLINDER || typeLower === 'cylinder') {
    return <Cylinder size={size} className={`text-emerald-400 shrink-0 ${customClass}`} />;
  }
  if (type === ObjectType.PLANE || typeLower === 'plane') {
    return <Square size={size} className={`text-emerald-400 shrink-0 ${customClass}`} />;
  }

  // Audio / Sound
  if (typeLower.includes('audio') || typeLower.includes('sound')) {
    return <Volume2 size={size} className={`text-purple-400 shrink-0 ${customClass}`} />;
  }

  // Particle Emitter / Effects
  if (typeLower.includes('particle') || typeLower.includes('emitter') || typeLower.includes('effect')) {
    return <Sparkles size={size} className={`text-fuchsia-400 shrink-0 ${customClass}`} />;
  }

  // Skinned Mesh (MUST check before isMesh because SkinnedMesh extends Mesh)
  if (node?.isSkinnedMesh || typeLower === 'skinnedmesh' || typeLower.includes('skinned')) {
    return <PersonStanding size={size} className={`text-rose-400 shrink-0 ${customClass}`} />;
  }

  // Bones & Armatures
  if (node?.isBone || typeLower === 'bone' || typeLower.includes('armature')) {
    return <Bone size={size} className={`text-amber-300 shrink-0 ${customClass}`} />;
  }

  // General Mesh
  if (node?.isMesh || typeLower.includes('mesh')) {
    return <Box size={size} className={`text-emerald-400 shrink-0 ${customClass}`} />;
  }

  // Generic Object3D
  if (node?.isObject3D || typeLower === 'object3d') {
    return <Move3d size={size} className={`text-indigo-400 shrink-0 ${customClass}`} />;
  }

  return <Box size={size} className={`text-emerald-400 shrink-0 ${customClass}`} />;
}

// ----------------------------------------------------------------------
// 2. Runtime Resource Browser Icon Resolver
// ----------------------------------------------------------------------
export function getRuntimeResourceIcon(resourceOrCategory: any, options: IconOptions = {}): React.ReactElement {
  const size = options.size ?? 32;
  const customClass = options.className ?? '';

  if (!resourceOrCategory) {
    return <FileText size={size} className={`text-zinc-500 ${customClass}`} />;
  }

  // String Category lookup (e.g. for tabs or category headings)
  if (typeof resourceOrCategory === 'string') {
    const cat = resourceOrCategory.toLowerCase();
    switch (cat) {
      case 'objects':
      case 'object3d':
        return <Move3d size={size} className={`text-indigo-400 ${customClass}`} />;
      case 'materials':
      case 'material':
        return <Palette size={size} className={`text-pink-400 ${customClass}`} />;
      case 'geometries':
      case 'geometry':
      case 'buffergeometry':
        return <Grid3x3 size={size} className={`text-emerald-400 ${customClass}`} />;
      case 'textures':
      case 'texture':
        return <ImageIcon size={size} className={`text-purple-400 ${customClass}`} />;
      default:
        return <FileText size={size} className={`text-zinc-500 ${customClass}`} />;
    }
  }

  const asset = resourceOrCategory;
  const typeLower = String(asset?.type || '').toLowerCase();

  // Materials
  if (asset.isMaterial || typeLower.includes('material')) {
    return <Palette size={size} className={`text-pink-400 ${customClass}`} />;
  }

  // Textures
  if (asset.isTexture || typeLower.includes('texture')) {
    return <ImageIcon size={size} className={`text-purple-400 ${customClass}`} />;
  }

  // Geometries
  if (asset.isGeometry || asset.isBufferGeometry || typeLower.includes('geometry')) {
    return <Grid3x3 size={size} className={`text-emerald-400 ${customClass}`} />;
  }

  // Skinned Mesh (MUST check before isMesh because SkinnedMesh extends Mesh)
  if (asset.isSkinnedMesh || typeLower === 'skinnedmesh' || typeLower.includes('skinned')) {
    return <PersonStanding size={size} className={`text-rose-400 ${customClass}`} />;
  }

  // Bones & Armatures
  if (asset.isBone || typeLower === 'bone' || typeLower.includes('armature')) {
    return <Bone size={size} className={`text-amber-300 ${customClass}`} />;
  }

  // Meshes
  if (asset.isMesh || typeLower.includes('mesh')) {
    return <Box size={size} className={`text-cyan-400 ${customClass}`} />;
  }

  // Lights
  if (asset.isLight || typeLower.includes('light')) {
    return <Lightbulb size={size} className={`text-yellow-400 ${customClass}`} />;
  }

  // Cameras
  if (asset.isCamera || typeLower.includes('camera')) {
    return <Camera size={size} className={`text-sky-400 ${customClass}`} />;
  }

  // Groups
  if (asset.isGroup || typeLower.includes('group')) {
    return <Folder size={size} className={`text-amber-400 ${customClass}`} />;
  }

  // Animation Clips
  if (asset.isAnimationClip || typeLower.includes('animation') || typeLower.includes('clip')) {
    return <Film size={size} className={`text-teal-400 ${customClass}`} />;
  }

  // General Object3D
  if (asset.isObject3D || typeLower.includes('object3d')) {
    return <Move3d size={size} className={`text-indigo-400 ${customClass}`} />;
  }

  return <FileText size={size} className={`text-zinc-400 ${customClass}`} />;
}

// ----------------------------------------------------------------------
// 3. Asset Browser & File System Icon Resolver
// ----------------------------------------------------------------------
export function getAssetIcon(assetOrType: any, options: IconOptions = {}): React.ReactElement {
  const size = options.size ?? 32;
  const customClass = options.className ?? '';

  let type = '';
  let filename = '';

  if (typeof assetOrType === 'string') {
    type = assetOrType.toLowerCase();
    filename = assetOrType.toLowerCase();
  } else if (assetOrType && typeof assetOrType === 'object') {
    type = String(assetOrType.type || '').toLowerCase();
    filename = String(assetOrType.name || assetOrType.id || assetOrType.fullPath || '').toLowerCase();
  }

  // 1. Folders & Directories
  if (type === 'folder' || type === 'directory') {
    return <Folder size={size} className={`text-amber-400 fill-amber-400/20 ${customClass}`} />;
  }

  // 2. Skinned Mesh / Rigged Character
  if (
    type === 'skinnedmesh' ||
    type === 'avatar' ||
    type === 'character' ||
    filename.includes('skinned')
  ) {
    return <PersonStanding size={size} className={`text-rose-400 ${customClass}`} />;
  }

  // 3. Models / 3D Objects
  if (
    type === 'model' ||
    type === 'mesh' ||
    filename.endsWith('.gltf') ||
    filename.endsWith('.glb') ||
    filename.endsWith('.obj') ||
    filename.endsWith('.fbx') ||
    filename.endsWith('object.bin')
  ) {
    return <Box size={size} className={`text-cyan-400 ${customClass}`} />;
  }

  // 3. Materials
  if (
    type === 'material' ||
    filename.endsWith('.mat') ||
    filename.endsWith('.material') ||
    filename.endsWith('mat.bin')
  ) {
    return <Palette size={size} className={`text-pink-400 ${customClass}`} />;
  }

  // 4. Textures & Images
  if (
    type === 'texture' ||
    type === 'image' ||
    filename.endsWith('tex.bin') ||
    filename.endsWith('.png') ||
    filename.endsWith('.jpg') ||
    filename.endsWith('.jpeg') ||
    filename.endsWith('.webp') ||
    filename.endsWith('.hdr') ||
    filename.endsWith('.exr') ||
    filename.endsWith('.svg')
  ) {
    return <FileImage size={size} className={`text-purple-400 ${customClass}`} />;
  }

  // 5. Scripts & Code
  if (
    type === 'script' ||
    type === 'code' ||
    filename.endsWith('.js') ||
    filename.endsWith('.ts') ||
    filename.endsWith('.tsx') ||
    filename.endsWith('.jsx') ||
    filename.endsWith('.lua') ||
    filename.endsWith('.py')
  ) {
    return <FileCode size={size} className={`text-amber-400 ${customClass}`} />;
  }

  // 6. Geometry
  if (type === 'geometry' || filename.endsWith('geo.bin') || filename.endsWith('.geo')) {
    return <Grid3x3 size={size} className={`text-emerald-400 ${customClass}`} />;
  }

  // 7. Animation
  if (type === 'animation' || filename.endsWith('anim.bin') || filename.endsWith('.anim') || filename.endsWith('.bvh')) {
    return <Film size={size} className={`text-teal-400 ${customClass}`} />;
  }

  // 8. Shaders
  if (
    type === 'shader' ||
    filename.endsWith('.glsl') ||
    filename.endsWith('.vert') ||
    filename.endsWith('.frag') ||
    filename.endsWith('.wgsl')
  ) {
    return <Code2 size={size} className={`text-red-400 ${customClass}`} />;
  }

  // 9. Scene files
  if (type === 'scene' || filename.endsWith('.scene') || filename.endsWith('primary.bin')) {
    return <Layers size={size} className={`text-amber-400 ${customClass}`} />;
  }

  // 10. Configurations & Data (JSON / TOML / YAML)
  if (filename.endsWith('.json') || filename.endsWith('.toml') || filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    return <FileCog size={size} className={`text-sky-400 ${customClass}`} />;
  }

  // 11. Generic Binary files
  if (filename.endsWith('.bin')) {
    return <Binary size={size} className={`text-zinc-400 ${customClass}`} />;
  }

  // Default Fallback
  return <FileText size={size} className={`text-zinc-400 ${customClass}`} />;
}

// ----------------------------------------------------------------------
// 4. Universal Icon Resolver
// ----------------------------------------------------------------------
export function getUniversalIcon(item: any, options: IconOptions = {}): React.ReactElement {
  if (!item) {
    return <HelpCircle size={options.size ?? 16} className="text-zinc-500" />;
  }

  // If it's a Three.js scene object
  if (item.isObject3D || item.isMesh || item.isLight || item.isCamera || item.isScene || item.isGroup) {
    return getHierarchyIcon(item, options);
  }

  // If it's a Material, Texture, or Geometry instance
  if (item.isMaterial || item.isTexture || item.isBufferGeometry || item.isGeometry) {
    return getRuntimeResourceIcon(item, options);
  }

  // If it's a File/Asset info object
  if (item.fullPath || item.size !== undefined || item.type === 'folder' || typeof item === 'string') {
    return getAssetIcon(item, options);
  }

  return getHierarchyIcon(item, options);
}

export default {
  getHierarchyIcon,
  getRuntimeResourceIcon,
  getAssetIcon,
  getUniversalIcon,
};
