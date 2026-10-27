import type { SiteProfile, SiteProject } from "../simple/render";
import type { Lot } from "./layout";
import type { Look } from "./materials";

const ENGINE_NAME = { unity: "Unity", unreal: "Unreal", other: "AI / Other" } as const;
const STATUS = { released: "Released", "in-development": "In development", prototype: "Prototype" } as const;

export type Option = "drive" | "spectate" | "simple" | Look;

export interface ActionButton {
  label: string;
  primary?: boolean;
  href?: string;
  run?: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, className = "", run?: () => void) {
  const b = el("button", className, label);
  b.type = "button";
  if (run) b.addEventListener("click", run);
  return b;
}

function list(items: string[], className = "ticks") {
  const ul = el("ul", className);
  for (const item of items) ul.append(el("li", undefined, item));
  return ul;
}

function linkButton(label: string, href: string, primary = false) {
  const a = el("a", `btn ${primary ? "btn-primary" : "btn-ghost"}`, label);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

function actionNode(action: ActionButton) {
  if (action.href) return linkButton(action.label, action.href, action.primary);
  return button(action.label, `btn ${action.primary ? "btn-primary" : "btn-ghost"}`, action.run);
}

export interface OverlayHandlers {
  onTour(): void;
  onAbout(): void;
  onContact(): void;
  onOption(option: Option): void;
  onPrompt(): void;
  onPanelPrev(): void;
  onPanelNext(): void;
  onPanelClose(): void;
  onTourNext(): void;
  onTourExit(): void;
  onFly(): void;
  onMenuToggle(open: boolean): void;
}

export function createOverlay(root: HTMLElement, profile: SiteProfile, total: number, handlers: OverlayHandlers) {
  // header: the only always-on UI
  const header = el("header", "cityh");
  const brand = el("p", "cityh-brand");
  const mark = el("span", "brand-mark", "M");
  mark.setAttribute("aria-hidden", "true");
  const brandText = el("span", "cityh-name");
  brandText.append(el("strong", undefined, profile.name), el("span", undefined, "Game Developer, Unity and Unreal"));
  brand.append(mark, brandText);

  const actions = el("nav", "cityh-actions");
  actions.setAttribute("aria-label", "City");
  const tourButton = button("", "btn btn-primary cityh-tour", handlers.onTour);
  tourButton.innerHTML = `<span class="cityh-long">Take the tour</span><span class="cityh-short">Tour</span>`;
  const aboutButton = button("About", "cityh-link cityh-wide", handlers.onAbout);
  const contactButton = button("Contact", "cityh-link cityh-wide", handlers.onContact);
  const simpleButton = button("1-page site", "cityh-link cityh-wide");
  simpleButton.dataset.closeCity = "";
  const visitedChip = el("span", "cityh-visited");
  visitedChip.hidden = true;
  const menuButton = button("", "cityh-menu");
  menuButton.innerHTML = `<span aria-hidden="true">☰</span> Menu<span class="new-dot" hidden></span>`;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-controls", "city-drawer");
  actions.append(tourButton, aboutButton, contactButton, simpleButton, visitedChip, menuButton);
  header.append(brand, actions);

  // menu drawer
  const drawer = el("aside", "city-drawer");
  drawer.id = "city-drawer";
  drawer.hidden = true;
  drawer.setAttribute("aria-label", "City menu");
  const optionButtons = new Map<Option, HTMLButtonElement>();
  const segment = (label: string, options: [Option, string][]) => {
    const group = el("div", "segmented");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    for (const [option, text] of options) {
      const b = button(text, "", () => handlers.onOption(option));
      b.setAttribute("aria-pressed", "false");
      b.append(Object.assign(el("span", "new-dot"), { hidden: true }));
      if (option === "simple") b.dataset.closeCity = "";
      optionButtons.set(option, b);
      group.append(b);
    }
    return [el("p", "label", label), group];
  };
  const minimap = el("canvas", "city-minimap");
  minimap.width = 320;
  minimap.height = 320;
  minimap.setAttribute("aria-hidden", "true");
  const progress = el("div", "drawer-progress");
  const progressBar = el("span");
  progress.append(progressBar);
  const progressText = el("p", "muted");
  const controls = el("dl", "drawer-controls");
  for (const [keys, what] of [
    ["W A S D", "Drive"],
    ["Shift", "Boost"],
    ["E", "Open a building"],
    ["F", "Fly / land"],
    ["Space · C", "Up · down while flying"],
    ["V · B", "Switch view · look"],
    ["Esc", "Close"],
  ]) {
    controls.append(el("dt", undefined, keys), el("dd", undefined, what));
  }
  drawer.append(
    el("h2", undefined, "Menu"),
    ...segment("View", [
      ["drive", "Drive"],
      ["spectate", "Spectate"],
      ["simple", "Simple"],
    ]),
    ...segment("Look", [
      ["day", "Day"],
      ["night", "Night"],
      ["blueprint", "Blueprint"],
    ]),
    el("p", "label", "Map"),
    minimap,
    el("p", "label", "Visited"),
    progress,
    progressText,
    el("p", "label", "Controls"),
    controls,
  );

  function setMenu(open: boolean) {
    drawer.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    handlers.onMenuToggle(open);
  }
  menuButton.addEventListener("click", () => setMenu(drawer.hidden !== false));

  // prompt
  const prompt = button("", "city-prompt", handlers.onPrompt);
  prompt.hidden = true;

  // arrival: letterbox, lower-third and action bar
  const letterTop = el("div", "letterbox letterbox-top");
  const letterBottom = el("div", "letterbox letterbox-bottom");
  const lowerThird = el("div", "lower-third");
  lowerThird.setAttribute("role", "status");
  const lowerBar = el("span", "lower-third-bar");
  const lowerName = el("p", "lower-third-name");
  const lowerSub = el("p", "lower-third-sub");
  lowerThird.append(lowerBar, lowerName, lowerSub);
  const actionBar = el("div", "action-bar");

  // details panel
  const card = el("aside", "city-card");
  card.hidden = true;
  card.setAttribute("aria-labelledby", "city-card-title");
  const cardInner = el("div", "city-card-inner");
  const close = button("×", "city-card-close", handlers.onPanelClose);
  close.setAttribute("aria-label", "Close details");
  const nav = el("div", "city-card-nav");
  nav.append(button("← Previous", "btn btn-ghost", handlers.onPanelPrev), button("Next →", "btn btn-ghost", handlers.onPanelNext));
  card.append(close, cardInner, nav);

  // tour bar
  const tourBar = el("div", "tour-bar");
  tourBar.hidden = true;
  const tourText = el("p");
  tourBar.append(tourText, button("Next stop", "btn btn-primary", handlers.onTourNext), button("Exit tour", "btn btn-ghost", handlers.onTourExit));

  // toast and hint bubble
  const toast = el("div", "city-toast");
  toast.hidden = true;
  toast.setAttribute("role", "status");
  const hint = el("div", "city-hint-bubble");
  hint.hidden = true;
  hint.setAttribute("role", "status");

  // touch pads
  const touch = el("div", "city-touch");
  touch.setAttribute("aria-hidden", "true");
  const pads: Record<string, HTMLButtonElement> = {};
  for (const [key, label] of [
    ["left", "◀"],
    ["right", "▶"],
    ["down", "▼"],
    ["up", "▲"],
    ["climb", "⤒"],
    ["descend", "⤓"],
  ] as const) {
    const pad = button(label, `city-pad city-pad-${key}`);
    pad.tabIndex = -1;
    pads[key] = pad;
    touch.append(pad);
  }
  const flyPad = button("Fly", "city-pad city-pad-fly", handlers.onFly);
  flyPad.tabIndex = -1;
  touch.append(flyPad);

  // qualifications, shown in the Blueprint look
  const quals = el("aside", "city-quals");
  quals.setAttribute("aria-label", "Qualifications");
  const qualRows: [string, string][] = [
    ["Degree", profile.education.map((e) => `${e.degree} (${e.period})`).join(", ")],
    ["Languages", "C#, C++, Blueprints"],
    ["Engines", "Unity, Unreal Engine 5"],
    ["Platforms", "PC, Android, iOS, WebGL"],
    ["Backend", "REST APIs, sockets, SQLite, Amazon S3"],
    ["Practice", `${profile.yearsExperience}+ years · ${total} projects`],
  ];
  const qualList = el("dl");
  for (const [k, v] of qualRows) qualList.append(el("dt", undefined, k), el("dd", undefined, v));
  quals.append(el("p", "label", "Qualifications"), qualList);

  root.append(letterTop, letterBottom, header, drawer, prompt, lowerThird, actionBar, card, tourBar, toast, hint, quals, touch);

  let video: HTMLVideoElement | null = null;
  let toastTimer = 0;

  function showPanel(content: HTMLElement[], color: string) {
    video?.pause();
    card.style.setProperty("--glow", color);
    cardInner.replaceChildren(...content);
    card.hidden = false;
    root.classList.add("has-panel");
    video = cardInner.querySelector("video");
    video?.play().catch(() => {});
    cardInner.querySelector<HTMLElement>("h2")?.focus();
  }

  function heading(kicker: string, title: string, color: string) {
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
    tourButton,
    get panelOpen() {
      return !card.hidden;
    },
    get menuOpen() {
      return !drawer.hidden;
    },
    closeMenu() {
      if (!drawer.hidden) setMenu(false);
    },
    focusMenu() {
      menuButton.focus();
    },
    setPressed(view: string, look: Look) {
      for (const [option, b] of optionButtons) b.setAttribute("aria-pressed", String(option === view || option === look));
    },
    setUntried(untried: Set<Option>) {
      for (const [option, b] of optionButtons) b.querySelector<HTMLElement>(".new-dot")!.hidden = !untried.has(option);
      menuButton.querySelector<HTMLElement>(".new-dot")!.hidden = untried.size === 0;
    },
    setVisited(count: number) {
      visitedChip.hidden = count === 0;
      visitedChip.textContent = `${count} / ${total} visited`;
      progressBar.style.width = `${(count / total) * 100}%`;
      progressText.textContent = `${count} of ${total} projects visited`;
    },
    showPrompt(html: string | null) {
      prompt.hidden = html === null;
      if (html !== null) prompt.innerHTML = html;
    },
    showArrival(name: string, sub: string, color: string, buttons: ActionButton[]) {
      root.classList.add("is-arrived");
      lowerBar.style.background = color;
      lowerName.textContent = name;
      lowerSub.textContent = sub;
      actionBar.replaceChildren(...buttons.map(actionNode));
      prompt.hidden = true;
    },
    hideArrival() {
      root.classList.remove("is-arrived");
      actionBar.replaceChildren();
    },
    focusAction() {
      actionBar.querySelector<HTMLElement>("button, a")?.focus();
    },
    showProject(project: SiteProject, color: string, blueprint: boolean) {
      const chips = el("div", "chips");
      for (const engine of project.engines) chips.append(el("span", `chip chip-${engine}`, ENGINE_NAME[engine]));
      chips.append(el("span", "chip chip-status", STATUS[project.status]));
      const meta = el("p", "meta", [project.engineLabel, project.platform, project.company, project.year].filter(Boolean).join(" · "));
      const parts: HTMLElement[] = [...heading(project.engineLabel || ENGINE_NAME[project.engines[0]], project.name, color), chips, meta];

      const role = el("p", "role");
      role.append(el("span", "label", "My role"), project.role || "Details for this project are coming soon.");
      const layers: HTMLElement[] = [];
      if (project.stack.length) {
        const stack = el("ol", "layer-stack");
        for (const [layer, what] of project.stack) {
          const item = el("li");
          item.append(el("span", "layer-name", layer), el("span", undefined, what));
          stack.append(item);
        }
        layers.push(el("p", "label", "How I built it"), stack);
      }

      if (blueprint) {
        parts.push(role, ...(layers.length ? layers : [el("p", "muted", "Build layers for this project are coming soon.")]));
      } else {
        parts.push(media(project), role, el("p", undefined, project.summary || "Details for this project are coming soon."));
        if (project.built.length) parts.push(el("p", "label", "What I built"), list(project.built));
        parts.push(...layers);
        if (project.tags.length) parts.push(list(project.tags, "tags"));
      }
      showPanel(parts, color);
    },
    showAbout() {
      const actionsRow = el("div", "cta-row");
      actionsRow.append(linkButton("GitHub", profile.github, true), linkButton("LinkedIn", profile.linkedin));
      showPanel(
        [
          ...heading("About me", profile.name, "#ffd24a"),
          el("p", "meta", profile.title),
          el("p", undefined, profile.bio),
          el("p", "label", "At a glance"),
          list([`${profile.yearsExperience}+ years of experience`, `${total} projects in this city`, ...profile.education.map((e) => `${e.degree}, ${e.school}`)]),
          el("p", "label", "Skills"),
          list(profile.expertise.map((box) => `${box.title}: ${box.bullets[0]}`)),
          el("p", "label", "Recent roles"),
          list(profile.experience.slice(0, 3).map((job) => `${job.role} · ${job.company} (${job.period})`)),
          actionsRow,
        ],
        "#ffd24a",
      );
    },
    showContact() {
      const actionsRow = el("div", "cta-row");
      actionsRow.append(linkButton("GitHub", profile.github, true), linkButton("LinkedIn", profile.linkedin));
      showPanel([...heading("Contact", "Let's build your next game", "#2fbf63"), el("p", undefined, `Reach out to ${profile.name} on GitHub or LinkedIn.`), actionsRow], "#2fbf63");
    },
    hidePanel() {
      if (card.hidden) return false;
      video?.pause();
      video = null;
      card.hidden = true;
      root.classList.remove("has-panel");
      cardInner.replaceChildren();
      return true;
    },
    showTour(text: string | null) {
      tourBar.hidden = text === null;
      root.classList.toggle("is-touring", text !== null);
      if (text !== null) tourText.textContent = text;
    },
    showToast(text: string, buttons: ActionButton[], seconds = 9) {
      window.clearTimeout(toastTimer);
      const row = el("div", "cta-row");
      row.append(
        ...buttons.map((b) => {
          const node = actionNode(b);
          node.addEventListener("click", () => (toast.hidden = true));
          return node;
        }),
      );
      toast.replaceChildren(el("p", undefined, text), row);
      toast.hidden = false;
      toastTimer = window.setTimeout(() => (toast.hidden = true), seconds * 1000);
    },
    showHint(text: string | null, onTry?: () => void, onDismiss?: () => void) {
      if (text === null) {
        hint.hidden = true;
        menuButton.classList.remove("is-hinted");
        return;
      }
      const row = el("div", "cta-row");
      row.append(
        button("Try it", "btn btn-primary", () => onTry?.()),
        button("Not now", "btn btn-ghost", () => onDismiss?.()),
      );
      hint.replaceChildren(el("p", undefined, text), row);
      const rect = menuButton.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      hint.style.top = `${rect.bottom - rootRect.top + 12}px`;
      hint.style.right = `${Math.max(12, rootRect.right - rect.right)}px`;
      hint.hidden = false;
      menuButton.classList.add("is-hinted");
    },
    get hintOpen() {
      return !hint.hidden;
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
  ctx.fillStyle = "rgba(7,10,18,0.9)";
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
