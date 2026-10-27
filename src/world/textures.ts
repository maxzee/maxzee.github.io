import * as THREE from "three";

export const CELLS = 8;
export const CELL_SIZE = 3;
export const TILE_SPAN = CELLS * CELL_SIZE;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement, repeat = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > max) out = out.slice(0, -1);
  return `${out}…`;
}

export function windowTexture(kind: "day" | "night") {
  const px = 32;
  const { canvas, ctx } = makeCanvas(CELLS * px, CELLS * px);
  const rand = seeded(kind === "day" ? 11 : 29);
  ctx.fillStyle = kind === "day" ? "#ece2cd" : "#141922";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < CELLS; r++) {
    for (let c = 0; c < CELLS; c++) {
      const x = c * px + 7;
      const y = r * px + 6;
      const w = px - 14;
      const h = px - 11;
      if (kind === "day") {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, "#a9d2ee");
        g.addColorStop(1, "#3f6f99");
        ctx.fillStyle = g;
      } else {
        const lit = rand() < 0.42;
        ctx.fillStyle = lit ? (rand() < 0.72 ? "#ffd98a" : "#9fe3ff") : "#0a0d14";
      }
      ctx.fillRect(x, y, w, h);
    }
  }
  return toTexture(canvas, true);
}

export function labelTexture(name: string, sub: string, color: string) {
  const { canvas, ctx } = makeCanvas(640, 150);
  roundRect(ctx, 6, 6, 628, 138, 24);
  ctx.fillStyle = "rgba(7, 10, 18, 0.88)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#eef2f8";
  ctx.font = '56px "Russo One", sans-serif';
  ctx.fillText(fit(ctx, name, 580), 320, 78);
  ctx.fillStyle = color;
  ctx.font = '700 32px "Rajdhani", sans-serif';
  ctx.fillText(fit(ctx, sub, 580), 320, 122);
  return toTexture(canvas);
}

export function nameplateTexture(name: string, color: string) {
  const { canvas, ctx } = makeCanvas(640, 76);
  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, 640, 76);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 12, 76);
  ctx.font = '44px "Russo One", sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText(fit(ctx, name, 590), 30, 40);
  return toTexture(canvas);
}

export function slateTexture(text: string) {
  const { canvas, ctx } = makeCanvas(640, 360);
  ctx.fillStyle = "#0d1220";
  ctx.fillRect(0, 0, 640, 360);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 14;
  for (let i = -360; i < 640; i += 36) {
    ctx.beginPath();
    ctx.moveTo(i, 360);
    ctx.lineTo(i + 360, 0);
    ctx.stroke();
  }
  ctx.fillStyle = "#9aa8bd";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '500 36px "IBM Plex Mono", monospace';
  ctx.fillText(text.toUpperCase(), 320, 180);
  return toTexture(canvas);
}

export function infoBoardTexture(lines: { text: string; size: number; color: string; font?: string }[]) {
  const { canvas, ctx } = makeCanvas(640, 360);
  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, 640, 360);
  let y = 70;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = `${line.size}px ${line.font ?? '"Rajdhani", sans-serif'}`;
    ctx.fillText(fit(ctx, line.text, 580), 34, y);
    y += line.size * 1.45;
  }
  return toTexture(canvas);
}

export function groundTextTexture(text: string, color: string, width = 512, height = 128, size = 64) {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${size}px "Russo One", sans-serif`;
  ctx.fillText(text, width / 2, height / 2);
  return toTexture(canvas);
}
