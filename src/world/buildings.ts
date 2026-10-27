import * as THREE from "three";
import type { Style } from "./layout";
import { FOOTPRINT } from "./layout";
import type { AccentKey, Materials } from "./materials";
import { TILE_SPAN } from "./textures";

// box whose side UVs tile the window texture at a constant real-world size
function facadeGeometry(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const faces: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  faces.forEach(([a, b], face) => {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v;
      uv.setXY(i, (uv.getX(i) * a) / TILE_SPAN, (uv.getY(i) * b) / TILE_SPAN);
    }
  });
  return geometry;
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function volume(m: Materials, w: number, h: number, d: number, x: number, y: number, z: number, white = false) {
  const side = white ? m.facadeWhite : m.facade;
  const box = mesh(facadeGeometry(w, h, d), [side, side, m.roof, m.roof, side, side]);
  box.position.set(x, y + h / 2, z);
  return box;
}

function crown(m: Materials, accent: AccentKey, w: number, d: number, x: number, y: number, z: number) {
  const band = mesh(new THREE.BoxGeometry(w + 0.6, 1.3, d + 0.6), m.crowns[accent]);
  band.position.set(x, y - 0.65, z);
  return band;
}

function roofPlate(m: Materials, accent: AccentKey, w: number, d: number, x: number, y: number, z: number) {
  const plate = mesh(new THREE.BoxGeometry(w * 0.7, 0.4, d * 0.7), m.crowns[accent]);
  plate.position.set(x, y + 0.2, z);
  return plate;
}

function tower(m: Materials, accent: AccentKey, h: number) {
  const g = new THREE.Group();
  const tiers: [number, number][] = [
    [20, h * 0.5],
    [15, h * 0.3],
    [10, h * 0.2],
  ];
  let y = 0;
  for (const [size, tierHeight] of tiers) {
    g.add(volume(m, size, tierHeight, size, 0, y, 0));
    y += tierHeight;
    g.add(crown(m, accent, size, size, 0, y, 0));
  }
  const spire = mesh(new THREE.CylinderGeometry(0.25, 0.7, 9, 8), m.metal);
  spire.position.y = y + 4.5;
  g.add(spire);
  return g;
}

function midrise(m: Materials, accent: AccentKey, h: number) {
  const g = new THREE.Group();
  g.add(volume(m, 20, h, 18, 0, 0, 0));
  g.add(crown(m, accent, 20, 18, 0, h, 0));
  g.add(roofPlate(m, accent, 20, 18, 0, h, 0));
  for (const [x, z] of [
    [-5, -4],
    [-1, -4],
  ]) {
    const unit = mesh(new THREE.BoxGeometry(2.6, 1.6, 2.6), m.metal);
    unit.position.set(x, h + 1.2, z);
    g.add(unit);
  }
  const tank = mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 12), m.metal);
  tank.position.set(5, h + 1.9, 3);
  g.add(tank);
  return g;
}

function mall(m: Materials, accent: AccentKey, h: number) {
  const g = new THREE.Group();
  const low = Math.min(h, 14);
  g.add(volume(m, FOOTPRINT, low, 16, 0, 0, -1));
  const band = mesh(new THREE.BoxGeometry(FOOTPRINT + 0.2, 2.4, 16.2), m.glass);
  band.position.set(0, low * 0.45, -1);
  g.add(band);
  g.add(crown(m, accent, FOOTPRINT, 16, 0, low, -1));
  const canopy = mesh(new THREE.BoxGeometry(FOOTPRINT - 4, 0.5, 4), m.crowns[accent]);
  canopy.position.set(0, 4.5, 8.8);
  g.add(canopy);
  return g;
}

function courtyard(m: Materials, accent: AccentKey, h: number) {
  const g = new THREE.Group();
  g.add(volume(m, 20, h, 8, 0, 0, -6));
  g.add(crown(m, accent, 20, 8, 0, h, -6));
  g.add(volume(m, 8, h * 0.7, 12, -6, 0, 4));
  g.add(crown(m, accent, 8, 12, -6, h * 0.7, 4));
  return g;
}

function stepped(m: Materials, accent: AccentKey, h: number) {
  const g = new THREE.Group();
  g.add(volume(m, 14, h, 14, -3, 0, -3));
  g.add(crown(m, accent, 14, 14, -3, h, -3));
  g.add(volume(m, 12, h * 0.55, 12, 4, 0, 4));
  g.add(crown(m, accent, 12, 12, 4, h * 0.55, 4));
  return g;
}

export function buildBuilding(m: Materials, style: Style, accent: AccentKey, height: number) {
  const builders = { tower, midrise, mall, courtyard, stepped };
  return builders[style](m, accent, height);
}

export function buildAboutStudio(m: Materials) {
  const g = new THREE.Group();
  g.add(volume(m, 20, 14, 16, 0, 0, -1, true));
  const glassFront = mesh(new THREE.BoxGeometry(14, 8, 0.4), m.glass);
  glassFront.position.set(0, 5, 7.1);
  g.add(glassFront);
  g.add(crown(m, "about", 20, 16, 0, 14, -1));
  return g;
}

export function buildContactTower(m: Materials, redLight: THREE.Mesh) {
  const g = new THREE.Group();
  g.add(volume(m, 12, 6, 12, 0, 0, 0, true));
  const mast = new THREE.CylinderGeometry(0.6, 3.2, 44, 4, 8, true);
  const lattice = new THREE.LineSegments(new THREE.EdgesGeometry(mast, 1), new THREE.LineBasicMaterial({ color: 0xc9ced6 }));
  lattice.position.y = 6 + 22;
  lattice.userData.keepVisible = true;
  g.add(lattice);
  for (const [y, r] of [
    [18, 2.6],
    [30, 1.9],
    [42, 1.2],
  ]) {
    const ring = mesh(new THREE.TorusGeometry(r, 0.18, 8, 32), m.crowns.contact);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  redLight.position.y = 51;
  g.add(redLight);
  return g;
}
