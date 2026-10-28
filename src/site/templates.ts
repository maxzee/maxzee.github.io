// Markup shared by the build-time prerender and the browser. It mirrors the prototype's HTML.

export type Engine = "unity" | "unreal" | "tbd";

export interface SourceProject {
  id: string;
  name: string;
  engines: ("unity" | "unreal" | "other")[];
  engineLabel: string;
  platform: string;
  company: string;
  year: string;
  status: "released" | "in-development" | "prototype";
  role: string;
  summary: string;
  tags: string[];
  built: string[];
  results: string[];
  stack: [string, string][];
  links: { label: string; href: string }[];
  visibility: "yes" | "footage-only" | "pending" | "no";
  style?: string;
  featured: boolean;
  height: number;
  district: string;
  preview: string;
  full: string;
  poster: string;
  character: string;
  wraps: string[];
  talk: string[];
}

export interface Project {
  id: string;
  name: string;
  engine: Engine;
  engineLabel: string;
  platform: string;
  company: string;
  year: string;
  status: SourceProject["status"];
  role: string;
  summary: string;
  tags: string[];
  built: string[];
  results: string;
  stack: [string, string][];
  // video: the whole clip with sound; loop: the short silent clip for banners
  media: { video: string; loop: string; poster: string; character: string; wraps: string[] };
  talk: string[];
  links: { label: string; href: string }[];
  visibility: SourceProject["visibility"];
  featured: boolean;
  height: number;
  style?: string;
}

export interface Review {
  stars: number;
  source: string;
  project: string;
  short: string;
  rest: string;
  tags: string[];
}

export interface Profile {
  name: string;
  shortName: string;
  title: string;
  lead: string;
  email: string;
  cvPath: string;
  github: string;
  linkedin: string;
  yearsExperience: number;
  upworkRating: string;
  skillTags: string[];
  reviews: Review[];
  education: { degree: string; school: string; period: string }[];
  experience: { role: string; company: string; period: string; bullets: string[] }[];
  expertise: { title: string; bullets: string[] }[];
}

export const CSSCOL: Record<Engine, string> = { unity: "#4DB6FF", unreal: "#FF8A3D", tbd: "#C7A6FF" };

export const SHOWREEL_CHAPTERS = ["kingdomland", "nayzak", "orionmeta", "mars-simulation", "kungfu-karate", "mototraffic-rider", "fps-commando", "reader-bee"];

export function toProject(p: SourceProject): Project {
  // the prototype colours a building by one engine; KingdomLand (both) reads as Unreal, AI video as "tbd"
  const engine: Engine = p.engines.includes("unreal") ? "unreal" : p.engines.includes("unity") ? "unity" : "tbd";
  return {
    id: p.id,
    name: p.name,
    engine,
    engineLabel: p.engineLabel,
    platform: p.platform,
    company: p.company,
    year: p.year,
    status: p.status,
    role: p.role,
    summary: p.summary,
    tags: p.tags,
    built: p.built,
    results: p.results.join(", "),
    stack: p.stack,
    media: { video: p.full || p.preview, loop: p.preview, poster: p.poster, character: p.character, wraps: p.wraps ?? [] },
    talk: p.talk,
    links: p.links,
    visibility: p.visibility,
    featured: p.featured,
    height: p.height,
    style: p.style,
  };
}

export function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const PLAY = '<span class="pl"><svg width="26" height="26" viewBox="0 0 24 24" fill="#EEF2F8" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span>';
const CAR_ICON = (size: number, width: string) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 16l1.5-5A2 2 0 0 1 8.4 9.5h7.2a2 2 0 0 1 1.9 1.5L19 16"></path><rect x="3" y="16" width="18" height="3" rx="1"></rect></svg>`;
const PLAY_ICON = (size: number) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>`;

export function mediaHTML(p: Project, big: boolean) {
  const bar = `<span class="bar" style="background:${CSSCOL[p.engine]}"></span>`;
  if (big && p.media.video) {
    return `<video src="${esc(p.media.video)}"${p.media.poster ? ` poster="${esc(p.media.poster)}"` : ""} controls playsinline preload="none"></video>`;
  }
  if (p.media.poster) return `<img src="${esc(p.media.poster)}" alt="${esc(p.name)} screenshot" loading="lazy">${bar}`;
  return `${PLAY}<small>${p.visibility === "pending" ? "Footage after studio approval" : "Demo video coming soon"}</small>${bar}`;
}

export function featHTML(projects: Project[]) {
  return projects
    .filter((p) => p.featured)
    .map((p, k) => {
      const i = projects.indexOf(p);
      const info = p.role || p.built.length;
      let body =
        `<span class="sv-pill"><i style="background:${CSSCOL[p.engine]}"></i>${esc(p.engineLabel || "Engine to be added")}</span>` +
        `<h3>${esc(p.name)}</h3><div class="sv-meta">${esc([p.platform, p.company, p.year].filter(Boolean).join(", "))}</div>` +
        (p.summary ? `<p class="sum">${esc(p.summary)}</p>` : "");
      if (p.visibility === "pending") body += '<p class="sv-note">In development. Footage and details will be shared once the studio approves them.</p>';
      else if (!info) body += '<p class="sv-note">Details for this project are coming soon.</p>';
      else {
        body += `<dl><dt>My role</dt><dd>${esc(p.role)}</dd>${p.results ? `<dt>Results</dt><dd>${esc(p.results)}</dd>` : ""}</dl>`;
        if (p.built.length) body += `<ul>${p.built.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
        if (p.stack.length) body += `<div class="sv-stack">${p.stack.map((x) => `<b>${esc(x[0])}</b><span>${esc(x[1])}</span>`).join("")}</div>`;
      }
      body += `<div class="sv-actions"><button type="button" class="btn primary" data-3d="${i}">Visit its building</button></div>`;
      return `<article class="sv-feat${k % 2 ? " flip" : ""}"><div class="sv-media">${mediaHTML(p, true)}</div><div>${body}</div></article>`;
    })
    .join("");
}

const STATUS_BADGE = { released: "Released", "in-development": "In development", prototype: "Prototype" } as const;

// "Coming soon" covers projects whose engine or details are still to come
export function matchesFilter(p: Project, filter: string) {
  if (filter === "all") return true;
  if (filter === "tbd") return p.engine === "tbd" || (!p.role && !p.built.length);
  return p.engine === filter;
}

export function cardHTML(p: Project, i: number) {
  const hasInfo = p.role || p.built.length;
  const dev = p.status === "in-development";
  const badge = hasInfo || dev ? `<span class="sv-badge${dev ? " dev" : ""}">${STATUS_BADGE[p.status]}</span>` : "";
  return (
    `<li><button type="button" class="sv-card" data-card="${i}"><span class="sv-media">${badge}${mediaHTML(p, false)}</span><span class="in"><strong>${esc(p.name)}</strong>` +
    `<span class="m">${esc([p.engineLabel, p.platform].filter(Boolean).join(", ") || "Engine to be added")}</span>` +
    `<span class="r">${p.visibility === "pending" ? "In development" : hasInfo ? esc(p.role) : "Details coming soon"}</span>` +
    (p.summary ? `<span class="sum">${esc(p.summary)}</span>` : "") +
    (p.tags.length ? `<span class="sv-tags">${p.tags.slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join("")}</span>` : "") +
    "</span></button></li>"
  );
}

export function gridHTML(projects: Project[], filter: string) {
  return projects.map((p, i) => (matchesFilter(p, filter) ? cardHTML(p, i) : "")).join("");
}

export interface Showreel {
  video: string;
  poster: string;
  chapters: { id: string; at: number | null }[];
}

/* chapters come from the built showreel; without one, the buttons just open each project in 3D */
export function reelChapters(reel: Showreel) {
  return reel.chapters.length ? reel.chapters : SHOWREEL_CHAPTERS.map((id) => ({ id, at: null }));
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function chaptersHTML(projects: Project[], reel: Showreel) {
  return reelChapters(reel).map((c, k) => {
    const p = projects.find((x) => x.id === c.id);
    return p ? `<button type="button" data-ch="${k}"><b>${esc(p.name)}</b><span>${c.at == null ? "Open in 3D" : clock(c.at)}</span></button>` : "";
  }).join("");
}

export function reviewHTML(r: Review) {
  return (
    `<div class="stars">${"★".repeat(r.stars)} ${r.stars.toFixed(1)} <span>${esc(r.source)}</span></div>` +
    `<blockquote>“${esc(r.short)}<span class="more">${esc(r.rest)}</span>”</blockquote>` +
    `<div class="row"><small>${esc(r.project)}</small>${r.tags.map((t) => `<b>${esc(t)}</b>`).join("")}<button type="button" id="svMore" aria-expanded="false">Read full review</button></div>`
  );
}

export function bodyHTML(projects: Project[], profile: Profile, reel: Showreel) {
  const N = projects.length;
  const short = profile.shortName || profile.name.split(" ")[0];
  const mail = profile.email ? `mailto:${profile.email}` : "#";
  const review = profile.reviews[0];
  const edu = profile.education[0];

  const timeline = profile.experience
    .map(
      (e) =>
        `<li><time>${esc(e.period)}</time><div><h3>${esc(e.role)}</h3><div class="co">${esc(e.company)}</div><ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div></li>`,
    )
    .join("\n          ");
  const skills = profile.expertise
    .map((x) => `<div class="sv-box"><h3>${esc(x.title)}</h3><ul>${x.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>`)
    .join("\n          ");

  return `<div id="app">
  <canvas id="scene" tabindex="-1" aria-label="3D city. Each building is one of ${esc(short)}'s game projects."></canvas>

  <header id="hdr">
    <div class="hb"><b>${esc(short)}</b><span>Game Developer, Unity and Unreal</span></div>
    <nav aria-label="Portfolio">
      <button type="button" class="btn primary" id="tourBtn">
        ${PLAY_ICON(16)}<span class="tt">Take the </span>tour</button>
      <button type="button" class="lnk" data-stop="about">About</button>
      <button type="button" class="lnk" data-stop="contact">Contact</button>
      <button type="button" class="lnk" data-view="simple" aria-pressed="false">1-page site</button>
      <a class="lnk" href="#" id="cvLink">CV</a>
      <span id="tripChip" hidden></span>
    </nav>
    <button type="button" id="menuBtn" aria-expanded="false" aria-controls="drawer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>Menu</button>
  </header>
  <aside id="drawer" class="panel" aria-label="Menu">
    <h2>View</h2>
    <div class="seg panel" role="group" aria-label="View">
      <button type="button" data-view="drive" aria-pressed="true">Drive</button>
      <button type="button" data-view="spectate" aria-pressed="false">Spectate</button>
      <button type="button" data-view="simple" aria-pressed="false">Simple</button>
    </div>
    <h2>Look</h2>
    <div class="seg panel" role="group" aria-label="Look">
      <button type="button" data-look="day" aria-pressed="true">Day</button>
      <button type="button" data-look="night" aria-pressed="false">Night</button>
      <button type="button" data-look="bp" aria-pressed="false">Blueprint</button>
    </div>
    <h2>Map</h2>
    <canvas id="minimap" width="300" height="300" aria-label="Minimap"></canvas>
    <h2 id="tripText">0 of ${N} projects visited</h2>
    <div class="prog" aria-hidden="true"><i id="tripBar"></i></div>
    <h2>Controls</h2>
    <div class="keys">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Drive (arrow keys work too)</span>
      <span><kbd>Shift</kbd></span><span>Boost</span>
      <span><kbd>F</kbd></span><span>Hold to fly up (Space, Numpad + too)</span>
      <span><kbd>E</kbd></span><span>Hold to fly down and land (C, Numpad − too)</span>
      <span><kbd>E</kbd></span><span>On a glowing ring: open the building</span>
      <span><kbd>V</kbd> <kbd>B</kbd></span><span>Next view, next look</span>
    </div>
  </aside>
  <div class="lb top" aria-hidden="true"></div><div class="lb bot" aria-hidden="true"></div>
  <div id="lower" aria-hidden="true"><i id="lowBar"></i><b id="lowT"></b><span id="lowS"></span></div>
  <div id="act" role="group" aria-label="Building actions"></div>
  <div id="tourBar" class="panel" aria-live="polite"><span id="tourT"></span><button type="button" class="btn primary" id="tourNext">Next stop</button><button type="button" class="btn" id="tourExit">Exit tour</button></div>
  <div id="hint" class="panel" role="status" aria-live="polite">
    <span id="hintText"></span>
    <div class="row"><button type="button" class="btn primary" id="hintTry">Try it</button><button type="button" class="btn" id="hintNo">Not now</button></div>
  </div>

  <button type="button" id="prompt" class="panel"><kbd>E</kbd><span id="promptText"></span></button>

  <section id="simple" aria-label="Simple view: portfolio website">
    <nav class="sv-nav" aria-label="Site">
      <span class="sv-logo">${esc(short)}</span>
      <div class="sv-links">
        <button type="button" data-go="sv-reel">Showreel</button>
        <button type="button" data-go="sv-work">Work</button>
        <button type="button" data-go="sv-all">All projects</button>
        <button type="button" data-go="sv-exp">Experience</button>
        <button type="button" data-go="sv-skills">Skills</button>
        <button type="button" data-go="sv-contact">Contact</button>
      </div>
      <span class="grow"></span>
      <div class="seg" role="group" aria-label="View">
        <button type="button" data-view="drive" aria-pressed="false">${CAR_ICON(16, "2.2")}Drive</button>
        <button type="button" data-view="spectate" aria-pressed="false">Spectate</button>
        <button type="button" data-view="simple" aria-pressed="false">Simple</button>
      </div>
      <div class="seg" role="group" aria-label="Look">
        <button type="button" data-look="day" aria-pressed="true">Day</button>
        <button type="button" data-look="night" aria-pressed="false">Night</button>
        <button type="button" data-look="bp" aria-pressed="false">Blueprint</button>
      </div>
    </nav>

    <div class="sv-band">
    <div class="sv-wrap">
      <header class="sv-hero2">
        <h1>I build game worlds in <span class="grad">Unity and Unreal</span>, then make them run fast.</h1>
        <p class="lead">${esc(profile.lead)}</p>
        <div class="sv-cta">
          <button type="button" class="btn primary big" id="svEnter2">
            ${CAR_ICON(18, "2.4")}
            Enter the 3D city</button>
          <button type="button" class="btn big" data-go="sv-reel">
            ${PLAY_ICON(16)}Watch the showreel</button>
        </div>
        <div class="sv-stage">
          <div class="glow" aria-hidden="true"></div>
          <div class="sv-city" id="svCityWrap">
            <canvas id="svCity" aria-label="Live 3D city. Each building is one of ${esc(short)}'s projects. Click a building to drive there."></canvas>
            <div class="cap"><i></i>Live city: drag to turn, click any building</div>
            <div class="tip" id="svTip"></div>
            <button type="button" class="go" id="svEnter" hidden>Enter</button>
          </div>
          <div class="sv-statbar" role="list">
            <div role="listitem"><b>${profile.yearsExperience}+</b><span>Years</span></div>
            <div role="listitem"><b>${N}</b><span>Projects</span></div>
            <div role="listitem"><b>2</b><span>Engines</span></div>
            <div role="listitem"><b>${esc(profile.upworkRating)} ★</b><span>Upwork rating</span></div>
          </div>
        </div>
        <div class="sv-skilltags" aria-label="Main skills">${profile.skillTags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        ${review ? `<div class="sv-review" id="svReview">${reviewHTML(review)}</div>` : ""}
        <a class="btn" href="#" id="cvLink2" style="margin-top:18px">Download CV</a>
      </header>
    </div>
    </div>
    <div class="sv-road" aria-hidden="true"></div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-reel" aria-labelledby="svReelH">
        <h2 class="sv-h" id="svReelH">Showreel</h2>
        <p class="sv-sub">Every project in one video. Pick a chapter to jump straight to it.</p>
        <div class="sv-reelwrap">
          <div class="sv-media" id="svReel">${reel.video
            ? `<video id="svReelVid" src="${esc(reel.video)}" controls playsinline preload="metadata"></video>`
            : `${PLAY}<small>Showreel coming soon</small>`}</div>
          <div class="sv-chapters" id="svChapters" role="group" aria-label="Showreel chapters">${chaptersHTML(projects, reel)}</div>
        </div>
      </section>
    </div>
    <div class="sv-road" aria-hidden="true"></div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-work" aria-labelledby="svWorkH">
        <h2 class="sv-h" id="svWorkH">Selected work</h2>
        <p class="sv-sub">The projects that show my work best, with what I personally built and how.</p>
        <div id="svFeat">${featHTML(projects)}</div>
      </section>
    </div>
    <div class="sv-road" aria-hidden="true"></div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-all" aria-labelledby="svAllH">
        <h2 class="sv-h" id="svAllH">All projects</h2>
        <p class="sv-sub">Every game and app I've worked on. Pick one and you'll drive straight to its building in the 3D city.</p>
        <div class="filters" role="group" aria-label="Filter projects">
          <button type="button" data-f="all" aria-pressed="true">All</button>
          <button type="button" data-f="unity" aria-pressed="false"><i style="background:#4DB6FF"></i>Unity</button>
          <button type="button" data-f="unreal" aria-pressed="false"><i style="background:#FF8A3D"></i>Unreal</button>
          <button type="button" data-f="tbd" aria-pressed="false"><i style="background:#C7A6FF"></i>Coming soon</button>
        </div>
        <ul class="sv-grid" id="sGrid">${gridHTML(projects, "all")}</ul>
      </section>
    </div>
    <div class="sv-road" aria-hidden="true"></div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-exp" aria-labelledby="svExpH">
        <h2 class="sv-h" id="svExpH">Experience</h2>
        <p class="sv-sub">Five years across studios, agencies and freelance work, newest first.</p>
        <ol class="sv-tl">
          ${timeline}
        </ol>
      </section>
    </div>
    <div class="sv-road" aria-hidden="true"></div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-skills" aria-labelledby="svSkH">
        <h2 class="sv-h" id="svSkH">Technical expertise</h2>
        <p class="sv-sub">The engines, platforms and systems I work with, and where I studied.</p>
        <div class="sv-exp">
          ${skills}
          ${edu ? `<div class="sv-box"><h3>Education</h3><p style="margin:0; font-size:17px; line-height:1.45"><strong>${esc(edu.degree)}</strong><br>${esc(edu.school)}, ${esc(edu.period)}</p></div>` : ""}
        </div>
      </section>
    </div>

    <div class="sv-wrap">
      <section class="sv-sec" id="sv-contact" aria-labelledby="svCH" style="padding-top:20px">
        <div class="sv-contact">
          <div>
            <h2 id="svCH">Ready to build something together?</h2>
            <p>I'm available for freelance projects and full-time roles in Unity or Unreal.</p>
          </div>
          <div class="sv-cta" style="margin:0">
            <a class="btn primary" href="${esc(mail)}?subject=New%20project">Start a project</a>
            <a class="btn" href="${esc(profile.github)}" target="_blank" rel="noopener">GitHub</a>
            <a class="btn" href="#" id="cvLink3">Download CV</a>
          </div>
        </div>
      </section>
      <div class="sv-play3d">
        <div><h2>Now play it.</h2><p>Every project is a building. Drive a hover car through the city and open each one.</p></div>
        <button type="button" class="btn primary big" data-3d="-1">Enter the 3D city</button>
      </div>
      <footer class="sv-foot"><span>${esc(short)}, game developer</span><span>Built with three.js. Switch to Drive to explore the city.</span></footer>
    </div>
  </section>
  <div id="shade"></div>
  <div id="toast" class="panel" role="status" aria-live="polite"><strong id="toastT"></strong><span id="toastB"></span><div class="row" id="toastRow"></div></div>
  <div id="warp" aria-live="polite"><div><span id="warpT">Driving to…</span><small>Taking you into the 3D city</small></div></div>
  <div id="choice" role="dialog" aria-modal="true" aria-labelledby="chH">
    <div class="box">
      <h2 id="chH">How do you want to see my work?</h2>
      <p class="s">Both show the same ${N} projects. You can switch any time from the top bar.</p>
      <div class="opts">
        <button type="button" class="opt" data-choose="drive"><em>About 3 minutes</em><b>Play the city</b><span>Drive a hover car through a 3D city where every building is one of my games.</span></button>
        <button type="button" class="opt" data-choose="simple"><em>About 30 seconds</em><b>Quick read</b><span>One page: showreel, projects, experience and contact.</span></button>
      </div>
      <div class="foot">Recruiter? The quick read has everything, and you can still jump into any building from it.</div>
    </div>
  </div>

  <div id="theater" role="dialog" aria-modal="false" aria-label="Project video">
    <video id="thVid" controls playsinline preload="none"></video>
  </div>
  <aside id="card" class="panel" role="dialog" aria-modal="false" aria-labelledby="cTitle">
    <div class="card-top">
      <div><h2 id="cTitle"></h2><div class="meta" id="cMeta"></div></div>
      <button type="button" class="icon-btn" id="cClose" aria-label="Close project">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>
      </button>
    </div>
    <div id="cBody" style="display:flex; flex-direction:column; gap:12px"></div>
    <div class="card-actions">
      <button type="button" class="btn" id="cPrev">Previous</button>
      <button type="button" class="btn primary" id="cNext">Next project</button>
      <button type="button" class="btn simple-only" id="c3d">See it in 3D</button>
    </div>
  </aside>

  <div id="touch">
    <div class="pad">
      <button type="button" data-k="left" aria-label="Steer left"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg></button>
      <div class="alt"><button type="button" data-k="rise" aria-label="Fly up"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>Up</button><button type="button" data-k="sink" aria-label="Fly down"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"></path></svg>Down</button></div>
      <button type="button" data-k="right" aria-label="Steer right"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg></button>
    </div>
    <div class="pad">
      <button type="button" data-k="down" aria-label="Brake and reverse"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"></path></svg></button>
      <button type="button" data-k="up" aria-label="Accelerate"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 15l7-7 7 7"></path></svg></button>
    </div>
  </div>

  <div id="loader"><b>${esc(short)} Online</b><span>Building the city…</span></div>
</div>`;
}
