import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { globalInspector } from '../lib/inspector';

export const setupScene = () => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1c1c1c');

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;
  camera.name = "Main Camera";

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(200, 200);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Create objects
  const object3d = new THREE.Object3D();
  object3d.name = "Empty Object3D";
  object3d.add(new THREE.AxesHelper(2)); // Add helper so it's visible
  scene.add(object3d);

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.name = "Box Geometry";

  const texture = new THREE.TextureLoader().load('https://picsum.photos/seed/threejs/200/200');
  texture.name = "Sample Texture";

  const basicMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, map: texture });
  basicMaterial.name = "Basic Material";

  const standardMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  standardMaterial.name = "Standard Material";

  const physicalMaterial = new THREE.MeshPhysicalMaterial({ color: 0x0000ff, roughness: 0.2, metalness: 0.8 });
  physicalMaterial.name = "Physical Material";

  const mesh = new THREE.Mesh(geometry, standardMaterial);
  mesh.name = "Box Mesh";
  mesh.position.x = -1;
  scene.add(mesh);

  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(2, 2, 2);
  light.name = "Point Light";
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040, 1);
  ambientLight.name = "Ambient Light";
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(-2, 2, 2);
  dirLight.name = "Directional Light";
  scene.add(dirLight);

  const spotLight = new THREE.SpotLight(0xffffff, 1);
  spotLight.position.set(0, 3, 0);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 0.5;
  spotLight.name = "Spot Light";
  scene.add(spotLight);

  const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
  hemiLight.name = "Hemisphere Light";
  scene.add(hemiLight);

  const spriteMaterial = new THREE.SpriteMaterial({ color: 0xffffff, map: texture });
  spriteMaterial.name = "Sprite Material";
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.name = "Sample Sprite";
  sprite.position.x = 1;
  scene.add(sprite);

  const pointsGeometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,
  ]);
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const pointsMaterial = new THREE.PointsMaterial({ color: 0x8888ff, size: 0.5, sizeAttenuation: true });
  pointsMaterial.name = "Points Material";
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  points.name = "Sample Points";
  points.position.set(0, 2, 0);
  scene.add(points);

  // SkinnedMesh Setup
  const skinnedGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8, 2);
  const positionAttribute = skinnedGeometry.attributes.position;
  const skinIndices = [];
  const skinWeights = [];
  for (let i = 0; i < positionAttribute.count; i++) {
    const y = positionAttribute.getY(i);
    const skinIndex = (y > 0) ? 1 : 0;
    const skinWeight = (y > 0) ? 1 : 0;
    skinIndices.push(skinIndex, 0, 0, 0);
    skinWeights.push(skinWeight, 0, 0, 0);
  }
  skinnedGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  skinnedGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  
  const bone1 = new THREE.Bone();
  const bone2 = new THREE.Bone();
  bone1.add(bone2);
  bone2.position.y = 0.5;
  const skeleton = new THREE.Skeleton([bone1, bone2]);
  
  const skinnedMaterial = new THREE.MeshStandardMaterial({ color: 0xff00ff });
  const skinnedMesh = new THREE.SkinnedMesh(skinnedGeometry, skinnedMaterial);
  skinnedMesh.add(bone1);
  skinnedMesh.bind(skeleton);
  skinnedMesh.name = "Skinned Mesh";
  skinnedMesh.position.set(-2, 0, 0);
  scene.add(skinnedMesh);

  const instancedGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const instancedMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const instancedMesh = new THREE.InstancedMesh(instancedGeometry, instancedMaterial, 10);
  instancedMesh.name = "Instanced Mesh";
  instancedMesh.position.y = 1;
  
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 10; i++) {
    dummy.position.set((i - 5) * 0.3, 0, 0);
    dummy.rotation.set(0, i * 0.2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  // Test GUI Folder
  const folder = globalInspector.createFolder('Scene Settings');
  folder.add('Background Color', scene, 'background');
  folder.add('Light Intensity', light, 'intensity', { min: 0, max: 10, step: 0.1 });
  
  const subFolder = folder.addFolder('Mesh Settings');
  subFolder.add('Visible', mesh, 'visible');
  subFolder.add('Position X', mesh.position, 'x', { min: -5, max: 5, step: 0.1 });

  // Test Custom Resolver
  globalInspector.setCustomResolverUI(
    'Custom Box Info',
    (obj) => obj && obj.name === 'Box Mesh',
    ({ obj }: { obj: any }) => {
      return (
        <div className="p-2 text-xs text-blue-300 bg-blue-900/20 border border-blue-800 rounded">
          This is a custom UI resolver that only shows up for the object named "{obj.name}".
        </div>
      );
    }
  );

  const objectsToInspect = {
    scene,
    camera,
    object3d,
    mesh,
    instancedMesh,
    skinnedMesh,
    light,
    ambientLight,
    dirLight,
    spotLight,
    hemiLight,
    basicMaterial,
    standardMaterial,
    physicalMaterial,
    pointsMaterial,
    geometry,
    texture,
    sprite,
    points
  };

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return { renderer, objectsToInspect };
};
