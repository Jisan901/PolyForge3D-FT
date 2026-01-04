import { ObjectType } from '../../types';

interface MenuItem {
  label: string;
  action: () => void;
  type?: 'separator' | 'submenu';
  children?: MenuItem[];
}

type AddObjectFunction = (type: ObjectType, id: string) => void;

export function getMenu(addObject: AddObjectFunction, id: string): MenuItem[] {
  return [
    // Basic Geometries Section
    {
      label: 'Mesh',
      type: 'submenu',
      children: [
        { label: 'Cube', action: () => addObject(ObjectType.CUBE, id) },
        { label: 'Sphere', action: () => addObject(ObjectType.SPHERE, id) },
        { label: 'Cylinder', action: () => addObject(ObjectType.CYLINDER, id) },
        { label: 'Plane', action: () => addObject(ObjectType.PLANE, id) },
        { label: 'Capsule', action: () => addObject(ObjectType.CAPSULE, id) },
        { label: 'Cone', action: () => addObject(ObjectType.CONE, id) },
        { type: 'separator' } as MenuItem,
        { label: 'Torus', action: () => addObject(ObjectType.TORUS, id) },
        { label: 'Torus Knot', action: () => addObject(ObjectType.TORUS_KNOT, id) },
        { label: 'Ring', action: () => addObject(ObjectType.RING, id) },
        { label: 'Circle', action: () => addObject(ObjectType.CIRCLE, id) },
        { type: 'separator' } as MenuItem,
        { label: 'Dodecahedron', action: () => addObject(ObjectType.DODECAHEDRON, id) },
        { label: 'Icosahedron', action: () => addObject(ObjectType.ICOSAHEDRON, id) },
        { label: 'Octahedron', action: () => addObject(ObjectType.OCTAHEDRON, id) },
        { label: 'Tetrahedron', action: () => addObject(ObjectType.TETRAHEDRON, id) },
        { type: 'separator' } as MenuItem,
        { label: 'Lathe', action: () => addObject(ObjectType.LATHE, id) },
        { label: 'Tube', action: () => addObject(ObjectType.TUBE, id) }
      ]
    },

    // Lights Section
    {
      label: 'Light',
      type: 'submenu',
      children: [
        { label: 'Point Light', action: () => addObject(ObjectType.POINTLIGHT, id) },
        { label: 'Directional Light', action: () => addObject(ObjectType.DIRECTIONAL_LIGHT, id) },
        { label: 'Spot Light', action: () => addObject(ObjectType.SPOT_LIGHT, id) },
        { label: 'Ambient Light', action: () => addObject(ObjectType.AMBIENT_LIGHT, id) },
        { label: 'Hemisphere Light', action: () => addObject(ObjectType.HEMISPHERE_LIGHT, id) },
        { label: 'Rect Area Light', action: () => addObject(ObjectType.RECT_AREA_LIGHT, id) }
      ]
    },

    // Camera Section
    {
      label: 'Camera',
      type: 'submenu',
      children: [
        { label: 'Perspective Camera', action: () => addObject(ObjectType.CAMERA, id) },
        { label: 'Orthographic Camera', action: () => addObject(ObjectType.ORTHOGRAPHIC_CAMERA, id) }
      ]
    },

    // Special Objects Section
    {
      label: 'Special',
      type: 'submenu',
      children: [
        { label: 'Line', action: () => addObject(ObjectType.LINE, id) },
        { label: 'Line Segments', action: () => addObject(ObjectType.LINE_SEGMENTS, id) },
        { label: 'Points', action: () => addObject(ObjectType.POINTS, id) },
        { label: 'Sprite', action: () => addObject(ObjectType.SPRITE, id) }
      ]
    },

    // Helpers Section
    {
      label: 'Helper',
      type: 'submenu',
      children: [
        { label: 'Grid Helper', action: () => addObject(ObjectType.GRID_HELPER, id) },
        { label: 'Axes Helper', action: () => addObject(ObjectType.AXES_HELPER, id) },
        { label: 'Arrow Helper', action: () => addObject(ObjectType.ARROW_HELPER, id) }
      ]
    },

    { type: 'separator' } as MenuItem,

    // Organization
    { label: 'Group', action: () => addObject(ObjectType.FOLDER, id) }
  ];
}

// Alternative: Flat menu structure (no submenus)
export function getMenuFlat(addObject: AddObjectFunction, id: string): MenuItem[] {
  return [
    // Basic Geometries
    { label: 'Cube', action: () => addObject(ObjectType.CUBE, id) },
    { label: 'Sphere', action: () => addObject(ObjectType.SPHERE, id) },
    { label: 'Cylinder', action: () => addObject(ObjectType.CYLINDER, id) },
    { label: 'Plane', action: () => addObject(ObjectType.PLANE, id) },
    { label: 'Capsule', action: () => addObject(ObjectType.CAPSULE, id) },
    { label: 'Cone', action: () => addObject(ObjectType.CONE, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Polyhedra
    { label: 'Torus', action: () => addObject(ObjectType.TORUS, id) },
    { label: 'Torus Knot', action: () => addObject(ObjectType.TORUS_KNOT, id) },
    { label: 'Ring', action: () => addObject(ObjectType.RING, id) },
    { label: 'Circle', action: () => addObject(ObjectType.CIRCLE, id) },
    { label: 'Dodecahedron', action: () => addObject(ObjectType.DODECAHEDRON, id) },
    { label: 'Icosahedron', action: () => addObject(ObjectType.ICOSAHEDRON, id) },
    { label: 'Octahedron', action: () => addObject(ObjectType.OCTAHEDRON, id) },
    { label: 'Tetrahedron', action: () => addObject(ObjectType.TETRAHEDRON, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Advanced
    { label: 'Lathe', action: () => addObject(ObjectType.LATHE, id) },
    { label: 'Tube', action: () => addObject(ObjectType.TUBE, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Lights
    { label: 'Point Light', action: () => addObject(ObjectType.POINTLIGHT, id) },
    { label: 'Directional Light', action: () => addObject(ObjectType.DIRECTIONAL_LIGHT, id) },
    { label: 'Spot Light', action: () => addObject(ObjectType.SPOT_LIGHT, id) },
    { label: 'Ambient Light', action: () => addObject(ObjectType.AMBIENT_LIGHT, id) },
    { label: 'Hemisphere Light', action: () => addObject(ObjectType.HEMISPHERE_LIGHT, id) },
    { label: 'Rect Area Light', action: () => addObject(ObjectType.RECT_AREA_LIGHT, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Cameras
    { label: 'Perspective Camera', action: () => addObject(ObjectType.CAMERA, id) },
    { label: 'Orthographic Camera', action: () => addObject(ObjectType.ORTHOGRAPHIC_CAMERA, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Special Objects
    { label: 'Line', action: () => addObject(ObjectType.LINE, id) },
    { label: 'Line Segments', action: () => addObject(ObjectType.LINE_SEGMENTS, id) },
    { label: 'Points', action: () => addObject(ObjectType.POINTS, id) },
    { label: 'Sprite', action: () => addObject(ObjectType.SPRITE, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Helpers
    { label: 'Grid Helper', action: () => addObject(ObjectType.GRID_HELPER, id) },
    { label: 'Axes Helper', action: () => addObject(ObjectType.AXES_HELPER, id) },
    { label: 'Arrow Helper', action: () => addObject(ObjectType.ARROW_HELPER, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Organization
    { label: 'Group', action: () => addObject(ObjectType.FOLDER, id) }
  ];
}

// Alternative: Categorized but simpler structure
export function getMenuSimple(addObject: AddObjectFunction, id: string): MenuItem[] {
  return [
    // Primitives
    { label: '📦 Cube', action: () => addObject(ObjectType.CUBE, id) },
    { label: '⚪ Sphere', action: () => addObject(ObjectType.SPHERE, id) },
    { label: '🥫 Cylinder', action: () => addObject(ObjectType.CYLINDER, id) },
    { label: '📋 Plane', action: () => addObject(ObjectType.PLANE, id) },
    { label: '💊 Capsule', action: () => addObject(ObjectType.CAPSULE, id) },
    { label: '🔺 Cone', action: () => addObject(ObjectType.CONE, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Complex Shapes
    { label: '🍩 Torus', action: () => addObject(ObjectType.TORUS, id) },
    { label: '🎀 Torus Knot', action: () => addObject(ObjectType.TORUS_KNOT, id) },
    { label: '⬟ Ring', action: () => addObject(ObjectType.RING, id) },
    { label: '🔷 Dodecahedron', action: () => addObject(ObjectType.DODECAHEDRON, id) },
    { label: '🔶 Icosahedron', action: () => addObject(ObjectType.ICOSAHEDRON, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Lights
    { label: '💡 Point Light', action: () => addObject(ObjectType.POINTLIGHT, id) },
    { label: '☀️ Directional Light', action: () => addObject(ObjectType.DIRECTIONAL_LIGHT, id) },
    { label: '🔦 Spot Light', action: () => addObject(ObjectType.SPOT_LIGHT, id) },
    { label: '🌙 Ambient Light', action: () => addObject(ObjectType.AMBIENT_LIGHT, id) },
    
    { type: 'separator' } as MenuItem,
    
    // Camera & Organization
    { label: '📷 Camera', action: () => addObject(ObjectType.CAMERA, id) },
    { label: '📁 Group', action: () => addObject(ObjectType.FOLDER, id) }
  ];
}