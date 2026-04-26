# CityMind

> **The city always had a pulse. Now it has a mind.**

CityMind is a real-time urban intelligence platform for New York City. It ingests live data from public APIs every 30 seconds — 311 service requests, MTA disruptions, air quality, weather, and permitted events — and turns all of it into a single, queryable, visual nervous system for the city.

You can ask it questions in plain English. It answers from live city data — not the internet, not Wikipedia. The city itself.

---

## What It Does

### Live City Pulse
Every neighborhood in NYC gets a real-time stress score (0–100), color-coded on an interactive map — green for calm, red for critical. The score is computed from complaint volume, issue severity, air quality, MTA status, weather conditions, and nearby events. It refreshes every 30 seconds without any manual intervention.

### Natural Language Terminal
Type any question about the city — *"What's the single biggest pressure in Harlem right now?"* — and CityMind answers using live pulse data. The map responds too: it flies to the neighborhood being discussed, highlights it, and tracks the conversation context across turns.

### T+24H Predictive Forecast
Toggle to tomorrow's view. CityMind projects stress levels 24 hours ahead by layering forecast weather (heatwave risk, storm probability, precipitation), tomorrow's permitted events, and known MTA disruptions on top of today's baseline. City agencies can see where the pulse is likely to turn red before it happens — and act in advance.

### Policy Sandbox
Drag city resources — NYPD units, DSNY sanitation crews, EMS, MTA repair teams — onto the map and watch projected stress levels update in real time. Each resource type has affinity-weighted impact (e.g. a sanitation crew reduces stress more in neighborhoods with dirty conditions complaints than in noise complaints). This is the tool for the question: *"If I deploy three units here, does it actually help?"*

### Anomaly Detection
When a neighborhood's stress crosses a statistical threshold relative to its own history, a live alert fires — identifying genuine spikes versus normal noise. Anomalies are flagged visually on the map and surfaced in toast notifications.

---

## Use Cases

### Government & City Agencies
- Pre-deploy sanitation, police, or EMS before a stress spike hits — based on forecast data, not after the fact
- See which borough needs attention before 311 calls flood in
- Use the Sandbox to simulate resource allocation before committing budgets
- Identify neighborhoods with chronic stress vs. one-off anomalies

### Urban Planners & Policy Teams
- Forecast the impact of major events (concerts, parades, sports) on surrounding neighborhoods
- Model policy changes in the Sandbox ("what if we close this road for construction?")
- Track stress trends across seasons, events, and infrastructure changes

### Nonprofits & Service Organizations
- Identify where community resources (food banks, shelters, clinics) are most needed in real time
- Correlate stress spikes with service demand to plan capacity

### Journalists & Researchers
- Query the city in plain English — no SQL, no data portal navigation
- Get instant context on any neighborhood without needing domain expertise

### Residents & Commuters
- Ask if your commute will be worse tomorrow
- Find out which parks or neighborhoods are least stressed right now
- Understand what's driving issues in your area

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| 3D / Animation | Three.js, React Three Fiber, Framer Motion |
| Map | Mapbox GL JS 3 |
| Testing | Vitest |

---

## Data Sources & APIs

| Source | What It Provides |
|---|---|
| [NYC 311 Open Data](https://data.cityofnewyork.us/resource/erm2-nwe9.json) | Live service request complaints by neighborhood — noise, heat, rodents, parking, etc. |
| [MTA Alerts](https://www.mta.info/alerts) | Real-time subway and bus disruptions, planned maintenance, line-level severity |
| [Open-Meteo](https://open-meteo.com/) | Current weather (temp, precipitation, wind) and 24-hour hourly forecast |
| [NYC AQI / IQAir](https://www.iqair.com/) | Borough-level air quality index and PM2.5 readings |
| [NYC Open Data — Events](https://data.cityofnewyork.us/resource/tvpp-9vvx.json) | Permitted public events with location and timing |
| [Anthropic Claude API](https://www.anthropic.com/) | Natural language understanding and city-context-aware response generation |
| [Mapbox](https://www.mapbox.com/) | Map rendering, neighborhood topology, flyTo interactions |

---

## Architecture Overview

```
User Query
    │
    ▼
/api/chat  ──▶  Claude (with live city context injected)
                    │
                    ▼
              CityPulse context: stress scores, alerts, weather,
              MTA, AQI, events — all live, all local

/api/pulse  ──▶  buildCityPulse()
                    │
                    ├── fetch311Complaints()   → NYC 311 Open Data
                    ├── fetchMTAAlerts()       → MTA scraper
                    ├── fetchWeather()         → Open-Meteo
                    ├── fetchAQI()             → IQAir
                    └── fetchEvents()          → NYC Open Data

/api/forecast  ──▶  buildForecastPulse(currentPulse, forecastWeather, events)
                    │
                    └── Projects T+24h stress using weather multipliers,
                        event affinity, and MTA disruption weights
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_MAPBOX_TOKEN, ANTHROPIC_API_KEY, NYC_OPEN_DATA_TOKEN

# Start dev server
npm run dev

# Run tests
npm test
```

---

## Future Roadmap

| Feature | Impact |
|---|---|
| Neighborhood-level resolution tracking | Did the fix actually work? Close the loop on deployed resources |
| Budget allocation layer | Show $ spend vs. stress score per borough |
| Multi-city support | Scale the pulse model beyond NYC |
| Alert subscriptions | Notify agencies when a neighborhood crosses a threshold |
| Historical trend analysis | "Harlem spikes every July — here's why" |
| Community feedback loop | Residents flag issues directly into the stress model |

---

## One Line

**CityMind turns a reactive city into a self-aware one.**

---

*Built at the Code4City Hackathon by **noobacker**.*
