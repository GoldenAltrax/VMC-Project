use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{Alert, AlertStats, AlertWithDetails, CreateAlertInput};
use crate::utils::{require_admin, require_edit_permission, require_view_permission, validate_session};

/// Get all alerts (with optional filters)
#[tauri::command]
pub fn get_alerts(
    token: String,
    unread_only: Option<bool>,
    alert_type: Option<String>,
    limit: Option<i32>,
    db: State<'_, Database>,
) -> Result<Vec<AlertWithDetails>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut conditions = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if unread_only.unwrap_or(false) {
        conditions.push("a.is_read = 0");
    }

    if let Some(atype) = alert_type {
        conditions.push("a.alert_type = ?");
        params_vec.push(Box::new(atype));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let limit_clause = match limit {
        Some(l) => format!("LIMIT {}", l),
        None => "LIMIT 100".to_string(),
    };

    let query = format!(
        "SELECT a.*, m.name as machine_name, p.name as project_name
         FROM alerts a
         LEFT JOIN machines m ON a.machine_id = m.id
         LEFT JOIN projects p ON a.project_id = p.id
         {}
         ORDER BY a.created_at DESC
         {}",
        where_clause, limit_clause
    );

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|v| v.as_ref()).collect();

    let alerts: Vec<AlertWithDetails> = stmt
        .query_map(params.as_slice(), |row| {
            let alert = Alert::from_row(row)?;
            Ok(AlertWithDetails {
                alert,
                machine_name: row.get("machine_name")?,
                project_name: row.get("project_name")?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(alerts)
}

/// Get single alert
#[tauri::command]
pub fn get_alert(token: String, id: i64, db: State<'_, Database>) -> Result<AlertWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.query_row(
        "SELECT a.*, m.name as machine_name, p.name as project_name
         FROM alerts a
         LEFT JOIN machines m ON a.machine_id = m.id
         LEFT JOIN projects p ON a.project_id = p.id
         WHERE a.id = ?1",
        [id],
        |row| {
            let alert = Alert::from_row(row)?;
            Ok(AlertWithDetails {
                alert,
                machine_name: row.get("machine_name")?,
                project_name: row.get("project_name")?,
            })
        },
    )
    .map_err(|_| "Alert not found".to_string())
}

/// Create alert
#[tauri::command]
pub fn create_alert(
    token: String,
    input: CreateAlertInput,
    db: State<'_, Database>,
) -> Result<AlertWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    // Validate alert type
    if !["info", "warning", "error", "maintenance", "schedule"].contains(&input.alert_type.as_str())
    {
        return Err("Invalid alert type".to_string());
    }

    // Validate priority
    if !["low", "medium", "high", "critical"].contains(&input.priority.as_str()) {
        return Err("Invalid priority".to_string());
    }

    conn.execute(
        "INSERT INTO alerts (alert_type, priority, title, message, machine_id, project_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            input.alert_type,
            input.priority,
            input.title,
            input.message,
            input.machine_id,
            input.project_id
        ],
    )
    .map_err(|e| format!("Failed to create alert: {}", e))?;

    let new_id = conn.last_insert_rowid();
    drop(conn);
    get_alert(token, new_id, db)
}

/// Mark alert as read
#[tauri::command]
pub fn mark_alert_read(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.execute(
        "UPDATE alerts SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?1",
        [id],
    )
    .map_err(|e| format!("Failed to mark alert as read: {}", e))?;

    Ok(())
}

/// Mark all alerts as read
#[tauri::command]
pub fn mark_all_alerts_read(token: String, db: State<'_, Database>) -> Result<i32, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let count = conn
        .execute(
            "UPDATE alerts SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE is_read = 0",
            [],
        )
        .map_err(|e| format!("Failed to mark alerts as read: {}", e))?;

    Ok(count as i32)
}

/// Dismiss/delete alert
#[tauri::command]
pub fn dismiss_alert(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute("DELETE FROM alerts WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to dismiss alert: {}", e))?;

    Ok(())
}

/// Clear all read alerts
#[tauri::command]
pub fn clear_read_alerts(token: String, db: State<'_, Database>) -> Result<i32, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let count = conn
        .execute("DELETE FROM alerts WHERE is_read = 1", [])
        .map_err(|e| format!("Failed to clear alerts: {}", e))?;

    Ok(count as i32)
}

/// Get alert statistics
#[tauri::command]
pub fn get_alert_stats(token: String, db: State<'_, Database>) -> Result<AlertStats, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let total: i32 = conn
        .query_row("SELECT COUNT(*) FROM alerts", [], |row| row.get(0))
        .unwrap_or(0);

    let unread: i32 = conn
        .query_row("SELECT COUNT(*) FROM alerts WHERE is_read = 0", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    let critical: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM alerts WHERE priority = 'critical' AND is_read = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let high: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM alerts WHERE priority = 'high' AND is_read = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let by_type: Vec<(String, i32)> = conn
        .prepare("SELECT alert_type, COUNT(*) FROM alerts WHERE is_read = 0 GROUP BY alert_type")
        .ok()
        .and_then(|mut stmt| {
            stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                .ok()
                .map(|iter| iter.filter_map(|r| r.ok()).collect())
        })
        .unwrap_or_default();

    Ok(AlertStats {
        total,
        unread,
        critical,
        high,
        by_type,
    })
}

/// Get unread alert count (lightweight for header badge)
#[tauri::command]
pub fn get_unread_alert_count(token: String, db: State<'_, Database>) -> Result<i32, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM alerts WHERE is_read = 0", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    Ok(count)
}
