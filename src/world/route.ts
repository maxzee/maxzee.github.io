import * as THREE from "three";
import { PITCH } from "./layout";

const SPEED = 52;
const MIN_TIME = 1.6;
const MAX_TIME = 8;

function roadLines(size: number) {
  return Array.from({ length: size + 1 }, (_, k) => (k - size / 2) * PITCH);
}

function nearest(lines: number[], v: number) {
  return lines.reduce((best, line) => (Math.abs(line - v) < Math.abs(best - v) ? line : best), lines[0]);
}

// Manhattan path along the road grid: onto the nearest road, along it, across at the best avenue, then to the ring
export function planRoute(from: THREE.Vector3, to: THREE.Vector3, size: number) {
  const lines = roadLines(size);
  const hz = nearest(lines, from.z);
  const vx = nearest(lines, from.x);
  const targetRoad = nearest(lines, to.z);
  const points: THREE.Vector3[] = [new THREE.Vector3(from.x, 0, from.z)];
  const add = (x: number, z: number) => {
    const last = points[points.length - 1];
    if (Math.hypot(last.x - x, last.z - z) > 2) points.push(new THREE.Vector3(x, 0, z));
  };

  if (Math.abs(from.z - hz) <= Math.abs(from.x - vx)) {
    add(from.x, hz);
    if (hz !== targetRoad) {
      const avenue = lines.reduce((best, x) =>
        Math.abs(from.x - x) + Math.abs(x - to.x) < Math.abs(from.x - best) + Math.abs(best - to.x) ? x : best,
      );
      add(avenue, hz);
      add(avenue, targetRoad);
    }
  } else {
    add(vx, from.z);
    add(vx, targetRoad);
  }
  add(to.x, targetRoad);
  add(to.x, to.z);
  return points;
}

export class Trip {
  private readonly curve: THREE.CatmullRomCurve3 | null;
  readonly duration: number;
  private t = 0;
  private readonly finalHeading: number;
  private lastHeading: number;

  constructor(
    points: THREE.Vector3[],
    startHeading: number,
    finalHeading = 0,
    private readonly startLift = 0,
  ) {
    this.curve = points.length > 1 ? new THREE.CatmullRomCurve3(points, false, "centripetal") : null;
    const length = this.curve?.getLength() ?? 0;
    this.duration = THREE.MathUtils.clamp(length / SPEED, MIN_TIME, MAX_TIME);
    this.finalHeading = finalHeading;
    this.lastHeading = startHeading;
  }

  get done() {
    return this.t >= this.duration;
  }

  // returns the pose for this frame plus a bank amount from how fast the heading changes
  step(dt: number) {
    this.t = Math.min(this.duration, this.t + dt);
    const p = this.t / this.duration;
    const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    if (!this.curve) return { x: 0, z: 0, heading: this.finalHeading, bank: 0, lift: 0, speed: 0 };

    const point = this.curve.getPointAt(eased);
    const tangent = this.curve.getTangentAt(Math.min(eased, 0.999));
    let heading = Math.atan2(-tangent.x, -tangent.z);
    // ease into facing the building over the last stretch
    const settle = THREE.MathUtils.smoothstep(p, 0.85, 1);
    heading = lerpAngle(heading, this.finalHeading, settle);
    const turn = wrap(heading - this.lastHeading);
    this.lastHeading = heading;
    // a gentle lift as it sets off; a car that was flying glides down over the first third
    const lift = Math.sin(Math.PI * Math.min(1, p * 1.2)) * 0.6 + this.startLift * (1 - THREE.MathUtils.smoothstep(p, 0, 0.35));
    const speed = (this.curve.getLength() / this.duration) * (1 - Math.abs(2 * p - 1));
    return { x: point.x, z: point.z, heading, bank: THREE.MathUtils.clamp(turn / Math.max(dt, 0.001) * 0.18, -0.4, 0.4), lift, speed };
  }
}

function wrap(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function lerpAngle(a: number, b: number, t: number) {
  return a + wrap(b - a) * t;
}
