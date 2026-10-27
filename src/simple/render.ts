export type Engine = "unity" | "unreal" | "other";

export interface SiteProject {
  id: string;
  name: string;
  engines: Engine[];
  engineLabel: string;
  platform: string;
  company: string;
  year: string;
  status: "released" | "in-development" | "prototype";
  role: string;
  summary: string;
  tags: string[];
  built: string[];
  featured: boolean;
}

export interface SiteProfile {
  name: string;
  title: string;
  bio: string;
  github: string;
  linkedin: string;
  yearsExperience: number;
  education: { degree: string; school: string; period: string }[];
  experience: { role: string; company: string; period: string; bullets: string[] }[];
  expertise: { title: string; bullets: string[] }[];
}

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const engineName = (engine: Engine) => ({ unity: "Unity", unreal: "Unreal", other: "Other" })[engine];

const statusLabel = (project: SiteProject) =>
  ({ released: "Released", "in-development": "In development", prototype: "Prototype" })[project.status];

function engineTags(project: SiteProject) {
  return project.engines.map((engine) => `<span class="pill pill-${engine}">${esc(engineName(engine))}</span>`).join("");
}

function slate(project: SiteProject) {
  return `<div class="slate" role="img" aria-label="Demo video coming soon for ${esc(project.name)}"><span>Demo video coming soon</span></div>`;
}

function builtList(project: SiteProject) {
  if (project.built.length === 0) return `<p class="muted">Details for this project are coming soon.</p>`;
  return `<ul class="bullets">${project.built.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
}

function featuredRow(project: SiteProject, index: number) {
  return `<article class="feature${index % 2 ? " flip" : ""}">
    <div class="feature-media">${slate(project)}</div>
    <div class="feature-body">
      <div class="pill-row">${engineTags(project)}<span class="status">${esc(statusLabel(project))}</span></div>
      <h3>${esc(project.name)}</h3>
      <p class="meta">${esc(project.engineLabel)}${project.role ? ` · ${esc(project.role)}` : ""}</p>
      <p>${esc(project.summary || "Details for this project are coming soon.")}</p>
      ${builtList(project)}
    </div>
  </article>`;
}

function projectCard(project: SiteProject) {
  const engines = project.engines.join(" ");
  return `<article class="card" data-engines="${esc(engines)}" data-status="${esc(project.status)}">
    ${slate(project)}
    <div class="card-body">
      <div class="pill-row">${engineTags(project)}<span class="status">${esc(statusLabel(project))}</span></div>
      <h3>${esc(project.name)}</h3>
      <p class="meta">${esc(project.engineLabel)}${project.role ? ` · ${esc(project.role)}` : ""}</p>
      <p>${esc(project.summary || "Details for this project are coming soon.")}</p>
      ${project.tags.length ? `<ul class="tags">${project.tags.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${project.built.length ? `<details><summary>What I built</summary>${builtList(project)}</details>` : ""}
    </div>
  </article>`;
}

function experience(profile: SiteProfile) {
  return profile.experience
    .map(
      (job) => `<li class="job">
        <p class="job-period">${esc(job.period)}</p>
        <h3>${esc(job.role)} <span class="muted">· ${esc(job.company)}</span></h3>
        <ul class="bullets">${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </li>`,
    )
    .join("");
}

function expertise(profile: SiteProfile) {
  return profile.expertise
    .map(
      (box) => `<div class="box">
        <h3>${esc(box.title)}</h3>
        <ul class="bullets">${box.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
      </div>`,
    )
    .join("");
}

export function renderSimple(projects: SiteProject[], profile: SiteProfile) {
  const featured = projects.filter((p) => p.featured);
  const visibleCount = projects.length;
  const firstName = profile.name.split(" ")[0];

  const nav = `<header class="nav">
    <div class="nav-inner">
      <span class="brand">${esc(profile.name)}</span>
      <nav aria-label="Sections">
        <button type="button" data-scroll="projects">Work</button>
        <button type="button" data-scroll="experience">Experience</button>
        <button type="button" data-scroll="skills">Skills</button>
        <button type="button" data-scroll="contact">Contact</button>
      </nav>
    </div>
  </header>`;

  const hero = `<section class="hero" id="top">
    <p class="eyebrow">Game Developer · Unity and Unreal Engine</p>
    <h1>I build game worlds in <span class="grad">Unity and Unreal</span>, then make them run fast.</h1>
    <p class="intro">${esc(profile.bio)}</p>
    <div class="cta-row">
      <button type="button" class="btn btn-primary" data-scroll="projects">See my projects</button>
      <button type="button" class="btn" data-scroll="contact">Get in touch</button>
    </div>
    <dl class="stats">
      <div><dt>Years of experience</dt><dd>${profile.yearsExperience}+</dd></div>
      <div><dt>Projects</dt><dd>${visibleCount}</dd></div>
      <div><dt>Engines</dt><dd>Unity + Unreal</dd></div>
    </dl>
  </section>`;

  const selected = featured.length
    ? `<section class="section" id="featured" aria-labelledby="featured-title">
        <h2 id="featured-title">Selected work</h2>
        ${featured.map((p, i) => featuredRow(p, i)).join("")}
      </section>`
    : "";

  const filters = `<div class="filters" role="group" aria-label="Filter projects">
    <button type="button" aria-pressed="true" data-filter="all">All</button>
    <button type="button" aria-pressed="false" data-filter="unity">Unity</button>
    <button type="button" aria-pressed="false" data-filter="unreal">Unreal</button>
    <button type="button" aria-pressed="false" data-filter="coming-soon">Coming soon</button>
  </div>`;

  const allProjects = `<section class="section" id="projects" aria-labelledby="projects-title">
    <h2 id="projects-title">All projects</h2>
    ${filters}
    <div class="grid" data-filter-grid>${projects.map(projectCard).join("")}</div>
  </section>`;

  const experienceSection = `<section class="section" id="experience" aria-labelledby="experience-title">
    <h2 id="experience-title">Experience</h2>
    <ol class="timeline">${experience(profile)}</ol>
  </section>`;

  const skills = `<section class="section" id="skills" aria-labelledby="skills-title">
    <h2 id="skills-title">Technical expertise</h2>
    <div class="boxes">
      ${expertise(profile)}
      <div class="box">
        <h3>Education</h3>
        ${profile.education.map((e) => `<p><strong>${esc(e.degree)}</strong><br />${esc(e.school)}<br /><span class="muted">${esc(e.period)}</span></p>`).join("")}
      </div>
    </div>
  </section>`;

  const contact = `<section class="section cta-band" id="contact" aria-labelledby="contact-title">
    <h2 id="contact-title">Ready to build something together?</h2>
    <p>Reach out on GitHub or LinkedIn to talk about ${esc(firstName)}'s projects or a role.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${esc(profile.github)}" target="_blank" rel="noopener">GitHub</a>
      <a class="btn" href="${esc(profile.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
    </div>
  </section>`;

  const footer = `<footer class="footer">
    <p>© ${new Date().getFullYear()} ${esc(profile.name)}</p>
  </footer>`;

  return [nav, `<div class="page">`, hero, selected, allProjects, experienceSection, skills, contact, footer, `</div>`].join("\n");
}
