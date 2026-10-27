import type { Option } from "./ui";

const TRIED_KEY = "maaz.tried";
const VISITED_KEY = "maaz.visited";

const HINTS: [Option, string][] = [
  ["spectate", "See the whole city from above. Try Spectate: drag to orbit and click any building."],
  ["simple", "Prefer no 3D? Simple view lists every project on one page."],
  ["blueprint", "Curious how each game is built? Switch to Blueprint to see the build layers and my qualifications."],
  ["drive", "Want to explore it like a game? Try Drive and cruise to each building."],
  ["night", "Back to the lit city? Switch to Night."],
];

const FIRST_DELAY = 6;
const SHOW_FOR = 11;
const BETWEEN = 25;
const AFTER_CHANGE = 12;

function load(key: string) {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set<string>();
  }
}

function save(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // storage can be blocked; the session still works without it
  }
}

export function createVisits() {
  const visited = load(VISITED_KEY);
  return {
    get count() {
      return visited.size;
    },
    // true when this id is new
    add(id: string) {
      if (visited.has(id)) return false;
      visited.add(id);
      save(VISITED_KEY, visited);
      return true;
    },
  };
}

export function createHints(options: {
  show(text: string, onTry: () => void, onDismiss: () => void): void;
  hide(): void;
  apply(option: Option): void;
  canShow(): boolean;
  setUntried(untried: Set<Option>): void;
}) {
  const tried = load(TRIED_KEY) as Set<Option>;
  const dismissed = new Set<Option>();
  let countdown = FIRST_DELAY;
  let visible: Option | null = null;
  let visibleFor = 0;
  let started = false;

  const untried = () => new Set(HINTS.map(([o]) => o).filter((o) => !tried.has(o)));

  function hide() {
    if (visible === null) return;
    visible = null;
    options.hide();
  }

  function markTried(option: Option) {
    if (!tried.has(option)) {
      tried.add(option);
      save(TRIED_KEY, tried);
      options.setUntried(untried());
    }
    if (visible === option) hide();
    if (started) countdown = Math.min(countdown, AFTER_CHANGE);
  }

  function next() {
    let candidates = HINTS.filter(([o]) => !tried.has(o) && !dismissed.has(o));
    if (candidates.length === 0 && untried().size > 0) {
      dismissed.clear();
      candidates = HINTS.filter(([o]) => !tried.has(o));
    }
    return candidates[0] ?? null;
  }

  options.setUntried(untried());

  return {
    markTried,
    hide,
    start() {
      started = true;
      countdown = FIRST_DELAY;
    },
    tick(dt: number, currentView: Option) {
      if (!started) return;
      if (visible !== null) {
        visibleFor += dt;
        if (visibleFor > SHOW_FOR || !options.canShow()) {
          hide();
          countdown = BETWEEN;
        }
        return;
      }
      countdown -= dt;
      if (countdown > 0 || !options.canShow()) return;
      const hint = next();
      countdown = BETWEEN;
      if (!hint) return;
      const [option, text] = hint;
      // the Drive hint only makes sense while the visitor is somewhere else
      if (option === "drive" && currentView === "drive") {
        markTried("drive");
        return;
      }
      visible = option;
      visibleFor = 0;
      options.show(
        text,
        () => {
          hide();
          options.apply(option);
        },
        () => {
          dismissed.add(option);
          hide();
        },
      );
    },
  };
}
