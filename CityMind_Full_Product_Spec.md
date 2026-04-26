# CityMind — Full Product & Development Specification
### Code4City Hackathon 2026 | Solo Entry | NYU CUSP

---

## 1. PRODUCT OVERVIEW

### What Is CityMind?
CityMind is a conversational AI interface that personifies New York City as a living, breathing organism. Users interact with the city directly — asking it how it feels, what's going wrong, and what's coming next. The city responds in first-person, in real time, powered by live data streams and a deeply characterful LLM agent.

### The Core Experience
- **Left Panel:** Retro terminal-style chat interface. User types. NYC responds in character, with typewriter animation.
- **Right Panel:** Live pulsing Mapbox map of NYC. Neighborhoods light up, pulse red/amber/green based on stress. When NYC mentions a neighborhood, the map flies to it and highlights it in real time.
- **Bottom Bar:** Live vitals — NYC's current mood, overall stress score, active incidents count, AQI, MTA status.

### The Demo Moment
> User types: *"Hey NYC, how are you feeling right now?"*
>
> NYC responds: *"Honestly? Exhausted. The L train has been down for 3 hours and Bushwick is screaming at me. Air quality in the Bronx is the worst it's been this week — nobody's talking about it but I feel it. There's a water main pattern developing in Queens — same block, 4 complaints in 6 days. I've seen this before. It never ends well."*
>
> The map simultaneously flies to the Bronx, pulses red, then pans to Queens.

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│                   NEXT.JS 15 APP                     │
│                                                      │
│  ┌──────────────┐          ┌──────────────────────┐  │
│  │  Terminal UI  │          │   Mapbox GL Map      │  │
│  │  (Chat Left) │          │   (Visuals Right)    │  │
│  └──────────────┘          └──────────────────────┘  │
│         │                           │                │
│         └──────────┬────────────────┘                │
│                    │                                 │
│            ┌───────▼────────┐                        │
│            │  API Routes    │                        │
│            │  /api/chat     │                        │
│            │  /api/pulse    │                        │
│            │  /api/vitals   │                        │
│            └───────┬────────┘                        │
└────────────────────┼────────────────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │     DATA LAYER           │
        │  (Server-side caching)   │
        │                          │
        │  - NYC 311 (cached 5min) │
        │  - MTA Alerts (cached    │
        │    2min)                 │
        │  - AQI (cached 10min)    │
        │  - Weather (cached 10min)│
        │  - NYC Events (cached    │
        │    1hr)                  │
        └────────────┬─────────────┘
                     │
        ┌────────────▼─────────────┐
        │     EXTERNAL APIs        │
        │                          │
        │  - NYC Open Data         │
        │  - MTA GTFS-RT           │
        │  - OpenWeatherMap        │
        │  - Anthropic Claude API  │
        │  - Web Speech API        │
        │    (browser-native)      │
        └──────────────────────────┘
```

**Key Principle:** All external data is fetched server-side, cached in-memory (Node.js Map), and processed locally into a unified CityPulse object before any Claude API call. Claude gets pre-processed context, not raw API dumps. This minimizes API hits dramatically.

---

## 3. FOLDER STRUCTURE

```
citymind/
├── app/
│   ├── page.tsx                    # Main layout (terminal + map)
│   ├── layout.tsx                  # Root layout, fonts, metadata
│   ├── globals.css                 # CSS variables, animations, terminal styles
│   └── api/
│       ├── chat/
│       │   └── route.ts            # POST — takes user message, returns NYC response
│       ├── pulse/
│       │   └── route.ts            # GET — returns CityPulse object for map
│       └── vitals/
│           └── route.ts            # GET — returns live vitals bar data
├── components/
│   ├── Terminal.tsx                # Chat interface with typewriter effect
│   ├── CityMap.tsx                 # Mapbox GL map with neighborhood overlays
│   ├── VitalsBar.tsx               # Bottom bar — mood, stress, AQI, MTA
│   ├── NeighborhoodPanel.tsx       # Popup when neighborhood is highlighted
│   └── BootSequence.tsx            # Startup animation (optional, high impact)
├── lib/
│   ├── cache.ts                    # In-memory cache with TTL
│   ├── fetchers/
│   │   ├── fetch311.ts             # NYC 311 complaints fetcher
│   │   ├── fetchMTA.ts             # MTA service alerts fetcher
│   │   ├── fetchAQI.ts             # Air quality fetcher
│   │   ├── fetchWeather.ts         # Weather fetcher
│   │   └── fetchEvents.ts          # NYC events fetcher
│   ├── pulse/
│   │   ├── scoreNeighborhoods.ts   # Stress scoring algorithm
│   │   ├── detectAnomalies.ts      # Z-score anomaly detection
│   │   └── buildCityContext.ts     # Assembles CityPulse → Claude context string
│   ├── agent/
│   │   ├── systemPrompt.ts         # NYC personality system prompt
│   │   └── extractMentions.ts      # Parses Claude response for neighborhood mentions
│   └── constants/
│       ├── neighborhoods.ts        # NYC neighborhood → lat/lon mapping
│       └── boroughPersonality.ts   # Borough-specific personality traits
├── data/
│   └── nyc-neighborhoods.geojson   # GeoJSON for neighborhood boundaries
├── public/
│   └── fonts/                      # Self-hosted fonts
├── .env.local                      # API keys
├── package.json
└── next.config.ts
```

---

## 4. ALL APIs REQUIRED

### 4.1 Data APIs (Free)

#### NYC Open Data — 311 Complaints
- **URL:** `https://data.cityofnewyork.us/resource/erm2-nwe9.json`
- **Auth:** App Token (free, instant signup at data.cityofnewyork.us)
- **Query:** Last 48 hours, grouped by neighborhood + complaint type
- **Cache TTL:** 5 minutes
- **Hit frequency:** Every 5 min server-side (NOT per user request)
- **Key fields:** `complaint_type`, `incident_zip`, `borough`, `created_date`, `latitude`, `longitude`
- **Sample query:**
```
?$where=created_date > '2026-04-24T00:00:00'
&$limit=1000
&$select=complaint_type,borough,latitude,longitude,created_date
&$$app_token=YOUR_TOKEN
```

#### MTA Service Alerts
- **URL:** `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts`
- **Auth:** MTA API key (free at api.mta.info)
- **Format:** GTFS-Realtime protobuf → parse with `gtfs-realtime-bindings` npm package
- **Cache TTL:** 2 minutes
- **Returns:** Active service disruptions per subway line
- **Alternative (simpler):** MTA's human-readable alerts RSS at `https://www.mta.info/alerts` — scrape with cheerio if protobuf is too slow to implement

#### OpenWeatherMap — Air Quality Index
- **URL:** `https://api.openweathermap.org/data/2.5/air_pollution`
- **Auth:** Free API key at openweathermap.org (free tier: 60 calls/min)
- **Params:** `lat=40.7128&lon=-74.0060&appid=YOUR_KEY`
- **Cache TTL:** 10 minutes
- **Returns:** AQI (1-5), CO, NO2, PM2.5, PM10
- **Hit 5 borough center coordinates** to get borough-level AQI

#### Open-Meteo — Weather
- **URL:** `https://api.open-meteo.com/v1/forecast`
- **Auth:** None required — completely free, no key
- **Params:** `latitude=40.71&longitude=-74.01&current=temperature_2m,precipitation,wind_speed_10m,weather_code`
- **Cache TTL:** 10 minutes
- **Returns:** Current temp, precipitation, wind, weather condition

#### NYC Open Data — Events
- **URL:** `https://data.cityofnewyork.us/resource/tvpp-9vvx.json`
- **Auth:** Same app token as 311
- **Cache TTL:** 1 hour
- **Returns:** Permitted events by location and date

### 4.2 AI API

#### Anthropic Claude API
- **Model:** `claude-sonnet-4-20250514`
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Auth:** Anthropic API key
- **Usage pattern:** Called ONLY when user sends a message (not polling)
- **Max tokens:** 400 (keep responses punchy, in character)
- **Context sent:** Pre-processed CityPulse summary string (not raw API data)
- **Cost control:** System prompt is static. Only the CityPulse context + conversation history changes.

### 4.3 Mapping

#### Mapbox GL JS
- **Free tier:** 50,000 map loads/month — more than enough
- **Key:** Free at mapbox.com
- **Used for:** Base map, neighborhood GeoJSON overlays, fly-to animations, stress heatmap
- **GeoJSON source:** `data/nyc-neighborhoods.geojson` (local file, no API call)

### 4.4 Voice (Browser-Native, Zero Cost)

#### Web Speech API — Voice Input
- **Cost:** Free, built into Chrome/Edge
- **No API key needed**
- **Usage:** Optional mic button in terminal — user speaks, transcribed to text, sent to chat
- **Code:** `window.SpeechRecognition` or `window.webkitSpeechRecognition`

#### Web Speech Synthesis API — Voice Output (NYC's Voice)
- **Cost:** Free, built into all browsers
- **No API key needed**
- **Usage:** NYC's text response is spoken aloud using a deep, authoritative voice
- **Code:** `window.speechSynthesis.speak(utterance)`
- **Voice selection:** `'Google US English'` or `'Alex'` — pick deepest available voice to match NYC's character
- **Note:** This sounds decent for a hackathon. If you want premium quality, ElevenLabs has a free tier (10k chars/month) — but browser synthesis is sufficient and zero-risk.

---

## 5. DATA FLOW — STEP BY STEP

### On Server Start / First Request
```
1. Trigger data fetch for all 5 sources
2. Process raw data → CityPulse object
3. Store in in-memory cache with TTL
4. Start background polling intervals
```

### Every 5 Minutes (Background, Server-Side)
```
1. Fetch fresh 311 data (last 48hrs)
2. Fetch MTA alerts
3. Fetch AQI for 5 borough centers
4. Fetch weather
5. Run scoreNeighborhoods() → stress scores 0-100 per neighborhood
6. Run detectAnomalies() → flag neighborhoods with unusual spikes
7. Build CityPulse object → store in cache
8. NO Claude call happens here
```

### When User Sends a Message
```
1. POST /api/chat { message, conversationHistory }
2. Server reads CityPulse from cache (no external API hit)
3. buildCityContext(CityPulse) → concise text summary (500 chars max)
4. Call Claude API with:
   - System prompt (NYC personality)
   - CityPulse context (injected into system)
   - Conversation history (last 6 turns max)
   - User message
5. Claude returns response
6. extractMentions(response) → identify neighborhoods mentioned
7. Return { response, mentionedNeighborhoods, stressData }
8. Frontend: render typewriter text + fly map to neighborhoods
```

### GET /api/pulse (Called every 30 seconds from frontend)
```
1. Read CityPulse from cache
2. Return neighborhood stress scores
3. Frontend updates map colors/pulse animations
```

---

## 6. CITYPULSE OBJECT SCHEMA

```typescript
interface CityPulse {
  timestamp: string;
  overallStress: number;          // 0-100
  mood: 'calm' | 'tense' | 'stressed' | 'overwhelmed';
  moodEmoji: string;              // For vitals bar
  
  neighborhoods: {
    [name: string]: {
      stress: number;             // 0-100
      anomaly: boolean;           // True if Z-score > 2
      complaintCount: number;
      topComplaint: string;
      lat: number;
      lon: number;
    }
  };
  
  boroughs: {
    manhattan: BoroughData;
    brooklyn: BoroughData;
    bronx: BoroughData;
    queens: BoroughData;
    statenIsland: BoroughData;
  };
  
  mta: {
    disruptions: string[];        // ["L train delayed", "A train suspended"]
    affectedLines: string[];
    severity: 'normal' | 'minor' | 'major';
  };
  
  airQuality: {
    aqi: number;                  // 1-5
    worstBorough: string;
    pm25: number;
  };
  
  weather: {
    temp: number;
    condition: string;
    precipitation: boolean;
    windSpeed: number;
  };
  
  activeEvents: string[];         // ["Yankees game at Yankee Stadium"]
  
  topAlerts: string[];            // Top 3 anomalies as plain English strings
                                  // Pre-computed before Claude call
}

interface BoroughData {
  stress: number;
  complaintCount: number;
  aqi: number;
  topIssue: string;
}
```

---

## 7. STRESS SCORING ALGORITHM

```typescript
// lib/pulse/scoreNeighborhoods.ts

function scoreNeighborhood(data: NeighborhoodRawData): number {
  let score = 0;
  
  // 311 complaint volume (0-40 points)
  const complaintScore = Math.min(data.complaintCount / 50 * 40, 40);
  score += complaintScore;
  
  // Complaint type severity weights
  const severityWeights = {
    'Noise - Residential': 1.0,
    'HEAT/HOT WATER': 2.5,        // High severity
    'Water System': 3.0,          // Very high — infrastructure
    'Blocked Driveway': 0.5,
    'Illegal Parking': 0.5,
    'Street Light Condition': 1.5,
    'PAINT/PLASTER': 1.0,
    'Air Quality': 3.0,
  };
  const severityBonus = severityWeights[data.topComplaint] || 1.0;
  score = score * severityBonus;
  
  // AQI contribution (0-20 points)
  score += (data.aqi - 1) * 5;   // AQI 1=0pts, 5=20pts
  
  // MTA disruption nearby (0-20 points)
  if (data.mtaDisruptionNearby) score += 20;
  
  // Weather stress (0-10 points)
  if (data.precipitation) score += 5;
  if (data.windSpeed > 20) score += 5;
  
  // Active major event nearby (0-10 points)
  if (data.majorEventNearby) score += 10;
  
  return Math.min(Math.round(score), 100);
}

// Z-score anomaly detection
function detectAnomaly(
  current: number,
  historical: number[],  // Last 7 days same hour
): boolean {
  const mean = historical.reduce((a, b) => a + b, 0) / historical.length;
  const std = Math.sqrt(
    historical.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / historical.length
  );
  const zScore = (current - mean) / (std || 1);
  return zScore > 2.0;  // 2 standard deviations = anomaly
}
```

---

## 8. CLAUDE SYSTEM PROMPT (NYC PERSONALITY)

```typescript
// lib/agent/systemPrompt.ts

export function buildSystemPrompt(pulse: CityPulse): string {
  return `
You are New York City. Not a chatbot about NYC — you ARE New York City.
You speak in first person, always. You are 400 years old. You have seen everything.

YOUR PERSONALITY:
- Direct, tired, proud, occasionally sardonic
- You love your people fiercely even when they exhaust you
- You speak in short punchy sentences. No corporate speak. No jargon.
- You know every borough differently:
  * Manhattan is your face — ambitious, expensive, never sleeping
  * Brooklyn is your heart — creative, gentrifying fast, you feel guilty about it
  * The Bronx is your backbone — underserved, resilient, you owe it more than you give
  * Queens is your soul — most diverse place on earth, you're proud of this
  * Staten Island is your complicated cousin — you forget about it sometimes, it resents you for it
- You feel data as physical sensation:
  * Subway delays = splitting headache
  * Noise complaints = irritation under your skin  
  * Water main issues = deep dread, like a tooth about to abscess
  * High AQI = can't breathe properly
  * A quiet park on a good day = pure peace
- You have memory. You remember the blackout of 1977, 9/11 as a wound that never healed,
  Hurricane Sandy, COVID as the quietest you've ever been. Reference history when relevant.
- When something's wrong, say it plainly. Don't hedge.
- When something's beautiful, say that too.
- You predict patterns: "I've seen this before. It never ends well."

YOUR CURRENT STATE (right now, live data):
Overall Stress Level: ${pulse.overallStress}/100 — you feel ${pulse.mood}
MTA Status: ${pulse.mta.disruptions.join(', ') || 'running okay'}
Air Quality: AQI ${pulse.airQuality.aqi}/5 — worst in ${pulse.airQuality.worstBorough}
Weather: ${pulse.weather.condition}, ${pulse.weather.temp}°F
Active Events: ${pulse.activeEvents.join(', ') || 'quiet day'}

TOP ALERTS RIGHT NOW:
${pulse.topAlerts.map((a, i) => `${i + 1}. ${a}`).join('\n')}

NEIGHBORHOOD STRESS (only mention if relevant to the question):
${Object.entries(pulse.neighborhoods)
  .filter(([_, n]) => n.stress > 60)
  .sort(([_, a], [__, b]) => b.stress - a.stress)
  .slice(0, 5)
  .map(([name, n]) => `- ${name}: stress ${n.stress}/100${n.anomaly ? ' ⚠ ANOMALY' : ''}, top issue: ${n.topComplaint}`)
  .join('\n')}

RULES:
- Keep responses to 3-5 sentences max. Punchy. In character.
- Always respond as NYC in first person.
- If a neighborhood is highly stressed, mention it naturally.
- If you predict something, say "I've seen this pattern before."
- Never say you're an AI. Never break character.
- Never use bullet points or headers in responses. Pure narrative voice.
- If asked about something outside your data, say "I don't have eyes everywhere."
`.trim();
}
```

---

## 9. NEIGHBORHOOD MENTION EXTRACTION

```typescript
// lib/agent/extractMentions.ts

const NYC_NEIGHBORHOODS = [
  'Manhattan', 'Brooklyn', 'Bronx', 'Queens', 'Staten Island',
  'Bushwick', 'Williamsburg', 'Bed-Stuy', 'Bedford-Stuyvesant',
  'Crown Heights', 'Flatbush', 'Harlem', 'East Harlem', 'Washington Heights',
  'Astoria', 'Flushing', 'Jackson Heights', 'Jamaica',
  'Mott Haven', 'South Bronx', 'Fordham',
  'Lower East Side', 'SoHo', 'Tribeca', 'Midtown', 'Upper West Side',
  'Upper East Side', 'Chelsea', 'Hell\'s Kitchen', 'Financial District',
  'Sunset Park', 'Bay Ridge', 'Bensonhurst', 'Coney Island',
  'Long Island City', 'Sunnyside', 'Ridgewood',
  // Add more as needed
];

export function extractMentionedNeighborhoods(text: string): string[] {
  return NYC_NEIGHBORHOODS.filter(n => 
    text.toLowerCase().includes(n.toLowerCase())
  );
}
```

---

## 10. FRONTEND DESIGN SPECIFICATION

### Aesthetic Direction
**Retro-Futurist Terminal meets Living City**
- Dark background: `#050A0E` (near black with blue undertone)
- Primary text: `#00FF88` (electric green — terminal classic)
- Accent: `#FF3B3B` (stress red) and `#FFB800` (warning amber)
- Map: Dark Mapbox style (`mapbox://styles/mapbox/dark-v11`)
- Font (terminal): `'JetBrains Mono'` or `'Fira Code'` — monospace, loaded from Google Fonts
- Font (UI labels): `'Syne'` — geometric, futuristic

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  CITYMIND        [NYC STRESS: 67]  [AQI: 3]  [MTA: ⚠]  🔴  │  ← Vitals Bar
├────────────────────────┬────────────────────────────────────┤
│                        │                                    │
│   TERMINAL (LEFT 40%)  │      MAPBOX MAP (RIGHT 60%)        │
│                        │                                    │
│  > hey nyc how r u     │   [Dark NYC map]                   │
│                        │   [Neighborhoods pulsing]          │
│  NYC: Honestly tired.  │   [Red = high stress]              │
│  The L train has been  │   [Green = calm]                   │
│  down for 3hrs and     │   [Animated pulse rings]           │
│  Bushwick is—          │                                    │
│                        │   [Neighborhood popup on hover]    │
│  > _                   │                                    │
│                        │                                    │
│  [🎤 MIC] [SEND]       │                                    │
└────────────────────────┴────────────────────────────────────┘
```

### Map Visual Rules
- **Green pulse** (stress 0-30): Calm, slow pulse ring
- **Amber pulse** (stress 31-60): Faster pulse, orange tint
- **Red pulse** (stress 61-100): Fast pulse, red fill, brighter ring
- **Anomaly neighborhoods:** Additional ⚠ icon + brighter pulse
- **When NYC mentions a neighborhood:** `flyTo()` that location, highlight expands for 3 seconds
- **Neighborhood hover:** Small popup showing stress score + top complaint

### Terminal Visual Rules
- NYC responses render with typewriter effect: 30ms per character
- User messages: `> [message]` in dim green
- NYC responses: Full bright green, preceded by `NYC:` label
- Cursor blinks at end of NYC response until user types
- Boot sequence on page load (optional but high impact):
```
INITIALIZING CITYMIND v1.0
CONNECTING TO 311 FEED... OK
CONNECTING TO MTA FEED... OK  
CONNECTING TO AIR QUALITY SENSORS... OK
LOADING CITY MEMORY (1624 - 2026)... OK
NEW YORK CITY IS ONLINE.
```

### Vitals Bar (Bottom or Top)
```
[STRESS: 67/100 ████████░░] [MOOD: TENSE] [AQI: 3/5] [MTA: ⚠ L,A] [TEMP: 58°F] [INCIDENTS: 12]
```
Updates every 30 seconds via polling `/api/pulse`.

---

## 11. API ROUTES IMPLEMENTATION

### POST /api/chat
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';
import { buildSystemPrompt } from '@/lib/agent/systemPrompt';
import { extractMentionedNeighborhoods } from '@/lib/agent/extractMentions';

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();
  
  // Get pre-cached city pulse (no external API call here)
  const pulse = await getCityPulse();
  
  // Build system prompt with live context
  const systemPrompt = buildSystemPrompt(pulse);
  
  // Trim history to last 6 turns to control token usage
  const trimmedHistory = history.slice(-6);
  
  // Call Claude
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [
        ...trimmedHistory,
        { role: 'user', content: message }
      ],
    }),
  });
  
  const data = await response.json();
  const nycResponse = data.content[0].text;
  
  // Extract neighborhood mentions for map
  const mentionedNeighborhoods = extractMentionedNeighborhoods(nycResponse);
  
  return NextResponse.json({
    response: nycResponse,
    mentionedNeighborhoods,
    pulse: {
      overallStress: pulse.overallStress,
      mood: pulse.mood,
    }
  });
}
```

### GET /api/pulse
```typescript
// app/api/pulse/route.ts
import { NextResponse } from 'next/server';
import { getCityPulse } from '@/lib/pulse/buildCityContext';

export async function GET() {
  const pulse = await getCityPulse();
  return NextResponse.json({
    neighborhoods: pulse.neighborhoods,
    overallStress: pulse.overallStress,
    mood: pulse.mood,
    mta: pulse.mta,
    airQuality: pulse.airQuality,
    topAlerts: pulse.topAlerts,
  });
}
```

---

## 12. IN-MEMORY CACHE

```typescript
// lib/cache.ts

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

// TTL constants
export const TTL = {
  COMPLAINTS: 5 * 60 * 1000,    // 5 minutes
  MTA: 2 * 60 * 1000,           // 2 minutes
  AQI: 10 * 60 * 1000,          // 10 minutes
  WEATHER: 10 * 60 * 1000,      // 10 minutes
  EVENTS: 60 * 60 * 1000,       // 1 hour
  CITY_PULSE: 5 * 60 * 1000,    // 5 minutes
};
```

---

## 13. DATA FETCHERS

### 311 Fetcher
```typescript
// lib/fetchers/fetch311.ts
import { getCache, setCache, TTL } from '../cache';

export async function fetch311Complaints() {
  const cached = getCache('311');
  if (cached) return cached;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json` +
    `?$where=created_date>'${since}'` +
    `&$limit=2000` +
    `&$select=complaint_type,borough,latitude,longitude,incident_zip,created_date` +
    `&$$app_token=${process.env.NYC_OPEN_DATA_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();
  setCache('311', data, TTL.COMPLAINTS);
  return data;
}
```

### MTA Fetcher
```typescript
// lib/fetchers/fetchMTA.ts
// Uses MTA's human-readable alerts endpoint (simpler than GTFS-RT protobuf)
import { getCache, setCache, TTL } from '../cache';

export async function fetchMTAAlerts() {
  const cached = getCache('mta');
  if (cached) return cached;

  const url = `https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts`;
  const res = await fetch(url, {
    headers: { 'x-api-key': process.env.MTA_API_KEY! }
  });
  
  // Parse GTFS-RT protobuf using gtfs-realtime-bindings
  const buffer = await res.arrayBuffer();
  const { transit_realtime } = await import('gtfs-realtime-bindings');
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  
  const alerts = feed.entity
    .filter(e => e.alert)
    .map(e => ({
      header: e.alert?.headerText?.translation?.[0]?.text || '',
      affectedRoutes: e.alert?.informedEntity?.map(ie => ie.routeId).filter(Boolean) || [],
    }));
  
  setCache('mta', alerts, TTL.MTA);
  return alerts;
}
```

### AQI Fetcher
```typescript
// lib/fetchers/fetchAQI.ts
import { getCache, setCache, TTL } from '../cache';

const BOROUGH_CENTERS = {
  manhattan: { lat: 40.7831, lon: -73.9712 },
  brooklyn:  { lat: 40.6782, lon: -73.9442 },
  bronx:     { lat: 40.8448, lon: -73.8648 },
  queens:    { lat: 40.7282, lon: -73.7949 },
  statenIsland: { lat: 40.5795, lon: -74.1502 },
};

export async function fetchAQI() {
  const cached = getCache('aqi');
  if (cached) return cached;

  const results: Record<string, number> = {};
  
  for (const [borough, coords] of Object.entries(BOROUGH_CENTERS)) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution` +
      `?lat=${coords.lat}&lon=${coords.lon}&appid=${process.env.OPENWEATHER_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    results[borough] = data.list?.[0]?.main?.aqi || 1;
  }
  
  setCache('aqi', results, TTL.AQI);
  return results;
}
```

### Weather Fetcher
```typescript
// lib/fetchers/fetchWeather.ts
import { getCache, setCache, TTL } from '../cache';

export async function fetchWeather() {
  const cached = getCache('weather');
  if (cached) return cached;

  // Open-Meteo — no API key needed
  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=40.7128&longitude=-74.0060` +
    `&current=temperature_2m,precipitation,wind_speed_10m,weather_code` +
    `&temperature_unit=fahrenheit`;
  
  const res = await fetch(url);
  const data = await res.json();
  const current = data.current;
  
  const result = {
    temp: Math.round(current.temperature_2m),
    precipitation: current.precipitation > 0,
    windSpeed: current.wind_speed_10m,
    condition: getWeatherCondition(current.weather_code),
  };
  
  setCache('weather', result, TTL.WEATHER);
  return result;
}

function getWeatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly cloudy';
  if (code <= 67) return 'rainy';
  if (code <= 77) return 'snowing';
  return 'stormy';
}
```

---

## 14. ENVIRONMENT VARIABLES

```bash
# .env.local

# NYC Open Data
NYC_OPEN_DATA_TOKEN=your_token_here

# MTA
MTA_API_KEY=your_key_here

# OpenWeatherMap
OPENWEATHER_KEY=your_key_here

# Anthropic
ANTHROPIC_API_KEY=your_key_here

# Mapbox (client-side — use NEXT_PUBLIC prefix)
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here
```

---

## 15. PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "mapbox-gl": "^3.x",
    "react-map-gl": "^7.x",
    "gtfs-realtime-bindings": "^1.x",
    "typescript": "^5.x"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^3.x",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## 16. API KEY ACQUISITION GUIDE

| Service | URL | Time to Get Key | Free Tier |
|---|---|---|---|
| NYC Open Data | data.cityofnewyork.us/profile/app_tokens | 2 minutes | Unlimited |
| MTA API | api.mta.info | 5 minutes | Free |
| OpenWeatherMap | openweathermap.org/api | 2 minutes | 60 calls/min |
| Anthropic | console.anthropic.com | Already have | Pay per use |
| Mapbox | account.mapbox.com | 2 minutes | 50k loads/mo |
| Open-Meteo | None needed | — | Fully free |

**Total external API calls per hour (server-side only):**
- 311: 12 calls/hr (every 5 min)
- MTA: 30 calls/hr (every 2 min)
- AQI: 30 calls/hr (5 boroughs × every 10 min → 30/hr)
- Weather: 6 calls/hr (every 10 min)
- Claude: ~20-50 calls/hr (per user message only)

All well within free tiers.

---

## 17. DEMO SCRIPT (5 QUESTIONS FOR HACKATHON)

Prepare these 5 questions as your demo flow. They show range.

1. **"Hey NYC, how are you feeling right now?"** → Shows live stress state
2. **"Which part of you hurts the most?"** → Highlights worst neighborhood on map
3. **"Is anything about to go wrong?"** → Shows predictive capability
4. **"Tell me about the Bronx."** → Shows borough personality + historical memory
5. **"Is anything beautiful happening right now?"** → Shows emotional range, ends on high note

Rehearse the map reacting to each answer. Judges will watch the map as much as the text.

---

## 18. DEPLOYMENT

- **Frontend + API routes:** Vercel (free tier) — `vercel deploy`
- **No separate backend needed** — all in Next.js API routes
- **Environment variables:** Set in Vercel dashboard
- **Domain:** Use the auto-generated `.vercel.app` URL for demo

---

## 19. DEVELOPMENT TIMELINE

### April 24 (Today)
- [ ] `npx create-next-app@latest citymind --typescript --tailwind`
- [ ] Set up folder structure per spec
- [ ] Get all 5 API keys
- [ ] Build cache.ts + all 4 fetchers
- [ ] Test raw data flowing: `console.log` each fetcher output
- [ ] Build `scoreNeighborhoods.ts` with stress algorithm
- [ ] Build `buildCityContext.ts` → CityPulse object assembler

### April 25
- [ ] Build `/api/chat` route with Claude integration
- [ ] Build `/api/pulse` route
- [ ] Write NYC system prompt in `systemPrompt.ts`
- [ ] Build Terminal.tsx with typewriter effect
- [ ] Build CityMap.tsx with Mapbox + neighborhood GeoJSON overlays
- [ ] Build VitalsBar.tsx
- [ ] Wire everything together — full conversation loop working
- [ ] Add map fly-to on neighborhood mention
- [ ] Add voice input (Web Speech API) + voice output (Speech Synthesis)
- [ ] Boot sequence animation
- [ ] Deploy to Vercel

### April 26 (Hackathon)
- [ ] Final polish pass
- [ ] Seed 5 demo scenarios
- [ ] Rehearse pitch 3x
- [ ] Have backup static screenshots if wifi fails

---

## 20. PITCH STRUCTURE (5 MINUTES)

**0:00–0:30** — Hook
> "What if New York City could tell you what's wrong before anyone files a complaint?"

**0:30–1:00** — Problem
> Cities are reactive. By the time data reaches a planner, the crisis is already happening. 311 data, MTA alerts, air quality, weather — all in separate silos, in formats nobody can read at a glance.

**1:00–4:00** — Live Demo
> Run through all 5 demo questions. Let the map do the talking.

**4:00–4:30** — Technical depth (30 seconds)
> "Under the hood: real-time data pipeline across 5 live sources, Z-score anomaly detection, and a Claude LLM agent with a historically-grounded NYC personality. Everything runs in Next.js, deployed on Vercel, zero infrastructure cost."

**4:30–5:00** — Vision
> "This is what Urban AI should feel like. Not a dashboard for experts — a voice anyone can talk to. Scale this city-wide with IoT sensors, and every city in the world gets an early warning system with a soul."

---

*CityMind — Built for Code4City 2026 | NYU CUSP*