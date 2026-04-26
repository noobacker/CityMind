# CityMind Todo

## Done
- Scaffolded a Next.js 15 App Router project with TypeScript.
- Built the main CityMind shell: terminal, map panel, vitals bar, and boot sequence.
- Replaced the mock CityPulse backend with live-data fetchers and TTL caching.
- Added realtime fetchers for NYC 311, MTA alerts page, AQI, weather, and NYC events.
- Wired realtime stress scoring + anomaly pass from fetched data into `CityPulse`.
- Added `/api/chat` and `/api/pulse` routes.
- Expanded neighborhood coverage (including Sunset Park) for better borough-level responses.
- Expanded `/api/pulse` payload with `timestamp`, `boroughs`, and `activeEvents`.
- Added deterministic NYC date/day/year handling in `/api/chat` (server-time guarded).
- Added optional Groq provider support in `/api/chat` when Anthropic key is absent.
- Wired fallback NYC responses so the app works without external API keys.
- Verified the project builds successfully with `npm run build`.

## Pending
- Add a real Mapbox map and GeoJSON overlays.
- Add live fly-to behavior when neighborhoods are mentioned.
- Add voice input and speech synthesis.
- Add typewriter animation to assistant responses.
- Add stronger observability/error logging per fetcher (status, source, and fallback reason).
- Decide final MTA ingestion strategy: GTFS-RT protobuf vs alerts-page scraping hardening.
- Add a `/api/vitals` route if you want the vitals bar split from `/api/pulse`.
- Add tests for scoring, mention extraction, and API payloads.
- Upgrade the dependency versions and resolve the Next.js security warning on `next@15.3.1`.

## Local Run
- Install dependencies: `npm install`
- Start the app: `npm run dev`
- Open the local site in the browser on the port Next prints, usually `http://localhost:3000`

## Current State
- Backend pulse data is now fetched from live APIs with cache + fallback safety.
- Date/day/year responses are deterministic and based on NYC server time.
- UI is still a prototype map shell (cards), not full Mapbox visualization yet.
- Realtime backend is functional for development; frontend still needs final realtime map behaviors.