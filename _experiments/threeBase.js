import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export const threeWebgl = () => {

    // -----------------------------
    // Renderer
    // -----------------------------
    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    document.body.appendChild(renderer.domElement)

    // -----------------------------
    // Camera
    // -----------------------------
    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    )
    camera.position.set(2, 2, 4)

    // -----------------------------
    // Controls
    // -----------------------------
    const controls = new OrbitControls(camera, renderer.domElement)

    // -----------------------------
    // Render target WITH depth
    // -----------------------------
    const renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
    )

    renderTarget.depthTexture = new THREE.DepthTexture(
        window.innerWidth,
        window.innerHeight
    )
    renderTarget.depthTexture.type = THREE.UnsignedShortType

    // -----------------------------
    // Fullscreen quad
    // -----------------------------
    const quadScene = new THREE.Scene()
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ map: renderTarget.texture })
    )

    quadScene.add(quad)

    // -----------------------------
    // Resize
    // -----------------------------
    window.addEventListener('resize', () => {
        const w = window.innerWidth
        const h = window.innerHeight

        camera.aspect = w / h
        camera.updateProjectionMatrix()

        renderer.setSize(w, h)
        renderTarget.setSize(w, h)
    })

    // -----------------------------
    // Render function (ONE scene render)
    // -----------------------------
    const render = (scene) => {

        // render scene → offscreen target (color + depth)
        renderer.setRenderTarget(renderTarget)
        renderer.render(scene, camera)

        // draw fullscreen quad → screen
        renderer.setRenderTarget(null)
        renderer.render(quadScene, quadCamera)
    }

    return {
        renderer,
        THREE,
        camera,
        controls,
        render
    }
}



import * as THREE_WEBGPU from 'three/webgpu'


export const threeWebgpu = async () => {

    // -----------------------------
    // Renderer
    // -----------------------------
    const renderer = new THREE_WEBGPU.WebGPURenderer({
        antialias: false,
        forceWebGL: true
    })

    await renderer.init()

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    document.body.appendChild(renderer.domElement)

    // -----------------------------
    // Camera
    // -----------------------------
    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    )
    camera.position.set(2, 2, 4)

    // -----------------------------
    // Controls
    // -----------------------------
    const controls = new OrbitControls(camera, renderer.domElement)

    // -----------------------------
    // Resize
    // -----------------------------
    window.addEventListener('resize', () => {
        const w = window.innerWidth
        const h = window.innerHeight

        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
    })

    // -----------------------------
    // Render function
    // -----------------------------
    const render = (scene) => {
        renderer.render(scene, camera)
    }

    return {
        renderer,
        camera,
        controls,
        render,
        THREE: THREE_WEBGPU
    }
}





export function randMesh(maxSize, radius, counti, THREE, mat) {
    const group = new THREE.Group();

    // random mesh count (adjust as needed)
    const count = Math.floor(Math.random() * counti) + 5;

    const geometries = [
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.ConeGeometry(0.5, 1, 12)
    ];





    for (let i = 0; i < count; i++) {
        const size = Math.random() * maxSize + 0.1;

        const geometry = geometries[
            Math.floor(Math.random() * geometries.length)
        ].clone();

        geometry.scale(size, size, size);
        const material = mat||new THREE.MeshStandardMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random()),
            roughness: 0.6,
            metalness: 0.1
        });

        const mesh = new THREE.Mesh(geometry, material);

        // random position inside a sphere
        const dir = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();

        const dist = Math.random() * radius;
        mesh.position.copy(dir.multiplyScalar(dist));

        // random rotation
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        group.add(mesh);
    }

    return group;
}
