import "@fontsource/russo-one/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/700.css";
import "./styles/tokens.css";
import "./styles/simple.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll<HTMLButtonElement>("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.scroll ?? "");
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
});

const filterButtons = document.querySelectorAll<HTMLButtonElement>("[data-filter]");
const cards = document.querySelectorAll<HTMLElement>("[data-filter-grid] .card");

function applyFilter(filter: string) {
  filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
  cards.forEach((card) => {
    const engines = card.dataset.engines?.split(" ") ?? [];
    const status = card.dataset.status ?? "";
    const show =
      filter === "all" ||
      (filter === "coming-soon" ? status === "in-development" : engines.includes(filter));
    card.hidden = !show;
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => applyFilter(button.dataset.filter ?? "all"));
});
