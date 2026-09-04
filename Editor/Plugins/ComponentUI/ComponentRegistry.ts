import React from 'react';
import {
  FileCode,
  Activity,
  BoxSelect,
  Volume2,
  PlaySquare,
  Layout,
  Layers,
  Camera,
  Lightbulb,
  Box,
  Globe,
  LucideIcon
} from 'lucide-react';

export interface ComponentProps {
  object: any;
  componentKey: string;
  nameCode?: number;
  componentData: any;
  basePath: string; // e.g. "userData.components.5"
}

export type ComponentRenderer = React.ComponentType<ComponentProps>;

export interface ComponentMetadata {
  name: string;
  description: string;
  icon: LucideIcon;
  nameCode: number;
  key: string;
}

class ComponentRegistryManager {
  private renderers = new Map<string, ComponentRenderer>();
  private metadata = new Map<string, Partial<ComponentMetadata>>();

  register(keyOrNameCode: string | number, renderer: ComponentRenderer, meta?: Partial<ComponentMetadata>) {
    const key = String(keyOrNameCode).toLowerCase();
    this.renderers.set(key, renderer);
    if (meta) {
      this.metadata.set(key, meta);
    }
  }

  getRenderer(keyOrNameCode: string | number): ComponentRenderer | undefined {
    const key = String(keyOrNameCode).toLowerCase();
    return this.renderers.get(key);
  }

  getIcon(keyOrNameCode: string | number): LucideIcon {
    const str = String(keyOrNameCode).toLowerCase();
    if (str.includes('script') || str === '7') return FileCode;
    if (str.includes('rigidbody') || str === '5') return Activity;
    if (str.includes('collider') || str === '6') return BoxSelect;
    if (str.includes('audio') || str === '9') return Volume2;
    if (str.includes('animation') || str === '8') return PlaySquare;
    if (str.includes('uielement') || str === '10') return Layout;
    if (str.includes('lod') || str === '11') return Layers;
    if (str.includes('light') || str === '4') return Lightbulb;
    if (str.includes('camera') || str === '2') return Camera;
    if (str.includes('mesh') || str === '3') return Box;
    if (str.includes('transform') || str === '1') return Globe;
    return Layers;
  }

  getTitle(componentKey: string, componentData: any): string {
    if (componentData?.name) return componentData.name;
    if (componentData?.key) {
      return componentData.key.charAt(0).toUpperCase() + componentData.key.slice(1);
    }
    const meta = this.metadata.get(componentKey.toLowerCase());
    if (meta?.name) return meta.name;
    return componentKey.charAt(0).toUpperCase() + componentKey.slice(1);
  }
}

export const ComponentRegistry = new ComponentRegistryManager();
