import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "./projects";

/* Builds one showcase video from several clips, in the style of the KingdomLand portfolio cut:
   an intro card, then each clip framed on the right over a blurred copy of itself, with a numbered
   section label, title and description on the left. Output is 1280x720, 30 fps, AAC stereo. */

type Showcase = NonNullable<Project["media"]["showcase"]>;

const W = 1280, H = 720, FADE = 0.35, INTRO = 4.5, DIVIDER = 3.5;
const GOLD = "0xFFD24A", WHITE = "0xFFFFFF", BODY = "0xB8C3D6", DIM = "0x8A93A6";
// Windows fonts, copied into the work folder so filter strings can name them without drive-letter escaping
const FONTS = { bold: "segoeuib.ttf", semi: "seguisb.ttf", body: "segoeui.ttf", caps: "arialbd.ttf" };
const ENCODE = [
  "-r", "30", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "medium",
  "-maxrate", "2000k", "-bufsize", "4000k", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
];

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + " " + word).length > width) { lines.push(line); line = word; } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export function buildShowcase(project: Project, dir: string, out: string, ffmpeg: string, duration: (f: string) => number) {
  const sc = project.media.showcase as Showcase;
  const work = join(tmpdir(), `showcase-${project.id}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  for (const f of Object.values(FONTS)) copyFileSync(join(process.env.WINDIR ?? "C:/Windows", "Fonts", f), join(work, f));

  let n = 0;
  // drawtext reads each string from its own file: no quoting or escaping of user text in the filter graph
  const text = (s: string) => { const name = `t${n++}.txt`; writeFileSync(join(work, name), s); return name; };
  const draw = (s: string, font: string, size: number, color: string, x: string, y: string, extra = "") =>
    s ? `,drawtext=fontfile=${font}:textfile=${text(s)}:expansion=none:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:line_spacing=6${extra}` : "";
  const run = (args: string[]) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: work, stdio: "inherit" });
  const blurred = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:2,eq=brightness=-0.2:saturation=0.85`;
  const fades = (d: number) => `,fade=t=in:st=0:d=${FADE},fade=t=out:st=${(d - FADE).toFixed(2)}:d=${FADE}`;
  const afades = (d: number) => `afade=t=in:st=0:d=${FADE},afade=t=out:st=${(d - FADE).toFixed(2)}:d=${FADE}`;
  const segments: string[] = [];
  const name = project.name.toUpperCase(), total = sc.sections.length;

  // a centred title card over a moving, blurred stretch of a clip, with silent audio
  const card = (clip: string, seconds: number, from: number, lines: { label?: string; title: string; tagline?: string; built?: string; pills?: string[]; blurb?: string }) => {
    const seg = `seg-${segments.length}.mp4`;
    const vf = `${blurred},eq=brightness=-0.12,drawbox=x=(iw-36)/2:y=232:w=36:h=3:color=${GOLD}:t=fill` +
      draw(lines.label ?? "", FONTS.caps, 14, GOLD, "(w-text_w)/2", "200") +
      draw(lines.title, FONTS.bold, 60, WHITE, "(w-text_w)/2", "250") +
      draw(lines.tagline ?? "", FONTS.body, 22, "0xD6DCE6", "(w-text_w)/2", "334") +
      draw((lines.built ?? "").toUpperCase(), FONTS.caps, 14, GOLD, "(w-text_w)/2", "378") +
      draw((lines.pills ?? []).join("     ·     "), FONTS.semi, 15, WHITE, "(w-text_w)/2", "416", ":box=1:boxcolor=0xFFFFFF@0.10:boxborderw=12") +
      draw(wrap(lines.blurb ?? "", 92), FONTS.body, 16, "0x9AA4B5", "(w-text_w)/2", "470") + fades(seconds);
    run(["-ss", from.toFixed(2), "-t", String(seconds), "-i", join(dir, clip), "-f", "lavfi", "-t", String(seconds), "-i", "anullsrc=r=48000:cl=stereo",
      "-map", "0:v:0", "-map", "1:a:0", "-vf", vf, ...ENCODE, "-shortest", seg]);
    segments.push(seg);
  };

  const first = sc.sections[0].clip;
  if (sc.mode === "framed") {
    card(first, INTRO, Math.min(duration(join(dir, first)) * 0.3, 20), { title: project.name, tagline: sc.tagline, built: sc.built, pills: sc.pills, blurb: sc.blurb });
  }

  sc.sections.forEach((s, k) => {
    const src = join(dir, s.clip), d = duration(src), num = String(k + 1).padStart(2, "0");
    if (sc.mode === "join") {
      if (s.title) card(s.clip, DIVIDER, Math.min(d * 0.3, 20), { label: s.label, title: s.title, tagline: s.text });
      const seg = `seg-${segments.length}.mp4`;   /* named after the divider card, which takes the previous number */
      run(["-i", src, "-map", "0:v:0", "-map", "0:a:0",
        "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1${fades(d)}`,
        "-af", afades(d), ...ENCODE, seg]);
      segments.push(seg);
      return;
    }
    // framed: the clip at 720 wide on the right, a darkened text column on the left
    const seg = `seg-${segments.length}.mp4`;
    const graph =
      `[0:v]${blurred},drawbox=x=0:y=0:w=520:h=${H}:color=0x0B0F17@0.55:t=fill,drawbox=x=48:y=42:w=3:h=14:color=${GOLD}:t=fill` +
      draw(name, FONTS.caps, 13, WHITE, "60", "42") +
      draw(`${num}   ${s.label.toUpperCase()}`, FONTS.caps, 13, GOLD, "48", "252") +
      draw(s.title, FONTS.bold, 34, WHITE, "48", "274") +
      draw(wrap(s.text, 38), FONTS.body, 17, BODY, "48", "328") +
      draw(`${num} / ${String(total).padStart(2, "0")}`, FONTS.caps, 12, DIM, "48", "660") + `[bg];` +
      `[0:v]scale=720:405:force_original_aspect_ratio=decrease,pad=iw+6:ih+6:3:3:color=0x2A3245[fg];` +
      `[bg][fg]overlay=x=W-w-48:y=(H-h)/2${fades(d)}[v]`;
    run(["-i", src, "-filter_complex", graph, "-map", "[v]", "-map", "0:a:0", "-af", afades(d), ...ENCODE, seg]);
    segments.push(seg);
  });

  writeFileSync(join(work, "list.txt"), segments.map((s) => `file '${s}'`).join("\n"));
  run(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", join(work, "out.mp4")]);
  copyFileSync(join(work, "out.mp4"), out);
  rmSync(work, { recursive: true, force: true });
}
