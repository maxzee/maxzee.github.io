import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { z } from "zod";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const contentDir = join(root, "content");
export const publicProjectsDir = join(root, "public", "projects");

export const projectSchema = z.object({
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
      start: z.number().min(0).optional(),
      character: z.string().optional(),
      gallery: z.array(z.string()).default([]),
    })
    .default({ gallery: [] }),
  links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  visibility: z.enum(["yes", "footage-only", "pending", "no"]),
  style: z.enum(["tower", "midrise", "mall", "courtyard", "stepped"]).optional(),
  featured: z.boolean().default(false),
  height: z.number().min(8).max(60).default(20),
  district: z.enum(["team", "unreal", "mobile", "sim"]).default("unreal"),
  order: z.number().optional(),
});

export type Project = z.infer<typeof projectSchema> & { body: string };

export function issuesText(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
}

export function loadProjectEntries() {
  const projectsRoot = join(contentDir, "projects");
  const entries: Array<{ project: Project; dir: string }> = [];
  const seen = new Set<string>();

  for (const engineDir of readdirSync(projectsRoot)) {
    const enginePath = join(projectsRoot, engineDir);
    if (!statSync(enginePath).isDirectory()) continue;

    for (const projectDir of readdirSync(enginePath)) {
      const dir = join(enginePath, projectDir);
      const infoFile = join(dir, "info.md");
      if (!existsSync(infoFile)) continue;

      const { data, content } = matter(readFileSync(infoFile, "utf8"));
      const parsed = projectSchema.safeParse(data);
      if (!parsed.success) throw new Error(`${infoFile}: ${issuesText(parsed.error)}`);
      if (seen.has(parsed.data.id)) throw new Error(`duplicate project id "${parsed.data.id}" in ${infoFile}`);
      seen.add(parsed.data.id);

      entries.push({ project: { ...parsed.data, body: content.trim() }, dir });
    }
  }

  return entries.filter((e) => e.project.visibility !== "no");
}
