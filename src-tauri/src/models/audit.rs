use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: i64,
    pub user_id: Option<i64>,
    pub username: Option<String>,
    pub action: String,
    pub table_name: String,
    pub record_id: Option<i64>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub timestamp: String,
}

impl AuditLog {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            username: row.get("username")?,
            action: row.get("action")?,
            table_name: row.get("table_name")?,
            record_id: row.get("record_id")?,
            old_values: row.get("old_values")?,
            new_values: row.get("new_values")?,
            timestamp: row.get("timestamp")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFilters {
    pub table_name: Option<String>,
    pub action: Option<String>,
    pub user_id: Option<i64>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Dashboard statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_machines: i32,
    pub active_machines: i32,
    pub maintenance_machines: i32,
    pub idle_machines: i32,
    pub error_machines: i32,
    pub total_projects: i32,
    pub active_projects: i32,
    pub completed_projects: i32,
    pub total_clients: i32,
    pub planned_hours_week: f64,
    pub actual_hours_week: f64,
    pub planned_hours_month: f64,
    pub actual_hours_month: f64,
    pub total_planned_hours: f64,
    pub total_actual_hours: f64,
    pub utilization_rate: f64,
    pub efficiency_rate: f64,
    pub upcoming_maintenance: i32,
    pub unread_alerts: i32,
    pub machine_status: Vec<(String, i32)>,
    pub project_status: Vec<(String, i32)>,
    pub top_machines_week: Vec<(String, f64)>,
    pub weekly_trend: Vec<(String, f64, f64)>,
}
