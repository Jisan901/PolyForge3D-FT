export enum ObjectType {
  // Scene & Organization
  SCENE = 'Scene',
  FOLDER = 'Group',
  OBJECT3D = 'Object3D',
  
  // Basic Geometries
  CUBE = 'CUBE',
  SPHERE = 'SPHERE',
  CYLINDER = 'CYLINDER',
  PLANE = 'PLANE',
  CAPSULE = 'CAPSULE',
  
  // Additional Geometries
  CONE = 'CONE',
  TORUS = 'TORUS',
  TORUS_KNOT = 'TORUS_KNOT',
  DODECAHEDRON = 'DODECAHEDRON',
  ICOSAHEDRON = 'ICOSAHEDRON',
  OCTAHEDRON = 'OCTAHEDRON',
  TETRAHEDRON = 'TETRAHEDRON',
  RING = 'RING',
  CIRCLE = 'CIRCLE',
  
  // Advanced Geometries
  LATHE = 'LATHE',
  EXTRUDE = 'EXTRUDE',
  SHAPE = 'SHAPE',
  TUBE = 'TUBE',
  
  // Lights
  POINTLIGHT = 'PointLight',
  DIRECTIONAL_LIGHT = 'DirectionalLight',
  SPOT_LIGHT = 'SpotLight',
  AMBIENT_LIGHT = 'AmbientLight',
  HEMISPHERE_LIGHT = 'HemisphereLight',
  RECT_AREA_LIGHT = 'RectAreaLight',
  
  // Cameras
  CAMERA = 'PerspectiveCamera',
  ORTHOGRAPHIC_CAMERA = 'OrthographicCamera',
  
  // Helpers
  GRID_HELPER = 'GridHelper',
  AXES_HELPER = 'AxesHelper',
  BOX_HELPER = 'BoxHelper',
  ARROW_HELPER = 'ArrowHelper',
  
  // Special Objects
  SPRITE = 'Sprite',
  LINE = 'Line',
  LINE_SEGMENTS = 'LineSegments',
  POINTS = 'Points',
  
  // Other
  MATERIAL = 'MATERIAL',
  SCRIPT = 'SCRIPT'
}

export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  children?: SceneObject[];
  expanded?: boolean;
  transform?: Transform;
  properties?: Record<string, any>;
}

export interface AssetFile {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'model' | 'script' | 'material';
  size?: string;
}

export type ViewMode = 'SCENE' | 'GAME' | 'ANIMATION';