use parking_lot::Mutex;
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Thread-safe database wrapper
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Create a new database connection
    pub fn new(db_path: PathBuf) -> Result<Self, rusqlite::Error> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Get the database path from app handle
    pub fn get_db_path(app_handle: &AppHandle) -> PathBuf {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data directory");

        app_data_dir.join("vmc_planner.db")
    }
}

/// Initialize the database with tables and seed data if needed
pub fn initialize_database(app_handle: &AppHandle) -> Result<Database, String> {
    let db_path = Database::get_db_path(app_handle);

    log::info!("Initializing database at: {:?}", db_path);

    let db = Database::new(db_path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Create tables
    {
        let conn = db.conn.lock();
        super::schema::create_tables(&conn)
            .map_err(|e| format!("Failed to create tables: {}", e))?;
    }

    // Run column migrations for existing databases
    {
        let conn = db.conn.lock();
        run_migrations(&conn);
    }

    // Seed initial data if database is empty
    {
        let conn = db.conn.lock();
        let user_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap_or(0);

        if user_count == 0 {
            log::info!("Database is empty, seeding initial data...");
            super::seed::seed_initial_data(&conn)
                .map_err(|e| format!("Failed to seed data: {}", e))?;
            log::info!("Initial data seeded successfully");
        }
    }

    Ok(db)
}

fn run_migrations(conn: &Connection) {
    // Add new columns to existing tables - errors ignored (column already exists)
    let migrations = [
        "ALTER TABLE machines ADD COLUMN hourly_rate REAL DEFAULT 0.0",
        "ALTER TABLE schedules ADD COLUMN setup_hours REAL DEFAULT 0.0",
        "ALTER TABLE schedules ADD COLUMN sequence_order INTEGER DEFAULT 0",
        "ALTER TABLE schedules ADD COLUMN drawing_number TEXT",
        "ALTER TABLE schedules ADD COLUMN revision TEXT",
        "ALTER TABLE schedules ADD COLUMN material TEXT",
        "ALTER TABLE projects ADD COLUMN actual_completion_date TEXT",
        "ALTER TABLE schedules ADD COLUMN cam_planned_hours REAL",
        "ALTER TABLE schedules ADD COLUMN cam_actual_hours REAL",
        "ALTER TABLE schedules ADD COLUMN cam_buffer_percentage REAL",
        "ALTER TABLE schedules ADD COLUMN job_type TEXT",
    ];
    for sql in &migrations {
        let _ = conn.execute_batch(sql);
    }
}
