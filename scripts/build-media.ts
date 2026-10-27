import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadProjectEntries, publicProjectsDir } from "./projects";

const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const ffprobe = process.env.FFPROBE ?? ffmpeg.replace(/ffmpeg(\.exe)?$/i, (_, ext = "") => `ffprobe${ext}`);
const force = process.argv.includes("--force");
const CLIP_SECONDS = 6;

function duration(file: string) {
  const out = execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  return Number.parseFloat(out.trim());
}

function run(args: string[]) {
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

let made = 0;
for (const { project, dir } of loadProjectEntries()) {
  if (!project.media.video) continue;

  const source = join(dir, project.media.video);
  if (!existsSync(source)) {
    console.warn(`warning: ${project.id}: source clip not found: ${source}`);
    continue;
  }

  const outDir = join(publicProjectsDir, project.id);
  const preview = join(outDir, "preview.mp4");
  const poster = join(outDir, "poster.webp");
  if (!force && existsSync(preview) && existsSync(poster)) continue;
  mkdirSync(outDir, { recursive: true });

  const length = duration(source);
  const start = project.media.start ?? Math.max(0, Math.min(length * 0.2, length - CLIP_SECONDS));

  run([
    "-ss", start.toFixed(2), "-t", String(CLIP_SECONDS), "-i", source,
    "-an", "-vf", "scale=960:-2:flags=lanczos,fps=30",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "slow",
    "-movflags", "+faststart", preview,
  ]);
  run([
    "-ss", (start + 1.5).toFixed(2), "-i", source,
    "-frames:v", "1", "-vf", "scale=960:-2:flags=lanczos", "-c:v", "libwebp", "-quality", "78", poster,
  ]);

  const kb = Math.round(statSync(preview).size / 1024);
  console.log(`media: ${project.id} preview ${kb} KB (from ${start.toFixed(1)}s)`);
  made++;
}
console.log(`media: ${made} project(s) processed`);
