import type { SiteProject } from "../simple/render";

export const PITCH = 46;
export const PLOT = 32;
export const FOOTPRINT = 22;
export const LAND_MARGIN = 36;

export type Style = "tower" | "midrise" | "mall" | "courtyard" | "stepped";
export type District = SiteProject["district"];

export const DISTRICTS: District[] = ["team", "unreal", "mobile", "sim"];
export const DISTRICT_NAME: Record<District, string> = {
  team: "Team projects",
  unreal: "Unreal and personal",
  mobile: "Mobile and web",
  sim: "Sim street",
};
export type LotKind = "project" | "about" | "contact" | "plaza" | "park";

export interface Lot {
  kind: LotKind;
  index: number;
  col: number;
  row: number;
  x: number;
  z: number;
  project?: SiteProject;
  height: number;
  style: Style;
}

export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const STYLES: Style[] = ["midrise", "mall", "courtyard", "stepped", "midrise"];

function heightFor(project: SiteProject) {
  const jitter = hash(project.id);
  if (project.featured) return 40 + jitter * 6;
  if (project.status === "released") return 20 + jitter * 12;
  if (project.status === "in-development") return 15 + jitter * 6;
  return 12 + jitter * 8;
}

function styleFor(project: SiteProject, height: number): Style {
  if (project.featured || height > 38) return "tower";
  return STYLES[Math.floor(hash(`${project.id}:style`) * STYLES.length)];
}

export function layoutCity(projects: SiteProject[]) {
  const needed = projects.length + 3;
  const size = Math.max(4, Math.ceil(Math.sqrt(needed)));
  const centre = (size - 1) / 2;

  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({ row, col, x: (col - centre) * PITCH, z: (row - centre) * PITCH });
    }
  }

  // the plaza sits front-centre, nearest the default camera
  const plazaCell = cells.find((c) => c.row === size - 1 && c.col === Math.floor(size / 2))!;
  const remaining = cells.filter((c) => c !== plazaCell);

  // About and Contact flank the plaza
  const byPlazaDistance = [...remaining].sort(
    (a, b) => Math.hypot(a.col - plazaCell.col, a.row - plazaCell.row) - Math.hypot(b.col - plazaCell.col, b.row - plazaCell.row),
  );
  const aboutCell = byPlazaDistance[0];
  const contactCell = byPlazaDistance[1];

  // districts fill the city from the back, row by row; featured projects lead their district
  const projectCells = remaining.filter((c) => c !== aboutCell && c !== contactCell).sort((a, b) => a.row - b.row || a.col - b.col);

  const ordered = [...projects].sort(
    (a, b) =>
      DISTRICTS.indexOf(a.district) - DISTRICTS.indexOf(b.district) ||
      Number(b.featured) - Number(a.featured) ||
      (a.order ?? 999) - (b.order ?? 999) ||
      a.name.localeCompare(b.name),
  );
  const lots: Lot[] = [];
  const districtStarts: { district: District; lot: Lot }[] = [];

  ordered.forEach((project, i) => {
    const cell = projectCells[i];
    const height = heightFor(project);
    const lot: Lot = { kind: "project", index: lots.length, ...cell, project, height, style: styleFor(project, height) };
    lots.push(lot);
    if (!districtStarts.some((d) => d.district === project.district)) districtStarts.push({ district: project.district, lot });
  });

  lots.push({ kind: "about", index: lots.length, ...aboutCell, height: 16, style: "midrise" });
  lots.push({ kind: "contact", index: lots.length, ...contactCell, height: 46, style: "tower" });
  lots.push({ kind: "plaza", index: lots.length, ...plazaCell, height: 0, style: "midrise" });
  for (const cell of projectCells.slice(ordered.length)) {
    lots.push({ kind: "park", index: lots.length, ...cell, height: 0, style: "midrise" });
  }

  return { lots, size, span: size * PITCH, districtStarts };
}
