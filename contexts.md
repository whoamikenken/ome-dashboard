# OvenMediaEngine (OME) REST API Context

## Overview
The OME REST APIs allow for querying and modifying system configurations such as VirtualHosts, Applications, Streams, and Statistics. 

### Base Connectivity
- **Default State:** The API server is disabled by default in most standard installations.
- **Port Binding:**
  - `Port`: Unsecured port.
  - `TLSPort`: Secured port (requires TLS certificate configuration in `<Managers>`).
- **Authentication:** Uses Basic HTTP Authentication. 
  - Standard format: `user-id:password` (Base64 encoded).
  - Browsers can use standard credential handling if formatted as such.

## Core API Resources (v1)

### 1. VirtualHosts
Manages the top-level logical containers for your streaming infrastructure.
- **Key Operations:** List, Retrieve details, Update configuration.
- **Structure:** Contains information on hosts, applications, and global settings.

### 2. Statistics
Provides real-time health and performance data for the engine.
- **Current Stats:** Real-time snapshots of active streams and workloads.
- **Granularity:** Can be queried at the VirtualHost level or individual App/Stream levels (coordinated via IDs).

### 3. Managers & API Server
Configuration for how the API itself behaves.
- **Access Control:** Restricts which IP addresses or domains can interact with the API server via `<Names>`.
- **Credentials:** Managed via an `AccessToken` string.

## Implementation Details for Dashboard
- **Service Layer:** All requests should be routed through a typed Axios service layer (e.g., `frontend/src/api/`).
- **Environment Variables:**
  - `VITE_OME_API_BASE`: Root URL (HTTP or HTTPS).
  - `VITE_OME_API_USER`: Auth Username.
  - `VITE_OME_API_PASS`: Auth Password.
- **Error Handling:** Ensure the dashboard handles 401 Unauthorized (auth failures) and 503 Service Unavailable (engine overloaded/offline) gracefully.

## Reference Links
- [Full OME API Docs](https://ovenmedialabs.com/docs/ome/rest-api)
