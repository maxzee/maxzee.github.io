import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { contentDir, issuesText, loadProjectEntries, publicProjectsDir, root } from "./projects";

const outDir = join(root, "src", "generated");
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

const profileSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().default(""),
  title: z.string().default(""),
  lead: z.string().default(""),
  bio: z.string().default(""),
  upworkRating: z.string().default(""),
  skillTags: z.array(z.string()).default([]),
  reviews: z
    .array(
      z.object({
        stars: z.number(),
        source: z.string(),
        project: z.string(),
        short: z.string(),
        rest: z.string().default(""),
        tags: z.array(z.string()).default([]),
      }),
    )
    .default([]),
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

function publishedMedia(id: string, dir: string, character?: string) {
  const at = (name: string) => join(publicProjectsDir, id, name);
  const url = (name: string) => (existsSync(at(name)) ? `/projects/${id}/${name}` : "");
  if (existsSync(at("preview.mp4")) && statSync(at("preview.mp4")).size > MAX_PREVIEW_BYTES) {
    console.warn(`warning: ${at("preview.mp4")} is over 8 MB`);
  }
  // a 3D model for the building's character: copied as-is next to the other published media
  if (character) {
    const source = join(dir, character);
    if (!existsSync(source)) console.warn(`warning: ${id}: character model not found: ${source}`);
    else {
      mkdirSync(join(publicProjectsDir, id), { recursive: true });
      copyFileSync(source, at("character.glb"));
    }
  }
  const wraps = [1, 2, 3].map((k) => url(`wrap-${k}.webp`)).filter(Boolean);
  return { preview: url("preview.mp4"), full: url("full.mp4"), poster: url("poster.webp"), character: url("character.glb"), wraps };
}

function loadProjects() {
  return loadProjectEntries().map(({ project, dir }) => {
    const { media, ...rest } = project;
    const published = publishedMedia(project.id, dir, media.character);
    if (media.video && !published.preview) {
      console.warn(`warning: ${project.id} has a source clip but no preview yet. Run: npm run media`);
    }
    return { ...rest, ...published };
  });
}

function loadShowreel() {
  const file = join(root, "public", "showreel.json");
  if (!existsSync(file) || !existsSync(join(root, "public", "showreel.mp4"))) return { video: "", poster: "", chapters: [] };
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadProfile() {
  const file = join(contentDir, "me", "profile.md");
  const { data, content } = matter(readFileSync(file, "utf8"));
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) throw new Error(`${file}: ${issuesText(parsed.error)}`);
  return { ...parsed.data, bio: parsed.data.bio || content.trim() };
}

const projects = loadProjects().sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
const profile = loadProfile();

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "projects.json"), JSON.stringify(projects, null, 2));
writeFileSync(join(outDir, "profile.json"), JSON.stringify(profile, null, 2));
writeFileSync(join(outDir, "showreel.json"), JSON.stringify(loadShowreel(), null, 2));
console.log(`content: ${projects.length} projects, profile for ${profile.name}`);
