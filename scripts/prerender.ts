import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bodyHTML, toProject, type Profile, type Showreel, type SourceProject } from "../src/site/templates";

const SITE_URL = "https://maxzee.github.io/";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generated = join(root, "src", "generated");

const projects = (JSON.parse(readFileSync(join(generated, "projects.json"), "utf8")) as SourceProject[]).map(toProject);
const profile = JSON.parse(readFileSync(join(generated, "profile.json"), "utf8")) as Profile;
const reel = JSON.parse(readFileSync(join(generated, "showreel.json"), "utf8")) as Showreel;
const template = readFileSync(join(root, "index.template.html"), "utf8");

for (const marker of ["<!--BODY-->", "<!--HEAD-->"]) {
  if (!template.includes(marker)) throw new Error(`index.template.html is missing the ${marker} marker`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const short = profile.shortName || profile.name.split(" ")[0];
const title = `${short} Online — drive through my game portfolio`;
const description = `${profile.name}, game developer with ${profile.yearsExperience}+ years in Unity (C#) and Unreal Engine (C++ and Blueprints). ${projects.length} projects, playable as a 3D city.`;
const image = `${SITE_URL}og-image.jpg`;

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  alternateName: short,
  jobTitle: profile.title,
  url: SITE_URL,
  sameAs: [profile.github, profile.linkedin].filter(Boolean),
  knowsAbout: ["Unity", "Unreal Engine", "C#", "C++", "Blueprints", "Game development"],
};

const head = [
  `<title>${esc(title)}</title>`,
  `<meta name="description" content="${esc(description)}" />`,
  `<link rel="canonical" href="${SITE_URL}" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:url" content="${SITE_URL}" />`,
  `<meta property="og:title" content="${esc(title)}" />`,
  `<meta property="og:description" content="${esc(description)}" />`,
  `<meta property="og:image" content="${image}" />`,
  `<meta property="og:image:width" content="1200" />`,
  `<meta property="og:image:height" content="630" />`,
  `<meta name="twitter:card" content="summary_large_image" />`,
  `<meta name="twitter:title" content="${esc(title)}" />`,
  `<meta name="twitter:description" content="${esc(description)}" />`,
  `<meta name="twitter:image" content="${image}" />`,
  // JSON in a script tag: escape "<" so nothing can close the tag early
  `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, "\\u003c")}</script>`,
].join("\n    ");

writeFileSync(join(root, "index.html"), template.replace("<!--HEAD-->", head).replace("<!--BODY-->", bodyHTML(projects, profile, reel)));
console.log(`prerender: index.html with ${projects.length} projects`);
