import { THREEGL as THREE } from '@/Core/lib/THREE';
import { Editor } from '@/Editor/Editor';
import fs from '@/Core/lib/fs';
import { extractImageSource } from '@/Ui/components/TextureEditor/textureSyncUtils';

export class AssetPreviewService {
    private static instance: AssetPreviewService;

    private previewCache: Map<string, string> = new Map();
    private listeners: Set<() => void> = new Set();

    // Offscreen rendering pipeline (initialized lazily)
    private offscreenCanvas: HTMLCanvasElement | null = null;
    private offscreenRenderer: THREE.WebGLRenderer | null = null;
    private offscreenScene: THREE.Scene | null = null;
    private offscreenCamera: THREE.PerspectiveCamera | null = null;
    private ambientLight: THREE.AmbientLight | null = null;
    private keyLight: THREE.DirectionalLight | null = null;
    private fillLight: THREE.DirectionalLight | null = null;
    private rimLight: THREE.DirectionalLight | null = null;

    private constructor() { }

    public static getInstance(): AssetPreviewService {
        if (!AssetPreviewService.instance) {
            AssetPreviewService.instance = new AssetPreviewService();
        }
        return AssetPreviewService.instance;
    }

    /**
     * Checks if a preview has already been generated for an asset ID.
     */
    public hasPreview(assetId: string): boolean {
        return this.previewCache.has(assetId);
    }

    /**
     * Gets a cached preview Data URL if one exists.
     */
    public getPreview(assetId: string): string | null {
        return this.previewCache.get(assetId) ?? null;
    }

    /**
     * Checks if an asset type is supported for preview generation.
     */
    public isPreviewSupported(type: string): boolean {
        const t = (type || '').toLowerCase();
        return (
            t === 'geometry' ||
            t === 'geo' ||
            t === 'material' ||
            t === 'mat' ||
            t === 'model' ||
            t === 'object' ||
            t === 'texture' ||
            t === 'image'
        );
    }

    /**
     * Generates a 2D or 3D preview thumbnail for an asset and caches it.
     */
    public async generatePreview(asset: {
        id: string;
        type: string;
        fullPath?: string;
        name?: string;
    }): Promise<string | null> {
        if (!asset || !asset.id) return null;

        const path = asset.fullPath || asset.id;
        const type = (asset.type || '').toLowerCase();

        try {
            let dataUrl: string | null = null;

            if (type === 'texture' || type === 'image') {
                dataUrl = await this.renderTexturePreview(path);
            } else if (type === 'material' || type === 'mat') {
                dataUrl = await this.renderMaterialPreview(path);
            } else if (type === 'geometry' || type === 'geo') {
                dataUrl = await this.renderGeometryPreview(path);
            } else if (type === 'model' || type === 'object') {
                dataUrl = await this.renderObjectPreview(path);
            }

            if (dataUrl) {
                this.previewCache.set(asset.id, dataUrl);
                this.notify();
                return dataUrl;
            }
        } catch (err) {
            console.error(`[AssetPreviewService] Error generating preview for ${path}:`, err);
        }

        return null;
    }

    /**
     * Generates and caches a preview directly from an in-memory THREE.Object3D instance
     * using its 3D bounding box for centering and camera framing.
     */
    public async generatePreviewForObject(id: string, obj: any): Promise<string | null> {
        if (!obj || !id) return null;
        try {
            const dataUrl = this.renderObject3D(obj);
            if (dataUrl) {
                this.previewCache.set(id, dataUrl);
                this.notify();
                return dataUrl;
            }
        } catch (err) {
            console.error(`[AssetPreviewService] Error generating preview for object ${id}:`, err);
        }
        return null;
    }

    /**
     * Removes a cached preview for an asset.
     */
    public clearPreview(assetId: string): void {
        if (this.previewCache.delete(assetId)) {
            this.notify();
        }
    }

    /**
     * Clears all cached preview thumbnails.
     */
    public clearAllPreviews(): void {
        this.previewCache.clear();
        this.notify();
    }

    /**
     * Subscribe to thumbnail cache updates.
     */
    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        this.listeners.forEach((fn) => {
            try {
                fn();
            } catch (err) {
                console.error('[AssetPreviewService] Listener error:', err);
            }
        });
    }

    // -----------------------------------------------------------------------
    // Offscreen 3D Renderer Setup
    // -----------------------------------------------------------------------
    private initOffscreenRenderer(): void {
        if (this.offscreenRenderer) return;

        // Low quality resolution (128x128) - fast rendering & low memory footprint
        const size = 128;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = size;
        this.offscreenCanvas.height = size;

        this.offscreenRenderer = new THREE.WebGLRenderer({
            canvas: this.offscreenCanvas,
            alpha: true,
            antialias: false, // Low quality / fast performance
            powerPreference: 'low-power',
            preserveDrawingBuffer: true,
        });
        this.offscreenRenderer.setSize(size, size, false);
        this.offscreenRenderer.setPixelRatio(1);
        this.offscreenRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.offscreenRenderer.toneMappingExposure = 1.1;

        this.offscreenScene = new THREE.Scene();
        this.offscreenCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

        // Three-point studio lighting with configurable positions
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.offscreenScene.add(this.ambientLight);

        this.keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
        this.keyLight.position.set(4, 7, 5);
        this.offscreenScene.add(this.keyLight);

        this.fillLight = new THREE.DirectionalLight(0x90b0ff, 0.9);
        this.fillLight.position.set(-5, 3, -4);
        this.offscreenScene.add(this.fillLight);

        this.rimLight = new THREE.DirectionalLight(0xfff0d0, 0.7);
        this.rimLight.position.set(0, -4, -5);
        this.offscreenScene.add(this.rimLight);
    }

    /**
     * Accurately calculates the tight bounding box of an object by inspecting
     * all descendant meshes and geometries, avoiding distortion from lights or cameras.
     */
    private computeObjectBoundingBox(obj: any): THREE.Box3 {
        const box = new THREE.Box3();
        let hasGeometry = false;

        obj.traverse((child: any) => {
            if (child.isMesh && child.geometry) {
                if (!child.geometry.boundingBox) {
                    child.geometry.computeBoundingBox();
                }
                const meshBox = new THREE.Box3().setFromObject(child);
                if (!meshBox.isEmpty() && isFinite(meshBox.min.x) && isFinite(meshBox.max.x)) {
                    box.union(meshBox);
                    hasGeometry = true;
                }
            }
        });

        if (!hasGeometry || box.isEmpty() || !isFinite(box.min.x)) {
            box.setFromObject(obj);
        }

        // Safe fallback if bounding box is completely empty or degenerated
        if (box.isEmpty() || !isFinite(box.min.x)) {
            box.min.set(-1, -1, -1);
            box.max.set(1, 1, 1);
        }

        return box;
    }

    /**
     * Dynamically frames the camera and repositions studio lights based on the 3D bounding box
     * to guarantee the entire object is visible, centered, and has balanced margins without clipping.
     */
    private frameCameraToBounds(box: THREE.Box3, targetCenter?: THREE.Vector3): void {
        if (!this.offscreenCamera || !this.offscreenScene) return;

        const center = targetCenter || box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const sphere = box.getBoundingSphere(new THREE.Sphere());

        const halfSize = size.clone().multiplyScalar(0.5);
        const radius = Math.max(sphere.radius, halfSize.length(), 0.5);

        const fov = (this.offscreenCamera.fov * Math.PI) / 180;
        const aspect = this.offscreenCamera.aspect || 1;

        // Calculate distance required to fit bounding box extents and bounding sphere
        const verticalDist = (halfSize.y || radius) / Math.tan(fov / 2);
        const horizontalDist = (halfSize.x || radius) / (Math.tan(fov / 2) * aspect);
        const sphereDist = radius / Math.sin(fov / 2);

        // Tight framing margin (1.04x) without artificial distance floor so the object appears much bigger
        const fitDistance = Math.max(verticalDist, horizontalDist, sphereDist, 0.05) * 1.04;

        // Update clipping planes to prevent clipping of large or tiny objects
        this.offscreenCamera.near = Math.max(0.01, fitDistance / 100);
        this.offscreenCamera.far = Math.max(100, fitDistance * 15);
        this.offscreenCamera.updateProjectionMatrix();

        // 3/4 perspective isometric viewpoint
        const viewDirection = new THREE.Vector3(1.1, 0.75, 1.25).normalize();
        this.offscreenCamera.position.copy(center).addScaledVector(viewDirection, fitDistance);
        this.offscreenCamera.lookAt(center);

        // Adjust studio lighting relative to bounding volume
        if (this.keyLight) {
            this.keyLight.position.set(
                center.x + fitDistance * 0.9,
                center.y + fitDistance * 1.3,
                center.z + fitDistance * 1.1
            );
        }
        if (this.fillLight) {
            this.fillLight.position.set(
                center.x - fitDistance * 1.1,
                center.y + fitDistance * 0.6,
                center.z - fitDistance * 0.8
            );
        }
        if (this.rimLight) {
            this.rimLight.position.set(
                center.x,
                center.y - fitDistance * 0.8,
                center.z - fitDistance * 1.2
            );
        }
    }

    // -----------------------------------------------------------------------
    // 1. Texture / Image Preview
    // -----------------------------------------------------------------------
    private async renderTexturePreview(path: string): Promise<string | null> {
        try {
            // Check if it's an image file readable via fs
            const isBinaryTex = path.endsWith('.tex.bin') || path.endsWith('.tex');

            if (!isBinaryTex) {
                // Standard image file (png, jpg, webp, svg)
                const data = await fs.readFile(path);
                if (data instanceof Blob || data instanceof ArrayBuffer || typeof data === 'string') {
                    const blob = data instanceof Blob ? data : new Blob([data]);
                    const blobUrl = URL.createObjectURL(blob);

                    return await new Promise<string | null>((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = 128;
                            canvas.height = 128;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.imageSmoothingQuality = 'high';
                                ctx.drawImage(img, 0, 0, 128, 128);
                                const out = canvas.toDataURL('image/png');
                                URL.revokeObjectURL(blobUrl);
                                resolve(out);
                            } else {
                                URL.revokeObjectURL(blobUrl);
                                resolve(null);
                            }
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(blobUrl);
                            resolve(null);
                        };
                        img.src = blobUrl;
                    });
                }
            }

            // Binary texture loaded via MemoLoader
            const tex = await Editor.core.loaders.objectLoader.loadTexture(path);
            if (tex) {
                return extractImageSource(tex);
            }
        } catch (err) {
            console.warn('[AssetPreviewService] Could not load texture preview:', err);
        }

        return null;
    }

    // -----------------------------------------------------------------------
    // 2. Material Preview (rendered on a 3D sphere framed by bounding box)
    // -----------------------------------------------------------------------
    private async renderMaterialPreview(path: string): Promise<string | null> {
        this.initOffscreenRenderer();
        if (!this.offscreenRenderer || !this.offscreenScene || !this.offscreenCamera || !this.offscreenCanvas) {
            return null;
        }

        const material = await Editor.core.loaders.objectLoader.loadMaterial(path);
        if (!material) return null;

        const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
        sphereGeo.computeBoundingBox();
        const mesh = new THREE.Mesh(sphereGeo, material);

        this.offscreenScene.add(mesh);
        mesh.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(mesh);
        this.frameCameraToBounds(box, new THREE.Vector3(0, 0, 0));

        this.offscreenRenderer.render(this.offscreenScene, this.offscreenCamera);
        const out = this.offscreenCanvas.toDataURL('image/png');

        this.offscreenScene.remove(mesh);
        sphereGeo.dispose();

        return out;
    }

    // -----------------------------------------------------------------------
    // 3. Geometry Preview (framed using geometry bounding box)
    // -----------------------------------------------------------------------
    private async renderGeometryPreview(path: string): Promise<string | null> {
        this.initOffscreenRenderer();
        if (!this.offscreenRenderer || !this.offscreenScene || !this.offscreenCamera || !this.offscreenCanvas) {
            return null;
        }

        const rawGeo = await Editor.core.loaders.objectLoader.loadGeometry(path);
        if (!rawGeo) return null;

        // Clone so we don't modify the cached original
        const geo = rawGeo.clone();
        geo.center();
        geo.computeVertexNormals();
        geo.computeBoundingBox();

        const previewMat = new THREE.MeshStandardMaterial({
            color: 0x6366f1, // Sleek indigo
            roughness: 0.35,
            metalness: 0.15,
        });

        const mesh = new THREE.Mesh(geo, previewMat);
        mesh.rotation.y = Math.PI / 6;
        mesh.rotation.x = Math.PI / 10;
        mesh.updateMatrixWorld(true);

        const transformedBox = new THREE.Box3().setFromObject(mesh);

        this.offscreenScene.add(mesh);

        // Frame camera using geometry bounding box
        this.frameCameraToBounds(transformedBox, new THREE.Vector3(0, 0, 0));

        this.offscreenRenderer.render(this.offscreenScene, this.offscreenCamera);
        const out = this.offscreenCanvas.toDataURL('image/png');

        this.offscreenScene.remove(mesh);
        geo.dispose();
        previewMat.dispose();

        return out;
    }

    // -----------------------------------------------------------------------
    // 4. Object / Model Preview (centered & framed using 3D Bounding Box)
    // -----------------------------------------------------------------------
    /**
     * Core renderer that takes any THREE.Object3D, calculates its bounding box,
     * centers it, frames the camera with FOV trigonometry, and renders a clean thumbnail.
     */
    public renderObject3D(rawObj: any): string | null {
        this.initOffscreenRenderer();
        if (!this.offscreenRenderer || !this.offscreenScene || !this.offscreenCamera || !this.offscreenCanvas) {
            return null;
        }

        const obj = rawObj.clone(true);

        // Ensure materials and normals exist on all meshes
        obj.traverse((child: any) => {
            if (child.isMesh) {
                if (child.geometry && !child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }
                if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: 0x94a3b8,
                        roughness: 0.4,
                        metalness: 0.1,
                    });
                }
            }
        });

        // 1. Compute exact bounding box of the object hierarchy
        const initialBox = this.computeObjectBoundingBox(obj);
        const center = initialBox.getCenter(new THREE.Vector3());

        // 2. Center object at local origin
        obj.position.sub(center);

        // 3. Place in pivot container with attractive 3/4 perspective tilt
        const container = new THREE.Group();
        container.add(obj);
        container.rotation.y = Math.PI / 5;
        container.rotation.x = Math.PI / 16;
        container.updateMatrixWorld(true);

        // 4. Compute transformed bounding box after tilt
        const transformedBox = new THREE.Box3().setFromObject(container);

        this.offscreenScene.add(container);

        // 5. Frame camera and lighting dynamically using the transformed bounding box
        this.frameCameraToBounds(transformedBox, new THREE.Vector3(0, 0, 0));

        // 6. Render and extract data URL
        this.offscreenRenderer.render(this.offscreenScene, this.offscreenCamera);
        const out = this.offscreenCanvas.toDataURL('image/png');

        // 7. Clean up offscreen scene
        this.offscreenScene.remove(container);

        return out;
    }

    private async renderObjectPreview(path: string): Promise<string | null> {
        const rawObj = await Editor.core.loaders.objectLoader.loadObject(path);
        if (!rawObj) return null;
        return this.renderObject3D(rawObj);
    }
}

export default AssetPreviewService.getInstance();
