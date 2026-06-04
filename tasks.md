     1|     1|# OME Dashboard — Implementation Plan
     2|     2|
     3|     3|## Overview
     4|     4|A system monitoring dashboard that connects to OvenMediaEngine (OME) via its REST API v1. Provides real-time visibility into streaming infrastructure: virtual hosts, applications, streams, push publishing, recordings, and server statistics.
     5|     5|
     6|     6|**Target:** Single-page Vue 3 dashboard, no backend — talks directly to OME API.
     7|     7|
     8|     8|---
     9|     9|
    10|    10|## ✅ T1: Project Scaffold & API Client Layer (DONE)
    11|    11|
    12|    12|**Objective:** Initialize the Vue 3 + Vite 6 + TypeScript + Tailwind CSS 4 project. Create the typed API client layer that wraps all OME REST API v1 endpoints.
    13|    13|
    14|    14|**Files:**
    15|    15|- Create: `frontend/` — full Vite scaffold
    16|    16|- Create: `frontend/src/types/ome.ts` — all OME API types
    17|    17|- Create: `frontend/src/api/client.ts` — Axios instance with basic auth
    18|    18|- Create: `frontend/src/api/vhosts.ts` — VHost endpoints
    19|    19|- Create: `frontend/src/api/apps.ts` — Application endpoints
    20|    20|- Create: `frontend/src/api/streams.ts` — Stream endpoints
    21|    21|- Create: `frontend/src/api/stats.ts` — Statistics endpoints
    22|    22|- Create: `frontend/src/api/push.ts` — Push publishing endpoints
    23|    23|- Create: `frontend/src/api/record.ts` — Recording endpoints
    24|    24|- Create: `frontend/src/env.d.ts` — Vite env type augmentation
    25|    25|
    26|    26|**Step 1: Scaffold Vite project**
    27|    27|```bash
    28|    28|cd /home/wsk-devops2/ome-dashboard
    29|    29|npm create vite@latest frontend -- --template vue-ts
    30|    30|cd frontend
    31|    31|npm install
    32|    32|npm install axios vue-router@4 pinia @vueuse/core
    33|    33|npm install -D tailwindcss @tailwindcss/vite
    34|    34|```
    35|    35|
    36|    36|**Step 2: Configure Tailwind CSS 4** via `@tailwindcss/vite` plugin in `vite.config.ts`.
    37|    37|
    38|    38|**Step 3: Define OME API types** in `src/types/ome.ts`:
    39|    39|- `VHost`, `Application`, `Stream`, `Track`, `OutputProfile`
    40|    40|- `StreamPush`, `StreamPushed` (push publishing state)
    41|    41|- `StreamRecord`, `StreamRecorded` (recording state)
    42|    42|- `StatsVHost`, `StatsApp`, `StatsStream`
    43|    43|- `HttpStatus`, `PaginatedResponse`
    44|    44|
    45|    45|**Step 4: Create API client** in `src/api/client.ts`:
    46|    46|- Axios instance with `baseURL` from `VITE_OME_API_BASE`
    47|    47|- Basic auth interceptor from `VITE_OME_API_USER` / `VITE_OME_API_PASS`
    48|    48|- Response error interceptor (standardized error handling)
    49|    49|
    50|    50|**Step 5: Create typed service modules** — one per endpoint group:
    51|    51|- `vhosts.ts`: `listVHosts()`, `getVHost(name)`, `createVHost(data)`, `deleteVHost(name)`
    52|    52|- `apps.ts`: `listApps(vhost)`, `getApp(vhost, app)`, `createApp(vhost, data)`, `deleteApp(vhost, app)`, `patchApp(vhost, app, data)`
    53|    53|- `streams.ts`: `listStreams(vhost, app)`, `getStream(vhost, app, stream)`, `createStream(vhost, app, data)`, `deleteStream(vhost, app, stream)`
    54|    54|- `stats.ts`: `getVHostStats(vhost)`, `getAppStats(vhost, app)`, `getStreamStats(vhost, app, stream)`
    55|    55|- `push.ts`: `startPush(vhost, app, data)`, `stopPush(vhost, app, data)`, `getPushState(vhost, app, data)`
    56|    56|- `record.ts`: `startRecord(vhost, app, data)`, `stopRecord(vhost, app, data)`, `getRecordState(vhost, app, data)`
    57|    57|
    58|    58|**Step 6: Configure Vue Router** with layout routes.
    59|    59|
    60|    60|**Step 7: Commit**
    61|    61|```bash
    62|    62|git add frontend/
    63|    63|git commit -m "feat: scaffold Vite project with typed OME API client layer"
    64|    64|```
    65|    65|
    66|    66|---
    67|    67|
    68|    68|## T2: Dashboard Layout & Navigation
    69|    69|
    70|    70|**Objective:** Build the app shell — sidebar navigation, top header, main content area with dark/light mode toggle. Reuse patterns from ABG project.
    71|    71|
    72|    72|**Files:**
    73|    73|- Create: `frontend/src/App.vue` — root component
    74|    74|- Create: `frontend/src/layouts/DashboardLayout.vue` — sidebar + header + router-view
    75|    75|- Create: `frontend/src/components/Sidebar.vue` — nav menu
    76|    76|- Create: `frontend/src/components/Header.vue` — top bar with theme toggle
    77|    77|- Create: `frontend/src/router/index.ts` — route definitions
    78|    78|- Create: `frontend/src/main.ts` — app entry point
    79|    79|- Create: `frontend/src/style.css` — Tailwind + CSS variables
    80|    80|- Modify: `frontend/index.html` — proper title, favicon
    81|    81|
    82|    82|**Routes:**
    83|    83|- `/` → `DashboardHome.vue` — overview cards + charts
    84|    84|- `/vhosts` → `VHostsPage.vue` — virtual host list
    85|    85|- `/vhosts/:vhost` → `VHostDetailPage.vue` — single vhost detail
    86|    86|- `/vhosts/:vhost/apps/:app` → `AppDetailPage.vue` — app detail + streams
    87|    87|- `/streams` → `StreamsPage.vue` — all streams overview
    88|    88|- `/stats` → `StatsPage.vue` — server-wide statistics
    89|    89|- `/settings` → `SettingsPage.vue` — connection config
    90|    90|
    91|    91|**Sidebar nav items:**
    92|    92|- Dashboard (home icon)
    93|    93|- Virtual Hosts (server icon)
    94|    94|- Streams (radio icon)
    95|    95|- Statistics (bar-chart icon)
    96|    96|- Settings (gear icon)
    97|    97|
    98|    98|**Theme:** CSS variable approach (light/dark), persisted in localStorage. Toggle button in header.
    99|    99|
   100|   100|---
   101|   101|
   102|   102|## T3: Dashboard Home — Overview Cards & Charts
   103|   103|
   104|   104|**Objective:** Main dashboard page with summary cards (total vhosts, apps, streams, active streams) and real-time charts.
   105|   105|
   106|   106|**Files:**
   107|   107|- Create: `frontend/src/pages/DashboardHome.vue`
   108|   108|- Create: `frontend/src/components/StatCard.vue` — metric card component
   109|   109|- Create: `frontend/src/components/charts/StreamsChart.vue` — streams over time
   110|   110|- Create: `frontend/src/composables/useOmeStatus.ts` — polling composable
   111|   111|
   112|   112|**Cards:**
   113|   113|- Total Virtual Hosts
   114|   114|- Total Applications
   115|   115|- Total Streams
   116|   116|- Active Streams (currently publishing)
   117|   117|- Push Publishing Jobs (active count)
   118|   118|- Active Recordings
   119|   119|
   120|   120|**Charts:**
   121|   121|- Stream count per virtual host (bar chart)
   122|   122|- Active vs idle streams (donut chart)
   123|   123|
   124|   124|**Data flow:**
   125|   125|- `useOmeStatus` composable polls `GET /vhosts`, then for each vhost polls apps, then streams
   126|   126|- Aggregates into reactive `ref()` state
   127|   127|- Auto-refresh every 10 seconds (configurable)
   128|   128|
   129|   129|---
   130|   130|
   131|   131|## T4: Virtual Hosts Page
   132|   132|
   133|   133|**Objective:** List all virtual hosts with details, create/delete vhosts.
   134|   134|
   135|   135|**Files:**
   136|   136|- Create: `frontend/src/pages/VHostsPage.vue`
   137|   137|- Create: `frontend/src/components/VHostCard.vue`
   138|   138|- Create: `frontend/src/components/VHostForm.vue` — create vhost modal
   139|   139|- Create: `frontend/src/stores/vhosts.ts` — Pinia store
   140|   140|
   141|   141|**Features:**
   142|   142|- Card grid of all vhosts with name, host names, TLS status
   143|   143|- Click to navigate to vhost detail
   144|   144|- Create new vhost modal (form with name, host names, TLS config)
   145|   145|- Delete vhost with confirmation
   146|   146|- Search/filter by name
   147|   147|
   148|   148|---
   149|   149|
   150|   150|## T5: VHost Detail Page
   151|   151|
   152|   152|**Objective:** View a single virtual host's configuration and its applications.
   153|   153|
   154|   154|**Files:**
   155|   155|- Create: `frontend/src/pages/VHostDetailPage.vue`
   156|   156|- Create: `frontend/src/components/AppCard.vue`
   157|   157|- Create: `frontend/src/components/AppForm.vue` — create app modal
   158|   158|
   159|   159|**Features:**
   160|   160|- VHost config display (host names, TLS, origins, cross-domain)
   161|   161|- Application list (cards/table)
   162|   162|- Create new application in vhost
   163|   163|- Delete application
   164|   164|- Click app → navigate to app detail
   165|   165|
   166|   166|---
   167|   167|
   168|   168|## T6: Application Detail Page
   169|   169|
   170|   170|**Objective:** View application configuration, output profiles, and stream list.
   171|   171|
   172|   172|**Files:**
   173|   173|- Create: `frontend/src/pages/AppDetailPage.vue`
   174|   174|- Create: `frontend/src/components/StreamTable.vue`
   175|   175|- Create: `frontend/src/components/OutputProfileList.vue`
   176|   176|- Create: `frontend/src/components/PushControls.vue`
   177|   177|- Create: `frontend/src/components/RecordControls.vue`
   178|   178|
   179|   179|**Features:**
   180|   180|- App config display (providers, publishers)
   181|   181|- Output profiles list
   182|   182|- Stream table (name, source type, source URL, state, created time)
   183|   183|- Start/stop push publishing per stream
   184|   184|- Start/stop recording per stream
   185|   185|- Delete stream
   186|   186|- Pull stream from external URL (RTSP/OVT)
   187|   187|
   188|   188|---
   189|   189|
   190|   190|## T7: Streams Overview Page
   191|   191|
   192|   192|**Objective:** Global view of all streams across all vhosts/apps.
   193|   193|
   194|   194|**Files:**
   195|   195|- Create: `frontend/src/pages/StreamsPage.vue`
   196|   196|
   197|   197|**Features:**
   198|   198|- Flat table of all streams with vhost/app context
   199|   199|- Search/filter by name, vhost, app, source type
   200|   200|- Status badges (live/idle/error)
   201|   201|- Sort by any column
   202|   202|- Click to navigate to stream in context
   203|   203|
   204|   204|---
   205|   205|
   206|   206|## T8: Statistics & Monitoring Page
   207|   207|
   208|   208|**Objective:** Real-time server statistics with visualizations.
   209|   209|
   210|   210|**Files:**
   211|   211|- Create: `frontend/src/pages/StatsPage.vue`
   212|   212|- Create: `frontend/src/components/charts/ThroughputChart.vue`
   213|   213|- Create: `frontend/src/components/charts/ConnectionChart.vue`
   214|   214|- Create: `frontend/src/components/StatsTable.vue`
   215|   215|
   216|   216|**Features:**
   217|   217|- Per-vhost stats (total connections, throughput, etc.)
   218|   218|- Per-app stats
   219|   219|- Per-stream stats (bitrate, viewers, packets)
   220|   220|- Auto-refresh every 5 seconds
   221|   221|- Time-series charts for throughput and connections
   222|   222|- Export stats as JSON
   223|   223|
   224|   224|---
   225|   225|
   226|   226|## T9: Settings Page
   227|   227|
   228|   228|**Objective:** Configure OME API connection parameters.
   229|   229|
   230|   230|**Files:**
   231|   231|- Create: `frontend/src/pages/SettingsPage.vue`
   232|   232|- Create: `frontend/src/composables/useOmeConfig.ts`
   233|   233|
   234|   234|**Features:**
   235|   235|- OME host, port, TLS toggle
   236|   236|- Basic auth username/password
   237|   237|- Connection test button (calls `GET /vhosts` and checks response)
   238|   238|- Persist to localStorage
   239|   239|- Theme preference toggle
   240|   240|
   241|   241|---
   242|   242|
   243|   243|## T10: Dark/Light Mode & Polish
   244|   244|
   245|   245|**Objective:** Full dark/light mode support across all pages and components.
   246|   246|
   247|   247|**Files:**
   248|   248|- Modify: all page and component files
   249|   249|
   250|   250|**Features:**
   251|   251|- CSS variable system for all colors (bg, text, border, card, sidebar)
   252|   252|- `dark` class on `<html>` element
   253|   253|- localStorage persistence
   254|   254|- Smooth transitions
   255|   255|- Consistent with ABG project patterns
   256|   256|
   257|   257|---
   258|   258|
   259|   259|## T11: Docker & Deployment (Completed)
   260|   260|
   261|   261|**Objective:** Containerize the dashboard for production deployment.
   262|   262|
   263|   263|**Files:**
   264|   264|- Create: `frontend/Dockerfile` — multi-stage nginx build
   265|   265|- Create: `frontend/nginx.conf` — SPA fallback config
   266|   266|- Create: `docker-compose.yml` — root level
   267|   267|
   268|   268|**Features:**
   269|   269|- Multi-stage Dockerfile (node build → nginx serve)
   270|   270|- Environment variables at runtime (envsubst for nginx)
   271|   271|- docker-compose with env file
   272|   272|- Health check endpoint
   273|   273|
   274|   274|---
   275|   275|
   276|   276|## T12: Tests
   277|   277|
   278|   278|**Objective:** Unit and component tests for critical paths.
   279|   279|
   280|   280|**Files:**
   281|   281|- Create: `frontend/src/__tests__/api/client.test.ts`
   282|   282|- Create: `frontend/src/__tests__/stores/vhosts.test.ts`
   283|   283|- Create: `frontend/src/__tests__/pages/DashboardHome.test.ts`
   284|   284|
   285|   285|**Features:**
   286|   286|- Vitest + @vue/test-utils
   287|   287|- API client mock tests
   288|   288|- Store logic tests
   289|   289|- Component rendering tests
   290|   290|