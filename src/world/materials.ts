import * as THREE from "three";
import { windowTexture } from "./textures";

export type Look = "day" | "night" | "blueprint";

export const ENGINE_HEX = {
  unity: 0x4db6ff,
  unreal: 0xff8a3d,
  other: 0xc7a6ff,
  dual: 0xffd24a,
  about: 0xffd24a,
  contact: 0x2fbf63,
} as const;

export type AccentKey = keyof typeof ENGINE_HEX;

export const BLUEPRINT_FILL = 0x5a9be6;

export function createMaterials() {
  const dayWindows = windowTexture("day");
  const nightWindows = windowTexture("night");

  const standard = (params: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(params);

  const crowns = Object.fromEntries(
    Object.entries(ENGINE_HEX).map(([key, hex]) => [
      key,
      standard({ color: hex, emissive: hex, emissiveIntensity: 0.12, roughness: 0.5, metalness: 0.2 }),
    ]),
  ) as Record<AccentKey, THREE.MeshStandardMaterial>;

  return {
    dayWindows,
    nightWindows,
    facade: standard({ map: dayWindows, roughness: 0.85, metalness: 0.04 }),
    facadeWhite: standard({ color: 0xf6f4ef, roughness: 0.7 }),
    roof: standard({ color: 0xd9cfbb, roughness: 0.95 }),
    glass: standard({ color: 0x6fa8d6, roughness: 0.15, metalness: 0.6 }),
    metal: standard({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.7 }),
    dark: standard({ color: 0x1a1f2a, roughness: 0.6, metalness: 0.3 }),
    crowns,
    edge: new THREE.LineBasicMaterial({ color: 0xe8f1ff, transparent: true, opacity: 0.85 }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

export function applyMaterialLook(m: Materials, look: Look) {
  const bp = look === "blueprint";
  const night = look === "night";
  const solids = [m.facade, m.facadeWhite, m.roof, m.glass, m.metal, m.dark, ...Object.values(m.crowns)];

  for (const mat of solids) {
    mat.transparent = bp;
    mat.opacity = bp ? 0.14 : 1;
    mat.depthWrite = !bp;
  }

  m.facade.map = bp ? null : night ? m.nightWindows : m.dayWindows;
  m.facade.emissiveMap = night ? m.nightWindows : null;
  m.facade.emissive.set(night ? 0xffffff : 0x000000);
  m.facade.emissiveIntensity = night ? 1.15 : 0;
  m.facade.color.set(bp ? BLUEPRINT_FILL : night ? 0xa0a6b0 : 0xffffff);

  m.facadeWhite.color.set(bp ? BLUEPRINT_FILL : night ? 0x3a3f48 : 0xf6f4ef);
  m.roof.color.set(bp ? BLUEPRINT_FILL : night ? 0x1d2129 : 0xd9cfbb);
  m.glass.color.set(bp ? BLUEPRINT_FILL : 0x6fa8d6);
  m.glass.emissive.set(night ? 0x2a5a80 : 0x000000);
  m.metal.color.set(bp ? BLUEPRINT_FILL : 0x9aa3ad);
  m.dark.color.set(bp ? BLUEPRINT_FILL : 0x1a1f2a);

  for (const [key, mat] of Object.entries(m.crowns)) {
    mat.color.set(bp ? BLUEPRINT_FILL : ENGINE_HEX[key as AccentKey]);
    mat.emissiveIntensity = night ? 0.75 : bp ? 0 : 0.12;
  }

  for (const mat of solids) mat.needsUpdate = true;
}
