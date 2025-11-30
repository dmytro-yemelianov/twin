# Digital Twin Demo - Technical Specification

**Version**: 2.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

---

## Executive Summary

This document specifies a comprehensive demo web application for visualizing data center infrastructure through interactive 3D "digital twins." The application displays up to 800 data center sites on a global map, provides detailed 3D building/room/rack/equipment visualization for selected sites, implements sophisticated 4D life-cycle state management (As-Is, To-Be, Future phases), and includes AI-ready capacity suggestions. Built with React, Three.js, and TypeScript, all data is loaded from local JSON files and GLB models with no external backend dependencies.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [Glossary](#glossary)
4. [Tech Stack](#1-tech-stack)
5. [4D Statuses and Phases](#2-4d-statuses-and-phases-important)
6. [Color Mode Selector](#3-color-mode-selector)
7. [Views and Features](#4-views-and-features)
8. [AI-Ready Capacity Suggestion](#5-ai-ready-capacity-suggestion)
9. [Data Models and JSON Schemas](#6-data-models-and-json-schemas)
10. [Implementation Guidelines](#7-implementation-guidelines)
11. [Non-Functional Requirements](#8-non-functional-requirements)
12. [Error Handling & Edge Cases](#9-error-handling--edge-cases)
13. [Testing Strategy](#10-testing-strategy)
14. [Deployment & Environment](#11-deployment--environment)
15. [Security Considerations](#12-security-considerations)
16. [Extension Points & Future Features](#13-extension-points--future-features)
17. [Appendices](#14-appendices)

---

## Project Overview

### Goals

- Demonstrate data center infrastructure visualization at scale
- Enable stakeholders to understand physical layout and capacity
- Visualize equipment life-cycle phases (current state, planned changes, future state)
- Identify AI-ready rack capacity using heuristic algorithms
- Provide an extensible foundation for production features

### In Scope

- Global map view of ~800 data centers
- 3D visualization of selected site (building, rooms, racks, devices)
- 4D status system with three phases (As-Is, To-Be, Future)
- Synchronized 3D scene and inventory table with two-way selection
- AI-ready capacity suggestion algorithm
- Color mode UI framework (4D Status implemented, Customer/Power placeholders)
- Local JSON data loading (no backend)

### Out of Scope

- Real-time data streaming or WebSocket connections
- User authentication and authorization (future consideration)
- Database integration (all data is static JSON)
- Full implementation of Customer and Power Consumption color modes
- Mobile/tablet optimization (desktop-first)
- Advanced pathfinding or rack routing algorithms
- Cost modeling or financial calculations
- Real AI/ML model integration for capacity planning

### Assumptions & Constraints

- Users have modern desktop browsers with WebGL 2.0 support
- GLB models are pre-optimized and properly scaled
- Maximum ~800 sites visible on map simultaneously
- Maximum ~100 racks per site scene
- Device count per rack typically ≤ 42 (1U devices in full 42U rack)
- All coordinates and transforms provided are in consistent units (meters)
- Building GLB files include proper coordinate systems
- U position conflicts are avoided in source data (validation recommended)

---

## Glossary

| Term | Definition |
|------|------------|
| **4D** | Fourth dimension (time): representing equipment states across project phases |
| **As-Is Phase** | Current state of infrastructure (what exists today) |
| **To-Be Phase** | Target state after deployment project (existing + new equipment) |
| **Future Phase** | Long-term planned state (includes reserved/future capacity) |
| **U Position** | Rack unit position (vertical position in standard 19" rack, 1U ≈ 1.75") |
| **Rack** | Standard equipment enclosure, typically 42U tall |
| **Device** | Individual piece of equipment (server, switch, PDU, etc.) |
| **GLB** | Binary glTF 3D model format |
| **Digital Twin** | Virtual 3D representation of physical infrastructure |
| **AI-Ready** | Racks meeting criteria for AI/ML workload deployment (power, cooling, space) |
| **Logical Equipment ID** | Identifier for a single piece of equipment across moves/relocations |

---

## 1. Tech Stack

### Required Technologies

- **Frontend Framework**: React 18+ with Hooks (Vite preferred; CRA acceptable)
- **Language**: TypeScript (strongly preferred); ES2020+ JavaScript acceptable
- **3D Engine**: Three.js (r150+)
- **Map Library**: Leaflet with OpenStreetMap tiles OR MapLibre GL
- **UI Components**: Headless UI or Radix UI recommended for accessibility
- **Styling**: Tailwind CSS or CSS Modules

### Architecture

- **Build**: Single Page Application (SPA)
- **Rendering**: Client-side only (no SSR)
- **Data Loading**: Fetch API for JSON, GLTFLoader for 3D models
- **State Management**: React Context or lightweight state management (Zustand/Jotai acceptable)

### No External Dependencies

- No backend API calls
- No authentication services
- All data from local static files (`/public/data/`, `/public/geometry/`)

---

## 2. 4D Statuses and Phases (IMPORTANT)

### 2.1. 4D Status Values

Every **device** (and optionally rack/equipment) must have a `status4D` field with **exactly** these values:

| Status | Label | Meaning |
|--------|-------|---------|
| `EXISTING_RETAINED` | "Existing To Be Retained" | Equipment that exists now and will remain |
| `EXISTING_REMOVED` | "Existing To Be Removed" | Equipment that exists now but will be removed |
| `PROPOSED` | "Proposed" | Equipment that will be added in the deployment |
| `FUTURE` | "Future" | Reserved space or equipment planned beyond current deployment |
| `MODIFIED` | "Modified" | Equipment being relocated (exists in two positions) |

#### Modified Equipment & Logical IDs

For equipment relocations, use `logicalEquipmentId`:

- The same `logicalEquipmentId` can have **two device records**
- Both records have `status4D = "MODIFIED"`
- One record represents current location, one represents future location
- UI should indicate these are the same logical asset

**Example:**
\`\`\`json
[
  {
    "id": "dev-001-current",
    "logicalEquipmentId": "logical-switch-42",
    "rackId": "rack-01",
    "name": "Core Switch (current)",
    "uStart": 10,
    "uHeight": 2,
    "status4D": "MODIFIED"
  },
  {
    "id": "dev-001-future",
    "logicalEquipmentId": "logical-switch-42",
    "rackId": "rack-05",
    "name": "Core Switch (future)",
    "uStart": 20,
    "uHeight": 2,
    "status4D": "MODIFIED"
  }
]
\`\`\`

### 2.2. Phases

Implement a **Phase selector** with **three** phases:

| Phase | UI Label | Internal Value | Description |
|-------|----------|----------------|-------------|
| As-Is | "As-Is" | `AS_IS` | Current state (existing equipment) |
| To-Be | "To-Be" | `TO_BE` | Target state (existing + new) |
| Future | "Future" | `FUTURE` | Long-term state (all equipment) |

#### Phase Visibility Logic

\`\`\`typescript
type Status4D =
  | "EXISTING_RETAINED"
  | "EXISTING_REMOVED"
  | "EXISTING_REMOVED"
  | "PROPOSED"
  | "FUTURE"
  | "MODIFIED";

type Phase = "AS_IS" | "TO_BE" | "FUTURE";

const phaseVisibilityMap: Record<Phase, Status4D[]> = {
  AS_IS: ["EXISTING_RETAINED", "EXISTING_REMOVED"],
  TO_BE: ["EXISTING_RETAINED", "PROPOSED", "MODIFIED"],
  FUTURE: ["EXISTING_RETAINED", "PROPOSED", "FUTURE", "MODIFIED"]
};
\`\`\`

**Implementation Rules:**

1. The **Phase selector** displays UI labels but uses internal values
2. When a phase is selected, compute allowed statuses from `phaseVisibilityMap`
3. Hide devices whose `status4D` is not in the allowed set
4. Apply status-level checkboxes (see below) for additional filtering

### 2.3. Status Layer Checkboxes

Provide checkboxes for each 4D status:

- ☑ Existing To Be Retained
- ☑ Existing To Be Removed
- ☑ Proposed
- ☑ Future
- ☑ Modified

**Visibility Rule:**

A device is visible if and only if:
1. `device.status4D` is in `phaseVisibilityMap[currentPhase]`, AND
2. The checkbox for `device.status4D` is checked

**Default State:** All checkboxes checked by default

---

## 3. Color Mode Selector

### 3.1. Overview

Add a **Color Mode** dropdown in the 3D viewer UI with three options:

1. `4D Status` (fully implemented)
2. `Customer` (UI only, placeholder coloring)
3. `Power Consumption` (UI only, placeholder coloring)

### 3.2. Implementation Requirements

**For 4D Status Mode (Current Implementation):**

Define distinct colors for each status:

| Status | Suggested Color | Hex Code |
|--------|----------------|----------|
| `EXISTING_RETAINED` | Neutral Grey | `#9CA3AF` |
| `EXISTING_REMOVED` | Red | `#EF4444` |
| `PROPOSED` | Green | `#10B981` |
| `FUTURE` | Blue | `#3B82F6` |
| `MODIFIED` | Purple | `#A855F7` |

Apply colors to:
- 3D device materials (emissive or diffuse color)
- Inventory table `4D Status` column (background or text color)
- Legend/key in UI

**For Customer & Power Consumption Modes (Placeholder):**

- Keep neutral/default color scheme (all devices grey: `#9CA3AF`)
- UI must switch modes (track state)
- Code structured for easy future extension

**Visual Example:**
- Include a color legend/key visible when in 4D Status mode
- Consider colorblind-friendly palette alternatives

---

## 4. Views and Features

### 4.1. Global Map View

**Purpose:** Display all data center sites with geographic context

**Requirements:**

- Load `sites.json` (contains array of site objects)
- Render markers at each site's `lat`/`lon` coordinates
- Marker colors based on `status`:
  - `AI_READY` → Green (`#10B981`)
  - `IN_PROGRESS` → Yellow (`#FBBF24`)
  - `LEGACY` → Grey (`#6B7280`)
- Optional enhancements:
  - Marker size proportional to `rackCount`
  - Cluster markers when zoomed out (if >100 sites)

**Interactions:**

- **Hover**: Show tooltip with:
  - Site name
  - Region
  - Total rack count
  - AI-ready rack count
  - Status
- **Click**: 
  - Select the site
  - Update Site Details Panel
  - Enable "Open 3D Twin" button

**Loading State:**
- Show skeleton loader or spinner while `sites.json` is fetching
- Handle map tile loading errors gracefully

### 4.2. Site Details Panel

**Displayed When:** A site is selected on the map

**Content:**

- Site name
- Region
- Total rack count
- AI-ready racks count
- Status badge (colored)
- Brief capacity summary (e.g., "72% capacity utilized")

**Actions:**

- **"Open 3D Twin"** button:
  - Loads scene config JSON via `sceneConfigUri`
  - Transitions to 3D Twin Viewer
  - Shows loading indicator during scene load

**Error Handling:**
- If `sceneConfigUri` is missing or 404: display error message
- Provide "Back to Map" action

### 4.3. 3D Digital Twin Viewer

**Purpose:** Render detailed 3D visualization of selected site

#### Scene Hierarchy

\`\`\`
World (root Three.js Scene)
└── BuildingRoot (Group)
    ├── Building Shell (Mesh from GLB)
    └── Room Groups
        └── Room (Group, per room)
            └── Rack Groups
                └── Rack (Group, per rack)
                    ├── Rack Frame (Mesh from GLB)
                    └── Device Meshes
                        └── Device (Mesh from GLB)
\`\`\`

#### Transform Application

Apply transforms in this order:

1. **BuildingRoot**: Apply `building.transformWorld` (position, rotation, scale)
2. **Room**: Apply `room.transformInBuilding` relative to BuildingRoot
3. **Rack**: Apply `rack.positionInRoom` relative to Room
4. **Device**: Calculate position within rack based on U position

#### Device Positioning in Racks

- Each rack has `uHeight` (typically 42)
- Each device has `uStart` and `uHeight`
- Vertical offset calculation:
  \`\`\`typescript
  const U_HEIGHT_METERS = 0.04445; // 1U ≈ 44.45mm
  const deviceYOffset = uStart * U_HEIGHT_METERS;
  \`\`\`
- Position device inside rack local space at `(0, deviceYOffset, 0)`

#### Camera Controls

- **Orbit Controls**: Rotate around target point
- **Pan**: Shift + drag or middle mouse
- **Zoom**: Scroll wheel or pinch
- **Default View**: Isometric view showing entire building
- **Reset View** button: Return to default camera position

#### Lighting

Minimum lighting setup:
- 1x Directional Light (sun-like, shadows optional)
- 1x Ambient or Hemisphere Light (soft fill)

Enhanced optional:
- Shadow mapping for directional light
- SSAO (Screen Space Ambient Occlusion) for depth

#### Performance Considerations

- Use `Object3D.visible` to hide/show devices (don't remove from scene)
- Consider instancing for identical device types (optional optimization)
- Implement frustum culling (Three.js default)
- Dispose of geometries/materials when switching sites

### 4.4. 4D Controls in 3D Viewer

**UI Elements (in sidebar or toolbar):**

1. **Phase Selector**
   - Segmented control or dropdown
   - Options: "As-Is" | "To-Be" | "Future"
   - Default: "To-Be"

2. **4D Status Checkboxes**
   - Vertical list with checkboxes
   - One per status (5 total)
   - All checked by default
   - Labels match status names

3. **Color Mode Selector**
   - Dropdown with 3 options
   - Default: "4D Status"

4. **Show Building Toggle**
   - Checkbox or switch
   - Label: "Show Building Shell"
   - Default: ON
   - Controls `building.visible` property

**Behavior:**

- Phase change: immediately update device visibility
- Status checkbox toggle: immediately update device visibility
- Color mode change: immediately re-color all visible devices
- Show building toggle: immediately show/hide building mesh

**Visual Feedback:**

- Disable irrelevant status checkboxes (greyed out) when not in current phase
- Show count of visible devices: "Showing 42 of 156 devices"

### 4.5. Inventory Panel (Table) with Two-Way Sync

**Purpose:** Tabular view of equipment synchronized with 3D scene

**UI Requirements:**

- Toggle button in 3D viewer: "Inventory" (open/close panel)
- Panel slides in from right or bottom
- Paginated table: 5 rows per page
- Pagination controls: Previous | Page X of Y | Next

**Columns (minimum):**

| Column | Description | Sortable |
|--------|-------------|----------|
| Device Name | `device.name` | Yes |
| Rack | Parent rack name | Yes |
| Room | Parent room name | Yes |
| 4D Status | Color-coded status | Yes (filter) |
| Power (kW) | `device.powerKw` | Yes |
| U Position | `uStart` to `uStart + uHeight` | Yes |

**Conditional Formatting:**

- 4D Status column: background color matches 4D color scheme
- Selected row: highlight with blue background

**Data Scope:**

- Show all devices for current site (option A), OR
- Show only visible devices respecting current phase/filters (option B)
- Recommendation: Option A (all devices), with visual indicator for hidden devices

**Two-Way Selection:**

**3D → Table:**
- Click device in 3D scene
- Find corresponding row in table
- Highlight row (blue background)
- Scroll table to make row visible (if paginated away)

**Table → 3D:**
- Click row in table
- Find corresponding device in 3D scene
- Highlight device (emissive glow, outline, or color change)
- Animate camera to focus on device (optional but recommended):
  \`\`\`typescript
  // Pseudo-code
  camera.lookAt(device.position);
  controls.target = device.position;
  // Smooth animation using TWEEN or GSAP
  \`\`\`

**Additional Features:**

- Search/filter box: filter table rows by device name
- Export to CSV button (bonus feature)
- Column visibility toggles (bonus feature)

---

## 5. AI-Ready Capacity Suggestion

**Purpose:** Identify optimal rack blocks for AI workload deployment

### UI Integration

- Button in 3D viewer: **"Find AI-ready Capacity"**
- Placement: Near 4D controls or in toolbar

### Algorithm (Heuristic)

**Input:**
- All racks in current site
- Current phase selection (affects available space calculation)

**Steps:**

1. **Group racks by room**
   \`\`\`typescript
   const racksByRoom = racks.reduce((acc, rack) => {
     acc[rack.roomId] = acc[rack.roomId] || [];
     acc[rack.roomId].push(rack);
     return acc;
   }, {});
   \`\`\`

2. **For each room, sort racks**
   - By `rackOrder` field (if present), or
   - By name (alphanumeric), or
   - By position (spatial ordering)

3. **For each contiguous block of N racks** (where N = 3 to 6):
   \`\`\`typescript
   for (let blockSize = 3; blockSize <= 6; blockSize++) {
     for (let startIdx = 0; startIdx <= racks.length - blockSize; startIdx++) {
       const block = racks.slice(startIdx, startIdx + blockSize);
       // Score this block...
     }
   }
   \`\`\`

4. **Calculate block metrics:**
   \`\`\`typescript
   function scoreBlock(racks: Rack[], devices: Device[], phase: Phase) {
     let totalFreeU = 0;
     let totalPowerHeadroomKw = 0;
     
     for (const rack of racks) {
       // Get devices in this rack that are visible in current phase
       const rackDevices = devices.filter(d => 
         d.rackId === rack.id && 
         isVisibleInPhase(d.status4D, phase)
       );
       
       const usedU = rackDevices.reduce((sum, d) => sum + d.uHeight, 0);
       const freeU = rack.uHeight - usedU;
       
       const usedPower = rackDevices.reduce((sum, d) => sum + d.powerKw, 0);
       const powerHeadroom = rack.powerKwLimit - usedPower;
       
       totalFreeU += freeU;
       totalPowerHeadroomKw += powerHeadroom;
     }
     
     return { totalFreeU, totalPowerHeadroomKw };
   }
   \`\`\`

5. **Select best block:**
   - Filter blocks where `totalPowerHeadroomKw >= AI_POWER_THRESHOLD` (e.g., 20 kW)
   - Rank by `totalFreeU` (descending)
   - Return top result

**Output:**
\`\`\`typescript
interface AIReadySuggestion {
  rackIds: string[];
  roomId: string;
  totalFreeU: number;
  totalPowerHeadroomKw: number;
  summary: string; // Human-readable description
}
\`\`\`

### Visual Feedback

**In 3D Scene:**
- Highlight selected racks with distinct color (e.g., cyan glow)
- Or apply emissive material to rack frames
- Add visual labels above racks (optional)

**In UI Panel:**
- Show result card/modal with:
  - "AI-Ready Capacity Found!"
  - Room name
  - List of rack IDs/names
  - Total available U space
  - Total power headroom
  - Suggested text: "These 4 racks in Datacenter Room 1 can accommodate 84U of AI servers with 32 kW power headroom."
- Actions:
  - "View in Inventory" (filter table to show these racks)
  - "Clear Selection"
  - "Export Report" (bonus)

### Future Extension Points

- Replace heuristic with API call to backend optimization service
- Add cooling capacity calculation (BTU, airflow)
- Consider network topology (proximity to uplinks)
- Multi-objective optimization (power + space + cooling)

---

## 6. Data Models and JSON Schemas

### 6.1. Sites List (`sites.json`)

**Location:** `/public/data/sites.json`

\`\`\`json
{
  "sites": [
    {
      "id": "site-nyc-01",
      "name": "NYC-01",
      "region": "US-East",
      "lat": 40.7128,
      "lon": -74.0060,
      "rackCount": 18,
      "aiReadyRacks": 4,
      "status": "AI_READY",
      "sceneConfigUri": "data/configs/site-nyc-01.json"
    },
    {
      "id": "site-lax-03",
      "name": "LAX-03",
      "region": "US-West",
      "lat": 34.0522,
      "lon": -118.2437,
      "rackCount": 24,
      "aiReadyRacks": 0,
      "status": "LEGACY",
      "sceneConfigUri": "data/configs/site-lax-03.json"
    }
  ]
}
\`\`\`

**Schema:**

\`\`\`typescript
interface SitesList {
  sites: Site[];
}

interface Site {
  id: string;                    // Unique site identifier
  name: string;                  // Display name
  region: string;                // Geographic region
  lat: number;                   // Latitude (-90 to 90)
  lon: number;                   // Longitude (-180 to 180)
  rackCount: number;             // Total racks in site
  aiReadyRacks: number;          // Count of AI-ready racks
  status: SiteStatus;            // Current site status
  sceneConfigUri: string;        // Path to scene config JSON
}

type SiteStatus = "AI_READY" | "IN_PROGRESS" | "LEGACY";
\`\`\`

**Validation Rules:**
- `id`: Required, unique, alphanumeric with hyphens
- `lat`: Required, -90 ≤ lat ≤ 90
- `lon`: Required, -180 ≤ lon ≤ 180
- `rackCount`: Required, ≥ 0
- `aiReadyRacks`: Required, ≥ 0, ≤ rackCount
- `sceneConfigUri`: Required, valid path string

### 6.2. Scene Config per Site (`configs/site-*.json`)

**Location:** `/public/data/configs/site-{id}.json`

\`\`\`json
{
  "siteId": "site-nyc-01",
  "building": {
    "glbUri": "geometry/sites/site-nyc-01/building-shell.glb",
    "transformWorld": {
      "position": [100.0, 0.0, -50.0],
      "rotationEuler": [0.0, 1.5708, 0.0],
      "scale": [1.0, 1.0, 1.0]
    }
  },
  "rooms": [
    {
      "id": "room-DC-01",
      "name": "Datacenter Room 1",
      "transformInBuilding": {
        "position": [0.0, 0.0, 0.0],
        "rotationEuler": [0.0, 0.0, 0.0],
        "scale": [1.0, 1.0, 1.0]
      }
    },
    {
      "id": "room-DC-02",
      "name": "Datacenter Room 2",
      "transformInBuilding": {
        "position": [20.0, 0.0, 0.0],
        "rotationEuler": [0.0, 0.0, 0.0],
        "scale": [1.0, 1.0, 1.0]
      }
    }
  ],
  "racks": [
    {
      "id": "rack-01",
      "roomId": "room-DC-01",
      "name": "Rack 01",
      "uHeight": 42,
      "positionInRoom": {
        "position": [2.0, 0.0, 1.0],
        "rotationEuler": [0.0, 0.0, 0.0],
        "scale": [1.0, 1.0, 1.0]
      },
      "powerKwLimit": 10.0,
      "currentPowerKw": 6.0,
      "rackOrder": 1
    },
    {
      "id": "rack-02",
      "roomId": "room-DC-01",
      "name": "Rack 02",
      "uHeight": 42,
      "positionInRoom": {
        "position": [2.6, 0.0, 1.0],
        "rotationEuler": [0.0, 0.0, 0.0],
        "scale": [1.0, 1.0, 1.0]
      },
      "powerKwLimit": 10.0,
      "currentPowerKw": 4.2,
      "rackOrder": 2
    }
  ],
  "devices": [
    {
      "id": "dev-001",
      "logicalEquipmentId": "logical-001",
      "rackId": "rack-01",
      "deviceTypeId": "server-2u",
      "name": "App Server 1",
      "uStart": 10,
      "uHeight": 2,
      "status4D": "EXISTING_RETAINED",
      "powerKw": 0.8,
      "customer": "CustomerA"
    },
    {
      "id": "dev-002",
      "logicalEquipmentId": "logical-002",
      "rackId": "rack-01",
      "deviceTypeId": "switch-1u",
      "name": "Network Switch",
      "uStart": 1,
      "uHeight": 1,
      "status4D": "EXISTING_REMOVED",
      "powerKw": 0.3,
      "customer": "Internal"
    },
    {
      "id": "dev-003",
      "logicalEquipmentId": "logical-003",
      "rackId": "rack-02",
      "deviceTypeId": "server-4u",
      "name": "AI Training Server",
      "uStart": 20,
      "uHeight": 4,
      "status4D": "PROPOSED",
      "powerKw": 2.5,
      "customer": "CustomerB"
    }
  ]
}
\`\`\`

**Schema:**

\`\`\`typescript
interface SceneConfig {
  siteId: string;
  building: Building;
  rooms: Room[];
  racks: Rack[];
  devices: Device[];
}

interface Building {
  glbUri: string;
  transformWorld: Transform;
}

interface Room {
  id: string;
  name: string;
  transformInBuilding: Transform;
}

interface Rack {
  id: string;
  roomId: string;                 // Foreign key to Room
  name: string;
  uHeight: number;                // Typically 42
  positionInRoom: Transform;
  powerKwLimit: number;           // Maximum power capacity
  currentPowerKw: number;         // Current power usage
  rackOrder?: number;             // Optional: ordering within room
}

interface Device {
  id: string;
  logicalEquipmentId: string;     // For tracking across moves
  rackId: string;                 // Foreign key to Rack
  deviceTypeId: string;           // Foreign key to DeviceType
  name: string;
  uStart: number;                 // Starting U position (1-based)
  uHeight: number;                // Height in U (1, 2, 4, etc.)
  status4D: Status4D;
  powerKw: number;
  customer?: string;              // Optional: for Customer color mode
  powerConsumptionLevel?: string; // Optional: for Power color mode
}

interface Transform {
  position: [number, number, number];      // [x, y, z] in meters
  rotationEuler: [number, number, number]; // [x, y, z] in radians
  scale: [number, number, number];         // [x, y, z] scale factors
}
\`\`\`

**Validation Rules:**
- `uStart`: Required, 1 ≤ uStart ≤ rack.uHeight
- `uHeight`: Required, ≥ 1
- `uStart + uHeight`: Must be ≤ rack.uHeight + 1
- No overlapping devices in same rack (validate `uStart` ranges)
- `powerKw`: Required, ≥ 0
- Sum of device `powerKw` in rack should ≤ `rack.currentPowerKw`

### 6.3. Device Types (`device-types.json`)

**Location:** `/public/data/device-types.json`

\`\`\`json
{
  "deviceTypes": [
    {
      "id": "rack-42u",
      "category": "RACK",
      "modelRef": "geometry/global/rack-42u.glb",
      "uHeight": 42,
      "description": "Standard 42U server rack"
    },
    {
      "id": "server-2u",
      "category": "SERVER",
      "modelRef": "geometry/global/server-2u.glb",
      "uHeight": 2,
      "description": "2U rackmount server"
    },
    {
      "id": "server-4u",
      "category": "SERVER",
      "modelRef": "geometry/global/server-4u.glb",
      "uHeight": 4,
      "description": "4U high-density AI server"
    },
    {
      "id": "switch-1u",
      "category": "SWITCH",
      "modelRef": "geometry/global/switch-1u.glb",
      "uHeight": 1,
      "description": "1U network switch"
    },
    {
      "id": "pdu-0u",
      "category": "PDU",
      "modelRef": "geometry/global/pdu-vertical.glb",
      "uHeight": 0,
      "description": "Vertical PDU (0U, mounted to rack sides)"
    }
  ]
}
\`\`\`

**Schema:**

\`\`\`typescript
interface DeviceTypesList {
  deviceTypes: DeviceType[];
}

interface DeviceType {
  id: string;
  category: DeviceCategory;
  modelRef: string;           // Path to GLB file
  uHeight: number;            // Height in U (0 for vertical PDUs)
  description?: string;       // Optional description
}

type DeviceCategory = "RACK" | "SERVER" | "SWITCH" | "PDU" | "STORAGE" | "OTHER";
\`\`\`

**Validation Rules:**
- `id`: Required, unique, alphanumeric with hyphens
- `modelRef`: Required, valid path to GLB file
- `uHeight`: Required, ≥ 0
- `category`: Required, one of allowed values

---

## 7. Implementation Guidelines

### 7.1. Project Structure

\`\`\`
digital-twin-demo/
├── public/
│   ├── data/
│   │   ├── sites.json
│   │   ├── device-types.json
│   │   └── configs/
│   │       ├── site-nyc-01.json
│   │       └── site-lax-03.json
│   └── geometry/
│       ├── global/
│       │   ├── rack-42u.glb
│       │   ├── server-2u.glb
│       │   └── switch-1u.glb
│       └── sites/
│           └── site-nyc-01/
│               └── building-shell.glb
├── src/
│   ├── components/
│   │   ├── MapView/
│   │   │   ├── MapView.tsx
│   │   │   ├── SiteMarker.tsx
│   │   │   └── SiteTooltip.tsx
│   │   ├── SitePanel/
│   │   │   └── SitePanel.tsx
│   │   ├── TwinViewer/
│   │   │   ├── TwinViewer.tsx
│   │   │   ├── Scene3D.tsx
│   │   │   ├── Controls4D.tsx
│   │   │   ├── ColorModeSelector.tsx
│   │   │   └── AICapacityButton.tsx
│   │   └── InventoryPanel/
│   │       ├── InventoryPanel.tsx
│   │       ├── DeviceTable.tsx
│   │       └── Pagination.tsx
│   ├── lib/
│   │   ├── three/
│   │   │   ├── SceneManager.ts
│   │   │   ├── GLBLoader.ts
│   │   │   ├── TransformUtils.ts
│   │   │   ├── DevicePositioning.ts
│   │   │   └── MaterialUtils.ts
│   │   ├── data/
│   │   │   └── DataLoader.ts
│   │   └── algorithms/
│   │       └── AICapacityFinder.ts
│   ├── context/
│   │   └── AppContext.tsx
│   ├── types/
│   │   ├── Site.ts
│   │   ├── SceneConfig.ts
│   │   ├── DeviceType.ts
│   │   └── Phase.ts
│   ├── hooks/
│   │   ├── useSites.ts
│   │   ├── useSceneConfig.ts
│   │   └── useDeviceSelection.ts
│   ├── utils/
│   │   ├── phaseVisibility.ts
│   │   └── colorSchemes.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
\`\`\`

### 7.2. State Management

**Global State (via React Context or Zustand):**

\`\`\`typescript
interface AppState {
  // Site selection
  selectedSiteId: string | null;
  selectedSite: Site | null;
  sceneConfig: SceneConfig | null;
  
  // Phase & filters
  currentPhase: Phase;
  statusVisibility: Record<Status4D, boolean>;
  colorMode: ColorMode;
  
  // UI state
  showBuilding: boolean;
  inventoryPanelOpen: boolean;
  
  // Selection
  selectedDeviceId: string | null;
  
  // AI capacity
  aiSuggestion: AIReadySuggestion | null;
  
  // Loading states
  isLoadingSites: boolean;
  isLoadingScene: boolean;
  error: string | null;
}
\`\`\`

**Actions:**
- `selectSite(siteId: string)`
- `loadSceneConfig(uri: string)`
- `setPhase(phase: Phase)`
- `toggleStatusVisibility(status: Status4D)`
- `setColorMode(mode: ColorMode)`
- `toggleBuilding()`
- `selectDevice(deviceId: string | null)`
- `findAICapacity()`

### 7.3. 3D Scene Management

**SceneManager Class Pattern:**

\`\`\`typescript
class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  private buildingGroup: THREE.Group;
  private roomGroups: Map<string, THREE.Group>;
  private rackGroups: Map<string, THREE.Group>;
  private deviceMeshes: Map<string, THREE.Mesh>;
  
  constructor(canvas: HTMLCanvasElement) { /* ... */ }
  
  async loadScene(config: SceneConfig, deviceTypes: DeviceType[]) { /* ... */ }
  
  updatePhaseFilters(phase: Phase, statusVisibility: Record<Status4D, boolean>) {
    // Update device.visible based on filters
  }
  
  updateColorMode(mode: ColorMode, devices: Device[]) {
    // Update materials based on color mode
  }
  
  highlightDevice(deviceId: string | null) {
    // Add emissive glow or outline
  }
  
  focusCameraOnDevice(deviceId: string) {
    // Animate camera to device position
  }
  
  dispose() {
    // Clean up resources
  }
}
\`\`\`

### 7.4. Performance Optimization

**GLB Model Caching:**
\`\`\`typescript
class GLBCache {
  private cache = new Map<string, THREE.Group>();
  
  async load(uri: string): Promise<THREE.Group> {
    if (this.cache.has(uri)) {
      return this.cache.get(uri)!.clone();
    }
    const gltf = await loader.loadAsync(uri);
    this.cache.set(uri, gltf.scene);
    return gltf.scene.clone();
  }
}
\`\`\`

**Device Visibility Management:**
- Use `Object3D.visible = false` instead of removing from scene
- Batch visibility updates in single frame
- Avoid re-creating geometries on filter changes

**Rendering:**
- Target 60 FPS on desktop
- Use `requestAnimationFrame` for render loop
- Implement simple frustum culling (Three.js default)

### 7.5. Code Style Standards

**TypeScript:**
- Strict mode enabled
- Explicit return types for functions
- Use interfaces for data structures, types for unions
- Avoid `any`, prefer `unknown` if type is truly unknown

**React:**
- Functional components with hooks
- Custom hooks for reusable logic
- Memoization (`useMemo`, `useCallback`) for expensive computations
- Prop types via TypeScript interfaces

**Naming Conventions:**
- Components: PascalCase (`MapView.tsx`)
- Files: kebab-case (`device-positioning.ts`) or PascalCase for components
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

**Formatting:**
- ESLint + Prettier
- 2-space indentation
- Single quotes for strings
- Trailing commas in arrays/objects

---

## 8. Non-Functional Requirements

### 8.1. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load time | < 3 seconds | Time to first map render |
| 3D scene load | < 5 seconds | Time to render 100-device scene |
| Map with 800 markers | < 2 seconds | Render all site markers |
| Frame rate (3D) | ≥ 30 FPS | Consistent during orbit/zoom |
| Phase filter toggle | < 100ms | Update device visibility |
| Table pagination | < 50ms | Switch between pages |

**Optimization Strategies:**
- Lazy load scene configs (only when site selected)
- GLB model caching (reuse geometries)
- Debounce user input (search, filters)
- Virtual scrolling for large tables (if >1000 devices)
- Web Workers for AI capacity algorithm (if needed)

### 8.2. Browser & Device Support

**Supported Browsers:**
- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Requirements:**
- WebGL 2.0 support (mandatory)
- ES2020+ JavaScript support
- Minimum 4GB RAM
- Dedicated GPU recommended for large scenes

**Not Supported:**
- Mobile browsers (future consideration)
- IE11 or older browsers
- Browsers without WebGL

**Detection:**
- Show warning if WebGL not available
- Graceful degradation: show 2D fallback map only

### 8.3. Accessibility Requirements

**Keyboard Navigation:**
- All interactive elements focusable via Tab
- Enter/Space to activate buttons
- Arrow keys for table navigation
- Escape to close modals/panels

**Screen Reader Support:**
- ARIA labels on all controls
- ARIA live regions for dynamic content updates
- Semantic HTML (nav, main, article, aside)
- Alt text for informational graphics

**Visual Accessibility:**
- WCAG 2.1 AA contrast ratios (4.5:1 for text)
- Colorblind-friendly palette option
- Focus indicators visible (2px outline)
- Text resizable up to 200% without breaking layout

**3D Visualization Accessibility:**
- Provide text alternatives for 3D data (inventory table)
- Describe key findings in text (AI capacity results)
- Don't rely solely on color to convey information

---

## 9. Error Handling & Edge Cases

### 9.1. Data Loading Errors

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| `sites.json` 404 or network error | Show error banner: "Unable to load sites. Please refresh." Provide retry button. |
| `sites.json` invalid JSON | Show error: "Data format error. Please contact support." Log details to console. |
| Scene config 404 | Show in Site Panel: "3D model unavailable for this site." Disable "Open 3D Twin" button. |
| Scene config malformed | Show error modal: "Scene data is corrupted." Provide "Back to Map" button. |
| GLB model 404 | Show placeholder cube/box in 3D scene. Log warning. Continue rendering other models. |
| GLB model corrupted | Show placeholder geometry. Display warning in UI: "Some models failed to load." |

### 9.2. 3D Scene Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Zero racks in scene | Show message: "No racks in this site." Don't crash. |
| Zero devices in rack | Render empty rack frame. Allow selection. |
| Device U position conflict (overlap) | Log warning. Render both devices (stacked). Add validation check. |
| Device `uStart + uHeight > rack.uHeight` | Clamp device position to rack bounds. Log warning. |
| Missing device type | Use fallback cube geometry. Log error. |
| Huge scene (>500 racks) | Show warning: "Large scene may impact performance." Offer simplified view. |
| No AI-ready capacity found | Show message: "No suitable rack blocks found. Try adjusting filters." |

### 9.3. User Input Validation

| Input | Validation |
|-------|------------|
| Phase selection | Constrained to dropdown options (no validation needed) |
| Status checkbox | Boolean only (no validation needed) |
| Table search | Sanitize input (prevent XSS). Max 100 characters. |
| Device selection | Check device exists before highlighting. Handle null gracefully. |

### 9.4. State Consistency

- **Stale data**: Refresh scene when switching sites (dispose old scene)
- **Race conditions**: Cancel pending data fetches when new request starts
- **Memory leaks**: Dispose Three.js objects when unmounting components
- **Sync issues (3D ↔ Table)**: Use single source of truth (`selectedDeviceId` in global state)

---

## 10. Testing Strategy

### 10.1. Unit Testing

**Test Frameworks:** Jest + React Testing Library

**Key Areas:**
- Phase visibility logic (`phaseVisibilityMap`)
- Device filtering functions
- AI capacity heuristic algorithm
- Transform application utilities
- Data validation functions

**Example Test:**
\`\`\`typescript
describe('phaseVisibility', () => {
  it('should show only EXISTING statuses in AS_IS phase', () => {
    const device1 = { status4D: 'EXISTING_RETAINED' };
    const device2 = { status4D: 'PROPOSED' };
    
    expect(isVisibleInPhase(device1, 'AS_IS')).toBe(true);
    expect(isVisibleInPhase(device2, 'AS_IS')).toBe(false);
  });
});
\`\`\`

### 10.2. Integration Testing

**Tools:** Cypress or Playwright

**Key Workflows:**
1. **Map to 3D workflow:**
   - Load app → see map with markers
   - Click site marker → Site Panel opens
   - Click "Open 3D Twin" → 3D scene loads
   - Assert: building and racks visible

2. **Phase filtering:**
   - Load 3D scene in "As-Is" phase
   - Assert: only EXISTING devices visible
   - Change to "To-Be" phase
   - Assert: EXISTING_RETAINED + PROPOSED visible

3. **Two-way selection:**
   - Click device in 3D → Table row highlights
   - Click different table row → 3D device highlights

4. **AI capacity:**
   - Click "Find AI-ready Capacity" button
   - Assert: result panel appears with rack IDs
   - Assert: racks highlighted in 3D scene

### 10.3. Visual Regression Testing

**Tool:** Percy or Chromatic

**Screenshots:**
- Map view with 10+ sites
- Site Panel (open state)
- 3D scene (As-Is, To-Be, Future phases)
- Each color mode
- Inventory table (first page, selected row)
- AI capacity result panel

### 10.4. Manual Testing Checklist

- [ ] All sites load on map
- [ ] Marker colors match site status
- [ ] Tooltips show correct data
- [ ] 3D scene loads for each sample site
- [ ] Phase selector changes visibility correctly
- [ ] Status checkboxes work
- [ ] Color modes switch correctly
- [ ] Building toggle works
- [ ] Inventory table pagination works
- [ ] 3D → Table selection sync works
- [ ] Table → 3D selection sync works
- [ ] AI capacity button returns results
- [ ] AI capacity highlights racks
- [ ] Keyboard navigation works
- [ ] Accessible to screen readers (basic test)
- [ ] Performance acceptable (30+ FPS)

---

## 11. Deployment & Environment

### 11.1. Development Setup

**Prerequisites:**
- Node.js 18+ and npm 9+
- Modern browser with WebGL 2.0
- Git

**Installation:**
\`\`\`bash
git clone <repository-url>
cd digital-twin-demo
npm install
npm run dev
\`\`\`

**Development Server:**
- Vite dev server at `http://localhost:5173`
- Hot module replacement enabled

### 11.2. Build for Production

\`\`\`bash
npm run build
npm run preview  # Test production build locally
\`\`\`

**Output:** `/dist` folder with static assets

### 11.3. Deployment Options

**Recommended Platforms:**
- Vercel (zero-config deployment)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

**Configuration:**
- SPA routing: Configure redirects to `index.html`
- Caching: Set aggressive caching for `/geometry/*` and `/data/*` (immutable assets)

**Environment Variables:**
- None required for demo (all data is local)
- Future: `VITE_API_BASE_URL` for backend integration

### 11.4. Asset Management

**GLB Files:**
- Keep individual files < 5MB
- Use glTF compression (Draco or meshopt)
- Host on CDN for production (optional)

**JSON Files:**
- Minify for production (Vite handles this)
- Consider splitting large scene configs if > 1MB

---

## 12. Security Considerations

### 12.1. Current Demo Security

**Input Sanitization:**
- Sanitize table search input to prevent XSS
- Validate JSON data structure after loading
- Use DOMPurify for any user-generated content

**Content Security Policy (CSP):**
\`\`\`
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https://tile.openstreetmap.org; 
  connect-src 'self';
\`\`\`

**No Authentication:**
- Demo is public-facing (no sensitive data)
- No PII or confidential information in JSON files

### 12.2. Future Production Security

**When Adding Backend:**
- Implement JWT or session-based auth
- Use HTTPS only (HSTS header)
- Implement rate limiting on API endpoints
- Validate all inputs server-side

**Data Privacy:**
- Anonymize customer names in public demos
- Implement role-based access control (RBAC)
- Audit logging for sensitive actions

**Third-Party Dependencies:**
- Regular `npm audit` checks
- Keep dependencies updated
- Use Dependabot or Renovate for automated updates

---

## 13. Extension Points & Future Features

### 13.1. Customer Color Mode

**Data Required:**
- Add `customer` field to `Device` interface (already in schema)

**Implementation:**
- Define color palette for customers (max 10 distinct colors)
- Hash customer name to assign consistent color
- Update `MaterialUtils.ts` to apply customer colors

**UI:**
- Add legend showing customer → color mapping
- Filter devices by customer (checkbox list)

### 13.2. Power Consumption Color Mode

**Data Required:**
- Add `powerConsumptionLevel` field: "LOW" | "MEDIUM" | "HIGH"
- Or use continuous scale based on `powerKw` value

**Implementation:**
- Define heat map color scale (green → yellow → red)
- Map power levels to colors
- Update materials dynamically

**UI:**
- Add color scale legend (gradient bar)
- Show power statistics panel (total, average, peak)

### 13.3. Backend Integration

**API Endpoints:**
- `GET /api/sites` - Dynamic site list
- `GET /api/sites/:id/scene` - Scene config
- `POST /api/ai-capacity` - AI optimization endpoint
- `GET /api/device-types` - Device type catalog

**Authentication:**
- Add login page
- Store JWT in localStorage or httpOnly cookie
- Include auth token in API requests

**Real-Time Updates:**
- WebSocket connection for live device status updates
- Show "Live" indicator in UI
- Handle connection loss gracefully

### 13.4. Advanced Features

**Collision Detection:**
- Prevent overlapping device U positions in UI
- Visual feedback when attempting invalid placement

**Drag & Drop Planning:**
- Allow dragging devices between racks (proposed equipment)
- Update `status4D` to "PROPOSED" on drop
- Calculate power/space constraints in real-time

**Historical Playback:**
- Timeline scrubber to view past states
- Animate transitions between phases
- Show "time-travel" feature for project visualization

**Reporting & Export:**
- Generate PDF reports with 3D screenshots
- Export device inventory to Excel
- Share specific views via URL (deep linking)

**Multi-Site Comparison:**
- Side-by-side 3D viewer for two sites
- Capacity comparison dashboard
- Cross-site capacity optimization

---

## 14. Appendices

### 14.1. JSON Schema Definitions

**JSONSchema for `sites.json`:**

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["sites"],
  "properties": {
    "sites": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "region", "lat", "lon", "rackCount", "aiReadyRacks", "status", "sceneConfigUri"],
        "properties": {
          "id": { "type": "string", "pattern": "^[a-zA-Z0-9-]+$" },
          "name": { "type": "string", "minLength": 1 },
          "region": { "type": "string" },
          "lat": { "type": "number", "minimum": -90, "maximum": 90 },
          "lon": { "type": "number", "minimum": -180, "maximum": 180 },
          "rackCount": { "type": "integer", "minimum": 0 },
          "aiReadyRacks": { "type": "integer", "minimum": 0 },
          "status": { "enum": ["AI_READY", "IN_PROGRESS", "LEGACY"] },
          "sceneConfigUri": { "type": "string" }
        }
      }
    }
  }
}
\`\`\`

### 14.2. Sample Data Generators

For testing, consider generating sample data:

\`\`\`typescript
function generateSampleSites(count: number): Site[] {
  const regions = ["US-East", "US-West", "EU-Central", "APAC"];
  const statuses: SiteStatus[] = ["AI_READY", "IN_PROGRESS", "LEGACY"];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `site-${String(i).padStart(3, '0')}`,
    name: `Site ${String(i).padStart(3, '0')}`,
    region: regions[i % regions.length],
    lat: -90 + Math.random() * 180,
    lon: -180 + Math.random() * 360,
    rackCount: Math.floor(Math.random() * 50) + 10,
    aiReadyRacks: Math.floor(Math.random() * 10),
    status: statuses[i % statuses.length],
    sceneConfigUri: `data/configs/site-${String(i).padStart(3, '0')}.json`
  }));
}
\`\`\`

### 14.3. Performance Profiling

**Chrome DevTools:**
- Use Performance tab to record 3D scene load
- Check for long tasks (> 50ms)
- Monitor memory usage (Heap snapshots)

**Three.js Stats:**
\`\`\`typescript
import Stats from 'three/examples/jsm/libs/stats.module';

const stats = Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // ... render logic
  stats.end();
}
\`\`\`

**Lighthouse:**
- Run Lighthouse audit for performance score
- Target: > 90 on performance metric

### 14.4. Useful Resources

**Three.js:**
- [Three.js Documentation](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)

**Leaflet:**
- [Leaflet Quick Start Guide](https://leafletjs.com/examples/quick-start/)

**React + TypeScript:**
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

**WebGL:**
- [WebGL Fundamentals](https://webglfundamentals.org/)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-Q1 | Initial Team | Original specification |
| 2.0 | 2024 | v0 | Comprehensive improvements, added NFRs, error handling, testing, accessibility, deployment, security |

---

## Approval & Sign-Off

This specification has been enhanced with industry best practices and is ready for implementation.

**Next Steps:**
1. Review and approve this specification
2. Set up development environment
3. Create sample data files
4. Begin implementation (recommend starting with Map View → Site Panel → basic 3D scene)
5. Iterate with regular demos and feedback

---

**End of Specification**
