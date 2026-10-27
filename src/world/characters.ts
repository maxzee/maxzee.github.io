import * as THREE from "three";
import type { Lot } from "./layout";
import { hash } from "./layout";
import type { Look } from "./materials";

type Idle = "kick" | "scan" | "lean" | "bob" | "cup" | "brief" | "card" | "child" | "halo" | "fly" | "plot" | "shard" | "unknown" | "sword" | "shamble" | "aim" | "robot" | "tank";

interface Spec {
  title: string;
  hi: string;
  idle: Idle;
  skin: number;
  shirt: number;
  pants: number;
  extras?: (rig: Rig, mat: (c: number, o?: Partial<THREE.MeshStandardMaterialParameters>) => THREE.Material) => void;
}

interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  prop: THREE.Group;
}

const cache = new Map<string, THREE.Material>();
function mat(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = `${color}:${JSON.stringify(extra)}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra }));
  return cache.get(key)!;
}

function box(w: number, h: number, d: number, material: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true;
  return m;
}

function limb(w: number, h: number, material: THREE.Material) {
  const pivot = new THREE.Group();
  const part = box(w, h, w, material);
  part.position.y = -h / 2;
  pivot.add(part);
  return pivot;
}

// a simple blocky person, about human scale; callers scale it up
function humanoid(skin: number, shirt: number, pants: number): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const legL = limb(0.24, 0.85, mat(pants));
  const legR = limb(0.24, 0.85, mat(pants));
  legL.position.set(-0.14, 0.85, 0);
  legR.position.set(0.14, 0.85, 0);
  const torso = box(0.6, 0.7, 0.32, mat(shirt));
  torso.position.y = 1.2;
  const head = new THREE.Group();
  const face = box(0.36, 0.38, 0.34, mat(skin));
  face.position.y = 0.19;
  head.add(face);
  head.position.y = 1.56;
  const armL = limb(0.18, 0.7, mat(shirt));
  const armR = limb(0.18, 0.7, mat(shirt));
  armL.position.set(-0.4, 1.52, 0);
  armR.position.set(0.4, 1.52, 0);
  const prop = new THREE.Group();
  body.add(legL, legR, torso, head, armL, armR, prop);
  return { root, body, head, armL, armR, legL, legR, prop };
}

const SPECS: Record<string, Spec> = {
  "kungfu-karate": {
    title: "Fighter",
    hi: "Hi-yah! Fight me in KungFu Karate!",
    idle: "kick",
    skin: 0xe0b48a,
    shirt: 0xf5f5f0,
    pants: 0xf5f5f0,
    extras: (r, m) => {
      const belt = box(0.62, 0.08, 0.34, m(0x111111));
      belt.position.y = 0.9;
      const band = box(0.38, 0.07, 0.36, m(0xd62828));
      band.position.y = 0.32;
      r.body.add(belt);
      r.head.add(band);
    },
  },
  "fps-commando": {
    title: "Commando",
    hi: "Squad's ready. Check out FPS Commando.",
    idle: "scan",
    skin: 0xc68c5c,
    shirt: 0x4b5d3a,
    pants: 0x3a4a2e,
    extras: (r, m) => {
      const helmet = box(0.42, 0.18, 0.4, m(0x34402a));
      helmet.position.y = 0.42;
      const vest = box(0.66, 0.5, 0.38, m(0x2a3322));
      vest.position.y = 1.2;
      const pack = box(0.45, 0.5, 0.2, m(0x3a4a2e));
      pack.position.set(0, 1.2, -0.28);
      const rifle = box(0.08, 0.1, 0.9, m(0x1a1a1a));
      rifle.position.set(0.1, 1.15, 0.35);
      r.head.add(helmet);
      r.body.add(vest, pack);
      r.prop.add(rifle);
    },
  },
  "mototraffic-rider": {
    title: "Rider",
    hi: "Ride through traffic in MotoTraffic Rider!",
    idle: "lean",
    skin: 0xd9a77a,
    shirt: 0x222831,
    pants: 0x222831,
    extras: (r, m) => {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8), m(0xd62828));
      helmet.position.y = 0.22;
      r.head.add(helmet);
      const bike = new THREE.Group();
      const frame = box(0.3, 0.35, 1.6, m(0xd62828, { metalness: 0.4 }));
      frame.position.y = 0.55;
      for (const z of [-0.65, 0.65]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 16), m(0x111111));
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(0, 0.35, z);
        bike.add(wheel);
      }
      bike.add(frame);
      r.root.add(bike);
      r.body.position.set(0, 0.05, -0.1);
      r.legL.rotation.x = r.legR.rotation.x = -1.2;
      r.armL.rotation.x = r.armR.rotation.x = -1.1;
    },
  },
  "mars-simulation": {
    title: "Astronaut",
    hi: "Next stop: Mars. Explore Mars Simulation.",
    idle: "bob",
    skin: 0xf2f2f2,
    shirt: 0xf2f2f2,
    pants: 0xe6e6e6,
    extras: (r, m) => {
      const visor = box(0.3, 0.2, 0.05, m(0xffc93c, { metalness: 0.9, roughness: 0.1 }));
      visor.position.set(0, 0.22, 0.18);
      const pack = box(0.5, 0.6, 0.25, m(0xdddddd));
      pack.position.set(0, 1.25, -0.28);
      const poleMesh = box(0.04, 1.6, 0.04, m(0xbbbbbb));
      poleMesh.position.set(0.55, 1.2, 0.2);
      const flag = box(0.6, 0.38, 0.02, m(0xff8a3d));
      flag.position.set(0.86, 1.8, 0.2);
      flag.name = "flag";
      r.head.add(visor);
      r.body.add(pack);
      r.prop.add(poleMesh, flag);
    },
  },
  "boba-tea": {
    title: "Shop owner",
    hi: "One boba tea coming up!",
    idle: "cup",
    skin: 0xe8b98f,
    shirt: 0xff8fab,
    pants: 0x3d405b,
    extras: (r, m) => {
      const cart = new THREE.Group();
      const counter = box(1.4, 0.9, 0.7, m(0xffffff));
      counter.position.y = 0.45;
      for (let i = 0; i < 4; i++) {
        const stripe = box(0.35, 0.1, 0.72, m(i % 2 ? 0xff8fab : 0xffffff));
        stripe.position.set(-0.52 + i * 0.35, 1.5, 0);
        cart.add(stripe);
      }
      cart.add(counter);
      cart.position.set(0, 0, 0.8);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 10), m(0xc9a27e));
      cup.name = "cup";
      cup.position.set(0, -0.75, 0);
      r.armR.add(cup);
      r.root.add(cart);
    },
  },
  "bank-manager": {
    title: "Bank manager",
    hi: "Welcome to the bank. Your account is in good hands.",
    idle: "brief",
    skin: 0xd6a37b,
    shirt: 0x1f2a44,
    pants: 0x1f2a44,
    extras: (r, m) => {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), m(0x111111));
      brim.position.y = 0.4;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 16), m(0x111111));
      crown.position.y = 0.53;
      const case_ = box(0.36, 0.28, 0.1, m(0x5b3a1e));
      case_.position.set(0, -0.8, 0);
      r.head.add(brim, crown);
      r.armR.add(case_);
    },
  },
  "bank-atm": {
    title: "ATM helper",
    hi: "Insert card, learn banking!",
    idle: "card",
    skin: 0xc68c5c,
    shirt: 0x2a9d8f,
    pants: 0x264653,
    extras: (r, m) => {
      const atm = box(0.8, 1.7, 0.6, m(0x9aa3ad, { metalness: 0.5 }));
      atm.position.set(0.95, 0.85, 0);
      const screen = box(0.5, 0.35, 0.02, m(0x4de3ff, { emissive: 0x4de3ff, emissiveIntensity: 0.8 }));
      screen.position.set(0.95, 1.25, 0.31);
      const card = box(0.22, 0.14, 0.02, m(0xffd24a));
      card.position.set(0, -0.75, 0.1);
      r.root.add(atm, screen);
      r.armL.add(card);
    },
  },
  "virtual-mom": {
    title: "Mom",
    hi: "Family time! Say hi in Virtual Mom.",
    idle: "child",
    skin: 0xf0c8a0,
    shirt: 0xe76f51,
    pants: 0x264653,
    extras: (r, m) => {
      const hair = box(0.4, 0.2, 0.38, m(0x4a2c1a));
      hair.position.y = 0.4;
      r.head.add(hair);
      const child = humanoid(0xf0c8a0, 0xf4a261, 0x2a9d8f);
      child.root.scale.setScalar(0.5);
      child.root.position.set(0.75, 0, 0.2);
      child.root.name = "child";
      r.root.add(child.root);
    },
  },
  orionmeta: {
    title: "Avatar",
    hi: "Step into the metaverse with OrionMeta.",
    idle: "halo",
    skin: 0x7fd8ff,
    shirt: 0x7fd8ff,
    pants: 0x7fd8ff,
    extras: (r) => {
      r.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = new THREE.MeshStandardMaterial({ color: 0x7fd8ff, emissive: 0x4db6ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 });
      });
      for (let i = 0; i < 2; i++) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.6 + i * 0.25, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: 0x9fe3ff }));
        halo.position.y = 1.3 + i * 0.5;
        halo.rotation.x = Math.PI / 2;
        halo.name = "halo";
        r.root.add(halo);
      }
    },
  },
  "reader-bee": {
    title: "Bee",
    hi: "Buzz! Let's read together.",
    idle: "fly",
    skin: 0xffd24a,
    shirt: 0xffd24a,
    pants: 0x222222,
    extras: (r, m) => {
      for (let i = 0; i < 2; i++) {
        const stripe = box(0.62, 0.1, 0.34, m(0x222222));
        stripe.position.y = 1.05 + i * 0.25;
        r.body.add(stripe);
      }
      for (const x of [-0.35, 0.35]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        wing.position.set(x, 1.45, -0.25);
        wing.rotation.y = x > 0 ? -0.6 : 0.6;
        wing.name = "wing";
        r.body.add(wing);
      }
      const book = box(0.5, 0.36, 0.06, m(0x4db6ff));
      book.position.set(0, 1.15, 0.4);
      r.prop.add(book);
    },
  },
  kingdomland: {
    title: "Citizen",
    hi: "Welcome to KingdomLand. Pick your plot!",
    idle: "plot",
    skin: 0xc8956a,
    shirt: 0xfafafa,
    pants: 0xfafafa,
    extras: (r, m) => {
      const robe = box(0.62, 0.9, 0.34, m(0xfafafa));
      robe.position.y = 0.55;
      const scarf = box(0.42, 0.14, 0.4, m(0xd62828));
      scarf.position.y = 0.4;
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 16), m(0x111111));
      cord.rotation.x = Math.PI / 2;
      cord.position.y = 0.46;
      const signPole = box(0.05, 1.2, 0.05, m(0x8a6440));
      signPole.position.set(0, -0.6, 0);
      const sign = box(0.7, 0.42, 0.04, m(0x2fbf63));
      sign.position.set(0, 0.05, 0.05);
      signPole.add(sign);
      r.body.add(robe);
      r.head.add(scarf, cord);
      r.armR.add(signPole);
    },
  },
  nayzak: {
    title: "The Hooded",
    hi: "…",
    idle: "shard",
    skin: 0x111418,
    shirt: 0x1c2230,
    pants: 0x1c2230,
    extras: (r, m) => {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 10), m(0x1c2230));
      hood.position.y = 0.38;
      for (const x of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4de3ff }));
        eye.position.set(x, 0.2, 0.18);
        eye.name = "eye";
        r.head.add(eye);
      }
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xff8a3d }));
      shard.name = "shard";
      shard.position.y = 1.4;
      r.head.add(hood);
      r.root.add(shard);
    },
  },
  "island-of-deceit": {
    title: "Pirate",
    hi: "Arr! Can ye spot the traitor?",
    idle: "sword",
    skin: 0xd9a77a,
    shirt: 0xf1e3c6,
    pants: 0x2b2d42,
    extras: (r, m) => {
      const bandana = box(0.4, 0.12, 0.38, m(0xd62828));
      bandana.position.y = 0.36;
      const patch = box(0.1, 0.08, 0.02, m(0x111111));
      patch.position.set(0.08, 0.24, 0.18);
      const sword = box(0.05, 0.05, 0.9, m(0xcfd6dd, { metalness: 0.8 }));
      sword.position.set(0, -0.75, 0.4);
      r.head.add(bandana, patch);
      r.armR.add(sword);
    },
  },
  "tank-game": {
    title: "Tank commander",
    hi: "Tanks rolling! Try the Tank Game.",
    idle: "tank",
    skin: 0xd6a37b,
    shirt: 0x6b705c,
    pants: 0x3f4238,
    extras: (r, m) => {
      const cap = box(0.4, 0.12, 0.4, m(0x3f4238));
      cap.position.y = 0.4;
      r.head.add(cap);
      const tank = new THREE.Group();
      const hull = box(1.2, 0.4, 1.6, m(0x5b8c5a));
      hull.position.y = 0.3;
      const turret = box(0.7, 0.3, 0.7, m(0x4a7449));
      turret.position.y = 0.65;
      const gun = box(0.12, 0.12, 0.9, m(0x333333));
      gun.position.set(0, 0.65, 0.75);
      turret.name = "turret";
      tank.add(hull, turret, gun);
      tank.position.set(1.4, 0, 0.3);
      r.root.add(tank);
    },
  },
  "you-will-die": {
    title: "Zombie",
    hi: "Braaains… You Will Die!",
    idle: "shamble",
    skin: 0x8fb36b,
    shirt: 0x5c4b3c,
    pants: 0x3a3a4a,
  },
  "hack-and-slash-arpg": {
    title: "Serath",
    hi: "Blades ready. Face the boss!",
    idle: "sword",
    skin: 0xe0b48a,
    shirt: 0x6a4c93,
    pants: 0x2b2d42,
    extras: (r, m) => {
      const sword = box(0.06, 0.06, 1.1, m(0xe0e6ed, { metalness: 0.8, emissive: 0x6a4c93, emissiveIntensity: 0.2 }));
      sword.position.set(0, -0.75, 0.5);
      const shield = box(0.5, 0.6, 0.06, m(0x8a6440));
      shield.position.set(-0.1, -0.5, 0.15);
      r.armR.add(sword);
      r.armL.add(shield);
    },
  },
  "space-fighter": {
    title: "Space marine",
    hi: "Gear up, pilot. Space Fighter awaits.",
    idle: "aim",
    skin: 0x6c8fb5,
    shirt: 0x3d5a80,
    pants: 0x293241,
    extras: (r, m) => {
      const visor = box(0.32, 0.12, 0.04, m(0x4de3ff, { emissive: 0x4de3ff, emissiveIntensity: 0.7 }));
      visor.position.set(0, 0.24, 0.18);
      const blaster = box(0.1, 0.14, 0.7, m(0x222222));
      blaster.position.set(0, -0.7, 0.3);
      r.head.add(visor);
      r.armR.add(blaster);
    },
  },
  "scifi-sim-escape": {
    title: "Enforcer",
    hi: "Intruder detected. Can you escape?",
    idle: "robot",
    skin: 0x9aa3ad,
    shirt: 0x5c6670,
    pants: 0x3d444b,
    extras: (r) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
      eye.position.set(0, 0.22, 0.18);
      eye.name = "eye";
      r.head.add(eye);
    },
  },
};

function unknownSpec(name: string): Spec {
  return {
    title: "Coming soon",
    hi: `Characters for ${name} are on their way.`,
    idle: "unknown",
    skin: 0xc7d2e0,
    shirt: 0xc7d2e0,
    pants: 0xc7d2e0,
    extras: (r) => {
      r.root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.material = new THREE.MeshStandardMaterial({ color: 0xc7d2e0, transparent: true, opacity: 0.4 });
      });
    },
  };
}

function textSprite(lines: string[], color: string, bubble = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = bubble ? 160 : 112;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bubble ? "rgba(255,255,255,0.96)" : "rgba(7,10,18,0.85)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, bubble ? 120 : 104, 20);
  ctx.fill();
  if (bubble) {
    ctx.beginPath();
    ctx.moveTo(220, 124);
    ctx.lineTo(256, 156);
    ctx.lineTo(276, 124);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = bubble ? "#14213d" : "#eef2f8";
  ctx.font = bubble ? '700 34px "Rajdhani", sans-serif' : '30px "Russo One", sans-serif';
  const fit = (text: string) => {
    let out = text;
    while (ctx.measureText(out).width > 470 && out.length > 4) out = out.slice(0, -2);
    return out === text ? text : `${out}…`;
  };
  if (bubble) {
    // wrap the greeting onto at most two lines
    ctx.font = '700 30px "Rajdhani", sans-serif';
    const words = lines[0].split(" ");
    const rows = [""];
    for (const word of words) {
      const next = rows[rows.length - 1] ? `${rows[rows.length - 1]} ${word}` : word;
      if (ctx.measureText(next).width > 460 && rows[rows.length - 1] && rows.length < 2) rows.push(word);
      else rows[rows.length - 1] = next;
    }
    rows.forEach((row, i) => ctx.fillText(fit(row), 256, rows.length === 1 ? 64 : 46 + i * 36));
  } else {
    ctx.fillText(fit(lines[0]), 256, 40);
    ctx.fillStyle = color;
    ctx.font = '700 26px "Rajdhani", sans-serif';
    ctx.fillText(fit(lines[1] ?? ""), 256, 80);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(bubble ? 7 : 6, bubble ? 2.2 : 1.3, 1);
  return sprite;
}

interface Hero {
  id: string;
  rig: Rig;
  spec: Spec;
  stage: THREE.Group;
  bubble: THREE.Sprite;
  cone: THREE.Mesh;
  phase: number;
  yaw: number;
}

const SCALE = 2;

export function buildCharacters(entries: { lot: Lot; id: string; name: string; color: number }[]) {
  const group = new THREE.Group();
  const heroes: Hero[] = [];

  for (const { lot, id, name, color } of entries) {
    const spec = SPECS[id] ?? unknownSpec(name);
    const rig = humanoid(spec.skin, spec.shirt, spec.pants);
    spec.extras?.(rig, mat);
    rig.root.scale.setScalar(SCALE);

    const stage = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 32), mat(0x161b26, { roughness: 0.4 }));
    disc.position.y = 0.15;
    disc.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.31;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 2.3, 7, 24, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }),
    );
    cone.position.y = 3.8;
    rig.root.position.y = 0.3;
    stage.add(disc, ring, cone, rig.root);

    const tag = textSprite([spec.title, name], `#${color.toString(16).padStart(6, "0")}`);
    tag.position.y = 5;
    const bubble = textSprite([spec.hi], "#14213d", true);
    bubble.position.y = 6.9;
    bubble.visible = false;
    stage.add(tag, bubble);

    // front-left corner of the plot, facing the street
    stage.position.set(lot.x - 11.5, 0.4, lot.z + 11);
    group.add(stage);
    heroes.push({ id, rig, spec, stage, bubble, cone, phase: hash(id) * 10, yaw: 0 });
  }

  return {
    group,
    applyLook(look: Look) {
      group.visible = look !== "blueprint";
      for (const h of heroes) h.cone.visible = look === "night";
    },
    update(dt: number, t: number, car: THREE.Vector3, greetId: string | null, reducedMotion: boolean) {
      for (const h of heroes) {
        const { rig, spec } = h;
        const time = reducedMotion ? 0 : t + h.phase;
        const toCar = Math.atan2(car.x - h.stage.position.x, car.z - h.stage.position.z);
        const near = Math.hypot(car.x - h.stage.position.x, car.z - h.stage.position.z) < 34;
        const targetYaw = near ? toCar : 0;
        h.yaw += Math.atan2(Math.sin(targetYaw - h.yaw), Math.cos(targetYaw - h.yaw)) * Math.min(1, dt * 3);
        rig.root.rotation.y = h.yaw;

        const greeting = greetId === h.id;
        h.bubble.visible = greeting;
        if (reducedMotion) continue;

        // idle loops
        rig.body.position.y = 0;
        rig.body.rotation.set(0, 0, 0);
        switch (spec.idle) {
          case "kick":
            rig.legR.rotation.x = -Math.max(0, Math.sin(time * 3)) * 1.4;
            rig.armL.rotation.x = -Math.max(0, Math.sin(time * 3 + Math.PI)) * 1.5;
            break;
          case "scan":
            rig.body.rotation.y = Math.sin(time * 0.8) * 0.5;
            break;
          case "lean":
            rig.body.rotation.z = Math.sin(time * 1.1) * 0.12;
            break;
          case "bob":
            rig.body.position.y = Math.abs(Math.sin(time * 1.4)) * 0.35;
            rig.prop.getObjectByName("flag")!.rotation.y = Math.sin(time * 3) * 0.3;
            break;
          case "cup":
            rig.armR.rotation.x = -1.3 - Math.max(0, Math.sin(time * 1.5)) * 1.2;
            break;
          case "brief":
            rig.armR.rotation.x = Math.sin(time * 1.6) * 0.15;
            break;
          case "card":
            rig.armL.rotation.x = -0.9 + Math.sin(time * 2) * 0.2;
            break;
          case "child": {
            const child = rig.root.getObjectByName("child");
            if (child) child.position.y = Math.abs(Math.sin(time * 4)) * 0.3;
            break;
          }
          case "halo":
            rig.root.children.filter((c) => c.name === "halo").forEach((c, i) => (c.rotation.z = time * (i ? -1.5 : 1)));
            rig.body.position.y = Math.sin(time * 1.2) * 0.1 + 0.15;
            break;
          case "fly": {
            const r = 0.6;
            rig.body.position.set(Math.cos(time) * r, 0.6 + Math.sin(time * 2) * 0.15, Math.sin(time) * r);
            rig.body.children.filter((c) => c.name === "wing").forEach((w, i) => (w.rotation.x = Math.sin(time * 30) * 0.6 * (i ? 1 : -1)));
            break;
          }
          case "plot":
            rig.armR.rotation.x = -2.6 + Math.sin(time * 1.2) * 0.15;
            break;
          case "shard": {
            const shard = rig.root.getObjectByName("shard");
            if (shard) shard.position.set(Math.cos(time * 1.4) * 0.7, 1.4 + Math.sin(time * 2) * 0.1, Math.sin(time * 1.4) * 0.7);
            rig.head.children.filter((c) => c.name === "eye").forEach((e) => (e.visible = Math.sin(time * 9) > -0.6));
            break;
          }
          case "unknown":
            rig.body.position.y = Math.sin(time * 1.5) * 0.12;
            break;
          case "sword":
            rig.armR.rotation.x = -0.6 - Math.max(0, Math.sin(time * 2.4)) * 1.6;
            break;
          case "shamble":
            rig.armL.rotation.x = rig.armR.rotation.x = -1.4 + Math.sin(time * 1.3) * 0.15;
            rig.body.rotation.z = Math.sin(time * 1.3) * 0.15;
            rig.head.rotation.z = 0.3;
            break;
          case "aim":
            rig.armR.rotation.x = -1.5;
            rig.armL.rotation.x = -1.3;
            rig.body.rotation.y = Math.sin(time * 0.7) * 0.35;
            break;
          case "robot":
            rig.head.rotation.y = Math.sin(time * 0.9) * 0.8;
            rig.head.children.filter((c) => c.name === "eye").forEach((e) => (e.visible = Math.sin(time * 5) > -0.8));
            break;
          case "tank": {
            const turret = rig.root.getObjectByName("turret");
            if (turret) turret.rotation.y = Math.sin(time * 0.6) * 0.8;
            break;
          }
        }

        // wave while the car is parked on this building's ring
        if (greeting && !["lean", "fly"].includes(spec.idle)) {
          rig.armL.rotation.x = -2.8;
          rig.armL.rotation.z = Math.sin(t * 8) * 0.35;
        } else {
          rig.armL.rotation.z = 0;
        }
      }
    },
  };
}

// a few people walking the sidewalks around plots
export function buildPedestrians(lots: Lot[]) {
  const group = new THREE.Group();
  const shirts = [0xe63946, 0x2a9d8f, 0xf4a261, 0x4db6ff, 0x6a4c93, 0xffd24a, 0xffffff, 0x264653];
  const skins = [0xf0c8a0, 0xc68c5c, 0x8d5524, 0xe0b48a];
  const candidates = lots.filter((l) => l.kind === "project");
  const walkers = shirts.map((shirt, i) => {
    const rig = humanoid(skins[i % skins.length], shirt, 0x2b2d42);
    rig.root.scale.setScalar(1.05);
    group.add(rig.root);
    const lot = candidates[Math.floor(hash(`walk${i}`) * candidates.length)];
    return { rig, lot, s: hash(`ws${i}`) * 4, dir: i % 2 ? 1 : -1, speed: 1.3 + hash(`wv${i}`) * 0.5 };
  });
  const half = 15.2;
  const perimeter = half * 8;

  function at(s: number) {
    const u = (((s % 4) + 4) % 4) * half * 2;
    const side = Math.floor(u / (half * 2));
    const t = u - side * half * 2 - half;
    return [
      [t, -half],
      [half, t],
      [-t, half],
      [-half, -t],
    ][side] as [number, number];
  }

  return {
    group,
    applyLook(look: Look) {
      group.visible = look !== "blueprint";
    },
    update(dt: number, t: number, reducedMotion: boolean) {
      if (reducedMotion) return;
      for (const w of walkers) {
        const prev = at(w.s);
        w.s += (w.dir * w.speed * dt) / (perimeter / 4);
        const [x, z] = at(w.s);
        w.rig.root.position.set(w.lot.x + x, 0.4, w.lot.z + z);
        w.rig.root.rotation.y = Math.atan2(x - prev[0], z - prev[1]);
        const swing = Math.sin(t * 7 + w.s * 10) * 0.6;
        w.rig.legL.rotation.x = swing;
        w.rig.legR.rotation.x = -swing;
        w.rig.armL.rotation.x = -swing * 0.7;
        w.rig.armR.rotation.x = swing * 0.7;
      }
    },
  };
}
