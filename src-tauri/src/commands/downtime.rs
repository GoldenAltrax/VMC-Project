use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::utils::{require_edit_permission, require_view_permission, validate_session};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DowntimeLog {
    pub id: i64,
    pub machine_id: i64,
    pub machine_name: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub reason_category: String,
    pub description: Option<String>,
    pub duration_hours: Option<f64>,
    pub created_by: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDowntimeInput {
    pub machine_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub reason_category: String,
    pub description: Option<String>,
}

#[tauri::command]
pub fn get_downtime_log(token: String, machine_id: Option<i64>, db: State<'_, Database>) -> Result<Vec<DowntimeLog>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let sql = if machine_id.is_some() {
        "SELECT d.*, m.name as machine_name FROM downtime_log d
         LEFT JOIN machines m ON d.machine_id = m.id
         WHERE d.machine_id = ?1 ORDER BY d.start_time DESC LIMIT 100"
    } else {
        "SELECT d.*, m.name as machine_name FROM downtime_log d
         LEFT JOIN machines m ON d.machine_id = m.id
         ORDER BY d.start_time DESC LIMIT 200"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let mid = machine_id.unwrap_or(0);

    let logs: Vec<DowntimeLog> = if machine_id.is_some() {
        stmt.query_map(params![mid], |row| {
            let start: String = row.get("start_time")?;
            let end: Option<String> = row.get("end_time")?;
            let duration = end.as_ref().and_then(|e| {
                let s = chrono::NaiveDateTime::parse_from_str(&start, "%Y-%m-%dT%H:%M").ok()?;
                let en = chrono::NaiveDateTime::parse_from_str(e, "%Y-%m-%dT%H:%M").ok()?;
                Some((en - s).num_minutes() as f64 / 60.0)
            });
            Ok(DowntimeLog {
                id: row.get("id")?,
                machine_id: row.get("machine_id")?,
                machine_name: row.get("machine_name").unwrap_or_default(),
                start_time: start,
                end_time: end,
                reason_category: row.get("reason_category")?,
                description: row.get("description")?,
                duration_hours: duration,
                created_by: row.get("created_by")?,
                created_at: row.get("created_at")?,
            })
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    } else {
        stmt.query_map([], |row| {
            let start: String = row.get("start_time")?;
            let end: Option<String> = row.get("end_time")?;
            let duration = end.as_ref().and_then(|e| {
                let s = chrono::NaiveDateTime::parse_from_str(&start, "%Y-%m-%dT%H:%M").ok()?;
                let en = chrono::NaiveDateTime::parse_from_str(e, "%Y-%m-%dT%H:%M").ok()?;
                Some((en - s).num_minutes() as f64 / 60.0)
            });
            Ok(DowntimeLog {
                id: row.get("id")?,
                machine_id: row.get("machine_id")?,
                machine_name: row.get("machine_name").unwrap_or_default(),
                start_time: start,
                end_time: end,
                reason_category: row.get("reason_category")?,
                description: row.get("description")?,
                duration_hours: duration,
                created_by: row.get("created_by")?,
                created_at: row.get("created_at")?,
            })
        }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    };

    Ok(logs)
}

#[tauri::command]
pub fn create_downtime(token: String, input: CreateDowntimeInput, db: State<'_, Database>) -> Result<DowntimeLog, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute(
        "INSERT INTO downtime_log (machine_id, start_time, end_time, reason_category, description, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![input.machine_id, input.start_time, input.end_time, input.reason_category, input.description, user.id],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    let log: DowntimeLog = conn.query_row(
        "SELECT d.*, m.name as machine_name FROM downtime_log d LEFT JOIN machines m ON d.machine_id = m.id WHERE d.id = ?1",
        params![id],
        |row| {
            let start: String = row.get("start_time")?;
            let end: Option<String> = row.get("end_time")?;
            let duration = end.as_ref().and_then(|e| {
                let s = chrono::NaiveDateTime::parse_from_str(&start, "%Y-%m-%dT%H:%M").ok()?;
                let en = chrono::NaiveDateTime::parse_from_str(e, "%Y-%m-%dT%H:%M").ok()?;
                Some((en - s).num_minutes() as f64 / 60.0)
            });
            Ok(DowntimeLog {
                id: row.get("id")?,
                machine_id: row.get("machine_id")?,
                machine_name: row.get("machine_name").unwrap_or_default(),
                start_time: start,
                end_time: end,
                reason_category: row.get("reason_category")?,
                description: row.get("description")?,
                duration_hours: duration,
                created_by: row.get("created_by")?,
                created_at: row.get("created_at")?,
            })
        }
    ).map_err(|e| e.to_string())?;

    Ok(log)
}

#[tauri::command]
pub fn close_downtime(token: String, id: i64, end_time: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    conn.execute("UPDATE downtime_log SET end_time = ?1 WHERE id = ?2", params![end_time, id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_downtime(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    conn.execute("DELETE FROM downtime_log WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
