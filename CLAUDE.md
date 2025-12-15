# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VMC Planner is a Tauri v2 desktop application for machine monitoring and management (VMC = Vertical Machining Center). It's built with React + TypeScript frontend and Rust backend.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (Vite only, web browser)
npm run dev

# Run Tauri desktop app in development
npm run tauri:dev

# Build for production
npm run build

# Build Tauri app for distribution
npm run tauri:build

# Lint TypeScript/React code
npm run lint
```

## Architecture

### Frontend (src/)
- **Entry point**: `src/index.tsx` → `AppRouter.tsx` → `App.tsx`
- **Routing**: React Router with a single route; navigation uses internal state (`activeTab`) rather than URL routes
- **State management**: Local React state; authentication stored in `localStorage` (`isAuthenticated`)
- **Styling**: Tailwind CSS with dark theme (gray-800/900 backgrounds)
- **Animations**: Framer Motion for page transitions and UI interactions

### Main Views (src/components/)
- `Dashboard.tsx` - Machine status overview, maintenance schedules, alerts
- `Projects.tsx` - Project management
- `Machines.tsx` - Machine inventory/details
- `WeeklyPlanner.tsx` - Weekly scheduling
- `Settings.tsx` - App settings
- `Login.tsx` - Authentication screen
- `Sidebar.tsx` - Navigation with logout confirmation modal
- `Header.tsx` - Top header bar

### Backend (src-tauri/)
- **Tauri v2** with Rust 2021 edition
- `lib.rs` - App setup with splashscreen-to-main window transition (2.8s delay)
- `splashscreen.html` - Animated splash screen shown on app launch
- Uses `macos-private-api` feature for macOS-specific functionality

### Window Configuration
Two windows defined in `tauri.conf.json`:
1. **splashscreen** - 420x300, transparent, no decorations, shown first
2. **main** - 1280x800, resizable, hidden until splash completes

## Key Dependencies
- React 18, React Router 6
- Tauri 2.9 / @tauri-apps/api 2.9
- Framer Motion for animations
- Lucide React for icons
- Tailwind CSS 3.4
