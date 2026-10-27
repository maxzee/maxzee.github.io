import * as THREE from "three";

export const HOVER_HEIGHT = 2.4;
const MAX_SPEED = 38;
const BOOST_SPEED = 62;
const REVERSE_SPEED = 14;
const ACCEL = 34;
const BOOST_ACCEL = 60;
const BRAKE = 70;
const TURN_RATE = 2.1;
const RADIUS = 2.2;
const FLY_START = 28;
const FLY_MIN = 6;
const FLY_MAX = 90;
const CLIMB_RATE = 9;
const FLY_SPEED_BONUS = 1.3;

export interface DriveInput {
  throttle: number;
  steer: number;
  boost: boolean;
  climb: number;
}

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

export function buildHoverCar() {
  const car = new THREE.Group();
  const body = new THREE.Group();
  car.add(body);

  const pearl = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.25, metalness: 0.35 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.4, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0c2a40, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.85 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffd24a, emissiveIntensity: 0.8 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x4de3ff, emissive: 0x4de3ff, emissiveIntensity: 1.5 });

  // wedge hull: side profile (low nose at +x) extruded across the width; rotateY maps +x to -z, the car's forward
  const profile = new THREE.Shape();
  profile.moveTo(-3.2, 0);
  profile.lineTo(3.4, 0);
  profile.lineTo(3.4, 0.35);
  profile.lineTo(-1.0, 1.3);
  profile.lineTo(-3.2, 1.1);
  profile.closePath();
  const hullGeometry = new THREE.ExtrudeGeometry(profile, { depth: 3.2, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2 });
  hullGeometry.translate(0, 0, -1.6);
  hullGeometry.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeometry, pearl);
  hull.castShadow = true;
  body.add(hull);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1, 0.75, 1.7);
  canopy.position.set(0, 0.95, -0.4);
  body.add(canopy);

  const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.15), gold);
  lightStrip.position.set(0, 0.2, -3.62);
  body.add(lightStrip);

  for (const x of [-1.55, 1.55]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.8, 16).rotateX(Math.PI / 2), trim);
    pod.position.set(x, 0.7, 3.1);
    pod.castShadow = true;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), cyan);
    glow.position.set(x, 0.7, 4.02);
    body.add(pod, glow);
  }

  const underglow = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4de3ff, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  underglow.position.y = -HOVER_HEIGHT + 0.5;
  car.add(underglow);

  const light = new THREE.PointLight(0x4de3ff, 0, 18, 1.6);
  light.position.y = -1;
  car.add(light);

  return { car, body, underglow, light };
}

export class Vehicle {
  readonly position = new THREE.Vector3();
  heading = 0;
  speed = 0;
  steerSmoothed = 0;
  altitude = HOVER_HEIGHT;
  flying = false;
  private landing = false;
  private targetAltitude = HOVER_HEIGHT;
  private climbRate = 0;
  private bob = 0;

  constructor(
    readonly parts: ReturnType<typeof buildHoverCar>,
    private readonly colliders: Collider[],
    private readonly limit: number,
    private readonly reducedMotion: boolean,
  ) {}

  readonly hoverHeight = HOVER_HEIGHT;

  get airborne() {
    return this.altitude > HOVER_HEIGHT + 0.5;
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.heading), 0, -Math.cos(this.heading));
  }

  roofBelow() {
    const p = this.position;
    let top = 0;
    for (const c of this.colliders) {
      if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ) top = Math.max(top, c.top);
    }
    return top;
  }

  place(x: number, z: number, heading: number) {
    this.position.set(x, HOVER_HEIGHT, z);
    this.heading = heading;
    this.speed = 0;
    this.flying = this.landing = false;
    this.altitude = this.targetAltitude = HOVER_HEIGHT;
    this.sync();
  }

  // scripted pose used by street trips and the tour
  pose(x: number, z: number, heading: number, bank: number, lift: number, speed: number) {
    this.position.set(x, HOVER_HEIGHT, z);
    this.heading = heading;
    this.speed = speed;
    this.steerSmoothed = bank;
    this.flying = this.landing = false;
    this.altitude = this.targetAltitude = HOVER_HEIGHT + lift;
    this.bob += 0.016;
    this.sync();
  }

  takeOff() {
    if (this.flying) return;
    this.flying = true;
    this.landing = false;
    this.targetAltitude = Math.max(FLY_START, this.roofBelow() + 4);
    if (Math.abs(this.speed) < 3) this.speed = 6;
  }

  // false when there's a roof underneath
  land() {
    if (!this.flying) return true;
    if (this.roofBelow() > 0) return false;
    this.landing = true;
    this.targetAltitude = HOVER_HEIGHT;
    if (Math.abs(this.speed) < 3) this.speed = 5;
    return true;
  }

  update(dt: number, input: DriveInput) {
    const bonus = this.flying && !this.landing ? FLY_SPEED_BONUS : 1;
    const top = (input.boost ? BOOST_SPEED : MAX_SPEED) * bonus;

    if (input.throttle > 0) {
      const accel = (input.boost ? BOOST_ACCEL : ACCEL) * bonus;
      this.speed = this.speed < 0 ? this.speed + BRAKE * dt : Math.min(top, this.speed + accel * dt);
      if (this.speed > top) this.speed = Math.max(top, this.speed - BRAKE * dt);
    } else if (input.throttle < 0) {
      this.speed = this.speed > 0 ? Math.max(0, this.speed - BRAKE * dt) : Math.max(-REVERSE_SPEED, this.speed - ACCEL * 0.6 * dt);
    } else {
      this.speed *= Math.max(0, 1 - 1.4 * dt);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    const grip = Math.min(1, Math.abs(this.speed) / 8);
    this.heading += input.steer * TURN_RATE * grip * Math.sign(this.speed || 1) * dt;
    const bankScale = this.flying ? 1.5 : 1;
    this.steerSmoothed += (input.steer * grip * bankScale - this.steerSmoothed) * Math.min(1, dt * 6);

    this.position.addScaledVector(this.forward(), this.speed * dt);

    if (this.flying) {
      if (!this.landing) this.targetAltitude = THREE.MathUtils.clamp(this.targetAltitude + input.climb * CLIMB_RATE * dt, FLY_MIN, FLY_MAX);
      // never descend into a roof
      this.targetAltitude = Math.max(this.targetAltitude, this.roofBelow() + 3);
      const delta = THREE.MathUtils.clamp(this.targetAltitude - this.altitude, -CLIMB_RATE * dt, CLIMB_RATE * dt);
      this.climbRate = delta / Math.max(dt, 0.0001);
      this.altitude += delta;
      if (this.landing && this.altitude <= HOVER_HEIGHT + 0.05) {
        this.altitude = HOVER_HEIGHT;
        this.flying = this.landing = false;
        this.climbRate = 0;
      }
    } else {
      this.climbRate = 0;
    }

    this.resolveCollisions();
    this.bob += dt;
    this.sync();
  }

  private resolveCollisions() {
    const p = this.position;
    for (const c of this.colliders) {
      // while flying, only things taller than the car block it
      if (c.top < this.altitude - 1) continue;
      const nx = THREE.MathUtils.clamp(p.x, c.minX, c.maxX);
      const nz = THREE.MathUtils.clamp(p.z, c.minZ, c.maxZ);
      const dx = p.x - nx;
      const dz = p.z - nz;
      const dist = Math.hypot(dx, dz);
      if (dist >= RADIUS) continue;
      if (dist > 0.0001) {
        p.x = nx + (dx / dist) * RADIUS;
        p.z = nz + (dz / dist) * RADIUS;
      } else {
        p.addScaledVector(this.forward(), -RADIUS);
      }
      this.speed *= -0.25;
    }
    const edge = this.limit;
    if (Math.abs(p.x) > edge || Math.abs(p.z) > edge) {
      p.x = THREE.MathUtils.clamp(p.x, -edge, edge);
      p.z = THREE.MathUtils.clamp(p.z, -edge, edge);
      this.speed *= -0.25;
    }
  }

  private sync() {
    const { car, body, underglow } = this.parts;
    const hover = this.reducedMotion ? 0 : Math.sin(this.bob * 2.2) * 0.15;
    this.position.y = this.altitude;
    car.position.set(this.position.x, this.altitude + hover, this.position.z);
    car.rotation.y = this.heading;
    underglow.visible = !this.airborne;
    if (this.reducedMotion) {
      body.rotation.set(0, 0, 0);
      return;
    }
    body.rotation.z = this.steerSmoothed * 0.28;
    const accelPitch = THREE.MathUtils.clamp(this.speed / 400, -0.06, 0.1);
    body.rotation.x = accelPitch + THREE.MathUtils.clamp(this.climbRate / 40, -0.22, 0.22);
  }
}
