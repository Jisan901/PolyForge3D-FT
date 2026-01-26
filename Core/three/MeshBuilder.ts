import { THREE } from '@/Core/lib/THREE'
import { ObjectType } from '@/Core/Types/Objects'


/**
 * MeshBuilder is a factory class for creating common Three.js objects.
 *
 * It supports:
 * - Primitive meshes
 * - Advanced geometries
 * - Lights
 * - Cameras
 * - Helpers
 * - Special render objects (Sprite, Line, Points)
 * - Organizational nodes (Group)
 *
 * All created objects are automatically registered
 * into the provided ThreeRegistry.
 *
 * Similar concept:
 * Unity: GameObject → Create Menu
 * Unreal: Actor Factory
 */
export class MeshBuilder {
    
    private _defaultMaterial = new THREE.MeshStandardNodeMaterial({ color: 0xaaaaaa });
    
  /**
   * Create MeshBuilder instance.
   *
   * @param threeRegistry Runtime ThreeRegistry used for tracking objects
   *
   * @example
   * const registry = new ThreeRegistry()
   * const builder = new MeshBuilder(registry)
   */
  constructor(private threeRegistry) { }

  /**
   * Create an object by enum type.
   *
   * Automatically:
   * - Builds geometry/material/light/camera
   * - Registers object to ThreeRegistry
   *
   * @param type Object type enum
   *
   * @returns Created Object3D or null if unknown type
   *
   * @example
   * const cube = builder.create(ObjectType.CUBE)
   * scene.add(cube)
   */
  create(type: ObjectType): THREE.Object3D | null {

    switch (type) {

      // -----------------------
      // Basic Geometries
      // -----------------------

      case ObjectType.CUBE: return this.threeRegistry.register(this.cube())
      case ObjectType.SPHERE: return this.threeRegistry.register(this.sphere())
      case ObjectType.CYLINDER: return this.threeRegistry.register(this.cylinder())
      case ObjectType.PLANE: return this.threeRegistry.register(this.plane())
      case ObjectType.CAPSULE: return this.threeRegistry.register(this.capsule())

      // -----------------------
      // Additional Geometries
      // -----------------------

      case ObjectType.CONE: return this.threeRegistry.register(this.cone())
      case ObjectType.TORUS: return this.threeRegistry.register(this.torus())
      case ObjectType.TORUS_KNOT: return this.threeRegistry.register(this.torusKnot())
      case ObjectType.DODECAHEDRON: return this.threeRegistry.register(this.dodecahedron())
      case ObjectType.ICOSAHEDRON: return this.threeRegistry.register(this.icosahedron())
      case ObjectType.OCTAHEDRON: return this.threeRegistry.register(this.octahedron())
      case ObjectType.TETRAHEDRON: return this.threeRegistry.register(this.tetrahedron())
      case ObjectType.RING: return this.threeRegistry.register(this.ring())
      case ObjectType.CIRCLE: return this.threeRegistry.register(this.circle())

      // -----------------------
      // Advanced Geometries
      // -----------------------

      case ObjectType.LATHE: return this.threeRegistry.register(this.lathe())
      case ObjectType.TUBE: return this.threeRegistry.register(this.tube())

      // -----------------------
      // Lights
      // -----------------------

      case ObjectType.POINTLIGHT: return this.threeRegistry.register(this.pointLight())
      case ObjectType.DIRECTIONAL_LIGHT: return this.threeRegistry.register(this.directionalLight())
      case ObjectType.SPOT_LIGHT: return this.threeRegistry.register(this.spotLight())
      case ObjectType.AMBIENT_LIGHT: return this.threeRegistry.register(this.ambientLight())
      case ObjectType.HEMISPHERE_LIGHT: return this.threeRegistry.register(this.hemisphereLight())
      case ObjectType.RECT_AREA_LIGHT: return this.threeRegistry.register(this.rectAreaLight())

      // -----------------------
      // Cameras
      // -----------------------

      case ObjectType.CAMERA: return this.threeRegistry.register(this.camera())
      case ObjectType.ORTHOGRAPHIC_CAMERA: return this.threeRegistry.register(this.orthographicCamera())

      // -----------------------
      // Helpers
      // -----------------------

      case ObjectType.GRID_HELPER: return this.threeRegistry.register(this.gridHelper())
      case ObjectType.AXES_HELPER: return this.threeRegistry.register(this.axesHelper())
      case ObjectType.ARROW_HELPER: return this.threeRegistry.register(this.arrowHelper())

      // -----------------------
      // Special Objects
      // -----------------------

      case ObjectType.SPRITE: return this.threeRegistry.register(this.sprite())
      case ObjectType.LINE: return this.threeRegistry.register(this.line())
      case ObjectType.LINE_SEGMENTS: return this.threeRegistry.register(this.lineSegments())
      case ObjectType.POINTS: return this.threeRegistry.register(this.points())

      // -----------------------
      // Organization
      // -----------------------

      case ObjectType.FOLDER: return this.threeRegistry.register(this.folder())

      default:
        console.warn('MeshBuilder: Unknown type', type)
        return null
    }
  }

  // =====================================================
  // BASIC GEOMETRIES
  // =====================================================

  /**
   * Create a cube mesh.
   *
   * @example
   * const cube = builder.cube()
   */
  cube(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      this._defaultMaterial
    )
  }

  /**
   * Create a sphere mesh.
   */
  sphere(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      this._defaultMaterial
    )
  }

  /**
   * Create a cylinder mesh.
   */
  cylinder(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
      this._defaultMaterial
    )
  }

  /**
   * Create a plane mesh.
   */
  plane(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this._defaultMaterial
    )
  }

  /**
   * Create a capsule mesh.
   */
  capsule(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1, 4, 8),
      this._defaultMaterial
    )
  }

  // =====================================================
  // ADDITIONAL GEOMETRIES
  // =====================================================

  /** Create cone mesh */
  cone(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1, 32),
      this._defaultMaterial
    )
  }

  /** Create torus mesh */
  torus(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.2, 16, 100),
      this._defaultMaterial
    )
  }

  /** Create torus knot mesh */
  torusKnot(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16),
      this._defaultMaterial
    )
  }

  /** Create dodecahedron mesh */
  dodecahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5),
      this._defaultMaterial
    )
  }

  /** Create icosahedron mesh */
  icosahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5),
      this._defaultMaterial
    )
  }

  /** Create octahedron mesh */
  octahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5),
      this._defaultMaterial
    )
  }

  /** Create tetrahedron mesh */
  tetrahedron(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.5),
      this._defaultMaterial
    )
  }

  /** Create ring mesh */
  ring(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.5, 32),
      this._defaultMaterial
    )
  }

  /** Create circle mesh */
  circle(): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      this._defaultMaterial
    )
  }

  // =====================================================
  // ADVANCED GEOMETRIES
  // =====================================================

  /**
   * Create lathe geometry mesh.
   */
  lathe(): THREE.Mesh {

    const points = []

    for (let i = 0; i < 10; i++) {
      points.push(
        new THREE.Vector2(
          Math.sin(i * 0.2) * 0.3 + 0.3,
          (i - 5) * 0.1
        )
      )
    }

    return new THREE.Mesh(
      new THREE.LatheGeometry(points, 32),
      this._defaultMaterial
    )
  }

  /**
   * Create tube geometry mesh.
   */
  tube(): THREE.Mesh {

    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(-0.25, 0.5, 0),
      new THREE.Vector3(0.25, -0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ])

    return new THREE.Mesh(
      new THREE.TubeGeometry(path, 64, 0.1, 8, false),
      this._defaultMaterial
    )
  }

  // Lights
  pointLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, 2, 0);
    return light;
  }

  directionalLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.add(light.target)
    light.target.position.set(0, -5, 0)
    light.position.set(5, 5, 5);
    return light;
  }

  spotLight(): THREE.SpotLight {
    const light = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 6);
    light.add(light.target)
    light.target.position.set(0, -5, 0)
    light.position.set(0, 5, 0);
    return light;
  }

  ambientLight(): THREE.AmbientLight {
    return new THREE.AmbientLight(0xffffff, 0.5);
  }

  hemisphereLight(): THREE.HemisphereLight {
    return new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  }

  rectAreaLight(): THREE.RectAreaLight {
    const light = new THREE.RectAreaLight(0xffffff, 5, 2, 2);
    light.position.set(0, 2, 0);
    return light;
  }

  // Cameras
  camera(): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    cam.position.set(0, 1, 3);
    return cam;
  }

  orthographicCamera(): THREE.OrthographicCamera {
    const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 1000);
    cam.position.set(0, 1, 3);
    return cam;
  }

  // Helpers
  gridHelper(): THREE.GridHelper {
    return new THREE.GridHelper(10, 10);
  }

  axesHelper(): THREE.AxesHelper {
    return new THREE.AxesHelper(1);
  }

  arrowHelper(): THREE.ArrowHelper {
    return new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      1,
      0xff0000
    );
  }

  // Special Objects
  sprite(): THREE.Sprite {
    const map = new THREE.CanvasTexture(this.generateSpriteTexture());
    const material = new THREE.SpriteMaterial({ map });
    const sprite = new THREE.Sprite(material);
    sprite.geometry = new THREE.BufferGeometry() 
    sprite.geometry.copy(new THREE.PlaneGeometry());
    return sprite
  }

  line(): THREE.Line {
    const points = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
    return new THREE.Line(geometry, material);
  }

  lineSegments(): THREE.LineSegments {
    const points = [
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0.5, 0, 0)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
    return new THREE.LineSegments(geometry, material);
  }

  points(): THREE.Points {
    const vertices = [];
    for (let i = 0; i < 100; i++) {
      vertices.push(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.05 });
    return new THREE.Points(geometry, material);
  }

  // Organization
  folder(): THREE.Group {
    return new THREE.Group();
  }

  // Helper method for sprite texture
  private generateSpriteTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    return canvas;
  }
}