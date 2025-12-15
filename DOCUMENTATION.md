# VMC Planner - Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Design](#database-design)
5. [Frontend Structure](#frontend-structure)
6. [Backend Structure](#backend-structure)
7. [Authentication & Security](#authentication--security)
8. [Key Features](#key-features)
9. [How to Run](#how-to-run)
10. [Default Credentials](#default-credentials)

---

## Project Overview

**VMC Planner** is a full-stack desktop application designed for managing Vertical Machining Center (VMC) operations. VMC machines are CNC (Computer Numerical Control) machines used in manufacturing for precise cutting, drilling, and shaping of materials.

### What Does This Application Do?

- **Machine Management**: Track and monitor 7 real VMC machines with their specifications, status, and maintenance history
- **Project Management**: Create and manage manufacturing projects with client associations
- **Weekly Scheduling**: Plan machine operations with a visual weekly planner showing loads, planned hours, and actual hours
- **Dashboard Analytics**: Real-time statistics on machine utilization, project progress, and operational efficiency
- **User Management**: Role-based access control for Admins, Operators, and Viewers
- **Export Capabilities**: Export schedules and reports to Excel and PDF formats

### Why This Application?

Manufacturing facilities need to efficiently allocate machine time across multiple projects. This application solves:
- **Resource Allocation**: Know which machines are available and when
- **Production Planning**: Schedule loads across the week
- **Tracking**: Monitor planned vs. actual hours for efficiency analysis
- **Maintenance Scheduling**: Prevent downtime with scheduled maintenance

---

## Technology Stack

### Frontend Technologies

| Technology | Version | What It Is | Why We Use It |
|------------|---------|------------|---------------|
| **React** | 18.3.1 | A JavaScript library for building user interfaces | React uses a component-based architecture, allowing us to build reusable UI components. It's fast due to its Virtual DOM and is the industry standard for modern web applications |
| **TypeScript** | 5.5.4 | A typed superset of JavaScript | Adds static type checking to JavaScript, catching errors at compile time rather than runtime. Makes code more maintainable and self-documenting |
| **Tailwind CSS** | 3.4.17 | A utility-first CSS framework | Allows rapid UI development with pre-built utility classes. No need to write custom CSS for most styling needs |
| **Framer Motion** | 12.23.24 | Animation library for React | Provides smooth, declarative animations for page transitions, modals, and interactive elements |
| **Lucide React** | 0.522.0 | Icon library | Provides beautiful, consistent SVG icons used throughout the interface |
| **React Router** | 6.26.2 | Navigation library for React | Handles routing and navigation within the single-page application |
| **Vite** | 5.2.0 | Build tool and development server | Extremely fast development server with Hot Module Replacement (HMR). Much faster than traditional bundlers like Webpack |

### Backend Technologies

| Technology | Version | What It Is | Why We Use It |
|------------|---------|------------|---------------|
| **Tauri** | 2.9.0 | Framework for building desktop apps | Creates lightweight desktop applications using web technologies for UI and Rust for backend. Apps are ~10x smaller than Electron apps |
| **Rust** | 2021 Edition | Systems programming language | Memory-safe, blazingly fast, and perfect for building reliable backend systems. Tauri uses Rust for native functionality |
| **SQLite** | via rusqlite 0.31 | Embedded relational database | Serverless, zero-configuration database stored in a single file. Perfect for desktop applications |
| **bcrypt** | 0.15 | Password hashing library | Industry-standard secure password hashing algorithm. Protects user passwords even if database is compromised |
| **UUID** | 1.7 | Unique identifier generator | Creates secure, random tokens for user sessions |
| **Chrono** | 0.4 | Date/time library for Rust | Handles all date and time operations in the backend |
| **Tokio** | 1.x | Async runtime for Rust | Enables asynchronous programming for non-blocking operations |

### Export Libraries

| Technology | Version | What It Is | Why We Use It |
|------------|---------|------------|---------------|
| **xlsx** | 0.18.5 | Excel file generator | Creates .xlsx Excel files for exporting schedules and reports |
| **jsPDF** | 2.5.1 | PDF generator | Creates PDF documents for printable reports |
| **jspdf-autotable** | 3.8.1 | Table plugin for jsPDF | Adds table formatting capabilities to PDF exports |

---

## Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                         │
│                     (React + TypeScript)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Dashboard│ │Projects │ │Machines │ │ Planner │ │Settings │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Tauri IPC (invoke)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                      (Rust Commands)                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Auth   │ │Machines │ │Projects │ │Schedule │ │ Alerts  │  │
│  │Commands │ │Commands │ │Commands │ │Commands │ │Commands │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    rusqlite (SQL)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│                        (SQLite)                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  users | sessions | machines | projects | schedules     │   │
│  │  clients | maintenance | alerts | audit_log             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### How Tauri Works

**Tauri** bridges the gap between web technologies and native desktop capabilities:

1. **Frontend**: Renders in a native webview (not Chromium like Electron)
2. **Backend**: Rust code runs natively on the system
3. **Communication**: Frontend calls Rust functions using `invoke()` (IPC - Inter-Process Communication)

```typescript
// Frontend calls backend command
const machines = await invoke<Machine[]>('get_machines');

// Backend receives and processes
#[tauri::command]
fn get_machines(state: State<AppState>) -> Result<Vec<Machine>, String> {
    // Access database and return data
}
```

---

## Database Design

### Entity-Relationship Overview

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│  Users  │───────│Sessions │       │ Clients │
└────┬────┘       └─────────┘       └────┬────┘
     │                                   │
     │            ┌─────────┐            │
     └───────────>│Projects │<───────────┘
                  └────┬────┘
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
     ▼                 ▼                 ▼
┌─────────┐     ┌──────────┐     ┌───────────┐
│Schedules│     │Project   │     │Project    │
│         │     │Machines  │     │Team       │
└────┬────┘     └──────────┘     └───────────┘
     │
┌────┴────┐
│Machines │
└────┬────┘
     │
     ├──────────────┐
     ▼              ▼
┌─────────┐  ┌─────────────┐
│ Alerts  │  │ Maintenance │
└─────────┘  └─────────────┘
```

### Database Tables

#### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | Store user accounts | username, password_hash, role (Admin/Operator/Viewer) |
| **sessions** | Track active login sessions | token, user_id, expires_at |
| **clients** | Customer/client information | name, contact_email, contact_phone |
| **machines** | VMC machine inventory | name, model, status, capacity, specifications |
| **projects** | Manufacturing projects | name, client_id, status, planned_hours, actual_hours |

#### Relationship Tables

| Table | Purpose | Relationship |
|-------|---------|--------------|
| **project_machines** | Link projects to machines | Many-to-Many (M:N) |
| **project_team** | Link users to projects | Many-to-Many (M:N) |

#### Operational Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **schedules** | Weekly planner entries | machine_id, date, load_name, planned_hours, actual_hours |
| **maintenance** | Maintenance records | machine_id, date, type (preventive/corrective/inspection/calibration) |
| **alerts** | System notifications | type, priority, title, message, is_read |
| **audit_log** | Change tracking | user_id, action, table_name, old_values, new_values |

### Sample SQL Schema (Schedules Table)

```sql
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    project_id INTEGER REFERENCES projects(id),
    date TEXT NOT NULL,               -- YYYY-MM-DD format
    start_time TEXT,                  -- HH:MM format
    end_time TEXT,
    operator_id INTEGER REFERENCES users(id),
    load_name TEXT,                   -- Job/load identifier
    planned_hours REAL DEFAULT 0,
    actual_hours REAL,                -- Filled in after completion
    notes TEXT,
    status TEXT DEFAULT 'scheduled',  -- scheduled/in-progress/completed/cancelled
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Frontend Structure

### Component Hierarchy

```
src/
├── index.tsx              # Application entry point with auth routing
├── App.tsx                # Main app layout with sidebar navigation
├── components/
│   ├── Login.tsx          # Authentication screen
│   ├── Dashboard.tsx      # Statistics and overview
│   ├── Projects.tsx       # Project management
│   ├── Machines.tsx       # Machine inventory
│   ├── WeeklyPlanner.tsx  # Schedule management
│   ├── Settings.tsx       # User and system settings
│   ├── Sidebar.tsx        # Navigation menu
│   ├── Header.tsx         # Top bar with search and notifications
│   └── LoadingPopup.tsx   # Animated loading overlay
├── context/
│   └── AuthContext.tsx    # Global authentication state
├── hooks/
│   ├── useAuth.ts         # Authentication operations
│   ├── useMachines.ts     # Machine CRUD operations
│   ├── useProjects.ts     # Project CRUD operations
│   ├── useSchedules.ts    # Schedule CRUD operations
│   ├── useDashboard.ts    # Dashboard statistics
│   ├── useClients.ts      # Client CRUD operations
│   └── useAlerts.ts       # Alert/notification operations
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    └── export.ts          # Excel/PDF export functions
```

### State Management

The application uses **React Context** for global state and **Custom Hooks** for data fetching:

```typescript
// AuthContext provides authentication state globally
const { user, isAuthenticated, login, logout } = useAuth();

// Custom hooks encapsulate Tauri command calls
const { machines, loading, fetchMachines } = useMachines();
```

### Key Components Explained

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **Dashboard** | Overview of operations | Machine status cards, project progress bars, weekly trends chart, recent alerts |
| **Projects** | Manage projects | CRUD operations, client assignment, machine assignment, export |
| **Machines** | Machine inventory | Status tracking, specifications, history view |
| **WeeklyPlanner** | Schedule management | Grid view (machines x days), add/edit entries, copy week function |
| **Settings** | Configuration | Change password, user management (admin), client management |

---

## Backend Structure

### Rust Module Organization

```
src-tauri/src/
├── lib.rs              # Application setup and command registration
├── main.rs             # Binary entry point
├── db/
│   ├── mod.rs          # Module exports
│   ├── connection.rs   # SQLite connection management
│   ├── schema.rs       # Table creation SQL
│   └── seed.rs         # Initial data (machines, users)
├── models/
│   ├── mod.rs          # Module exports
│   ├── user.rs         # User struct and methods
│   ├── machine.rs      # Machine struct and methods
│   ├── project.rs      # Project struct and methods
│   ├── schedule.rs     # Schedule struct and methods
│   ├── client.rs       # Client struct and methods
│   ├── maintenance.rs  # Maintenance struct and methods
│   └── alert.rs        # Alert struct and methods
└── commands/
    ├── mod.rs          # Module exports
    ├── auth.rs         # login, logout, validate_token
    ├── users.rs        # User CRUD commands
    ├── machines.rs     # Machine CRUD commands
    ├── projects.rs     # Project CRUD commands
    ├── schedules.rs    # Schedule CRUD commands
    ├── clients.rs      # Client CRUD commands
    ├── maintenance.rs  # Maintenance commands
    ├── alerts.rs       # Alert commands
    └── dashboard.rs    # Statistics aggregation
```

### Tauri Commands

Commands are Rust functions exposed to the frontend:

```rust
#[tauri::command]
async fn login(
    state: State<'_, AppState>,
    username: String,
    password: String
) -> Result<AuthResponse, String> {
    // Validate credentials
    // Create session
    // Return token and user data
}
```

**Total Commands**: ~50+ commands covering all CRUD operations

---

## Authentication & Security

### How Authentication Works

```
┌─────────────┐     1. Submit credentials     ┌─────────────┐
│   Login     │ ──────────────────────────────>│   Backend   │
│   Screen    │                                │  (Rust)     │
└─────────────┘                                └──────┬──────┘
                                                      │
                                               2. Verify password
                                                  with bcrypt
                                                      │
                                               3. Generate UUID
                                                  session token
                                                      │
┌─────────────┐     4. Return token + user     ┌──────┴──────┐
│  Frontend   │ <──────────────────────────────│   Database  │
│  (Store in  │                                │  (sessions) │
│  localStorage)                               └─────────────┘
└─────────────┘
```

### Password Security

Passwords are hashed using **bcrypt** before storage:

```rust
// When creating/updating password
let hash = bcrypt::hash(password, 12)?;  // Cost factor of 12

// When verifying login
bcrypt::verify(password, &stored_hash)?;
```

**Why bcrypt?**
- Intentionally slow to prevent brute-force attacks
- Includes salt to prevent rainbow table attacks
- Industry standard for password storage

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: CRUD all entities, user management, system configuration |
| **Operator** | Edit schedules, update machine status, log hours, create maintenance records |
| **Viewer** | Read-only access to all data, cannot modify anything |

```typescript
// Frontend role checks
const { isAdmin, isOperator, canEdit } = useAuth();

if (canEdit) {
    // Show edit button
}
```

---

## Key Features

### 1. Dashboard

**Purpose**: Provide at-a-glance overview of operations

**Key Metrics**:
- Machine status breakdown (active/idle/maintenance/error)
- Project progress percentages
- Weekly planned vs. actual hours
- Utilization and efficiency rates
- Recent alerts with priority indicators

### 2. Weekly Planner

**Purpose**: Visual scheduling of machine operations

**Layout**: Machines as ROWS, Days (Mon-Sun) as COLUMNS

```
| Machine      | Mon           | Tue           | Wed           |
|--------------|---------------|---------------|---------------|
| TAKUMI H12E  | HW BOT INS    | HW BOT INS    | KWPA BUNK     |
|              | Plan: 12h     | Plan: 24h     | Plan: 20h     |
|              | Actual: 11h   | Actual: 22h   | Actual: -     |
```

**Features**:
- Navigate between weeks
- Add/edit schedule entries
- Log actual hours after completion
- Copy entire week's schedule

### 3. Machine Management

**7 Real VMC Machines**:
1. TAKUMI H12E - Horizontal Machining Center
2. MAKINO PS65 - Vertical Machining Center
3. TAKUMI V12 - Vertical Machining Center
4. CHEVALIER NH - CNC Vertical Machining Center
5. USW 2518 - Wire EDM Machine
6. F16 - High-Speed Milling Center
7. DMC 103V - 5-Axis Universal Milling Machine

### 4. Export Functionality

**Excel Export** (.xlsx):
- Weekly schedules with all machines
- Project lists with details
- Machine inventory

**PDF Export**:
- Formatted printable reports
- Schedule summaries
- Project reports

### 5. Notification System

**Alert Types**: info, warning, error, maintenance, schedule

**Priority Levels**: low, medium, high, critical

**Features**:
- Bell icon with unread count badge
- Mark individual alerts as read
- Mark all as read
- Click to view details

### 6. Search Functionality

- Search across machines and projects
- Real-time results as you type
- Click result to navigate to relevant section

---

## How to Run

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Rust** (latest stable)
3. **Tauri CLI**

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd VMC-Planner

# 2. Install frontend dependencies
npm install

# 3. Run in development mode
npm run tauri:dev
```

### Build for Production

```bash
# Build the desktop application
npm run tauri:build

# Output will be in src-tauri/target/release/
```

### Other Commands

```bash
# Run web version only (no Tauri)
npm run dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | admin | admin123 |
| **Operator** | operator1 | operator123 |
| **Operator** | operator2 | operator123 |
| **Viewer** | viewer1 | viewer123 |

---

## Summary

**VMC Planner** demonstrates a modern full-stack desktop application architecture:

- **Frontend**: React + TypeScript with component-based architecture
- **Backend**: Rust with Tauri for native performance
- **Database**: SQLite for embedded, zero-configuration storage
- **Security**: bcrypt password hashing with session-based authentication
- **UI/UX**: Tailwind CSS for styling, Framer Motion for smooth animations

The application follows industry best practices:
- Type safety with TypeScript and Rust
- Separation of concerns (presentation, business logic, data)
- Role-based access control
- Secure authentication
- Responsive and animated user interface

---

*Documentation generated for DBMS Lab Mini Project - Semester III*
