export interface Point {
  x: number;
  y: number;
}

export interface Path {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  mask: string;
  falloff: number;
  isEraser?: boolean;
}

export interface TextureAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
}

export interface BrushSettings {
  color: string;
  size: number;
  falloff: number;
  opacity: number;
  mask: string;
}

export type EditorTool = 'pan' | 'brush' | 'eraser';

export const DEFAULT_ADJUSTMENTS: TextureAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
};

export const DEFAULT_BRUSH: BrushSettings = {
  color: '#ffffff',
  size: 5,
  falloff: 0,
  opacity: 100,
  mask: 'solid',
};
