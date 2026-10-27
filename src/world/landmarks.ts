import * as THREE from "three";
import { DISTRICT_NAME, type District, type Lot } from "./layout";
import type { Look } from "./materials";
import type { Collider } from "./vehicle";

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const pole = new THREE.MeshStandardMaterial({ color: 0x8d949e, metalness: 0.6, roughness: 0.4 });

export function buildStreetSigns(starts: { district: District; lot: Lot }[], colliders: Collider[]) {
  const group = new THREE.Group();
  for (const { district, lot } of starts) {
    const texture = canvasTexture(512, 128, (ctx) => {
      ctx.fillStyle = "#14713b";
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 112);
      ctx.fillStyle = "#ffffff";
      ctx.font = '700 54px "Rajdhani", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(DISTRICT_NAME[district].toUpperCase(), 256, 68);
    });
    const sign = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 8), pole);
    post.position.y = 3.5;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }));
    panel.position.set(3.8, 6.4, 0);
    sign.add(post, panel);
    // on the front-left corner of the district's first plot, facing the road
    const x = lot.x - 18.5;
    const z = lot.z + 18.5;
    sign.position.set(x, 0, z);
    group.add(sign);
    colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4, top: 7 });
  }
  return group;
}

export function buildWelcome(plaza: Lot, lines: { title: string; detail: string; call: string }, colliders: Collider[]) {
  const group = new THREE.Group();
  const texture = canvasTexture(2048, 336, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 2048, 0);
    g.addColorStop(0, "#0b2447");
    g.addColorStop(1, "#13305a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2048, 336);
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(0, 0, 2048, 10);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eef2f8";
    ctx.font = '96px "Russo One", sans-serif';
    ctx.fillText(lines.title, 1024, 124);
    ctx.fillStyle = "#9cc4ff";
    ctx.font = '700 58px "Rajdhani", sans-serif';
    ctx.fillText(lines.detail, 1024, 210);
    ctx.fillStyle = "#ffd24a";
    ctx.fillText(lines.call, 1024, 290);
  });

  const width = 22;
  const height = 3.6;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, height + 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a1f2a, metalness: 0.4, roughness: 0.5 }));
  frame.position.y = 6.5;
  frame.castShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  face.position.set(0, 6.5, 0.31);
  for (const x of [-width / 2 + 1.5, width / 2 - 1.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.7, 0.6), pole);
    leg.position.set(x, 2.35, 0);
    group.add(leg);
  }
  group.add(frame, face);

  const z = plaza.z - 10;
  group.position.set(plaza.x, 0.4, z);
  colliders.push({ minX: plaza.x - width / 2 - 0.3, maxX: plaza.x + width / 2 + 0.3, minZ: z - 0.6, maxZ: z + 0.6, top: 9 });

  // controls painted on the road in front of the spawn point
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 1.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(1600, 128, (ctx) => {
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '700 78px "Rajdhani", sans-serif';
        ctx.fillText("W A S D TO DRIVE · SHIFT BOOST · E OPEN A BUILDING", 800, 66);
      }),
      transparent: true,
      depthWrite: false,
    }),
  );
  paint.position.set(plaza.x, 0.47, plaza.z - 3.5);

  const paintMaterial = paint.material as THREE.MeshBasicMaterial;
  return {
    group,
    paint,
    applyLook(look: Look) {
      paintMaterial.color.set(look === "day" ? 0x2a3550 : 0xffd24a);
    },
  };
}
