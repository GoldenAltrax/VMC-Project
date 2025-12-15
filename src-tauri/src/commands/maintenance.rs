use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{CreateMaintenanceInput, Maintenance, UpdateMaintenanceInput, UpcomingMaintenance};
use crate::utils::{require_edit_permission, require_view_permission, validate_session};

/// Get all maintenance records
#[tauri::command]
pub fn get_all_maintenance(
    token: String,
    db: State<'_, Database>,
) -> Result<Vec<Maintenance>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare("SELECT * FROM maintenance ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let records = stmt
        .query_map([], Maintenance::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(records)
}

/// Get maintenance records for a specific machine
#[tauri::command]
pub fn get_machine_maintenance(
    token: String,
    machine_id: i64,
    db: State<'_, Database>,
) -> Result<Vec<Maintenance>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare("SELECT * FROM maintenance WHERE machine_id = ?1 ORDER BY date DESC")
        .map_err(|e| e.to_string())?;

    let records = stmt
        .query_map([machine_id], Maintenance::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(records)
}

/// Get single maintenance record
#[tauri::command]
pub fn get_maintenance(
    token: String,
    id: i64,
    db: State<'_, Database>,
) -> Result<Maintenance, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.query_row(
        "SELECT * FROM maintenance WHERE id = ?1",
        [id],
        Maintenance::from_row,
    )
    .map_err(|_| "Maintenance record not found".to_string())
}

/// Create maintenance record
#[tauri::command]
pub fn create_maintenance(
    token: String,
    input: CreateMaintenanceInput,
    db: State<'_, Database>,
) -> Result<Maintenance, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    // Validate maintenance type
    if !["preventive", "corrective", "inspection", "calibration"]
        .contains(&input.maintenance_type.as_str())
    {
        return Err("Invalid maintenance type".to_string());
    }

    // Validate status
    let status = input.status.unwrap_or_else(|| "scheduled".to_string());
    if !["scheduled", "in-progress", "completed", "cancelled"].contains(&status.as_str()) {
        return Err("Invalid status".to_string());
    }

    conn.execute(
        "INSERT INTO maintenance (machine_id, date, maintenance_type, description, performed_by, cost, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            input.machine_id,
            input.date,
            input.maintenance_type,
            input.description,
            input.performed_by,
            input.cost,
            status,
            input.notes
        ],
    )
    .map_err(|e| format!("Failed to create maintenance record: {}", e))?;

    let new_id = conn.last_insert_rowid();

    // If maintenance is in-progress, update machine status
    if status == "in-progress" {
        conn.execute(
            "UPDATE machines SET status = 'maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [input.machine_id],
        )
        .ok();
    }

    conn.query_row(
        "SELECT * FROM maintenance WHERE id = ?1",
        [new_id],
        Maintenance::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Update maintenance record
#[tauri::command]
pub fn update_maintenance(
    token: String,
    id: i64,
    input: UpdateMaintenanceInput,
    db: State<'_, Database>,
) -> Result<Maintenance, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    // Get original record for machine status update
    let original: Maintenance = conn
        .query_row("SELECT * FROM maintenance WHERE id = ?1", [id], Maintenance::from_row)
        .map_err(|_| "Maintenance record not found".to_string())?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(date) = &input.date {
        updates.push("date = ?");
        values.push(Box::new(date.clone()));
    }
    if let Some(mtype) = &input.maintenance_type {
        if !["preventive", "corrective", "inspection", "calibration"].contains(&mtype.as_str()) {
            return Err("Invalid maintenance type".to_string());
        }
        updates.push("maintenance_type = ?");
        values.push(Box::new(mtype.clone()));
    }
    if let Some(desc) = &input.description {
        updates.push("description = ?");
        values.push(Box::new(desc.clone()));
    }
    if let Some(performer) = input.performed_by {
        updates.push("performed_by = ?");
        values.push(Box::new(performer));
    }
    if let Some(cost) = input.cost {
        updates.push("cost = ?");
        values.push(Box::new(cost));
    }
    if let Some(status) = &input.status {
        if !["scheduled", "in-progress", "completed", "cancelled"].contains(&status.as_str()) {
            return Err("Invalid status".to_string());
        }
        updates.push("status = ?");
        values.push(Box::new(status.clone()));
    }
    if let Some(notes) = &input.notes {
        updates.push("notes = ?");
        values.push(Box::new(notes.clone()));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE maintenance SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update maintenance: {}", e))?;

    // Handle machine status updates based on maintenance status change
    if let Some(new_status) = &input.status {
        if new_status == "in-progress" && original.status != "in-progress" {
            // Set machine to maintenance
            conn.execute(
                "UPDATE machines SET status = 'maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                [original.machine_id],
            )
            .ok();
        } else if new_status == "completed" && original.status == "in-progress" {
            // Set machine back to idle
            conn.execute(
                "UPDATE machines SET status = 'idle', updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
                [original.machine_id],
            )
            .ok();
        }
    }

    conn.query_row(
        "SELECT * FROM maintenance WHERE id = ?1",
        [id],
        Maintenance::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Delete maintenance record
#[tauri::command]
pub fn delete_maintenance(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute("DELETE FROM maintenance WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete maintenance: {}", e))?;

    Ok(())
}

/// Get upcoming/scheduled maintenance
#[tauri::command]
pub fn get_upcoming_maintenance(
    token: String,
    days_ahead: Option<i32>,
    db: State<'_, Database>,
) -> Result<Vec<UpcomingMaintenance>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let days = days_ahead.unwrap_or(30);
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let end_date = (chrono::Utc::now() + chrono::Duration::days(days as i64))
        .format("%Y-%m-%d")
        .to_string();

    let mut stmt = conn
        .prepare(
            "SELECT m.*, ma.name as machine_name, u.full_name as performer_name
             FROM maintenance m
             LEFT JOIN machines ma ON m.machine_id = ma.id
             LEFT JOIN users u ON m.performed_by = u.id
             WHERE m.date >= ?1 AND m.date <= ?2 AND m.status IN ('scheduled', 'in-progress')
             ORDER BY m.date ASC",
        )
        .map_err(|e| e.to_string())?;

    let records: Vec<UpcomingMaintenance> = stmt
        .query_map(params![today, end_date], |row| {
            let maintenance = Maintenance::from_row(row)?;
            Ok(UpcomingMaintenance {
                maintenance,
                machine_name: row.get("machine_name")?,
                performer_name: row.get("performer_name")?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(records)
}

/// Get overdue maintenance
#[tauri::command]
pub fn get_overdue_maintenance(
    token: String,
    db: State<'_, Database>,
) -> Result<Vec<UpcomingMaintenance>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT m.*, ma.name as machine_name, u.full_name as performer_name
             FROM maintenance m
             LEFT JOIN machines ma ON m.machine_id = ma.id
             LEFT JOIN users u ON m.performed_by = u.id
             WHERE m.date < ?1 AND m.status IN ('scheduled')
             ORDER BY m.date ASC",
        )
        .map_err(|e| e.to_string())?;

    let records: Vec<UpcomingMaintenance> = stmt
        .query_map([today], |row| {
            let maintenance = Maintenance::from_row(row)?;
            Ok(UpcomingMaintenance {
                maintenance,
                machine_name: row.get("machine_name")?,
                performer_name: row.get("performer_name")?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(records)
}
