// JS/multi_glb_viewers.js
// Module ES utilisant l'importmap définie dans index.html

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/**
 * Centre et cadre le modèle dans la caméra.
 */
function frameFit(object, camera, controls) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fov = camera.fov * (Math.PI / 180);
  const dist = (maxDim * 0.7) / Math.tan(fov / 2); // zoom plus rapproché

  camera.position.copy(
    center.clone().add(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(dist))
  );
  camera.near = Math.max(0.01, maxDim / 1000);
  camera.far = Math.max(1000, dist * 10);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.target.y -= size.y * 0.6; // remonte légèrement la scène
  controls.update();
}

/**
 * Crée un viewer Three.js dans un conteneur donné.
 */
function createViewer(container, modelUrl, options = {}) {
  const { autoRotate = true, rotationSpeed = 0.01 } = options;

  const rect = container.getBoundingClientRect();
  const width = rect.width || 200;
  const height = rect.height || 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f7fb');

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1e6);
  camera.position.set(3, 2, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // --- Active les ombres ---
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // On vide le conteneur et on ajoute le canvas WebGL
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // --- Sol invisible pour capter les ombres ---
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.45 });
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    shadowMaterial
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.001;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  let currentRoot = null;

  gltfLoader.load(
    modelUrl,
    (gltf) => {
      currentRoot = gltf.scene || (gltf.scenes && gltf.scenes[0]);
      if (!currentRoot) {
        console.error('GLB chargé mais aucune scène trouvée.');
        return;
      }
      scene.add(currentRoot);

      // --- Active les ombres pour les meshes et récupère les lights ---
      const allLights = [];
      currentRoot.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
        if (obj.isLight) {
          obj.intensity *= 0.01; // ✅ multiplicateur 0.01
          allLights.push(obj);
        }
      });

      // --- Sélectionne jusqu’à 4 DirectionalLight dans le modèle ---
      const suns = allLights.filter((l) => l.isDirectionalLight).slice(0, 4);
      suns.forEach((light) => {
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0005;

        const cam = light.shadow.camera;
        cam.left = -10;
        cam.right = 10;
        cam.top = 10;
        cam.bottom = -10;
        cam.near = 0.1;
        cam.far = 100;
        cam.updateProjectionMatrix();
      });

      // --- Centre et cadre le modèle ---
      frameFit(currentRoot, camera, controls);

      // --- Ajuste le sol à la base du modèle ---
      const box = new THREE.Box3().setFromObject(currentRoot);
      const center = box.getCenter(new THREE.Vector3());
      shadowPlane.position.set(center.x, box.min.y - 0.001, center.z);
    },
    undefined,
    (error) => {
      console.error(`Erreur de chargement du modèle GLB (${modelUrl}) :`, error);
    }
  );

  // Resize responsive
  window.addEventListener('resize', () => {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height);
  });

  function animate() {
    requestAnimationFrame(animate);
    if (currentRoot && autoRotate) {
      currentRoot.rotation.y += rotationSpeed;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

/**
 * Initialise tous les viewers présents dans le DOM.
 * (une bulle = un `.threejs-glb` avec un data-glb-model)
 */
export function initAllGlbViewers() {
  const containers = document.querySelectorAll('.threejs-glb[data-glb-model]');
  if (!containers.length) return;

  containers.forEach((container) => {
    const modelUrl = container.dataset.glbModel;
    if (!modelUrl) return;

    const autoRotateAttr = container.dataset.glbAutorotate;
    const speedAttr = container.dataset.glbSpeed;

    const autoRotate =
      autoRotateAttr === undefined ? true : autoRotateAttr !== 'false';
    const rotationSpeed =
      speedAttr !== undefined ? parseFloat(speedAttr) : 0.01;

    createViewer(container, modelUrl, {
      autoRotate,
      rotationSpeed: isNaN(rotationSpeed) ? 0.01 : rotationSpeed,
    });
  });
}

// On expose la fonction dans le global pour pouvoir l'appeler depuis script.js
window.initAllGlbViewers = initAllGlbViewers;
