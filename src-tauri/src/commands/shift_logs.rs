use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::utils::{require_edit_permission, require_view_permission, validate_session};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShiftLog {
    pub id: i64,
    pub machine_id: Option<i64>,
    pub machine_name: Option<String>,
    pub shift_date: String,
    pub outgoing_operator_id: Option<i64>,
    pub operator_name: Option<String>,
    pub notes: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateShiftLogInput {
    pub machine_id: Option<i64>,
    pub shift_date: String,
    pub notes: String,
}

#[tauri::command]
pub fn get_shift_logs(token: String, machine_id: Option<i64>, db: State<'_, Database>) -> Result<Vec<ShiftLog>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;
    let sql = if machine_id.is_some() {
        "SELECT sl.*, m.name as machine_name, u.full_name as operator_name
         FROM shift_logs sl LEFT JOIN machines m ON sl.machine_id = m.id LEFT JOIN users u ON sl.outgoing_operator_id = u.id
         WHERE sl.machine_id = ?1 ORDER BY sl.created_at DESC LIMIT 50"
    } else {
        "SELECT sl.*, m.name as machine_name, u.full_name as operator_name
         FROM shift_logs sl LEFT JOIN machines m ON sl.machine_id = m.id LEFT JOIN users u ON sl.outgoing_operator_id = u.id
         ORDER BY sl.created_at DESC LIMIT 100"
    };
    let mid = machine_id.unwrap_or(0);
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let logs: Vec<ShiftLog> = if machine_id.is_some() {
        stmt.query_map(params![mid], |row| Ok(ShiftLog {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            machine_name: row.get("machine_name")?,
            shift_date: row.get("shift_date")?,
            outgoing_operator_id: row.get("outgoing_operator_id")?,
            operator_name: row.get("operator_name")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
        })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    } else {
        stmt.query_map([], |row| Ok(ShiftLog {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            machine_name: row.get("machine_name")?,
            shift_date: row.get("shift_date")?,
            outgoing_operator_id: row.get("outgoing_operator_id")?,
            operator_name: row.get("operator_name")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
        })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    };
    Ok(logs)
}

#[tauri::command]
pub fn create_shift_log(token: String, input: CreateShiftLogInput, db: State<'_, Database>) -> Result<ShiftLog, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    conn.execute(
        "INSERT INTO shift_logs (machine_id, shift_date, outgoing_operator_id, notes) VALUES (?1, ?2, ?3, ?4)",
        params![input.machine_id, input.shift_date, user.id, input.notes],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let log: ShiftLog = conn.query_row(
        "SELECT sl.*, m.name as machine_name, u.full_name as operator_name FROM shift_logs sl LEFT JOIN machines m ON sl.machine_id = m.id LEFT JOIN users u ON sl.outgoing_operator_id = u.id WHERE sl.id = ?1",
        params![id],
        |row| Ok(ShiftLog {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            machine_name: row.get("machine_name")?,
            shift_date: row.get("shift_date")?,
            outgoing_operator_id: row.get("outgoing_operator_id")?,
            operator_name: row.get("operator_name")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
        })
    ).map_err(|e| e.to_string())?;
    Ok(log)
}
