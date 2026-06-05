# OME Dashboard — Implementation Plan

## Overview
A system monitoring dashboard that connects to OvenMediaEngine (OME) via its REST API v1. Provides real-time visibility into streaming infrastructure: virtual hosts, applications, streams, push publishing, recordings, and server statistics.

**Target:** Single-page Vue 3 dashboard, no backend — talks directly to OME API.

---

## ✅ T1: Project Scaffold & API Client Layer (DONE)

**Objective:** Initialize the Vue 3 + Vite 6 + TypeScript + Tailwind CSS 4 project. Create the typed API client layer that wraps all OME REST API v1 endpoints.

**Files:**
- `frontend/src/types/ome.ts` — all OME API types
- `frontend/src/api/client.ts` — Axios instance with basic auth
- `frontend/src/api/vhosts.ts` — VHost endpoints
- `frontend/src/api/apps.ts` — Application endpoints
- `frontend/src/api/streams.ts` — Stream endpoints
- `frontend/src/api/stats.ts` — Statistics endpoints
- `frontend/src/api/push.ts` — Push publishing endpoints
- `frontend/src/api/record.ts` — Recording endpoints
- `frontend/src/env.d.ts` — Vite env type augmentation

---

## ✅ T2: Dashboard Layout & Navigation (DONE)

**Objective:** Build the app shell — sidebar navigation, top header, main content area with dark/light mode toggle.

**Files:**
- `frontend/src/App.vue` — root component
- `frontend/src/layouts/DashboardLayout.vue` — sidebar + header + router-view
- `frontend/src/components/Sidebar.vue` — nav menu
- `frontend/src/components/Header.vue` — top bar with theme toggle
- `frontend/src/router/index.ts` — route definitions
- `frontend/src/main.ts` — app entry point
- `frontend/src/style.css` — Tailwind + CSS variables

**Routes:**
- `/` → DashboardHome.vue
- `/vhosts` → VHostsPage.vue
- `/vhosts/:vhost` → VHostDetailPage.vue
- `/vhosts/:vhost/apps/:app` → AppDetailPage.vue
- `/streams` → StreamsPage.vue
- `/stats` → StatsPage.vue
- `/settings` → SettingsPage.vue

**Sidebar nav:** Dashboard, Virtual Hosts, Streams, Statistics, Settings

---

## ✅ T3: Dashboard Home — Overview Cards & Charts (DONE)

**Objective:** Main dashboard page with summary cards and real-time charts.

**Files:**
- `frontend/src/pages/DashboardHome.vue`
- `frontend/src/components/StatCard.vue`
- `frontend/src/components/charts/StreamsBarChart.vue`
- `frontend/src/components/charts/ActiveVsIdleChart.vue`
- `frontend/src/composables/useOmeStatus.ts`

**Cards:** Total VHosts, Total Apps, Total Streams, Active Streams, Push Jobs, Active Recordings

**Charts:** Stream count per vhost (bar), Active vs idle streams (donut)

**Data flow:** useOmeStatus polls GET /vhosts → apps → streams, aggregates into reactive state, auto-refresh every 10s.

---

## ✅ T4: Virtual Hosts Page (DONE)

**Objective:** List all virtual hosts with details, create/delete vhosts.

**Files:**
- `frontend/src/pages/VHostsPage.vue`
- `frontend/src/components/VHostCard.vue`
- `frontend/src/components/VHostForm.vue`
- `frontend/src/stores/vhosts.ts` — Pinia store

**Features:** Card grid, click to detail, create modal, delete with confirmation, search/filter.

---

## ✅ T5: VHost Detail Page (DONE)

**Objective:** View a single virtual host's configuration and its applications.

**Files:**
- `frontend/src/pages/VHostDetailPage.vue`
- `frontend/src/components/AppCard.vue`
- `frontend/src/components/AppForm.vue`

**Features:** VHost config display, application list, create/delete app, navigate to app detail.

---

## ✅ T6: Application Detail Page (DONE)

**Objective:** View application configuration, output profiles, and stream list.

**Files:**
- `frontend/src/pages/AppDetailPage.vue`
- `frontend/src/components/StreamTable.vue`
- `frontend/src/components/OutputProfileList.vue`
- `frontend/src/components/PushControls.vue`
- `frontend/src/components/RecordControls.vue`

**Features:** App config display, output profiles, stream table, start/stop push publishing, start/stop recording, delete stream, pull stream from URL.

---

## ✅ T7: Streams Overview Page (DONE)

**Objective:** Global view of all streams across all vhosts/apps.

**Files:**
- `frontend/src/pages/StreamsPage.vue`

**Features:** Flat table with vhost/app context, search/filter by name/vhost/app/source type, status badges, sortable columns.

---

## ✅ T8: Statistics & Monitoring Page (DONE)

**Objective:** Real-time server statistics with visualizations.

**Files:**
- `frontend/src/pages/StatsPage.vue`
- `frontend/src/components/charts/ThroughputChart.vue`
- `frontend/src/components/charts/ConnectionChart.vue`
- `frontend/src/components/StatsTable.vue`

**Features:** Per-vhost/app/stream stats, auto-refresh every 5s, time-series charts, export as JSON.

---

## ✅ T9: Settings Page (DONE)

**Objective:** Configure OME API connection parameters.

**Files:**
- `frontend/src/pages/SettingsPage.vue`
- `frontend/src/composables/useOmeConfig.ts`

**Features:** OME host/port/TLS, basic auth, connection test, localStorage persistence, theme toggle.

---

## ✅ T10: Dark/Light Mode & Polish (DONE)

**Objective:** Full dark/light mode support across all pages and components.

**Files:** Modified all page and component files.

**Features:** CSS variable system for all colors, dark class on html, localStorage persistence, smooth transitions.

---

## ✅ T11: Docker & Deployment (DONE)

**Objective:** Containerize the dashboard for production deployment.

**Files:**
- `frontend/Dockerfile` — multi-stage nginx build
- `frontend/nginx.conf` — SPA fallback config
- `frontend/public/assets/env.template.js` — runtime env injection
- `frontend/.dockerignore`
- `docker-compose.yml` — root level
- `.gitignore`

**Features:** Multi-stage build, runtime env vars via envsubst, gzip, cache headers, health check.

---

## ✅ T12: Tests (DONE)

**Objective:** Unit and component tests for critical paths.

**Files:**
- `frontend/src/__tests__/api/client.test.ts` — 7 tests
- `frontend/src/__tests__/stores/vhosts.test.ts` — 5 tests
- `frontend/src/__tests__/pages/DashboardHome.test.ts` — 3 tests

**Results:** 15/15 tests passing, vitest + @vue/test-utils + jsdom.

---

## ✅ T13: Streaming History & Logs Page (DONE)

**Objective:** Track and display stream session history with timestamps, duration, source IP, and status changes.

**Files:**
- Create: `frontend/src/pages/HistoryPage.vue`
- Create: `frontend/src/composables/useStreamHistory.ts`
- Create: `frontend/src/types/history.ts`
- Modify: `frontend/src/router/index.ts` — add /history route
- Modify: `frontend/src/components/Sidebar.vue` — add nav item

**Features:**
- Stream session tracking (start time, end time, duration, source IP, vhost, app, stream name)
- Store history in IndexedDB (no backend required)
- Filter by vhost, app, stream name, date range
- Status badges (live/completed/error)
- Sortable columns
- Export as CSV
- Auto-prune old entries (configurable retention)

---

## ✅ T14: Stream Publish Authentication (DONE)

**Objective:** Manage per-stream and per-application publish access tokens/keys.

**Files:**
- Create: `frontend/src/pages/AuthPage.vue`
- Create: `frontend/src/components/PublishTokenForm.vue`
- Create: `frontend/src/composables/usePublishAuth.ts`
- Modify: `frontend/src/router/index.ts` — add /auth route
- Modify: `frontend/src/components/Sidebar.vue` — add nav item

**Features:**
- Generate/manage publish access tokens per app or stream
- Create/revoke tokens with expiry dates
- Display current auth config from OME API (SignedPolicy, AdmissionWebhooks)
- Copy token to clipboard
- Token usage statistics

---

## T15: ABR & Output Profile Management

**Objective:** Visual ABR ladder editor — add, remove, and configure renditions per application.

**Files:**
- Create: `frontend/src/components/ABRLadderEditor.vue`
- Create: `frontend/src/components/OutputProfileForm.vue`
- Modify: `frontend/src/pages/AppDetailPage.vue` — integrate ABR editor
- Modify: `frontend/src/api/apps.ts` — add profile update methods

**Features:**
- Visual ABR ladder editor (add/remove renditions)
- Configure video bitrate, audio bitrate, resolution per rendition
- Save/apply output profiles to applications
- Preview of available renditions
- JSON editor view for advanced users

---

## T16: LLHLS / WebRTC Settings Panel

**Objective:** Configure low-latency streaming modes per application.

**Files:**
- Create: `frontend/src/components/LLHLSConfig.vue`
- Create: `frontend/src/components/WebRTCConfig.vue`
- Modify: `frontend/src/pages/AppDetailPage.vue` — integrate latency config

**Features:**
- Toggle LLHLS mode per application
- Configure HLS segment duration, playlist window size
- WebRTC transport settings (ICE servers, port range, max connections)
- Low-latency preset profiles (ultra-low, balanced, reliable)
- Preview generated stream URLs for each protocol

---

## T17: Automatic Recording Rules

**Objective:** Per-application auto-record toggle and schedule-based recording.

**Files:**
- Create: `frontend/src/components/AutoRecordConfig.vue`
- Create: `frontend/src/composables/useAutoRecord.ts`
- Modify: `frontend/src/pages/AppDetailPage.vue` — integrate auto-record

**Features:**
- Per-application auto-record toggle (record on stream start)
- Schedule-based recording (start/stop times, days of week)
- Recording format and storage path configuration
- Recording status indicators
- Manual override (start/stop now)

---

## T18: Live Stream Player

**Objective:** Embedded video player to watch streams directly from the dashboard.

**Files:**
- Create: `frontend/src/components/StreamPlayer.vue`
- Create: `frontend/src/composables/useStreamPlayer.ts`
- Modify: `frontend/src/pages/AppDetailPage.vue` — add player panel
- Modify: `frontend/src/pages/StreamsPage.vue` — add play button per stream

**Features:**
- Embedded OvenPlayer or Hls.js player
- Stream URL generator (HLS, WebRTC, LLHLS)
- Protocol selector (auto-detect best available)
- Playback controls (play/pause, volume, fullscreen)
- Stream info overlay (bitrate, resolution, codec)
- Picture-in-picture mode

---

## T19: Notifications & Alerts

**Objective:** Real-time notifications for stream events and system alerts.

**Files:**
- Create: `frontend/src/composables/useNotifications.ts`
- Create: `frontend/src/components/NotificationBell.vue`
- Create: `frontend/src/components/NotificationPanel.vue`
- Create: `frontend/src/pages/NotificationsPage.vue`
- Modify: `frontend/src/components/Header.vue` — add notification bell

**Features:**
- Stream start/stop notifications
- Recording complete alerts
- Connection loss detection
- Push publishing status changes
- Notification history panel (slide-out drawer)
- Sound alerts (optional)
- Notification preferences (which events to notify on)

---

## T20: Application Configuration Editor

**Objective:** Full application configuration editor with form and JSON views.

**Files:**
- Create: `frontend/src/components/AppConfigEditor.vue`
- Create: `frontend/src/components/ConfigDiffViewer.vue`
- Modify: `frontend/src/pages/AppDetailPage.vue` — integrate editor

**Features:**
- Full app config form (providers, publishers, output profiles)
- JSON editor view for advanced users (with syntax highlighting)
- Config diff/comparison view (before vs after changes)
- Validation before applying
- Config templates (pre-built profiles for common use cases)
- One-click restore to defaults
