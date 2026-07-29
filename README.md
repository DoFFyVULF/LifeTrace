# 🗺️ Life Trace

A visual map journal. Drop pins on a map, attach photos, link them into routes — a travel diary that's actually fun to look at.

Built with Next.js, PostgreSQL, MapLibre GL. No API keys needed for the map.

-----

## Table of Contents

* [What's inside](#whats-inside)
* [Stack](#stack)
* [Getting started](#getting-started)
* [Project structure](#project-structure)
* [License](#license)

-----

## What's inside

**Map.** Four styles: light, dark, satellite, vintage. Switch on the fly, markers stay put. Vivid mode for extra color.

**Memories.** A pin on the map with a title, date, color, icon. Add photos — they show up as thumbnails around the pin. Drag-and-drop with GPS extraction from EXIF.

**Threads.** Link memories together — the map draws a route between them. Colors blend automatically, lines are animated.

**Achievements.** 30 of them in 8 categories. First steps, geography, photos, style, you name it. Get 10 — unlock the Wanderer title, 20 — Chronicler, 30 — Pathfinder. Pick your title in the profile.

**Profile.** Avatar, stats, a timeline by year. Language toggle — EN/RU.

> [!NOTE]
> The map works without any API keys. Tile sources are open and free.

-----

## Stack

- **Next.js 16** — App Router, Turbopack
- **React 19** + Tailwind CSS 4
- **MapLibre GL 6** — open-source Mapbox GL fork
- **PostgreSQL + Prisma 7** — database
- **Framer Motion** — animations
- **exifr, heic2any** — photo processing and EXIF

-----

## Getting started

```bash
git clone https://github.com/DoFFyVULF/LifeTrace.git
cd life-trace
npm install
```

You'll need PostgreSQL. Create a database, copy `.env.example` to `.env`, and set `DATABASE_URL`.

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

-----

## Project structure

```
app/
├── (dashboard)/        — map (main page)
├── achievements/       — achievements page
├── memory/[id]/        — single memory view
├── memories/[year]/[month]/ — memories by month
├── profile/            — profile
├── search/             — search
└── api/                — all API routes

features/map/           — map components
shared/                 — shared components, i18n
lib/achievements/       — achievement definitions + checkers
prisma/schema.prisma    — database schema
```

DB models: Memory, MemoryThread, Collection, UnlockedAchievement, Profile (singleton).

-----
