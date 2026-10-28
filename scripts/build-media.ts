import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadProjectEntries, publicProjectsDir, root } from "./projects";

const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const ffprobe = process.env.FFPROBE ?? ffmpeg.replace(/ffmpeg(\.exe)?$/i, (_, ext = "") => `ffprobe${ext}`);
const force = process.argv.includes("--force");
const CLIP_SECONDS = 6;
const REEL_SECONDS = 4;

function duration(file: string) {
  const out = execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  return Number.parseFloat(out.trim());
}

function run(args: string[]) {
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

const mb = (file: string) => (statSync(file).size / 1048576).toFixed(1);

let made = 0;
const reel: { id: string; preview: string }[] = [];
const entries = loadProjectEntries().sort((a, b) => (a.project.order ?? 999) - (b.project.order ?? 999));
for (const { project, dir } of entries) {
  if (!project.media.video) continue;

  const source = join(dir, project.media.video);
  if (!existsSync(source)) {
    console.warn(`warning: ${project.id}: source clip not found: ${source}`);
    continue;
  }

  const outDir = join(publicProjectsDir, project.id);
  const preview = join(outDir, "preview.mp4");
  const poster = join(outDir, "poster.webp");
  const full = join(outDir, "full.mp4");
  mkdirSync(outDir, { recursive: true });
  reel.push({ id: project.id, preview });

  const length = duration(source);
  const start = project.media.start ?? Math.max(0, Math.min(length * 0.2, length - CLIP_SECONDS));

  // short silent loop for the building banners
  if (force || !existsSync(preview) || !existsSync(poster)) {
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
    console.log(`media: ${project.id} preview ${mb(preview)} MB (from ${start.toFixed(1)}s)`);
    made++;
  }

  // the whole video, with sound, for the project cards and the 1-page site
  if (force || !existsSync(full)) {
    run([
      "-i", source, "-map", "0:v:0", "-map", "0:a:0?",
      "-vf", "scale='min(1280,iw)':-2:flags=lanczos,fps=30",
      "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "28", "-preset", "medium",
      "-maxrate", "1600k", "-bufsize", "3200k",
      "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-movflags", "+faststart", full,
    ]);
    console.log(`media: ${project.id} full ${mb(full)} MB (${Math.round(length)}s)`);
    made++;
  }
}

// showreel: a few seconds of every project, back to back, with chapter times
const reelFile = join(root, "public", "showreel.mp4");
const reelJson = join(root, "public", "showreel.json");
if (reel.length && (force || made > 0 || !existsSync(reelFile))) {
  const inputs = reel.flatMap((r) => ["-i", r.preview]);
  const parts = reel.map(
    (_, k) =>
      `[${k}:v]trim=0:${REEL_SECONDS},setpts=PTS-STARTPTS,scale=1280:720:force_original_aspect_ratio=decrease:flags=lanczos,` +
      `pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0B0F17,setsar=1,fps=30,fade=t=in:st=0:d=0.3,fade=t=out:st=${REEL_SECONDS - 0.3}:d=0.3[v${k}]`,
  );
  const graph = `${parts.join(";")};${reel.map((_, k) => `[v${k}]`).join("")}concat=n=${reel.length}:v=1:a=0[out]`;
  run([
    ...inputs, "-filter_complex", graph, "-map", "[out]",
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow",
    "-movflags", "+faststart", reelFile,
  ]);
  const chapters = reel.map((r, k) => ({ id: r.id, at: k * REEL_SECONDS }));
  writeFileSync(reelJson, JSON.stringify({ video: "/showreel.mp4", poster: "", chapters }, null, 2) + "\n");
  console.log(`media: showreel ${mb(reelFile)} MB, ${reel.length} chapters`);
}
console.log(`media: ${made} file(s) made`);
