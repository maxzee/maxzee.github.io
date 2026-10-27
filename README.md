# Maaz Online

Portfolio site for Muhammad Maaz Umer. A full one-page portfolio, plus the same projects as a 3D city you can drive, spectate or tour.

- **1-page site:** pre-rendered HTML, works without JavaScript.
- **3D city:** three.js, loaded only when a visitor opens it (`#city`, or `#<project-id>` for a specific project).

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the static site to `dist/`. `npm run preview` serves that build.

## Add or edit a project

Each project is a folder under `content/projects/<engine>/<id>/`, where `<engine>` is `unity` or `unreal`:

```
content/projects/unity/my-game/
├── info.md      # frontmatter below
├── media/       # source clips; not committed
└── docs/        # reference notes; never committed or published
```

`info.md` frontmatter:

```yaml
---
id: my-game                 # lowercase, unique; used in #my-game links
name: My Game
engines: [unity]            # unity | unreal | other; list both for a project built in both
engineLabel: Unity 3D
platform: Android, iOS
company: ""
year: ""
status: released            # released | in-development | prototype
role: Lead developer
summary: One or two sentences.
tags: [Unity 3D, C#]        # up to 4 show on cards
built:                      # only your own work
  - Thing you built
stack:                      # "How I built it" layers, top first
  - [Gameplay, What you did]
district: mobile            # team | unreal | mobile | sim (which street it sits on)
featured: false             # featured projects get towers and the Selected work section
visibility: "yes"           # yes | footage-only | pending | no
media:
  video: media/clip.mp4     # source clip for the preview
  start: 12                 # optional: second to cut the preview from
---
```

The build fails with a clear message if a required field is missing or wrong. Empty fields show "coming soon" copy on the site rather than blanks.

## Footage

Raw clips stay out of git. The media script cuts a 6-second silent preview and a poster for every project that has `media.video`:

```bash
npm run media
```

It needs [ffmpeg](https://ffmpeg.org/). If ffmpeg isn't on your `PATH`, set `FFMPEG` to its full path. Outputs go to `public/projects/<id>/preview.mp4` and `poster.webp`, and these are committed. Add `-- --force` to regenerate existing ones.

## Your profile

`content/me/profile.md` holds your name, title, bio, links, experience, education and skills. The CV PDF and other files in `content/me/` are ignored by git on purpose, because the CV contains personal details. Add a public CV and set `cvPath` when you have one.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. In the repository settings, set Pages to deploy from **GitHub Actions**.

## Project layout

```
scripts/         content build, prerender and media scripts
src/simple/      the 1-page site renderer (runs at build time)
src/world/       the 3D city (lazy-loaded)
src/styles/      tokens, page styles, city styles
reference/       original build spec and prototype (kept locally, not committed)
```
