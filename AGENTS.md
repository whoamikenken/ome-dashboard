# OME Dashboard — Project Root

## Stack
- **Frontend:** Vue 3 (Composition API) + Vite 6 + TypeScript 5.8 + Tailwind CSS 4
- **Charts:** Chart.js / vue-chartjs
- **Maps:** Leaflet (for geographic stream origin visualization)
- **API Client:** Axios (typed service layer for OME REST API)

## Project Structure
```
ome-dashboard/
├── AGENTS.md              ← This file (project overview)
├── tasks.md               ← Implementation plan & task backlog
├── frontend/              ← Vue 3 SPA
│   ├── src/
│   │   ├── api/           ← OME API client (typed services)
│   │   ├── components/    ← Reusable UI components
│   │   ├── composables/   ← Vue composables (useOmeStats, etc.)
│   │   ├── pages/         ← Route pages
│   │   ├── stores/        ← Pinia stores
│   │   ├── types/         ← TypeScript types/interfaces
│   │   ├── utils/         ← Helpers (formatters, etc.)
│   │   └── router/        ← Vue Router config
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
└── scripts/
    └── dev-start.sh       ← Local dev server launcher
```

## OvenMediaEngine REST API v1
- **Docs:** https://ovenmedialabs.com/docs/ome/rest-api
- **Base URL:** `http://{host}:8081/v1` (HTTP) or `https://{host}:8082/v1` (TLS)
- **Auth:** HTTP Basic Auth
- **OpenAPI Spec:** `api/ome.yml` in the OME repo
- **Sample Call:**
  ```bash
  curl --location 'http://192.168.88.202:8081/v1/stats/current/vhosts/default/apps/app' \
    --header 'Content-Type: application/json' \
    --header 'Authorization: Basic bnR0VG9rZW4='
  ```
- **Key Endpoints:**
  - `GET /vhosts` — List virtual hosts
  - `GET /vhosts/{vhost}` — VHost details
  - `GET /vhosts/{vhost}/apps` — List applications
  - `GET /vhosts/{vhost}/apps/{app}` — App details
  - `GET /vhosts/{vhost}/apps/{app}/streams` — List streams
  - `GET /vhosts/{vhost}/apps/{app}/streams/{stream}` — Stream details
  - `POST /vhosts/{vhost}/apps/{app}:startPush` — Start push publishing
  - `POST /vhosts/{vhost}/apps/{app}:stopPush` — Stop push publishing
  - `POST /vhosts/{vhost}/apps/{app}:startRecord` — Start recording
  - `POST /vhosts/{vhost}/apps/{app}:stopRecord` — Stop recording
  - `GET /stats/current/vhosts/{vhost}` — VHost statistics
  - `GET /stats/current/vhosts/{vhost}/apps/{app}` — App statistics
  - `GET /stats/current/vhosts/{vhost}/apps/{app}/streams/{stream}` — Stream statistics

## Quick Start (local development)
```bash
# Install frontend deps
cd frontend && npm install

# Dev server
npm run dev
```

## Environment Variables
```
VITE_OME_API_BASE=http://localhost:8081/v1
VITE_OME_API_USER=admin
VITE_OME_API_PASS=password
```
