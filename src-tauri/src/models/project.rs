use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub client_id: Option<i64>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub created_by: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

impl Project {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            client_id: row.get("client_id")?,
            description: row.get("description")?,
            start_date: row.get("start_date")?,
            end_date: row.get("end_date")?,
            status: row.get("status")?,
            planned_hours: row.get("planned_hours")?,
            actual_hours: row.get("actual_hours")?,
            created_by: row.get("created_by")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectWithDetails {
    #[serde(flatten)]
    pub project: Project,
    pub client_name: Option<String>,
    pub assigned_machines: Vec<i64>,
    pub team_members: Vec<i64>,
    pub progress_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub client_id: Option<i64>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: String,
    pub planned_hours: f64,
    pub assigned_machines: Option<Vec<i64>>,
    pub team_members: Option<Vec<i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub client_id: Option<i64>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub status: Option<String>,
    pub planned_hours: Option<f64>,
    pub actual_hours: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMachine {
    pub id: i64,
    pub project_id: i64,
    pub machine_id: i64,
    pub assigned_at: String,
}

impl ProjectMachine {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            machine_id: row.get("machine_id")?,
            assigned_at: row.get("assigned_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectTeam {
    pub id: i64,
    pub project_id: i64,
    pub user_id: i64,
    pub role: String,
    pub assigned_at: String,
}

impl ProjectTeam {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            project_id: row.get("project_id")?,
            user_id: row.get("user_id")?,
            role: row.get("role")?,
            assigned_at: row.get("assigned_at")?,
        })
    }
}
