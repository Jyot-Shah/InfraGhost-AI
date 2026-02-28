# InfraGhost AI 👻

A full-stack infrastructure reality verification system powered by Google Gemini Vision AI. Citizens submit geotagged photos of public infrastructure; the AI analyzes usability and computes a Ghost Score to classify assets as **InfraGhost**, **Partial**, or **Functional**. Includes a submission form, interactive Mapbox map, and an authority dashboard with PDF export.

---

## Highlights

- Photo upload with drag-and-drop, auto-location, and AI-powered analysis
- Ghost Score classification (0–100) with animated, responsive UI
- Interactive Mapbox GL JS map with color-coded markers and popups
- Authority dashboard with executive summary, metrics, and PDF export
- No build step — vanilla ES6 modules + custom CSS
- Hardened security: Helmet CSP, rate limiting, XSS prevention, input validation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend | Express.js |
| Security | `helmet` (HTTP headers + CSP), `express-rate-limit`, `cors` |
| AI | `@google/generative-ai` (Google Gemini Vision) |
| Config | `dotenv` |
| Frontend | HTML5, ES6 modules, custom CSS |
| Maps | Mapbox GL JS v2.15 |
| PDF | html2pdf.js (CDN) |
| Storage | File-based `reports.json` |
| Deployment | Render.com (`render.yaml`) |
| Dev Tools | `nodemon` |

---

## Project Structure

```
InfraGhost AI/
├── server.js              Express backend + API routes + security middleware
├── gemini.js              Gemini Vision integration + token estimation
├── package.json           Dependencies + scripts
├── render.yaml            Render.com deployment config
├── .env                   API keys (not committed)
├── .gitignore             Excludes .env, reports.json, node_modules, etc.
├── reports.json           Local JSON store (auto-created)
└── public/
    ├── index.html         Submission form with drag-and-drop upload
    ├── map.html           Interactive map with sidebar
    ├── authority.html     Authority dashboard + PDF export
    ├── css/
    │   ├── main.css       Global styles, animations, utilities
    │   ├── index-styles.css
    │   ├── map-styles.css
    │   └── authority-styles.css  (includes PDF export overrides)
    └── js/
        ├── utils.js       Shared utilities: DOM, API, Notify, escapeHTML
        ├── index.js       Submission page logic
        ├── map.js         Map rendering + markers + sidebar
        └── authority.js   Dashboard + stats + PDF download
```

---

## Setup

### Prerequisites

- Node.js 14+
- Google Gemini API key — https://ai.google.dev/
- Mapbox public token — https://account.mapbox.com/

### Install & Run

```bash
npm install

# Create .env file
GEMINI_API_KEY=your_gemini_api_key
MAPBOX_TOKEN=your_mapbox_public_token
GEMINI_MODEL=gemini-2.5-flash
PORT=5000

# Production
npm start

# Development (auto-restart with nodemon)
npm run dev

# Visit http://localhost:5000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `MAPBOX_TOKEN` | Yes | Mapbox public access token |
| `GEMINI_MODEL` | No | Gemini model name (default: `gemini-2.5-flash`) |
| `PORT` | No | Server port (default: `5000`) |
| `NODE_ENV` | No | Set to `production` for stricter CORS |
| `ALLOWED_ORIGIN` | No | Allowed CORS origin in production |

---

## Security

- **Helmet** — sets security headers including a full Content-Security-Policy (CSP) allowing only trusted sources (Mapbox, Google Fonts, cdnjs)
- **Rate limiting** — 100 requests/15 min on all API routes; 20/15 min on `/api/submit-report` to protect Gemini API credits
- **Input validation** — `infra_type` checked against an allowlist (`water`, `toilet`, `streetlight`, `ramp`); coordinates range-validated; comments HTML-stripped and length-capped (200 chars)
- **XSS prevention** — all user-generated content escaped via `escapeHTML()` before DOM injection in map popups, sidebar, and dashboard
- **Error sanitization** — internal error messages and stack traces are never leaked to clients
- **CORS** — restricted to specified origin in production; limited to GET/POST methods
- **File lock** — prevents concurrent write corruption on `reports.json`
- **API keys** — stored in `.env`, excluded from git via `.gitignore` and `.renderignore`
- **No hardcoded secrets** — `GEMINI_API_KEY` loaded from `process.env`; `/api/config` returns only the public Mapbox token

---

## API

### `POST /api/submit-report` *(rate-limited: 20/15 min)*

Submit an infrastructure report for AI analysis.

- **Body:** `{ infra_type, comment, latitude, longitude, image_base64 }`
- **Validation:** type must be in `[water, toilet, streetlight, ramp]`; coordinates must be valid; comment sanitized
- **Returns:** `{ success, report }` with analysis and classification

### `GET /api/reports`

Returns all saved reports from `reports.json`.

### `GET /api/stats`

Returns aggregated statistics: totals, ghost counts, top failing infrastructure types, most affected locations.

### `GET /api/config`

Returns `{ mapboxToken }` — the public Mapbox token for the frontend map.

### `GET /api/health`

Returns `{ status: "ok" }`.

---

## Flow Overview

1. User uploads a photo, selects infrastructure type, and adds a condition comment
2. Browser auto-detects GPS coordinates via Geolocation API
3. Backend validates all inputs, then sends the image to Google Gemini Vision
4. Gemini returns a structured JSON assessment (exists, usable, reason, usability_score)
5. Ghost Score computed: `100 - usability_score`
6. Asset classified: **InfraGhost** (≥ 60), **Partial** (30–60), **Functional** (< 30)
7. Report saved to `reports.json` and immediately visible on the map and dashboard

---

## Frontend Pages

### Index — Submission Form
- Drag-and-drop or click-to-upload image with preview
- Auto-detected GPS location display
- Infrastructure type dropdown + condition comment (with character counter)
- Full-screen loading overlay during AI analysis
- Animated success card showing exists/usable status, AI analysis, usability score, ghost score, and classification badge
- "View Infrastructure Map" link after submission

### Map — Interactive Visualization
- Mapbox GL JS map centered on report area
- Color-coded markers: 🔴 InfraGhost, 🟡 Partial, 🟢 Functional
- Clickable popups with report details (XSS-safe)
- Sidebar with stats summary and scrollable report list
- Click any report to fly to its location
- Auto-refreshes every 30 seconds

### Authority — Dashboard + PDF
- Executive summary with metric cards (total, ghosts, partial, functional)
- Ghost Rate percentage with visual emphasis
- Top failing infrastructure types ranked by ghost percentage
- Most affected geographic locations
- Classification criteria and recommended actions
- Methodology section
- One-click PDF download via html2pdf.js with dedicated print styles

---

## PDF Export

- Uses `html2pdf.js` with A4 portrait format
- Dedicated `.pdf-export` CSS class applies high-contrast, print-optimized styles
- Page break control on sections to prevent splitting
- Clean typography and forced colors for consistent PDF output

---

## License

MIT License. See [LICENSE](LICENSE).

## Author

[Jyot Shah](https://www.linkedin.com/in/jyotshah1/) — open issues here or email: jyotshah1595@gmail.com
