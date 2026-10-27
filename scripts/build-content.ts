import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { contentDir, issuesText, loadProjectEntries, publicProjectsDir, root } from "./projects";

const outDir = join(root, "src", "generated");
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

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

function publishedMedia(id: string) {
  const preview = join(publicProjectsDir, id, "preview.mp4");
  const poster = join(publicProjectsDir, id, "poster.webp");
  if (existsSync(preview) && statSync(preview).size > MAX_PREVIEW_BYTES) {
    console.warn(`warning: ${preview} is over 8 MB`);
  }
  return {
    preview: existsSync(preview) ? `/projects/${id}/preview.mp4` : "",
    poster: existsSync(poster) ? `/projects/${id}/poster.webp` : "",
  };
}

function loadProjects() {
  return loadProjectEntries().map(({ project }) => {
    const { media, ...rest } = project;
    const published = publishedMedia(project.id);
    if (media.video && !published.preview) {
      console.warn(`warning: ${project.id} has a source clip but no preview yet. Run: npm run media`);
    }
    return { ...rest, ...published };
  });
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
console.log(`content: ${projects.length} projects, profile for ${profile.name}`);
