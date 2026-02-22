use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{AuditFilters, AuditLog};
use crate::utils::{require_admin, validate_session};

/// Get audit logs with optional filters
#[tauri::command]
pub fn get_audit_logs(
    token: String,
    filters: Option<AuditFilters>,
    db: State<'_, Database>,
) -> Result<Vec<AuditLog>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let mut query = String::from(
        "SELECT id, user_id, username, action, table_name, record_id, old_values, new_values, timestamp
         FROM audit_log WHERE 1=1"
    );
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref f) = filters {
        if let Some(ref table_name) = f.table_name {
            query.push_str(" AND table_name = ?");
            params_vec.push(Box::new(table_name.clone()));
        }
        if let Some(ref action) = f.action {
            query.push_str(" AND action = ?");
            params_vec.push(Box::new(action.clone()));
        }
        if let Some(user_id) = f.user_id {
            query.push_str(" AND user_id = ?");
            params_vec.push(Box::new(user_id));
        }
        if let Some(ref from_date) = f.from_date {
            query.push_str(" AND timestamp >= ?");
            params_vec.push(Box::new(from_date.clone()));
        }
        if let Some(ref to_date) = f.to_date {
            query.push_str(" AND timestamp <= ?");
            params_vec.push(Box::new(format!("{} 23:59:59", to_date)));
        }
    }

    query.push_str(" ORDER BY timestamp DESC");

    if let Some(ref f) = filters {
        if let Some(limit) = f.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }
        if let Some(offset) = f.offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }
    } else {
        query.push_str(" LIMIT 100"); // Default limit
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let logs = stmt
        .query_map(params_slice.as_slice(), AuditLog::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(logs)
}

/// Get audit log statistics
#[tauri::command]
pub fn get_audit_stats(
    token: String,
    db: State<'_, Database>,
) -> Result<AuditStats, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM audit_log", [], |row| row.get(0))
        .unwrap_or(0);

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let today_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM audit_log WHERE timestamp >= ?",
            [&today],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let week_ago = (chrono::Utc::now() - chrono::Duration::days(7))
        .format("%Y-%m-%d")
        .to_string();
    let week_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM audit_log WHERE timestamp >= ?",
            [&week_ago],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Actions breakdown
    let mut stmt = conn
        .prepare(
            "SELECT action, COUNT(*) as count FROM audit_log
             GROUP BY action ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let actions_breakdown: Vec<(String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Tables breakdown
    let mut stmt = conn
        .prepare(
            "SELECT table_name, COUNT(*) as count FROM audit_log
             GROUP BY table_name ORDER BY count DESC",
        )
        .map_err(|e| e.to_string())?;

    let tables_breakdown: Vec<(String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Top users
    let mut stmt = conn
        .prepare(
            "SELECT COALESCE(username, 'Unknown') as name, COUNT(*) as count
             FROM audit_log GROUP BY user_id ORDER BY count DESC LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let top_users: Vec<(String, i64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(AuditStats {
        total,
        today_count,
        week_count,
        actions_breakdown,
        tables_breakdown,
        top_users,
    })
}

/// Get unique values for filter dropdowns
#[tauri::command]
pub fn get_audit_filter_options(
    token: String,
    db: State<'_, Database>,
) -> Result<AuditFilterOptions, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Get unique table names
    let mut stmt = conn
        .prepare("SELECT DISTINCT table_name FROM audit_log ORDER BY table_name")
        .map_err(|e| e.to_string())?;
    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Get unique actions
    let mut stmt = conn
        .prepare("SELECT DISTINCT action FROM audit_log ORDER BY action")
        .map_err(|e| e.to_string())?;
    let actions: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Get users with activity
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT user_id, username FROM audit_log
             WHERE user_id IS NOT NULL ORDER BY username",
        )
        .map_err(|e| e.to_string())?;
    let users: Vec<(i64, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, Option<String>>(1)?.unwrap_or_else(|| "Unknown".to_string()),
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(AuditFilterOptions {
        tables,
        actions,
        users,
    })
}

// Response types
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditStats {
    pub total: i64,
    pub today_count: i64,
    pub week_count: i64,
    pub actions_breakdown: Vec<(String, i64)>,
    pub tables_breakdown: Vec<(String, i64)>,
    pub top_users: Vec<(String, i64)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFilterOptions {
    pub tables: Vec<String>,
    pub actions: Vec<String>,
    pub users: Vec<(i64, String)>,
}
