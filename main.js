import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

const freeFallA = 9.81;
let velocity = 0;
let lastTime = 0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(50, 1, 50),
  new THREE.MeshNormalMaterial(),
);
floor.position.y = 0;

scene.add(floor);

const renderer = new THREE.WebGLRenderer();
camera.position.set(0, 10, 40);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 12, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 100;
controls.update();

let fallTime = 0;

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  controls.update();
  renderer.render(scene, camera);

  for (const c of cubes) c.update(dt);
}

class FallingCube {
  constructor(scene, { height, size, color }) {
    this.size = size;
    this.velocity = 0;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color }),
    );
    // случайный разброс по XZ, чтобы кубы не сливались
    this.mesh.position.set(
      (Math.random() - 0.5) * 20,
      height,
      (Math.random() - 0.5) * 20,
    );
    scene.add(this.mesh);
  }

  update(dt) {
    const labelDiv = document.createElement("div");
    labelDiv.style.cssText = `
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 4px;
  font: 12px monospace;
  white-space: pre;
  pointer-events: none;
`;
    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 1, 0);
    this.mesh.add(label);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.cssText = `
  position: absolute;
  top: 0;
  pointer-events: none;
`;
    document.body.appendChild(labelRenderer.domElement);

    const floorY = 0.5 + this.size / 2; // верх пола + половина куба
    if (this.mesh.position.y <= floorY) return;

    this.velocity += freeFallA * dt;
    this.mesh.position.y -= this.velocity * dt;
    labelDiv.textContent = `v = ${velocity.toFixed(1)} м/с\n`;

    label.visible = true;

    if (this.mesh.position.y <= floorY) {
      this.mesh.position.y = floorY;
      this.velocity = 0;
      label.visible = false;
    }
    labelRenderer.render(scene, camera);
  }
}

const cubes = [];
const statsEl = document.getElementById("stats");

document.getElementById("spawn").addEventListener("click", () => {
  cubes.push(
    new FallingCube(scene, {
      height: parseFloat(document.getElementById("height").value),
      size: parseFloat(document.getElementById("size").value),
      color: document.getElementById("color").value,
    }),
  );
  statsEl.textContent = `Кубов: ${cubes.length}`;
});

renderer.setAnimationLoop(animate);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
