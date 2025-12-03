# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 16 Digital Twin application for data center infrastructure visualization. Features interactive 3D visualization of sites, buildings, rooms, racks, and equipment with sophisticated 4D life-cycle phase management (AS_IS, TO_BE, FUTURE), anomaly detection, and capacity planning.

## Technology Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Language**: TypeScript (ES6 target, strict mode)
- **Database**: PostgreSQL via Supabase/postgres.js with Drizzle ORM
- **3D**: Three.js for visualization, GLB model loading
- **UI**: Radix UI primitives, custom components
- **Styling**: Tailwind CSS v4
- **State**: Zustand stores, React Query for server state
- **Forms**: React Hook Form + Zod validation
- **Map**: Leaflet for geographic visualization
- **Testing**: Vitest with React Testing Library
- **Package Manager**: pnpm

## Development Commands

```bash
# Core development
pnpm install          # Install dependencies
pnpm dev             # Development server (port 3000)
pnpm build           # Production build
pnpm start           # Run production build
pnpm lint            # ESLint with Next.js core-web-vitals
pnpm typecheck       # TypeScript type checking

# Testing
pnpm test            # Run tests with Vitest
pnpm test:ui         # Vitest UI mode
pnpm test:coverage   # Generate coverage report

# Database operations (requires .env.local with DATABASE_URL)
pnpm db:generate     # Generate migrations from schema changes
pnpm db:migrate      # Apply migrations to database
pnpm db:push         # Push schema directly (development)
pnpm db:studio       # Open Drizzle Studio GUI
pnpm db:seed         # Seed database with initial data
```

## Architecture

### Data Layer
- **Database Schema** (`/lib/db/schema/`): Sites → Buildings → Floors → Rooms → Racks → Devices hierarchy with anomalies tracking
- **API Routes** (`/app/api/`): RESTful endpoints for all entities (sites, devices, anomalies, etc.)
- **API Client** (`/lib/api/`): Typed client with retry logic, pagination, and file upload support
- **Services** (`/lib/services/`): Business logic for CSV import, anomaly detection, capacity analysis

### 3D Visualization
- **Scene Builder** (`/lib/three/scene-builder.ts`): Constructs Three.js scenes from SceneConfig data
- **Model Loading** (`/lib/geometry-loader.ts`): GLB model loading and caching from `/public/geometry/`
- **Components**: `ThreeScene` → `TwinViewer` orchestration with phase visibility controls

### 4D Phase System
Equipment lifecycle statuses mapped to visibility phases:
- **AS_IS**: Current state (EXISTING_RETAINED, EXISTING_REMOVED)
- **TO_BE**: Target state (+ PROPOSED, MODIFIED)
- **FUTURE**: Long-term (+ FUTURE)

Phase visibility controlled by `phaseVisibilityMap` in `/lib/types.ts`.

### State Management
- **Zustand Stores** (`/lib/stores/`): App-wide state for selection, UI, phase management
- **React Query**: Server state caching and synchronization
- **Component State**: Local state for UI interactions

## Key Patterns

### Database Operations
- All database access through Drizzle ORM
- Migrations in `/lib/db/migrations/`
- Schema definitions in `/lib/db/schema/`
- Connection pooling configured for serverless

### API Development
- Standard response format: `ApiResponse<T>` with success/error handling
- Paginated endpoints return `PaginatedResponse<T>`
- Consistent error handling with ApiClientError
- File uploads via FormData with progress tracking

### 3D Scene Management
- Device positioning uses U-height calculations (1U = 44.45mm)
- Transform data: position [x,y,z], rotationEuler [x,y,z], scale [x,y,z]
- Conflict detection for rack equipment placement
- Dynamic color modes for different visualizations

### CSV Import
- DUMM-Inventory.csv format support via `/api/sites/import`
- Automatic hierarchy creation (sites → buildings → floors → rooms → racks → devices)
- Anomaly detection during import
- Status mapping from legacy systems

## Configuration

- **TypeScript**: Build errors ignored (`ignoreBuildErrors: true` in next.config.mjs)
- **Path Alias**: `@/*` maps to project root
- **Environment**: `.env.local` for DATABASE_URL and other secrets
- **ESLint**: Allows `any` types, warns on unused vars with `_` prefix

## Data Flow

1. **Static Data** (`/public/data/`): Initial sites, scene configs, device types
2. **Database**: Persistent storage for all entities and relationships
3. **API Layer**: RESTful endpoints with typed client
4. **UI Components**: React components with Three.js integration
5. **State Sync**: Zustand for UI state, React Query for server state