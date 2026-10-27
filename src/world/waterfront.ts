import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hash, LAND_MARGIN } from "./layout";
import type { Look } from "./materials";

const SEA_LEVEL = -1.6;

const PALETTE = {
  day: { deep: 0x0e5c92, shallow: 0x3fd0c9, sky: 0xbfe3f5 },
  night: { deep: 0x061325, shallow: 0x0f3b4a, sky: 0x0b1530 },
};

function seaMaterial(landHalf: number) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      time: { value: 0 },
      deep: { value: new THREE.Color(PALETTE.day.deep) },
      shallow: { value: new THREE.Color(PALETTE.day.shallow) },
      skyColor: { value: new THREE.Color(PALETTE.day.sky) },
      sunDir: { value: new THREE.Vector3(0.55, 0.7, 0.42).normalize() },
      glint: { value: 1.4 },
      landHalf: { value: landHalf },
    },
  ]);
  return new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      uniform float time;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      float wave(vec2 p) {
        return sin(p.x * 0.045 + time * 0.9) * 0.35
             + sin(p.y * 0.06 - time * 1.1) * 0.28
             + sin((p.x + p.y) * 0.11 + time * 1.7) * 0.12
             + sin((p.x - p.y) * 0.19 - time * 2.3) * 0.06;
      }
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        float h = wave(world.xz);
        float e = 0.6;
        float hx = wave(world.xz + vec2(e, 0.0));
        float hz = wave(world.xz + vec2(0.0, e));
        vNormal2 = normalize(vec3(h - hx, e, h - hz));
        world.y += h;
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float time;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform vec3 skyColor;
      uniform vec3 sunDir;
      uniform float glint;
      uniform float landHalf;
      varying vec3 vWorld;
      varying vec3 vNormal2;
      void main() {
        // small ripples on top of the vertex waves
        vec3 n = normalize(vNormal2 + vec3(sin(vWorld.x * 0.9 + time * 3.0), 0.0, cos(vWorld.z * 0.8 - time * 2.6)) * 0.05);
        float shore = max(abs(vWorld.x), abs(vWorld.z)) - landHalf;
        vec3 base = mix(shallow, deep, smoothstep(2.0, 140.0, shore));
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(n, view), 0.0), 4.0);
        vec3 color = mix(base, skyColor, fresnel * 0.65);
        vec3 h = normalize(sunDir + view);
        color += vec3(1.0, 0.96, 0.85) * pow(max(dot(n, h), 0.0), 220.0) * glint;
        float band = 3.0 + 1.2 * sin(time * 1.4 + vWorld.x * 0.08 + vWorld.z * 0.08);
        float foam = 1.0 - smoothstep(0.0, band, shore);
        color = mix(color, vec3(0.96, 0.98, 1.0), foam * 0.85);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function striped(radiusTop: number, radiusBottom: number, height: number, bands: number, a: THREE.Material, b: THREE.Material) {
  const group = new THREE.Group();
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const r0 = THREE.MathUtils.lerp(radiusBottom, radiusTop, t0);
    const r1 = THREE.MathUtils.lerp(radiusBottom, radiusTop, t1);
    const piece = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, height / bands, 20), i % 2 ? b : a);
    piece.position.y = (t0 + t1) / 2 * height;
    piece.castShadow = true;
    group.add(piece);
  }
  return group;
}

function sailboat(color: number) {
  const group = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.6, 0);
  hullShape.lineTo(1.6, 0);
  hullShape.lineTo(2.2, 1.2);
  hullShape.lineTo(-2.2, 1.2);
  hullShape.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(hullShape, { depth: 7, bevelEnabled: false });
  hullGeometry.translate(0, -0.4, -3.5);
  const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.6 }));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 9, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a45 }));
  mast.position.set(0, 5.3, 0.4);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0, 8);
  sailShape.lineTo(3.8, 0.2);
  sailShape.closePath();
  const sail = new THREE.Mesh(
    new THREE.ShapeGeometry(sailShape),
    new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  sail.rotation.y = Math.PI / 2;
  sail.position.set(0, 1.3, 0.6);
  group.add(hull, mast, sail);
  return group;
}

function bridge(length: number, deckHeight: number, material: THREE.Material, cable: THREE.LineBasicMaterial) {
  // built along +x from the origin; the caller rotates and places it
  const group = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2, 14), material);
  deck.position.set(length / 2, deckHeight, 0);
  deck.castShadow = true;
  group.add(deck);
  const towers = [length * 0.3, length * 0.7];
  const towerTop = deckHeight + 30;
  for (const x of towers) {
    for (const z of [-6.5, 6.5]) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2, towerTop + 8, 2), material);
      tower.position.set(x, (towerTop - 8) / 2, z);
      group.add(tower);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 15), material);
    beam.position.set(x, towerTop - 2, 0);
    group.add(beam);
  }
  // main cables hang between towers and anchor at the deck ends
  for (const z of [-6.5, 6.5]) {
    const points: THREE.Vector3[] = [];
    const anchors = [0, towers[0], towers[1], length];
    for (let s = 0; s < 3; s++) {
      const x0 = anchors[s];
      const x1 = anchors[s + 1];
      const y0 = s === 0 ? deckHeight : towerTop;
      const y1 = s === 2 ? deckHeight : towerTop;
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const sag = s === 1 ? Math.sin(Math.PI * t) * 22 : Math.sin(Math.PI * t) * 4;
        points.push(new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t), THREE.MathUtils.lerp(y0, y1, t) - sag, z));
      }
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cable));
  }
  return group;
}

export function buildWaterfront(span: number, lowPower: boolean) {
  const group = new THREE.Group();
  const landHalf = span / 2 + LAND_MARGIN;
  const segments = lowPower ? 140 : 240;

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, segments, segments).rotateX(-Math.PI / 2), seaMaterial(landHalf));
  sea.position.y = SEA_LEVEL;
  group.add(sea);

  const concrete = new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.9 });
  const sand = new THREE.MeshStandardMaterial({ color: 0xe8cf9c, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xc23b2e, roughness: 0.5, metalness: 0.3 });
  const cable = new THREE.LineBasicMaterial({ color: 0x5a1e18 });

  // seawall on the north and east; beaches on the south and west
  const wallDepth = 8;
  const north = new THREE.Mesh(new THREE.BoxGeometry(landHalf * 2 + 4, wallDepth, 2), concrete);
  north.position.set(0, -wallDepth / 2 + 0.3, -landHalf - 1);
  const east = new THREE.Mesh(new THREE.BoxGeometry(2, wallDepth, landHalf * 2 + 4), concrete);
  east.position.set(landHalf + 1, -wallDepth / 2 + 0.3, 0);
  group.add(north, east);

  // beaches sit one step below street level, just above the waves
  const beachWidth = 34;
  const southBeach = new THREE.Mesh(new THREE.BoxGeometry(landHalf * 2 + beachWidth, 2, beachWidth), sand);
  southBeach.position.set(-beachWidth / 2, -1.6, landHalf + beachWidth / 2);
  const westBeach = new THREE.Mesh(new THREE.BoxGeometry(beachWidth, 2, landHalf * 2), sand);
  westBeach.position.set(-landHalf - beachWidth / 2, -1.6, 0);
  southBeach.receiveShadow = westBeach.receiveShadow = true;
  group.add(southBeach, westBeach);

  // umbrellas and loungers
  const umbrellaColors = [0xe63946, 0xffd24a, 0x2a9d8f, 0x4db6ff];
  const props = new THREE.Group();
  const placeOnBeach = (x: number, z: number, i: number) => {
    const umbrella = new THREE.Group();
    const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), wood);
    poleMesh.position.y = 1.7;
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 0.9, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: umbrellaColors[i % umbrellaColors.length], side: THREE.DoubleSide }),
    );
    top.position.y = 3.5;
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 2.6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    lounger.position.set(1.6, 0.4, 0.4);
    lounger.rotation.x = -0.15;
    umbrella.add(poleMesh, top, lounger);
    umbrella.position.set(x, -0.6, z);
    props.add(umbrella);
  };
  for (let i = 0; i < 9; i++) placeOnBeach(-landHalf + 30 + i * ((landHalf * 2 - 60) / 8), landHalf + 10, i);
  for (let i = 0; i < 7; i++) placeOnBeach(-landHalf - 10, -landHalf + 40 + i * ((landHalf * 2 - 80) / 6), i + 2);
  group.add(props);

  // wooden pier from the south beach
  const pier = new THREE.Group();
  const pierX = span * 0.22;
  const pierLength = 70;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, pierLength), wood);
  deck.position.set(0, 0.2, pierLength / 2);
  deck.receiveShadow = true;
  pier.add(deck);
  for (let z = 4; z < pierLength; z += 8) {
    for (const x of [-2.6, 2.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 6), wood);
      post.position.set(x, -2.2, z);
      pier.add(post);
    }
  }
  pier.position.set(pierX, 0, landHalf + 4);
  group.add(pier);

  // lighthouse on the south-west corner
  const red = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.6 });
  const lighthouse = striped(2.4, 3.6, 26, 6, white, red);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 3, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff2b3, emissive: 0xffd24a, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 }),
  );
  lamp.position.y = 27.5;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 16), red);
  cap.position.y = 30.5;
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(9, 140, 24, 1, true).translate(0, -70, 0).rotateZ(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 27.5;
  beamPivot.add(beam);
  lighthouse.add(lamp, cap, beamPivot);
  lighthouse.position.set(-landHalf - 14, -1, landHalf + 14);
  group.add(lighthouse);

  // two suspension bridges to the mainland
  const bridgeLength = 260;
  const eastBridge = bridge(bridgeLength, 12, steel, cable);
  eastBridge.position.set(landHalf + 2, 0, -span * 0.1);
  const northBridge = bridge(bridgeLength, 12, steel, cable);
  northBridge.rotation.y = Math.PI / 2;
  northBridge.position.set(span * 0.1, 0, -landHalf - 2);
  group.add(eastBridge, northBridge);

  const mainlandMaterial = new THREE.MeshStandardMaterial({ color: 0xcdb27c, roughness: 1 });
  const eastLand = new THREE.Mesh(new THREE.BoxGeometry(600, 6, 1600), mainlandMaterial);
  eastLand.position.set(landHalf + bridgeLength + 300, -3, 0);
  const northLand = new THREE.Mesh(new THREE.BoxGeometry(1600, 6, 600), mainlandMaterial);
  northLand.position.set(0, -3, -landHalf - bridgeLength - 300);
  group.add(eastLand, northLand);

  // a few low hills on the mainland so it reads as land, not a wall
  const hills: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const hill = new THREE.ConeGeometry(30 + hash(`hl${i}`) * 40, 14 + hash(`hh${i}`) * 26, 7);
    const alongEast = i % 2 === 0;
    const offset = -500 + hash(`ho${i}`) * 1000;
    hill.translate(alongEast ? landHalf + bridgeLength + 80 + hash(`hd${i}`) * 200 : offset, 6, alongEast ? offset : -landHalf - bridgeLength - 80 - hash(`hd${i}`) * 200);
    hills.push(hill);
  }
  const hillMesh = new THREE.Mesh(mergeGeometries(hills), new THREE.MeshStandardMaterial({ color: 0x9fb06b, flatShading: true, roughness: 1 }));
  group.add(hillMesh);

  // sailboats loop the bay
  const sailColors = [0xe63946, 0xffd24a, 0x4db6ff, 0x7ee08f];
  const boats = sailColors.map((color, i) => {
    const boat = sailboat(color);
    group.add(boat);
    return { boat, radius: landHalf + 55 + i * 28, speed: (i % 2 ? -1 : 1) * (0.02 + i * 0.006), phase: i * 1.7 };
  });

  const seaMat = sea.material as THREE.ShaderMaterial;
  const lampMat = lamp.material as THREE.MeshStandardMaterial;

  return {
    group,
    landHalf,
    update(elapsed: number, reducedMotion: boolean) {
      seaMat.uniforms.time.value = reducedMotion ? 0 : elapsed;
      beamPivot.rotation.y = reducedMotion ? 0.6 : elapsed * 0.6;
      for (const b of boats) {
        const a = b.phase + (reducedMotion ? 0 : elapsed * b.speed);
        b.boat.position.set(Math.cos(a) * b.radius, SEA_LEVEL - 0.2 + (reducedMotion ? 0 : Math.sin(elapsed * 1.3 + b.phase) * 0.25), Math.sin(a) * b.radius);
        b.boat.rotation.y = -a + (b.speed > 0 ? Math.PI : 0);
      }
    },
    applyLook(look: Look) {
      group.visible = look !== "blueprint";
      const palette = look === "night" ? PALETTE.night : PALETTE.day;
      seaMat.uniforms.deep.value.set(palette.deep);
      seaMat.uniforms.shallow.value.set(palette.shallow);
      seaMat.uniforms.skyColor.value.set(palette.sky);
      seaMat.uniforms.glint.value = look === "night" ? 0.6 : 1.4;
      (seaMat.uniforms.sunDir.value as THREE.Vector3).set(look === "night" ? -0.4 : 0.55, 0.7, look === "night" ? -0.3 : 0.42).normalize();
      beam.visible = look === "night";
      lampMat.emissiveIntensity = look === "night" ? 2.5 : 0.3;
      mainlandMaterial.color.set(look === "night" ? 0x2a2f38 : 0xcdb27c);
    },
  };
}
