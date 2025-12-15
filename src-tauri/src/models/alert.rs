use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: i64,
    pub alert_type: String,
    pub priority: String,
    pub title: String,
    pub message: String,
    pub machine_id: Option<i64>,
    pub project_id: Option<i64>,
    pub is_read: bool,
    pub read_at: Option<String>,
    pub created_at: String,
}

impl Alert {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            alert_type: row.get("alert_type")?,
            priority: row.get("priority")?,
            title: row.get("title")?,
            message: row.get("message")?,
            machine_id: row.get("machine_id")?,
            project_id: row.get("project_id")?,
            is_read: row.get::<_, i64>("is_read")? == 1,
            read_at: row.get("read_at")?,
            created_at: row.get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertWithDetails {
    #[serde(flatten)]
    pub alert: Alert,
    pub machine_name: Option<String>,
    pub project_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAlertInput {
    pub alert_type: String,
    pub priority: String,
    pub title: String,
    pub message: String,
    pub machine_id: Option<i64>,
    pub project_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertStats {
    pub total: i32,
    pub unread: i32,
    pub critical: i32,
    pub high: i32,
    pub by_type: Vec<(String, i32)>,
}
