import type { DriveInput } from "./vehicle";

export type Action = "open" | "nextView" | "toggleLook" | "fly";

const KEYS = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  boost: ["ShiftLeft", "ShiftRight"],
  climb: ["Space"],
  descend: ["KeyC"],
};

const ACTIONS: Record<string, Action> = { KeyE: "open", KeyV: "nextView", KeyB: "toggleLook", KeyF: "fly" };
const DRIVE_CODES = new Set([...KEYS.up, ...KEYS.down, ...KEYS.left, ...KEYS.right]);
const HELD_CODES = new Set(Object.values(KEYS).flat());

export function createInput(onAction: (action: Action) => void, isActive: () => boolean) {
  const held = new Set<string>();
  const touch = { up: false, down: false, left: false, right: false, climb: false, descend: false };
  let onDriveKey: (() => void) | null = null;

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

  function keydown(event: KeyboardEvent) {
    if (!isActive() || typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    // a focused button handles Space itself
    if (event.code === "Space" && event.target instanceof HTMLButtonElement) return;
    if (HELD_CODES.has(event.code)) {
      held.add(event.code);
      if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
      if (DRIVE_CODES.has(event.code)) onDriveKey?.();
      return;
    }
    const action = ACTIONS[event.code];
    if (action && !event.repeat) {
      event.preventDefault();
      onAction(action);
    }
  }

  function keyup(event: KeyboardEvent) {
    held.delete(event.code);
  }

  function clear() {
    held.clear();
    for (const key of Object.keys(touch) as (keyof typeof touch)[]) touch[key] = false;
  }

  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", clear);

  const any = (codes: string[]) => codes.some((c) => held.has(c));

  return {
    touch,
    clear,
    set onDriveKey(fn: (() => void) | null) {
      onDriveKey = fn;
    },
    read(): DriveInput {
      const up = any(KEYS.up) || touch.up;
      const down = any(KEYS.down) || touch.down;
      const left = any(KEYS.left) || touch.left;
      const right = any(KEYS.right) || touch.right;
      const climb = any(KEYS.climb) || touch.climb;
      const descend = any(KEYS.descend) || touch.descend;
      return {
        throttle: Number(up) - Number(down),
        steer: Number(left) - Number(right),
        boost: any(KEYS.boost),
        climb: Number(climb) - Number(descend),
      };
    },
  };
}

export type Input = ReturnType<typeof createInput>;
