import * as THREE from "three";
import { PITCH } from "./layout";
import type { Look } from "./materials";

const COLORS = [0xe63946, 0x4db6ff, 0xf4f1ea, 0xffd24a, 0x2a9d8f, 0x6a4c93];

function buildCar(color: number, lights: { head: THREE.MeshStandardMaterial; tail: THREE.MeshStandardMaterial }) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 4.4), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 }));
  body.position.y = 0.85;
  body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), new THREE.MeshStandardMaterial({ color: 0x1d2a3a, roughness: 0.1, metalness: 0.6 }));
  cabin.position.set(0, 1.6, -0.2);
  car.add(body, cabin);
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12).rotateZ(Math.PI / 2);
  const tyre = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const [x, z] of [
    [-1.05, -1.4],
    [1.05, -1.4],
    [-1.05, 1.4],
    [1.05, 1.4],
  ]) {
    const w = new THREE.Mesh(wheel, tyre);
    w.position.set(x, 0.42, z);
    car.add(w);
  }
  for (const x of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.05), lights.head);
    head.position.set(x, 0.95, -2.22);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.05), lights.tail);
    tail.position.set(x, 0.95, 2.22);
    car.add(head, tail);
  }
  return car;
}

// cars loop square ring roads; lanes keep the two directions apart
export function buildTraffic(size: number) {
  const group = new THREE.Group();
  const head = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xfff6d5, emissiveIntensity: 0.2 });
  const tail = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 0.2 });
  const rings = [(size / 2) * PITCH, (size / 2 - 1) * PITCH];
  const cars = COLORS.map((color, i) => {
    const car = buildCar(color, { head, tail });
    group.add(car);
    const clockwise = i % 2 === 0;
    const ring = rings[Math.floor(i / 2) % rings.length];
    // inner lane for one direction, outer lane for the other
    const half = ring + (clockwise ? -3 : 3) * (ring === rings[0] ? 0.6 : 1);
    return { car, half, clockwise, s: (i / COLORS.length) * 4, speed: 14 + (i % 3) * 3 };
  });

  function at(s: number, half: number): [number, number] {
    const u = ((s % 4) + 4) % 4;
    const side = Math.floor(u);
    const t = (u - side) * 2 * half - half;
    return ([
      [t, -half],
      [half, t],
      [-t, half],
      [-half, -t],
    ] as [number, number][])[side];
  }

  return {
    group,
    applyLook(look: Look) {
      group.visible = look !== "blueprint";
      head.emissiveIntensity = tail.emissiveIntensity = look === "night" ? 3 : 0.2;
    },
    update(dt: number, reducedMotion: boolean) {
      for (const c of cars) {
        if (!reducedMotion) c.s += ((c.clockwise ? 1 : -1) * c.speed * dt) / (2 * c.half);
        const [x, z] = at(c.s, c.half);
        const [nx, nz] = at(c.s + (c.clockwise ? 0.01 : -0.01), c.half);
        c.car.position.set(x, 0.05, z);
        c.car.rotation.y = Math.atan2(-(nx - x), -(nz - z));
      }
    },
  };
}
