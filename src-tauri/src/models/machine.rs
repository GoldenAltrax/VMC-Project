use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Machine {
    pub id: i64,
    pub name: String,
    pub model: String,
    pub serial_number: Option<String>,
    pub purchase_date: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub capacity: Option<String>,
    pub power_consumption: Option<String>,
    pub dimensions: Option<String>,
    pub weight: Option<String>,
    pub max_rpm: Option<String>,
    pub axis_travel: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Machine {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            model: row.get("model")?,
            serial_number: row.get("serial_number")?,
            purchase_date: row.get("purchase_date")?,
            status: row.get("status")?,
            location: row.get("location")?,
            capacity: row.get("capacity")?,
            power_consumption: row.get("power_consumption")?,
            dimensions: row.get("dimensions")?,
            weight: row.get("weight")?,
            max_rpm: row.get("max_rpm")?,
            axis_travel: row.get("axis_travel")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MachineSpecs {
    pub power_consumption: Option<String>,
    pub dimensions: Option<String>,
    pub weight: Option<String>,
    pub max_rpm: Option<String>,
    pub axis_travel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMachineInput {
    pub name: String,
    pub model: String,
    pub serial_number: Option<String>,
    pub purchase_date: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub capacity: Option<String>,
    pub power_consumption: Option<String>,
    pub dimensions: Option<String>,
    pub weight: Option<String>,
    pub max_rpm: Option<String>,
    pub axis_travel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMachineInput {
    pub name: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub purchase_date: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub capacity: Option<String>,
    pub power_consumption: Option<String>,
    pub dimensions: Option<String>,
    pub weight: Option<String>,
    pub max_rpm: Option<String>,
    pub axis_travel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MachineWithStats {
    #[serde(flatten)]
    pub machine: Machine,
    pub current_project: Option<String>,
    pub scheduled_hours_this_week: f64,
    pub actual_hours_this_week: f64,
    pub maintenance_due: Option<String>,
}
