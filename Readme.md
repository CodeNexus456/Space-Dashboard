# 🚀 Space Dashboard — Explore the Universe in Real Time

A fully responsive, dark space-themed dashboard built with **HTML5, CSS3, and vanilla JavaScript** (no frameworks, no build step). It pulls live data from public space APIs into a single glassmorphism UI.

## Features

- **Animated canvas starfield** with parallax nebula glow, plus a lightweight animated hero (orbiting planet, floating rocket).
- **NASA APOD** — today's Astronomy Picture of the Day with HD link, download, copy-URL, share, and fullscreen preview.
- **ISS Live Tracker** — latitude/longitude/altitude/velocity/visibility on a custom equirectangular grid, auto-refreshing every 5 seconds, with a "Locate Me" distance comparison.
- **SpaceX Launches** — next upcoming missions with rocket/launchpad names, live countdown timers, and webcast links.
- **Space News** — latest articles with search and category filter chips (NASA / SpaceX / Astronomy / ISS / Mars).
- **Mars Rover Gallery** — latest Curiosity & Perseverance frames in a responsive grid with fullscreen preview.
- **Space Facts** — animated statistic counters.
- Skeleton loading states, inline error handling with retry, session-based API caching with stale-data fallback, and an offline banner.
- Fully responsive (mobile / tablet / desktop), sticky navbar with scroll-spy, scroll-reveal animations, and a back-to-top button.

## APIs used

| Data | Source |
|---|---|
| Astronomy Picture of the Day | [api.nasa.gov/planetary/apod](https://api.nasa.gov/) |
| Mars Rover Photos | [api.nasa.gov/mars-photos](https://api.nasa.gov/) |
| ISS position/telemetry | [WhereTheISS.at](https://wheretheiss.at/w/developer) (fallback: [Open Notify](http://open-notify.org/)) |
| Upcoming launches, rockets, launchpads | [SpaceX API v4](https://github.com/r-spacex/SpaceX-API) |
| Space news | [Spaceflight News API v4](https://spaceflightnewsapi.net/) |

All NASA endpoints use the public `DEMO_KEY`, which is rate-limited (30 requests/hour, 50/day per IP). For production use, grab a free personal key at **api.nasa.gov** and replace `DEMO_KEY` in `js/nasa.js` and `js/mars.js`.

## Running it

No build step required — it's static files.

```bash
# from the project root
python3 -m http.server 8080
# then open http://localhost:8080
```

Or open `index.html` directly in a browser (some browsers restrict `fetch` on `file://` — a local server is recommended).

## Folder structure

```
space-dashboard/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js       # starfield, nav, scroll reveal, counters, toast, cache, lightbox
│   ├── nasa.js       # APOD
│   ├── iss.js        # ISS tracker
│   ├── spacex.js      # Launches
│   ├── news.js        # Space news
│   └── mars.js        # Mars rover gallery
├── assets/
│   ├── images/
│   └── icons/
└── README.md
```

## Notes & limitations

- The ISS map is a stylized lat/long grid rather than literal map tiles, keeping the dashboard dependency-free and fast — the marker position is mathematically accurate (equirectangular projection).
- `DEMO_KEY` NASA rate limits mean repeated hard-refreshing of APOD/Mars sections may briefly return errors; the dashboard falls back to cached data automatically when that happens.
- Some public APIs (e.g. Open Notify) occasionally have downtime; the dashboard is built to degrade gracefully with retry buttons and cached fallbacks rather than break.