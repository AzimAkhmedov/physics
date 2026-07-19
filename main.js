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

function resolvePair(a, b) {
  const pa = a.mesh.position,
    pb = b.mesh.position;
  const half = (a.size + b.size) / 2;

  const px = half - Math.abs(pb.x - pa.x);
  const py = half - Math.abs(pb.y - pa.y);
  const pz = half - Math.abs(pb.z - pa.z);
  if (px <= 0 || py <= 0 || pz <= 0) return;

  const normal = new THREE.Vector3();
  let depth;
  if (px <= py && px <= pz) {
    depth = px;
    normal.set(Math.sign(pb.x - pa.x) || 1, 0, 0);
  } else if (py <= pz) {
    depth = py;
    normal.set(0, Math.sign(pb.y - pa.y) || 1, 0);
  } else {
    depth = pz;
    normal.set(0, 0, Math.sign(pb.z - pa.z) || 1);
  }

  const totalInv = a.invMass + b.invMass;
  pa.addScaledVector(normal, -depth * (a.invMass / totalInv));
  pb.addScaledVector(normal, depth * (b.invMass / totalInv));

  const relVel = new THREE.Vector3().subVectors(b.velocity, a.velocity);
  const velAlongNormal = relVel.dot(normal);
  if (velAlongNormal > 0) return;

  const e = Math.min(a.restitution, b.restitution);
  const j = (-(1 + e) * velAlongNormal) / totalInv;

  a.velocity.addScaledVector(normal, -j * a.invMass);
  b.velocity.addScaledVector(normal, j * b.invMass);
}
class FallingCube {
  constructor(scene, { height, size, color, mass = 1, restitution = 0.7 }) {
    this.id = crypto.randomUUID();
    this.size = size;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.invMass = 1 / mass;

    this.mass = mass || 0;
    this.restitution = restitution;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color }),
    );
    this.mesh.position.set(
      (Math.random() - 0.5) * 20,
      height,
      (Math.random() - 0.5) * 20,
    );
    scene.add(this.mesh);

    this.labelDiv = document.createElement("div");
    this.labelDiv.style.cssText = `
      color: white;
      background: rgba(0, 0, 0, 0.6);
      padding: 4px 8px;
      border-radius: 4px;
      font: 12px monospace;
      white-space: pre;
      pointer-events: none;
    `;
    this.label = new CSS2DObject(this.labelDiv);
    this.label.position.set(0, size / 2 + 0.5, 0);
    this.mesh.add(this.label);
  }

  update(dt) {
    const floorY = 0.5 + this.size / 2;

    this.velocity.y -= freeFallA * dt;
    // this.mesh.position.y -= this.velocity * dt;
    this.mesh.position.addScaledVector(this.velocity, dt);

    this.labelDiv.textContent = `v = ${this.velocity.y.toFixed(1)} м/с`;

    if (this.mesh.position.y <= floorY) {
      this.mesh.position.y = floorY;
      if (this.velocity.y < 0) {
        this.velocity.y = -this.velocity.y * this.restitution;
        if (Math.abs(this.velocity.y) < 0.5) {
          this.velocity.y = 0;
          this.label.visible = false;
        }
      }

      this.velocity.x *= 0.98;
      this.velocity.z *= 0.98;
    }
  }
}
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

  for (let i = 0; i < cubes.length; i++) {
    for (let j = i + 1; j < cubes.length; j++) {
      resolvePair(cubes[i], cubes[j]);
    }
  }

  controls.update();
  renderer.render(scene, camera); // потом рендер
  labelRenderer.render(scene, camera); // и слой лейблов — один вызов на кадр
}

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.cssText = `
  position: absolute;
  top: 0;
  pointer-events: none;
`;
document.body.appendChild(labelRenderer.domElement);

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
