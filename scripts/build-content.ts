import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "content");
const outDir = join(root, "src", "generated");
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

const projectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase letters, numbers and hyphens"),
  name: z.string().min(1),
  engines: z.array(z.enum(["unity", "unreal", "other"])).min(1),
  engineLabel: z.string().default(""),
  platform: z.string().default(""),
  company: z.string().default(""),
  year: z.string().default(""),
  status: z.enum(["released", "in-development", "prototype"]).default("released"),
  teamSize: z.number().optional(),
  role: z.string().default(""),
  summary: z.string().default(""),
  tags: z.array(z.string()).default([]),
  built: z.array(z.string()).default([]),
  results: z.array(z.string()).default([]),
  stack: z.array(z.tuple([z.string(), z.string()])).default([]),
  media: z
    .object({
      video: z.string().optional(),
      poster: z.string().optional(),
      character: z.string().optional(),
      gallery: z.array(z.string()).default([]),
    })
    .default({ gallery: [] }),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  visibility: z.enum(["yes", "footage-only", "pending", "no"]),
  style: z.enum(["tower", "midrise", "mall", "courtyard", "stepped"]).optional(),
  featured: z.boolean().default(false),
  order: z.number().optional(),
});

const profileSchema = z.object({
  name: z.string().min(1),
  title: z.string().default(""),
  bio: z.string().default(""),
  email: z.string().default(""),
  cvPath: z.string().default(""),
  github: z.string().default(""),
  linkedin: z.string().default(""),
  yearsExperience: z.number().default(0),
  education: z
    .array(z.object({ degree: z.string(), school: z.string(), period: z.string() }))
    .default([]),
  experience: z
    .array(z.object({ role: z.string(), company: z.string(), period: z.string(), bullets: z.array(z.string()) }))
    .default([]),
  expertise: z.array(z.object({ title: z.string(), bullets: z.array(z.string()) })).default([]),
});

function readFrontmatter(file: string) {
  return matter(readFileSync(file, "utf8"));
}

function loadProjects() {
  const projectsRoot = join(contentDir, "projects");
  const found: Array<z.infer<typeof projectSchema> & { body: string }> = [];
  const seen = new Set<string>();

  for (const engineDir of readdirSync(projectsRoot)) {
    const enginePath = join(projectsRoot, engineDir);
    if (!statSync(enginePath).isDirectory()) continue;

    for (const projectDir of readdirSync(enginePath)) {
      const infoFile = join(enginePath, projectDir, "info.md");
      if (!existsSync(infoFile)) continue;

      const { data, content } = readFrontmatter(infoFile);
      const parsed = projectSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`${infoFile}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      }
      if (seen.has(parsed.data.id)) throw new Error(`duplicate project id "${parsed.data.id}" in ${infoFile}`);
      seen.add(parsed.data.id);

      const project = { ...parsed.data, body: content.trim() };
      warnIfVideoTooLarge(join(enginePath, projectDir), project.media.video);
      found.push(project);
    }
  }

  return found.filter((p) => p.visibility !== "no");
}

function warnIfVideoTooLarge(projectDir: string, videoPath: string | undefined) {
  if (!videoPath) return;
  const file = join(projectDir, videoPath);
  if (!existsSync(file)) {
    console.warn(`warning: video not found: ${file}`);
    return;
  }
  const size = statSync(file).size;
  if (size > MAX_VIDEO_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(1);
    console.warn(`warning: ${file} is ${mb} MB (limit 8 MB). Compress with:`);
    console.warn(`  ffmpeg -i "${file}" -vf scale=-2:720 -c:v libx264 -crf 28 -an -movflags +faststart "${file.replace(/\.[^.]+$/, "")}-web.mp4"`);
  }
}

function loadProfile() {
  const file = join(contentDir, "me", "profile.md");
  const { data, content } = readFrontmatter(file);
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return { ...parsed.data, bio: parsed.data.bio || content.trim() };
}

const projects = loadProjects().sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
const profile = loadProfile();

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "projects.json"), JSON.stringify(projects, null, 2));
writeFileSync(join(outDir, "profile.json"), JSON.stringify(profile, null, 2));
console.log(`content: ${projects.length} projects, profile for ${profile.name}`);
