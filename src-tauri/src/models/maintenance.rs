use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Maintenance {
    pub id: i64,
    pub machine_id: i64,
    pub date: String,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub performed_by: Option<i64>,
    pub cost: Option<f64>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Maintenance {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            date: row.get("date")?,
            maintenance_type: row.get("maintenance_type")?,
            description: row.get("description")?,
            performed_by: row.get("performed_by")?,
            cost: row.get("cost")?,
            status: row.get("status")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceWithMachine {
    #[serde(flatten)]
    pub maintenance: Maintenance,
    pub machine_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMaintenanceInput {
    pub machine_id: i64,
    pub date: String,
    pub maintenance_type: String,
    pub description: Option<String>,
    pub performed_by: Option<i64>,
    pub cost: Option<f64>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMaintenanceInput {
    pub date: Option<String>,
    pub maintenance_type: Option<String>,
    pub description: Option<String>,
    pub performed_by: Option<i64>,
    pub cost: Option<f64>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpcomingMaintenance {
    #[serde(flatten)]
    pub maintenance: Maintenance,
    pub machine_name: String,
    pub performer_name: Option<String>,
}
