import type { SiteProfile, SiteProject } from "../simple/render";
import type { Lot } from "./layout";

const ENGINE_NAME = { unity: "Unity", unreal: "Unreal", other: "AI / Other" } as const;
const STATUS = { released: "Released", "in-development": "In development", prototype: "Prototype" } as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function list(items: string[], className = "ticks") {
  const ul = el("ul", className);
  for (const item of items) ul.append(el("li", undefined, item));
  return ul;
}

function link(label: string, href: string, primary = false) {
  const a = el("a", `btn ${primary ? "btn-primary" : "btn-ghost"}`, label);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

export function createOverlay(root: HTMLElement, handlers: { onPrev(): void; onNext(): void; onClose(): void; onOpenNearby(): void }) {
  const prompt = el("button", "city-prompt");
  prompt.type = "button";
  prompt.hidden = true;
  prompt.addEventListener("click", handlers.onOpenNearby);

  const card = el("aside", "city-card");
  card.hidden = true;
  card.setAttribute("aria-labelledby", "city-card-title");
  const cardInner = el("div", "city-card-inner");
  const close = el("button", "city-card-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close project details");
  close.addEventListener("click", handlers.onClose);
  const nav = el("div", "city-card-nav");
  const prev = el("button", "btn btn-ghost", "← Previous");
  const next = el("button", "btn btn-ghost", "Next →");
  prev.type = next.type = "button";
  prev.addEventListener("click", handlers.onPrev);
  next.addEventListener("click", handlers.onNext);
  nav.append(prev, next);
  card.append(close, cardInner, nav);

  const minimap = el("canvas", "city-minimap");
  minimap.width = 320;
  minimap.height = 320;
  minimap.setAttribute("aria-hidden", "true");

  const touch = el("div", "city-touch");
  touch.setAttribute("aria-hidden", "true");
  const pads: Record<string, HTMLButtonElement> = {};
  for (const [key, label] of [
    ["left", "◀"],
    ["right", "▶"],
    ["down", "▼"],
    ["up", "▲"],
  ] as const) {
    const pad = el("button", `city-pad city-pad-${key}`, label);
    pad.type = "button";
    pad.tabIndex = -1;
    pads[key] = pad;
    touch.append(pad);
  }

  root.append(prompt, card, minimap, touch);

  let video: HTMLVideoElement | null = null;

  function show(content: HTMLElement[]) {
    video?.pause();
    cardInner.replaceChildren(...content);
    card.hidden = false;
    video = cardInner.querySelector("video");
    video?.play().catch(() => {});
    cardInner.querySelector<HTMLElement>("h2")?.focus();
  }

  function header(kicker: string, title: string, color: string) {
    const top = el("p", "city-card-kicker", kicker);
    top.style.color = color;
    const h = el("h2", undefined, title);
    h.id = "city-card-title";
    h.tabIndex = -1;
    return [top, h];
  }

  function media(project: SiteProject) {
    if (!project.poster) return el("div", "city-card-media city-card-empty", "Demo video coming soon");
    const box = el("div", "city-card-media");
    if (project.preview) {
      const v = el("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.poster = project.poster;
      v.src = project.preview;
      v.setAttribute("aria-label", `Footage from ${project.name}`);
      box.append(v);
    } else {
      const img = el("img");
      img.src = project.poster;
      img.alt = `Footage from ${project.name}`;
      box.append(img);
    }
    return box;
  }

  return {
    pads,
    minimap,
    get isOpen() {
      return !card.hidden;
    },
    showPrompt(text: string | null) {
      prompt.hidden = text === null;
      if (text) prompt.innerHTML = `<kbd>E</kbd> ${text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)}`;
    },
    showProject(project: SiteProject, color: string) {
      const chips = el("div", "chips");
      for (const engine of project.engines) chips.append(el("span", `chip chip-${engine}`, ENGINE_NAME[engine]));
      chips.append(el("span", "chip chip-status", STATUS[project.status]));
      const meta = el("p", "meta", [project.engineLabel, project.platform, project.company, project.year].filter(Boolean).join(" · "));
      const parts: HTMLElement[] = [...header(project.engineLabel || ENGINE_NAME[project.engines[0]], project.name, color), chips, meta, media(project)];
      if (project.role) {
        const role = el("p", "role");
        role.append(el("span", "label", "My role"), project.role);
        parts.push(role);
      }
      parts.push(el("p", undefined, project.summary || "Details for this project are coming soon."));
      if (project.built.length) parts.push(el("p", "label", "What I built"), list(project.built));
      if (project.tags.length) parts.push(list(project.tags, "tags"));
      card.style.setProperty("--glow", color);
      show(parts);
    },
    showAbout(profile: SiteProfile, projectCount: number) {
      card.style.setProperty("--glow", "#ffd24a");
      const actions = el("div", "cta-row");
      actions.append(link("GitHub", profile.github, true), link("LinkedIn", profile.linkedin));
      show([
        ...header("About me", profile.name, "#ffd24a"),
        el("p", "meta", profile.title),
        el("p", undefined, profile.bio),
        el("p", "label", "At a glance"),
        list([`${profile.yearsExperience}+ years of experience`, `${projectCount} projects in this city`, ...profile.education.map((e) => `${e.degree}, ${e.school}`)]),
        el("p", "label", "Recent roles"),
        list(profile.experience.slice(0, 3).map((job) => `${job.role} · ${job.company} (${job.period})`)),
        actions,
      ]);
    },
    showContact(profile: SiteProfile) {
      card.style.setProperty("--glow", "#2fbf63");
      const actions = el("div", "cta-row");
      actions.append(link("GitHub", profile.github, true), link("LinkedIn", profile.linkedin));
      show([...header("Contact", "Let's build your next game", "#2fbf63"), el("p", undefined, `Reach out to ${profile.name} on GitHub or LinkedIn.`), actions]);
    },
    hideCard() {
      if (card.hidden) return false;
      video?.pause();
      video = null;
      card.hidden = true;
      cardInner.replaceChildren();
      return true;
    },
  };
}

export type Overlay = ReturnType<typeof createOverlay>;

export function drawMinimap(
  canvas: HTMLCanvasElement,
  lots: Lot[],
  span: number,
  colors: Map<Lot, string>,
  car: { x: number; z: number; heading: number },
  nearest: Lot | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;
  const pad = 14;
  const scale = (size - pad * 2) / (span + 20);
  const toMap = (v: number) => size / 2 + v * scale;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(7,10,18,0.82)";
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 22);
  ctx.fill();

  for (const lot of lots) {
    const half = 16 * scale;
    const x = toMap(lot.x);
    const y = toMap(lot.z);
    if (lot.kind === "plaza") {
      ctx.strokeStyle = "#ffd24a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, half * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = lot.kind === "park" ? "#2f6b33" : colors.get(lot) ?? "#555";
    ctx.globalAlpha = lot === nearest ? 1 : 0.6;
    ctx.fillRect(x - half, y - half, half * 2, half * 2);
    ctx.globalAlpha = 1;
    if (lot === nearest) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - half, y - half, half * 2, half * 2);
    }
  }

  ctx.save();
  ctx.translate(toMap(car.x), toMap(car.z));
  ctx.rotate(-car.heading);
  ctx.fillStyle = "#4de3ff";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(8, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
