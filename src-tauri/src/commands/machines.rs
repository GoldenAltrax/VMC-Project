use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{CreateMachineInput, Machine, Maintenance, Schedule, UpdateMachineInput};
use crate::utils::{require_admin, require_edit_permission, require_view_permission, validate_session};

/// Get all machines
#[tauri::command]
pub fn get_machines(token: String, db: State<'_, Database>) -> Result<Vec<Machine>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare("SELECT * FROM machines ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let machines = stmt
        .query_map([], Machine::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(machines)
}

/// Get single machine by ID
#[tauri::command]
pub fn get_machine(token: String, id: i64, db: State<'_, Database>) -> Result<Machine, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.query_row(
        "SELECT * FROM machines WHERE id = ?1",
        [id],
        Machine::from_row,
    )
    .map_err(|_| "Machine not found".to_string())
}

/// Create new machine (Admin only)
#[tauri::command]
pub fn create_machine(
    token: String,
    input: CreateMachineInput,
    db: State<'_, Database>,
) -> Result<Machine, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Validate status
    if !["active", "idle", "maintenance", "error"].contains(&input.status.as_str()) {
        return Err("Invalid status".to_string());
    }

    conn.execute(
        "INSERT INTO machines (name, model, serial_number, purchase_date, status, location, capacity, power_consumption, dimensions, weight, max_rpm, axis_travel)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            input.name,
            input.model,
            input.serial_number,
            input.purchase_date,
            input.status,
            input.location,
            input.capacity,
            input.power_consumption,
            input.dimensions,
            input.weight,
            input.max_rpm,
            input.axis_travel
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "Machine name already exists".to_string()
        } else {
            format!("Failed to create machine: {}", e)
        }
    })?;

    let new_id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT * FROM machines WHERE id = ?1",
        [new_id],
        Machine::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Update machine (Admin or Operator)
#[tauri::command]
pub fn update_machine(
    token: String,
    id: i64,
    input: UpdateMachineInput,
    db: State<'_, Database>,
) -> Result<Machine, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = &input.name {
        updates.push("name = ?");
        values.push(Box::new(name.clone()));
    }
    if let Some(model) = &input.model {
        updates.push("model = ?");
        values.push(Box::new(model.clone()));
    }
    if let Some(serial) = &input.serial_number {
        updates.push("serial_number = ?");
        values.push(Box::new(serial.clone()));
    }
    if let Some(purchase) = &input.purchase_date {
        updates.push("purchase_date = ?");
        values.push(Box::new(purchase.clone()));
    }
    if let Some(status) = &input.status {
        if !["active", "idle", "maintenance", "error"].contains(&status.as_str()) {
            return Err("Invalid status".to_string());
        }
        updates.push("status = ?");
        values.push(Box::new(status.clone()));
    }
    if let Some(location) = &input.location {
        updates.push("location = ?");
        values.push(Box::new(location.clone()));
    }
    if let Some(capacity) = &input.capacity {
        updates.push("capacity = ?");
        values.push(Box::new(capacity.clone()));
    }
    if let Some(power) = &input.power_consumption {
        updates.push("power_consumption = ?");
        values.push(Box::new(power.clone()));
    }
    if let Some(dims) = &input.dimensions {
        updates.push("dimensions = ?");
        values.push(Box::new(dims.clone()));
    }
    if let Some(weight) = &input.weight {
        updates.push("weight = ?");
        values.push(Box::new(weight.clone()));
    }
    if let Some(rpm) = &input.max_rpm {
        updates.push("max_rpm = ?");
        values.push(Box::new(rpm.clone()));
    }
    if let Some(axis) = &input.axis_travel {
        updates.push("axis_travel = ?");
        values.push(Box::new(axis.clone()));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE machines SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update machine: {}", e))?;

    conn.query_row(
        "SELECT * FROM machines WHERE id = ?1",
        [id],
        Machine::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Update machine status only (Admin or Operator)
#[tauri::command]
pub fn update_machine_status(
    token: String,
    id: i64,
    status: String,
    db: State<'_, Database>,
) -> Result<Machine, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    if !["active", "idle", "maintenance", "error"].contains(&status.as_str()) {
        return Err("Invalid status".to_string());
    }

    conn.execute(
        "UPDATE machines SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![status, id],
    )
    .map_err(|e| format!("Failed to update status: {}", e))?;

    conn.query_row(
        "SELECT * FROM machines WHERE id = ?1",
        [id],
        Machine::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Delete machine (Admin only)
#[tauri::command]
pub fn delete_machine(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    conn.execute("DELETE FROM machines WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete machine: {}", e))?;

    Ok(())
}

/// Get machine history (schedules + maintenance)
#[tauri::command]
pub fn get_machine_history(
    token: String,
    machine_id: i64,
    db: State<'_, Database>,
) -> Result<MachineHistoryResponse, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    // Get machine
    let machine = conn
        .query_row(
            "SELECT * FROM machines WHERE id = ?1",
            [machine_id],
            Machine::from_row,
        )
        .map_err(|_| "Machine not found".to_string())?;

    // Get recent schedules
    let mut stmt = conn
        .prepare(
            "SELECT * FROM schedules WHERE machine_id = ?1 ORDER BY date DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let schedules: Vec<Schedule> = stmt
        .query_map([machine_id], Schedule::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Get maintenance records
    let mut stmt = conn
        .prepare(
            "SELECT * FROM maintenance WHERE machine_id = ?1 ORDER BY date DESC LIMIT 20",
        )
        .map_err(|e| e.to_string())?;
    let maintenance: Vec<Maintenance> = stmt
        .query_map([machine_id], Maintenance::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Get assigned projects
    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name FROM projects p
             INNER JOIN project_machines pm ON p.id = pm.project_id
             WHERE pm.machine_id = ?1 AND p.status IN ('planning', 'active')",
        )
        .map_err(|e| e.to_string())?;
    let projects: Vec<ProjectSummary> = stmt
        .query_map([machine_id], |row| {
            Ok(ProjectSummary {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(MachineHistoryResponse {
        machine,
        schedules,
        maintenance,
        assigned_projects: projects,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectSummary {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MachineHistoryResponse {
    pub machine: Machine,
    pub schedules: Vec<Schedule>,
    pub maintenance: Vec<Maintenance>,
    pub assigned_projects: Vec<ProjectSummary>,
}
