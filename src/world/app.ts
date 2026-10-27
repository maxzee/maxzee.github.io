import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import profileData from "../generated/profile.json";
import projectsData from "../generated/projects.json";
import type { SiteProfile, SiteProject } from "../simple/render";
import { buildAboutStudio, buildBuilding, buildContactTower } from "./buildings";
import { layoutCity, type Lot } from "./layout";
import { applyMaterialLook, createMaterials, ENGINE_HEX, type AccentKey, type Look, type Materials } from "./materials";
import { buildPlaza, buildScenery } from "./scenery";
import { groundTextTexture, infoBoardTexture, labelTexture, nameplateTexture, slateTexture } from "./textures";

export type { Look };

export interface CityHandle {
  start(): void;
  stop(): void;
  setLook(look: Look): void;
}

const projects = projectsData as unknown as SiteProject[];
const profile = profileData as unknown as SiteProfile;

const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function accentOf(project: SiteProject): AccentKey {
  return project.engines.length > 1 ? "dual" : project.engines[0];
}

function banner(m: Materials, screen: THREE.Texture, plate: THREE.Texture) {
  const group = new THREE.Group();
  for (const x of [-4.2, 4.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 0.3), m.metal);
    leg.position.set(x, 2.1, 0);
    group.add(leg);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.2, 6.8, 0.4), m.dark);
  frame.position.y = 7.3;
  frame.castShadow = true;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screen, toneMapped: false });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.84), screenMaterial);
  display.position.set(0, 6.75, 0.21);
  const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.02), new THREE.MeshBasicMaterial({ map: plate, toneMapped: false }));
  nameplate.position.set(0, 9.95, 0.21);
  group.add(frame, display, nameplate);
  return { group, screenMaterial };
}

function label(name: string, sub: string, color: number, y: number) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(name, sub, css(color)), transparent: true }));
  sprite.scale.set(26, 6.1, 1);
  sprite.position.y = y;
  return sprite;
}

function plotTag(lot: Lot, color: number) {
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1.5).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: groundTextTexture(`PLOT ${String(lot.index + 1).padStart(2, "0")}`, css(color), 384, 96, 52), transparent: true }),
  );
  tag.position.set(lot.x - 11, 0.43, lot.z + 14.5);
  return tag;
}

interface Riser {
  group: THREE.Object3D;
  extras: THREE.Object3D[];
  delay: number;
}

export async function createCity(container: HTMLElement, options: { reducedMotion: boolean }): Promise<CityHandle> {
  await Promise.all([
    document.fonts.load('56px "Russo One"'),
    document.fonts.load('700 32px "Rajdhani"'),
    document.fonts.load('500 36px "IBM Plex Mono"'),
  ]).catch(() => undefined);

  const lowPower = window.matchMedia("(pointer: coarse)").matches || Math.min(window.innerWidth, window.innerHeight) < 820;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", `3D city of ${profile.name}'s projects. Each building is one project.`);
  renderer.domElement.setAttribute("role", "img");
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 2400);
  const m = createMaterials();
  const { lots, size, span } = layoutCity(projects);

  const scenery = buildScenery(lots, size, span);
  scene.add(scenery.group, scenery.sky);

  const hemi = new THREE.HemisphereLight(0xbfddf5, 0xd8b98a, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(160, 230, 120);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = span / 2 + 40;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 50, far: 600 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(hemi, sun);

  const loader = new THREE.TextureLoader();
  const risers: Riser[] = [];
  let plaza: ReturnType<typeof buildPlaza> | null = null;
  const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));

  const plazaLot = lots.find((l) => l.kind === "plaza")!;
  const order = (lot: Lot) => Math.hypot(lot.x - plazaLot.x, lot.z - plazaLot.z);

  for (const lot of lots) {
    const delay = 0.15 + (order(lot) / span) * 1.6;

    if (lot.kind === "plaza") {
      plaza = buildPlaza(lot);
      scene.add(plaza.group);
      continue;
    }
    if (lot.kind === "park") continue;

    let building: THREE.Group;
    let color: number;
    let name: string;
    let sub: string;
    let screen: THREE.Texture;
    let labelY: number;
    let posterUrl = "";

    if (lot.kind === "project" && lot.project) {
      const project = lot.project;
      const accent = accentOf(project);
      color = ENGINE_HEX[accent];
      name = project.name;
      sub = project.engineLabel || "Details coming soon";
      building = buildBuilding(m, lot.style, accent, lot.height);
      labelY = lot.height + (lot.style === "tower" ? 16 : 7);
      screen = slateTexture(project.status === "in-development" ? "In development" : "Demo video coming soon");
      posterUrl = project.poster;
    } else if (lot.kind === "about") {
      color = ENGINE_HEX.about;
      name = "About me";
      sub = "My studio";
      building = buildAboutStudio(m);
      labelY = 23;
      screen = infoBoardTexture([
        { text: profile.name.toUpperCase(), size: 44, color: "#eef2f8", font: '"Russo One", sans-serif' },
        { text: profile.title, size: 34, color: "#ffd24a" },
        { text: `${profile.yearsExperience}+ years · ${projects.length} projects`, size: 34, color: "#c3cddc" },
        { text: "Unity (C#) · Unreal (C++, Blueprints)", size: 30, color: "#9aa8bd" },
      ]);
    } else {
      color = ENGINE_HEX.contact;
      name = "Contact";
      sub = "Radio tower";
      building = buildContactTower(m, redLight);
      labelY = 58;
      screen = infoBoardTexture([
        { text: "Let's build your next game", size: 44, color: "#eef2f8", font: '"Russo One", sans-serif' },
        { text: profile.github.replace(/^https?:\/\//, ""), size: 34, color: "#7ee08f" },
        { text: "LinkedIn: " + profile.name, size: 32, color: "#c3cddc" },
      ]);
    }

    building.position.set(lot.x, 0.4, lot.z - 2);
    building.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 25), m.edge);
        edges.userData.blueprintEdge = true;
        edges.visible = false;
        child.add(edges);
      }
    });
    scene.add(building);

    const bannerParts = banner(m, screen, nameplateTexture(name, css(color)));
    bannerParts.group.position.set(lot.x, 0.4, lot.z + 13);
    scene.add(bannerParts.group);
    if (posterUrl) {
      loader.load(posterUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        bannerParts.screenMaterial.map?.dispose();
        bannerParts.screenMaterial.map = texture;
        bannerParts.screenMaterial.needsUpdate = true;
      });
    }

    const sign = label(name, sub, color, labelY);
    sign.position.x = lot.x;
    sign.position.z = lot.z - 2;
    scene.add(sign);

    const tag = plotTag(lot, color);
    scene.add(tag);

    risers.push({ group: building, extras: [bannerParts.group, sign, tag], delay });
  }

  const blueprintEdges: THREE.Object3D[] = [];
  scene.traverse((o) => o.userData.blueprintEdge && blueprintEdges.push(o));

  let look: Look = "day";
  function setLook(next: Look) {
    look = next;
    const night = next === "night";
    const bp = next === "blueprint";
    applyMaterialLook(m, next);
    scenery.applyLook(next);
    plaza?.applyLook(next);
    for (const edge of blueprintEdges) edge.visible = bp;
    redLight.visible = night;
    scene.background = bp ? new THREE.Color(0x0b2447) : null;
    scene.fog = bp ? null : night ? new THREE.FogExp2(0x070a12, 0.0026) : new THREE.Fog(0xeaf2f4, 320, 900);
    hemi.color.set(bp ? 0xffffff : night ? 0x2a3a66 : 0xbfddf5);
    hemi.groundColor.set(bp ? 0xffffff : night ? 0x0a0c12 : 0xd8b98a);
    hemi.intensity = bp ? 1.6 : night ? 0.45 : 1.1;
    sun.color.set(night ? 0x9fb4ff : 0xfff1d6);
    sun.intensity = bp ? 0 : night ? 0.35 : 2.2;
    renderer.toneMappingExposure = night ? 1.05 : 1;
  }
  setLook("day");

  // camera
  const target = new THREE.Vector3(0, 4, 0);
  const finalPosition = new THREE.Vector3(0, span * 0.62, span * 0.98);
  const introPosition = new THREE.Vector3(span * 0.25, span * 1.25, span * 1.7);
  camera.position.copy(options.reducedMotion ? finalPosition : introPosition);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 45;
  controls.maxDistance = 360;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.32;
  controls.autoRotateSpeed = 0.45;
  controls.enabled = options.reducedMotion;

  let lastInput = performance.now();
  controls.addEventListener("start", () => {
    lastInput = performance.now();
    controls.autoRotate = false;
  });
  controls.addEventListener("change", () => {
    const limit = span / 2;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -limit, limit);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -limit, limit);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 30);
  });

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    // keep at least ~72 degrees of horizontal view, so portrait phones still see the city
    const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36)) / camera.aspect));
    camera.fov = Math.min(100, Math.max(50, needed));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // intro: the city rises out of the ground
  const INTRO = 2.6;
  let introTime = options.reducedMotion ? INTRO : 0;
  for (const riser of risers) {
    riser.group.scale.y = options.reducedMotion ? 1 : 0.001;
    for (const extra of riser.extras) extra.visible = options.reducedMotion;
  }

  const clock = new THREE.Clock();
  let running = false;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.1);

    if (introTime < INTRO) {
      introTime += dt;
      for (const riser of risers) {
        const p = clamp01((introTime - riser.delay) / 0.9);
        riser.group.scale.y = Math.max(0.001, easeOutCubic(p));
        if (p >= 0.95) for (const extra of riser.extras) extra.visible = true;
      }
      camera.position.lerpVectors(introPosition, finalPosition, easeInOut(clamp01(introTime / INTRO)));
      camera.lookAt(target);
      if (introTime >= INTRO) {
        for (const riser of risers) {
          riser.group.scale.y = 1;
          for (const extra of riser.extras) extra.visible = true;
        }
        controls.enabled = true;
        lastInput = performance.now();
      }
    } else {
      controls.autoRotate = !options.reducedMotion && performance.now() - lastInput > 4000;
      controls.update(dt);
    }

    scenery.sky.position.copy(camera.position);
    if (!options.reducedMotion) {
      scenery.clouds.rotation.y += dt * 0.004;
      if (plaza) plaza.ring.rotation.z += dt * 0.3;
    }
    if (look === "night") redLight.visible = Math.sin(performance.now() / 400) > -0.2;

    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    renderer.setAnimationLoop(tick);
  }

  function stop() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (running) {
      clock.getDelta();
      renderer.setAnimationLoop(tick);
    }
  });

  return { start, stop, setLook };
}
