import type { DriveInput } from "./vehicle";

type Action = "open" | "nextView" | "toggleLook";

const KEYS = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  boost: ["ShiftLeft", "ShiftRight"],
};

const ACTIONS: Record<string, Action> = { KeyE: "open", KeyV: "nextView", KeyB: "toggleLook" };
const DRIVE_CODES = new Set(Object.values(KEYS).flat());

export function createInput(onAction: (action: Action) => void, isActive: () => boolean) {
  const held = new Set<string>();
  const touch = { up: false, down: false, left: false, right: false };
  let onDriveKey: (() => void) | null = null;

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

  function keydown(event: KeyboardEvent) {
    if (!isActive() || typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (DRIVE_CODES.has(event.code)) {
      held.add(event.code);
      if (event.code.startsWith("Arrow")) event.preventDefault();
      onDriveKey?.();
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

  function blur() {
    held.clear();
    Object.assign(touch, { up: false, down: false, left: false, right: false });
  }

  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);
  window.addEventListener("blur", blur);

  const any = (codes: string[]) => codes.some((c) => held.has(c));

  return {
    touch,
    clear: blur,
    set onDriveKey(fn: (() => void) | null) {
      onDriveKey = fn;
    },
    read(): DriveInput {
      const up = any(KEYS.up) || touch.up;
      const down = any(KEYS.down) || touch.down;
      const left = any(KEYS.left) || touch.left;
      const right = any(KEYS.right) || touch.right;
      return { throttle: Number(up) - Number(down), steer: Number(left) - Number(right), boost: any(KEYS.boost) };
    },
  };
}

export type Input = ReturnType<typeof createInput>;
