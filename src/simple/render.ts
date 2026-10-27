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
  preview: string;
  poster: string;
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

const ENGINE_NAME: Record<Engine, string> = { unity: "Unity", unreal: "Unreal", other: "AI / Other" };
const STATUS_LABEL = { released: "Released", "in-development": "In development", prototype: "Prototype" } as const;
const pad = (n: number) => String(n).padStart(2, "0");

const accent = (project: SiteProject) => (project.engines.length > 1 ? "dual" : project.engines[0]);

function engineChips(project: SiteProject) {
  return project.engines.map((e) => `<span class="chip chip-${e}">${esc(ENGINE_NAME[e])}</span>`).join("");
}

function media(project: SiteProject, mode: "card" | "feature") {
  const label = `Footage from ${project.name}`;
  if (!project.poster) {
    return `<div class="media media-empty" role="img" aria-label="Demo video coming soon for ${esc(project.name)}">
      <span class="media-empty-mark" aria-hidden="true">${esc(project.name.slice(0, 2).toUpperCase())}</span>
      <span class="media-empty-text">Demo video coming soon</span>
    </div>`;
  }
  const video = project.preview
    ? `<video class="media-video" muted loop playsinline preload="none" aria-hidden="true" data-${mode}-video data-src="${esc(project.preview)}"></video>`
    : "";
  return `<div class="media">
    <img class="media-poster" src="${esc(project.poster)}" alt="${esc(label)}" loading="lazy" decoding="async" width="960" height="540" />
    ${video}
  </div>`;
}

function meta(project: SiteProject) {
  return [project.engineLabel, project.platform, project.company].filter(Boolean).map(esc).join(" · ");
}

function builtList(project: SiteProject) {
  if (project.built.length === 0) return `<p class="muted">Details for this project are coming soon.</p>`;
  return `<ul class="ticks">${project.built.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
}

function featureRow(project: SiteProject, index: number) {
  return `<article class="feature reveal accent-${accent(project)}${index % 2 ? " flip" : ""}">
    <div class="feature-media">${media(project, "feature")}</div>
    <div class="feature-body">
      <p class="index">${pad(index + 1)} / Featured</p>
      <h3 class="feature-title">${esc(project.name)}</h3>
      <div class="chips">${engineChips(project)}<span class="chip chip-status">${esc(STATUS_LABEL[project.status])}</span></div>
      <p class="meta">${meta(project)}</p>
      ${project.role ? `<p class="role"><span class="label">My role</span>${esc(project.role)}</p>` : ""}
      <p>${esc(project.summary || "Details for this project are coming soon.")}</p>
      ${project.built.length ? `<p class="label">What I built</p>${builtList(project)}` : ""}
    </div>
  </article>`;
}

function projectCard(project: SiteProject) {
  return `<article class="card reveal accent-${accent(project)}" data-engines="${esc(project.engines.join(" "))}" data-status="${esc(project.status)}">
    <div class="card-media">
      ${media(project, "card")}
      <span class="badge badge-${project.status}">${esc(STATUS_LABEL[project.status])}</span>
    </div>
    <div class="card-body">
      <div class="chips">${engineChips(project)}</div>
      <h3>${esc(project.name)}</h3>
      ${project.role ? `<p class="role-line">${esc(project.role)}</p>` : ""}
      <p class="summary">${esc(project.summary || "Details for this project are coming soon.")}</p>
      ${project.tags.length ? `<ul class="tags">${project.tags.slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${project.built.length ? `<details><summary>What I built</summary>${builtList(project)}</details>` : ""}
    </div>
  </article>`;
}

function heroReel(projects: SiteProject[]) {
  const clips = projects.filter((p) => p.preview && p.poster);
  if (clips.length === 0) return "";
  const list = clips.map((p) => ({ src: p.preview, poster: p.poster, name: p.name }));
  return `<div class="hero-reel" aria-hidden="true">
    <img class="hero-reel-poster" src="${esc(list[0].poster)}" alt="" />
    <video class="hero-reel-video" muted playsinline preload="none" data-reel='${esc(JSON.stringify(list))}'></video>
    <p class="hero-reel-caption"><span class="dot"></span><span data-reel-name>${esc(list[0].name)}</span></p>
  </div>`;
}

export function renderSimple(projects: SiteProject[], profile: SiteProfile) {
  const featured = projects.filter((p) => p.featured);
  const unityCount = projects.filter((p) => p.engines.includes("unity")).length;
  const unrealCount = projects.filter((p) => p.engines.includes("unreal")).length;
  const firstName = profile.name.split(" ")[0];

  const nav = `<header class="nav" data-nav>
    <div class="nav-inner">
      <button type="button" class="brand" data-scroll="top"><span class="brand-mark" aria-hidden="true">M</span>${esc(profile.name)}</button>
      <nav aria-label="Sections">
        <button type="button" data-scroll="featured">Work</button>
        <button type="button" data-scroll="projects">All projects</button>
        <button type="button" data-scroll="experience">Experience</button>
        <button type="button" data-scroll="skills">Skills</button>
        <button type="button" class="nav-cta" data-scroll="contact">Contact</button>
      </nav>
    </div>
  </header>`;

  const hero = `<section class="hero" id="top">
    ${heroReel([...featured, ...projects.filter((p) => !p.featured)])}
    <div class="hero-shade" aria-hidden="true"></div>
    <div class="hero-inner">
      <p class="eyebrow"><span class="eyebrow-line" aria-hidden="true"></span>Game developer · ${profile.yearsExperience}+ years</p>
      <h1>I build game worlds in <span class="eng eng-unity">Unity</span> and <span class="eng eng-unreal">Unreal</span>, then make them run fast.</h1>
      <p class="intro">${esc(profile.bio)}</p>
      <div class="cta-row">
        <button type="button" class="btn btn-primary" data-scroll="featured">See my work</button>
        <button type="button" class="btn btn-ghost" data-scroll="contact">Get in touch</button>
      </div>
    </div>
    <dl class="hud">
      <div><dt>Experience</dt><dd>${profile.yearsExperience}+ yrs</dd></div>
      <div><dt>Projects</dt><dd>${projects.length}</dd></div>
      <div class="hud-unity"><dt>Unity</dt><dd>${unityCount}</dd></div>
      <div class="hud-unreal"><dt>Unreal</dt><dd>${unrealCount}</dd></div>
    </dl>
  </section>`;

  const heading = (id: string, kicker: string, title: string) =>
    `<header class="section-head reveal"><p class="kicker">${esc(kicker)}</p><h2 id="${id}">${esc(title)}</h2></header>`;

  const selected = featured.length
    ? `<section class="section" id="featured" aria-labelledby="featured-title">
        ${heading("featured-title", "01 · Selected work", "Projects I'm proudest of")}
        ${featured.map(featureRow).join("")}
      </section>`
    : "";

  const filters = `<div class="filters reveal" role="group" aria-label="Filter projects">
    <button type="button" aria-pressed="true" data-filter="all">All <span>${projects.length}</span></button>
    <button type="button" aria-pressed="false" data-filter="unity">Unity <span>${unityCount}</span></button>
    <button type="button" aria-pressed="false" data-filter="unreal">Unreal <span>${unrealCount}</span></button>
    <button type="button" aria-pressed="false" data-filter="in-development">In development</button>
  </div>`;

  const allProjects = `<section class="section" id="projects" aria-labelledby="projects-title">
    ${heading("projects-title", "02 · All projects", "Everything I've shipped and prototyped")}
    ${filters}
    <div class="grid" data-filter-grid>${projects.map(projectCard).join("")}</div>
  </section>`;

  const experienceSection = `<section class="section" id="experience" aria-labelledby="experience-title">
    ${heading("experience-title", "03 · Experience", "Where I've worked")}
    <ol class="timeline">${profile.experience
      .map(
        (job) => `<li class="job reveal">
          <p class="job-period">${esc(job.period)}</p>
          <h3>${esc(job.role)}</h3>
          <p class="job-company">${esc(job.company)}</p>
          <ul class="ticks">${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        </li>`,
      )
      .join("")}</ol>
  </section>`;

  const skills = `<section class="section" id="skills" aria-labelledby="skills-title">
    ${heading("skills-title", "04 · Skills", "Technical expertise")}
    <div class="boxes">
      ${profile.expertise
        .map(
          (box, i) => `<div class="box reveal">
            <p class="box-index">${pad(i + 1)}</p>
            <h3>${esc(box.title)}</h3>
            <ul class="ticks">${box.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
          </div>`,
        )
        .join("")}
      <div class="box box-edu reveal">
        <p class="box-index">EDU</p>
        <h3>Education</h3>
        ${profile.education.map((e) => `<p><strong>${esc(e.degree)}</strong><br />${esc(e.school)}<br /><span class="muted">${esc(e.period)}</span></p>`).join("")}
      </div>
    </div>
  </section>`;

  const contact = `<section class="section" id="contact" aria-labelledby="contact-title">
    <div class="contact reveal">
      <p class="kicker">05 · Contact</p>
      <h2 id="contact-title">Ready to build something together?</h2>
      <p>Reach out on GitHub or LinkedIn to talk about ${esc(firstName)}'s projects or a role.</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="${esc(profile.github)}" target="_blank" rel="noopener">GitHub</a>
        <a class="btn btn-ghost" href="${esc(profile.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
      </div>
    </div>
  </section>`;

  const footer = `<footer class="footer"><p>© ${new Date().getFullYear()} ${esc(profile.name)} · Built with Vite and TypeScript</p></footer>`;

  return [nav, `<main class="page">`, hero, selected, allProjects, experienceSection, skills, contact, `</main>`, footer].join("\n");
}
