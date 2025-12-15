use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{Client, CreateClientInput, UpdateClientInput};
use crate::utils::{require_admin, require_view_permission, validate_session};

/// Get all clients
#[tauri::command]
pub fn get_clients(token: String, db: State<'_, Database>) -> Result<Vec<Client>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare("SELECT * FROM clients ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let clients = stmt
        .query_map([], Client::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(clients)
}

/// Get single client by ID
#[tauri::command]
pub fn get_client(token: String, id: i64, db: State<'_, Database>) -> Result<Client, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.query_row("SELECT * FROM clients WHERE id = ?1", [id], Client::from_row)
        .map_err(|_| "Client not found".to_string())
}

/// Create new client (Admin only)
#[tauri::command]
pub fn create_client(
    token: String,
    input: CreateClientInput,
    db: State<'_, Database>,
) -> Result<Client, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    conn.execute(
        "INSERT INTO clients (name, contact_email, contact_phone, address, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.name, input.contact_email, input.contact_phone, input.address, input.notes],
    )
    .map_err(|e| format!("Failed to create client: {}", e))?;

    let new_id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT * FROM clients WHERE id = ?1",
        [new_id],
        Client::from_row,
    )
    .map_err(|e| e.to_string())
}

/// Update client (Admin only)
#[tauri::command]
pub fn update_client(
    token: String,
    id: i64,
    input: UpdateClientInput,
    db: State<'_, Database>,
) -> Result<Client, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = &input.name {
        updates.push("name = ?");
        values.push(Box::new(name.clone()));
    }
    if let Some(email) = &input.contact_email {
        updates.push("contact_email = ?");
        values.push(Box::new(email.clone()));
    }
    if let Some(phone) = &input.contact_phone {
        updates.push("contact_phone = ?");
        values.push(Box::new(phone.clone()));
    }
    if let Some(address) = &input.address {
        updates.push("address = ?");
        values.push(Box::new(address.clone()));
    }
    if let Some(notes) = &input.notes {
        updates.push("notes = ?");
        values.push(Box::new(notes.clone()));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE clients SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update client: {}", e))?;

    conn.query_row("SELECT * FROM clients WHERE id = ?1", [id], Client::from_row)
        .map_err(|e| e.to_string())
}

/// Delete client (Admin only)
#[tauri::command]
pub fn delete_client(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    conn.execute("DELETE FROM clients WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete client: {}", e))?;

    Ok(())
}
