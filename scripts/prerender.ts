import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSimple, type SiteProfile, type SiteProject } from "../src/simple/render";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generated = join(root, "src", "generated");

const projects = JSON.parse(readFileSync(join(generated, "projects.json"), "utf8")) as SiteProject[];
const profile = JSON.parse(readFileSync(join(generated, "profile.json"), "utf8")) as SiteProfile;
const template = readFileSync(join(root, "index.template.html"), "utf8");

if (!template.includes("<!--SIMPLE-->")) throw new Error("index.template.html is missing the <!--SIMPLE--> marker");

writeFileSync(join(root, "index.html"), template.replace("<!--SIMPLE-->", renderSimple(projects, profile)));
console.log(`prerender: index.html with ${projects.length} projects`);
