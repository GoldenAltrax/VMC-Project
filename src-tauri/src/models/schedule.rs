use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Schedule {
    pub id: i64,
    pub machine_id: i64,
    pub project_id: Option<i64>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub operator_id: Option<i64>,
    pub load_name: Option<String>,
    pub planned_hours: f64,
    pub actual_hours: Option<f64>,
    pub notes: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

impl Schedule {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            project_id: row.get("project_id")?,
            date: row.get("date")?,
            start_time: row.get("start_time")?,
            end_time: row.get("end_time")?,
            operator_id: row.get("operator_id")?,
            load_name: row.get("load_name")?,
            planned_hours: row.get("planned_hours")?,
            actual_hours: row.get("actual_hours")?,
            notes: row.get("notes")?,
            status: row.get("status")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleWithDetails {
    #[serde(flatten)]
    pub schedule: Schedule,
    pub machine_name: String,
    pub project_name: Option<String>,
    pub operator_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScheduleInput {
    pub machine_id: i64,
    pub project_id: Option<i64>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub operator_id: Option<i64>,
    pub load_name: Option<String>,
    pub planned_hours: f64,
    pub notes: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScheduleInput {
    pub project_id: Option<i64>,
    pub date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub operator_id: Option<i64>,
    pub load_name: Option<String>,
    pub planned_hours: Option<f64>,
    pub actual_hours: Option<f64>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

/// Weekly schedule for a single machine (7 days)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MachineWeekSchedule {
    pub machine_id: i64,
    pub machine_name: String,
    pub days: Vec<DaySchedule>,
    pub weekly_planned_hours: f64,
    pub weekly_actual_hours: f64,
}

/// Schedule entries for a single day
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DaySchedule {
    pub date: String,
    pub day_name: String,
    pub entries: Vec<ScheduleEntry>,
    pub total_planned_hours: f64,
    pub total_actual_hours: f64,
}

/// A single schedule entry for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleEntry {
    pub id: i64,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub operator_id: Option<i64>,
    pub operator_name: Option<String>,
    pub load_name: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub planned_hours: f64,
    pub actual_hours: Option<f64>,
    pub notes: Option<String>,
    pub status: String,
}

/// Complete weekly schedule response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyScheduleResponse {
    pub week_start: String,
    pub week_end: String,
    pub machines: Vec<MachineWeekSchedule>,
}
