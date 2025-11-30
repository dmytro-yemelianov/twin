# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application implementing a Digital Twin demonstration for data center infrastructure visualization. The application displays data center sites on a global map and provides detailed 3D building/room/rack/equipment visualization with sophisticated 4D life-cycle state management (As-Is, To-Be, Future phases).

## Key Technologies

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **3D Rendering**: Three.js for 3D visualization
- **UI Components**: Radix UI primitives with custom components
- **Styling**: Tailwind CSS v4
- **State Management**: React hooks and context
- **Map**: Leaflet for geographic visualization
- **Forms**: React Hook Form with Zod validation

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production build locally
pnpm start

# Run linting
pnpm lint
```

## Architecture Overview

### Component Structure
The application uses a component-based architecture with clear separation:
- `/app` - Next.js app router pages and layouts
- `/components` - Feature-specific React components
- `/components/ui` - Reusable UI components (based on Radix UI)
- `/lib` - Business logic, utilities, and data handling
- `/public/data` - Static JSON data files for sites and configurations

### Core Data Flow
1. **Sites List** (`/public/data/sites.json`) - Contains all data center locations
2. **Scene Configs** (`/public/data/configs/site-*.json`) - Per-site 3D scene definitions
3. **Device Types** (`/public/data/device-types.json`) - Catalog of equipment types

### 4D Phase System
The application implements a sophisticated phase visibility system:
- **AS_IS**: Current state (existing equipment)
- **TO_BE**: Target state (existing + new equipment)
- **FUTURE**: Long-term state (all equipment including future plans)

Phase visibility is controlled by `phaseVisibilityMap` in `/lib/types.ts`.

### Key Components
- **MapView** (`/components/map-view.tsx`) - Global site visualization
- **TwinViewer** (`/components/twin-viewer.tsx`) - 3D digital twin viewer
- **ThreeScene** (`/components/three-scene.tsx`) - Three.js scene management
- **InventoryPanel** (`/components/inventory-panel.tsx`) - Equipment table view
- **AICapacityPanel** (`/components/ai-capacity-panel.tsx`) - AI-ready capacity analysis

### Type System
Strong TypeScript types are defined in `/lib/types.ts`:
- `Status4D` - Equipment lifecycle statuses
- `Phase` - Viewing phases (AS_IS, TO_BE, FUTURE)
- `ColorMode` - Visualization color modes
- `SceneConfig` - Complete site scene definition
- `Transform` - 3D positioning data

## Important Patterns

### Data Loading
- All data is loaded from static JSON files in `/public/data/`
- No external API calls or backend dependencies
- Use the data loader utilities in `/lib/data-loader.ts`

### 3D Scene Management
- Scene building logic is in `/lib/three/scene-builder.ts`
- GLB models are loaded from `/public/geometry/`
- Device positioning uses U-height calculations (1U = 44.45mm)

### State Management
- Component-level state with React hooks
- Shared state through prop drilling or context where needed
- Selection synchronization between 3D view and inventory table

### Validation
- Input validation utilities in `/lib/validation.ts`
- Scene config validation before rendering
- U-position conflict detection for rack equipment

## Testing Approach

Currently, the project does not have automated tests configured. When implementing tests:
- Use Jest for unit testing
- React Testing Library for component testing
- Focus on critical business logic (phase visibility, AI capacity calculations)