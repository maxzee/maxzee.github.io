import "./styles/tokens.css";
import projects from "./generated/projects.json";
import profile from "./generated/profile.json";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("#app missing");

const header = document.createElement("h1");
header.textContent = profile.name;

const title = document.createElement("p");
title.textContent = profile.title;

const list = document.createElement("ul");
for (const project of projects) {
  const item = document.createElement("li");
  item.textContent = `${project.name} — ${project.engineLabel || "Details coming soon"}`;
  list.append(item);
}

app.append(header, title, list);
