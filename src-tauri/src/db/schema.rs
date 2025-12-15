use rusqlite::{Connection, Result};

/// Create all database tables
pub fn create_tables(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        -- Users table for authentication
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            role TEXT NOT NULL CHECK (role IN ('Admin', 'Operator', 'Viewer')),
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Sessions table for tracking active logins
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            is_valid INTEGER DEFAULT 1
        );

        -- Clients table
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_email TEXT,
            contact_phone TEXT,
            address TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Machines table with the 7 real VMC machines
        CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            model TEXT NOT NULL,
            serial_number TEXT,
            purchase_date TEXT,
            status TEXT NOT NULL CHECK (status IN ('active', 'idle', 'maintenance', 'error')),
            location TEXT,
            capacity TEXT CHECK (capacity IN ('Small', 'Medium', 'Large', 'Extra Large')),
            power_consumption TEXT,
            dimensions TEXT,
            weight TEXT,
            max_rpm TEXT,
            axis_travel TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Projects table
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
            description TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
            planned_hours REAL DEFAULT 0,
            actual_hours REAL DEFAULT 0,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Project-Machine many-to-many relationship
        CREATE TABLE IF NOT EXISTS project_machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, machine_id)
        );

        -- Project team members
        CREATE TABLE IF NOT EXISTS project_team (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'member',
            assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, user_id)
        );

        -- Weekly planner schedules
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
            project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            operator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            load_name TEXT,
            planned_hours REAL DEFAULT 0,
            actual_hours REAL,
            notes TEXT,
            status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Maintenance records
        CREATE TABLE IF NOT EXISTS maintenance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection', 'calibration')),
            description TEXT,
            performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            cost REAL,
            status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Alerts/Notifications
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL CHECK (alert_type IN ('info', 'warning', 'error', 'maintenance', 'schedule')),
            priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            is_read INTEGER DEFAULT 0,
            read_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Audit log for tracking changes
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            username TEXT,
            action TEXT NOT NULL,
            table_name TEXT NOT NULL,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
        CREATE INDEX IF NOT EXISTS idx_schedules_machine ON schedules(machine_id);
        CREATE INDEX IF NOT EXISTS idx_maintenance_machine ON maintenance(machine_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_machine ON alerts(machine_id);
        CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
        CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
        CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        "#,
    )?;

    Ok(())
}
