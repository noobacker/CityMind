<div align="center">
  <img src="app/icon.svg" width="120" height="120" alt="CityMind Logo" />
  <h1>CityMind</h1>
  <p><strong>The city always had a pulse. Now it has a mind.</strong></p>
</div>

---

### 🏙️ What is CityMind?
CityMind is a real-time **Planetary Urban Intelligence Engine** that transforms raw municipal data into a living, queryable nervous system. Originally born from the data-rich streets of New York, it has evolved into a global platform that ingests high-velocity streams—from municipal service requests and global transit disruptions to atmospheric vitals and hyper-local events—every 30 seconds to provide a high-fidelity visual of any city's collective stress.

The goal is to bridge the gap between "what" is happening in our urban centers and "why" it matters to the people living within them. CityMind turns cold, fragmented metrics into empathetic, actionable narratives for a connected planet.

---

### ⚡ Neural Features

#### 🟢 Live Pulse Monitoring
CityMind computes a real-time **Stress Score (0–100)** for every urban node, visualized on an interactive geospatial grid. While initially optimized for NYC, the engine now scales globally by standardizing disparate urban data into a unified sensory mesh:

*   **Global Municipal Adapters**: Unified ingestion of service requests (311/OpenData) via standardized SODA adapters for any supported city worldwide.
*   **Planetary Transit Feed**: Live multi-modal health monitoring powered by global **GTFS-RT** (General Transit Feed Specification Realtime) streams.
*   **Atmospheric Vitals**: Real-time air quality and meteorological data sourced from planetary sensor networks (Open-Meteo & IQAir).
*   **Social Mesh Mapping**: Dynamic tracking of global public events and infrastructure load to measure the "vibe" and stress of a district.


#### 💬 Natural Language Console
Type any question about the city—*"What's the single biggest pressure in this district right now?"*—and CityMind answers using live pulse data. Powered by **Anthropic Claude**, the system maintains a context-aware conversation that syncs with the map.

#### 🔮 Predictive T+24H Forecast
Toggle to the future. CityMind projects stress levels 24 hours ahead by layering:
*   **Weather Multipliers**: High heat or storms increase projected stress.
*   **Event Affinities**: Scheduled parades or concerts impact specific districts.
*   **Transit Forecasts**: Planned maintenance and service changes.

#### 🏗️ Policy Sandbox
A real-world simulation tool. Drag-and-drop city resources—**PD Units, Sanitation Crews, EMS Response, Transit Repair**—onto the map to see projected stress reduction based on resource affinity and proximity.

#### 🚨 Anomaly Detection
Instant alerts triggered when neighborhood stress exceeds historical statistical thresholds. The system identifies genuine "spikes" versus normal urban noise, flagging them visually on the map.

---

### 🛠️ Core Tech Stack
*   **Framework**: Next.js 15 (App Router), TypeScript 5
*   **UI & 3D**: Tailwind CSS, Three.js (React Three Fiber), Framer Motion
*   **Geospatial**: Mapbox GL JS 3 (Globe projection)
*   **Intelligence**: Claude 3.5 API with live context-injection
*   **Live Feeds**: Municipal Open Data (SODA), Global Transit Alerts (GTFS-RT), Open-Meteo, IQAir

---

### 🚀 Quick Start
1. **Clone the repository**:
   ```bash
   git clone https://github.com/noobacker/CityMind
   cd CityMind
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Copy `.env.example` to `.env.local` and add your keys:
   *   `NEXT_PUBLIC_MAPBOX_TOKEN`: From Mapbox
   *   `ANTHROPIC_API_KEY`: From Anthropic
   *   `GROQ_API_KEY`: (Optional for Whisper/Speech)
4. **Launch the grid**:
   ```bash
   npm run dev
   ```

---

### 🤝 Contributing
CityMind is an open-source experiment in **Empathetic Urbanism**. We are actively accepting contributions!

**Open an issue or submit a PR. Let's build the self-aware city together.**

---
*Built for the Code4City Hackathon by [noobacker](https://github.com/noobacker).*
