use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: i64,
    pub name: String,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Client {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            contact_email: row.get("contact_email")?,
            contact_phone: row.get("contact_phone")?,
            address: row.get("address")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClientInput {
    pub name: String,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClientInput {
    pub name: Option<String>,
    pub contact_email: Option<String>,
    pub contact_phone: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}
