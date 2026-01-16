# InfraGhost AI 👻

A lightweight, full-stack system that verifies the real-world usability of public infrastructure using Google Gemini Vision. Users submit photos and feedback; the backend analyzes them and computes a Ghost Score to classify assets as InfraGhost, Partial, or Functional. The app includes a submission form, an interactive map, and an authority dashboard with PDF export.

---

## Highlights
- Photo upload with auto-location and AI-powered analysis
- Ghost Score classification with clean, responsive UI
- Interactive Mapbox visualization of reports
- Authority summary with PDF export (simple mode enabled)
- No build step; ES modules + custom CSS
- Safe API key handling via `.env`

---

## Tech Stack
- Backend: Node.js, Express, `dotenv`
- AI: `@google/generative-ai` (Google Gemini)
- Frontend: HTML, ES6 modules, custom CSS
- Maps: Mapbox GL JS
- PDF: html2pdf.js
- Storage: Local `reports.json` (MVP)

---

## Project Structure

InfraGhost AI/
- server.js (Express backend + API routes)
- gemini.js (Gemini Vision integration)
- package.json (dependencies + scripts)
- .env (API keys; not committed)
- .gitignore (excludes `.env`, `reports.json`, etc.)
- reports.json (local store; auto-created)
- public/
  - index.html (submission form; module script)
  - map.html (interactive map)
  - authority.html (authority summary + PDF)
  - css/
    - main.css (global styles)
    - index-styles.css
    - map-styles.css
    - authority-styles.css
  - js/
    - index.js (submission flow)
    - map.js (map rendering)
    - authority.js (dashboard + PDF)

---

## Setup

### Prerequisites
- Node.js 14+
- Google Gemini API key (https://ai.google.dev/)
- Mapbox public token (https://account.mapbox.com/)

### Install & Run

```bash
npm install

# Create .env with these keys
GEMINI_API_KEY=your_gemini_api_key
MAPBOX_TOKEN=your_mapbox_public_token
GEMINI_MODEL=gemini-2.5-flash
PORT=5000

npm start
# Visit http://localhost:5000
```

---

## Security
- Never hardcode `GEMINI_API_KEY` or secrets in source code
- `.gitignore` excludes `.env` and `reports.json`
- Backend validates missing keys early and exits
- `/api/config` returns only the public Mapbox token

---

## API

- POST /api/submit-report
  - Body: `{ infra_type, comment, latitude, longitude, image_base64 }`
  - Returns: `{ success, report }` with analysis and classification

- GET /api/reports
  - Returns: `[]` of reports (MVP JSON store)

- GET /api/stats
  - Returns: aggregated counts, top failing types, affected locations

- GET /api/config
  - Returns: `{ mapboxToken }` (public token expected)

- GET /api/health
  - Returns: `{ status: "ok" }`

---

## Flow Overview
1) User uploads a photo and feedback on the index page
2) Backend calls Google Gemini Vision with the image and context
3) Response parsed as JSON, Ghost Score computed: `100 - usability_score`
4) Asset classified: InfraGhost (≥60), Partial (30–60), Functional (<30)
5) Report saved to `reports.json` and visible on the map and dashboard

---

## Frontend Pages
- Index (Submission)
  - Upload image, auto-location, type selection, short comment
  - Submits to `/api/submit-report` and shows analysis

- Map (Visualization)
  - Loads reports, displays markers by classification (red/yellow/green)
  - Popups show summary and coordinates

- Authority (Summary + PDF)
  - Fetches stats, shows metrics, failing types, locations
  - Download PDF (current mode: simplified, minimal options)

---

## PDF Export
- Default mode can be high-contrast with careful typography and page breaks
- Current mode is simplified: minimal html2pdf options for testing
- Switch options in `public/js/authority.js` if needed

---

## Troubleshooting
- Missing Mapbox token: `/api/config` returns empty; set `MAPBOX_TOKEN` in `.env`
- Missing Gemini key: server exits with an error; set `GEMINI_API_KEY`
- Large images: Base64 upload is supported; keep sizes reasonable for MVP
- CORS: Express has `cors` enabled; backend and frontend share origin

---

## Pre-Push Checklist
- `.env` exists locally and is not committed
- `GEMINI_API_KEY` and `MAPBOX_TOKEN` configured
- `npm install` completes without errors
- `npm start` runs the server
- Test the app: submit, map view, PDF download
- No errors in browser console or server logs

---

## License
MIT License. See LICENSE.

## Author
Jyot Shah — open issues here or email: jyotshah1595@gmail.com
