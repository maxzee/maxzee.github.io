import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hash, PITCH, PLOT, type Lot } from "./layout";
import type { Look } from "./materials";
import { groundTextTexture } from "./textures";

const GROUND = { day: 0xe2be88, night: 0x161a22 };
const ASPHALT = { day: 0x5d5f66, night: 0x1f222a };
const SIDEWALK = { day: 0xd9d4c7, night: 0x2a2e37 };

function flat(geometry: THREE.BufferGeometry) {
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function sky() {
  const uniforms = {
    top: { value: new THREE.Color(0x4e9bd8) },
    mid: { value: new THREE.Color(0xa9d3f0) },
    bottom: { value: new THREE.Color(0xeaf2f4) },
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vDir;
        void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bottom, min(-h * 4.0, 1.0)); gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}

function stars() {
  const positions = [];
  for (let i = 0; i < 700; i++) {
    const theta = hash(`s${i}`) * Math.PI * 2;
    const y = 0.08 + hash(`y${i}`) * 0.92;
    const r = Math.sqrt(1 - y * y);
    positions.push(Math.cos(theta) * r * 850, y * 850, Math.sin(theta) * r * 850);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2, sizeAttenuation: false, fog: false }));
}

function clouds() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, fog: false });
  for (let i = 0; i < 9; i++) {
    const parts = [];
    for (let j = 0; j < 4; j++) {
      const blob = new THREE.IcosahedronGeometry(10 + hash(`c${i}${j}`) * 8, 0);
      blob.scale(1.4, 0.55, 1);
      blob.translate(j * 14 - 20, hash(`cy${i}${j}`) * 4, hash(`cz${i}${j}`) * 10 - 5);
      parts.push(blob);
    }
    const cloud = new THREE.Mesh(mergeGeometries(parts), material);
    const angle = (i / 9) * Math.PI * 2;
    cloud.position.set(Math.cos(angle) * (420 + hash(`d${i}`) * 160), 170 + hash(`h${i}`) * 70, Math.sin(angle) * (420 + hash(`d${i}`) * 160));
    group.add(cloud);
  }
  return group;
}

function palmGeometries() {
  const trunk = new THREE.CylinderGeometry(0.3, 0.55, 8, 6, 4);
  trunk.translate(0, 4, 0);
  const position = trunk.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    position.setX(i, position.getX(i) + (y / 8) ** 2 * 1.2);
  }
  trunk.computeVertexNormals();

  const fronds = [];
  for (let i = 0; i < 7; i++) {
    const frond = new THREE.BoxGeometry(5.2, 0.12, 1.1);
    frond.translate(2.6, 0, 0);
    frond.rotateZ(-0.38);
    frond.rotateY((i / 7) * Math.PI * 2);
    frond.translate(1.2, 8, 0);
    fronds.push(frond);
  }
  return { trunk, crown: mergeGeometries(fronds) };
}

function palms(points: THREE.Vector3[]) {
  const { trunk, crown } = palmGeometries();
  const trunks = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }), points.length);
  const crowns = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.8 }), points.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  points.forEach((p, i) => {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(`palm${i}`) * Math.PI * 2);
    const s = 0.85 + hash(`ps${i}`) * 0.4;
    scale.set(s, s, s);
    matrix.compose(p, quaternion, scale);
    trunks.setMatrixAt(i, matrix);
    crowns.setMatrixAt(i, matrix);
  });
  trunks.castShadow = crowns.castShadow = true;
  const group = new THREE.Group();
  group.add(trunks, crowns);
  return group;
}

function roadDashes(size: number, span: number) {
  const step = 7;
  const lines: { x: number; z: number; along: "x" | "z" }[] = [];
  for (let i = 0; i <= size; i++) {
    const offset = (i - size / 2) * PITCH;
    for (let t = -span / 2 + 3; t < span / 2; t += step) {
      lines.push({ x: offset, z: t, along: "z" });
      lines.push({ x: t, z: offset, along: "x" });
    }
  }
  const dashes = new THREE.InstancedMesh(flat(new THREE.PlaneGeometry(3, 0.4)), new THREE.MeshBasicMaterial({ color: 0xf4f1e8 }), lines.length);
  const matrix = new THREE.Matrix4();
  lines.forEach((l, i) => {
    matrix.makeRotationY(l.along === "z" ? Math.PI / 2 : 0);
    matrix.setPosition(l.x, 0.06, l.z);
    dashes.setMatrixAt(i, matrix);
  });
  return dashes;
}

export function buildScenery(lots: Lot[], size: number, span: number) {
  const group = new THREE.Group();
  const skyDome = sky();
  const starField = stars();
  const cloudLayer = clouds();

  const ground = new THREE.Mesh(flat(new THREE.PlaneGeometry(2400, 2400)), new THREE.MeshStandardMaterial({ color: GROUND.day, roughness: 1 }));
  ground.receiveShadow = true;

  const asphalt = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(span + 14, span + 14)),
    new THREE.MeshStandardMaterial({ color: ASPHALT.day, roughness: 0.95 }),
  );
  asphalt.position.y = 0.03;
  asphalt.receiveShadow = true;

  const plotMaterial = new THREE.MeshStandardMaterial({ color: SIDEWALK.day, roughness: 0.9 });
  const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x2fbf63 });
  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x6fae4f, roughness: 1 });
  const plots = new THREE.Group();
  const palmPoints: THREE.Vector3[] = [];
  const half = PLOT / 2;

  for (const lot of lots) {
    const plot = new THREE.Mesh(new THREE.BoxGeometry(PLOT, 0.4, PLOT), lot.kind === "park" ? grassMaterial : plotMaterial);
    plot.position.set(lot.x, 0.2, lot.z);
    plot.receiveShadow = true;
    plots.add(plot);

    const outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, 0, -half),
        new THREE.Vector3(half, 0, -half),
        new THREE.Vector3(half, 0, half),
        new THREE.Vector3(-half, 0, half),
      ]),
      outlineMaterial,
    );
    outline.position.set(lot.x, 0.43, lot.z);
    plots.add(outline);

    // palms on the back corners only, so banners at the front stay clear
    palmPoints.push(new THREE.Vector3(lot.x - half + 2, 0.4, lot.z - half + 2), new THREE.Vector3(lot.x + half - 2, 0.4, lot.z - half + 2));
    if (lot.kind === "park") {
      for (let i = 0; i < 5; i++) {
        palmPoints.push(new THREE.Vector3(lot.x + (hash(`pk${lot.index}${i}`) - 0.5) * 20, 0.4, lot.z + (hash(`pz${lot.index}${i}`) - 0.5) * 20));
      }
    }
  }

  for (let t = -span / 2; t <= span / 2; t += 12) {
    const edge = span / 2 + 12;
    palmPoints.push(new THREE.Vector3(t, 0, -edge), new THREE.Vector3(t, 0, edge), new THREE.Vector3(-edge, 0, t), new THREE.Vector3(edge, 0, t));
  }

  const palmGroup = palms(palmPoints);
  const dashes = roadDashes(size, span + 10);

  const blueprintGrid = new THREE.GridHelper(span + 200, Math.round((span + 200) / 8), 0x2e5e9a, 0x1b3d6b);
  blueprintGrid.position.y = 0.05;

  group.add(ground, asphalt, plots, dashes, palmGroup, blueprintGrid, starField, cloudLayer);

  function applyLook(look: Look) {
    const night = look === "night";
    const bp = look === "blueprint";
    skyDome.mesh.visible = !bp;
    skyDome.uniforms.top.value.set(night ? 0x02040b : 0x4e9bd8);
    skyDome.uniforms.mid.value.set(night ? 0x0b1530 : 0xa9d3f0);
    skyDome.uniforms.bottom.value.set(night ? 0x141c2c : 0xeaf2f4);
    starField.visible = night;
    cloudLayer.visible = look === "day";
    ground.visible = !bp;
    asphalt.visible = !bp;
    dashes.visible = !bp;
    palmGroup.visible = !bp;
    blueprintGrid.visible = bp;
    (ground.material as THREE.MeshStandardMaterial).color.set(night ? GROUND.night : GROUND.day);
    (asphalt.material as THREE.MeshStandardMaterial).color.set(night ? ASPHALT.night : ASPHALT.day);
    plotMaterial.color.set(bp ? 0x0b2447 : night ? SIDEWALK.night : SIDEWALK.day);
    plotMaterial.transparent = bp;
    plotMaterial.opacity = bp ? 0.4 : 1;
    grassMaterial.color.set(bp ? 0x0b2447 : night ? 0x1e3322 : 0x6fae4f);
    grassMaterial.transparent = bp;
    grassMaterial.opacity = bp ? 0.4 : 1;
    outlineMaterial.color.set(bp ? 0x9cc4ff : 0x2fbf63);
  }

  return { group, sky: skyDome.mesh, clouds: cloudLayer, applyLook };
}

export function buildPlaza(lot: Lot) {
  const group = new THREE.Group();
  group.position.set(lot.x, 0.4, lot.z);

  const paving = new THREE.Mesh(flat(new THREE.CircleGeometry(13, 48)), new THREE.MeshStandardMaterial({ color: 0xeee6d4, roughness: 0.8 }));
  paving.position.y = 0.02;
  paving.receiveShadow = true;

  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffd24a, emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.35, 10, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;

  const label = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(14, 3.5)),
    new THREE.MeshBasicMaterial({ map: groundTextTexture("START HERE", "#ffffff"), transparent: true, color: 0x14213d }),
  );
  label.position.set(0, 0.05, 0);

  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 9, 22, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = 11;

  group.add(paving, ring, label, cone);

  function applyLook(look: Look) {
    ringMaterial.emissiveIntensity = look === "night" ? 2 : 0.2;
    cone.visible = look === "night";
    paving.visible = look !== "blueprint";
    (label.material as THREE.MeshBasicMaterial).color.set(look === "day" ? 0x14213d : 0xffd24a);
  }

  return { group, applyLook, ring };
}
