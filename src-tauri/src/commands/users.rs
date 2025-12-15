use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{CreateUserInput, UpdateUserInput, User, UserPublic};
use crate::utils::{hash_password, require_admin, validate_session};

/// Get all users (Admin only)
#[tauri::command]
pub fn get_users(token: String, db: State<'_, Database>) -> Result<Vec<UserPublic>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let mut stmt = conn
        .prepare("SELECT * FROM users ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let users = stmt
        .query_map([], User::from_row)
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(UserPublic::from)
        .collect();

    Ok(users)
}

/// Get single user by ID (Admin only)
#[tauri::command]
pub fn get_user(token: String, id: i64, db: State<'_, Database>) -> Result<UserPublic, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let target_user = conn
        .query_row("SELECT * FROM users WHERE id = ?1", [id], User::from_row)
        .map_err(|_| "User not found".to_string())?;

    Ok(UserPublic::from(target_user))
}

/// Create new user (Admin only)
#[tauri::command]
pub fn create_user(
    token: String,
    input: CreateUserInput,
    db: State<'_, Database>,
) -> Result<UserPublic, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Validate role
    if !["Admin", "Operator", "Viewer"].contains(&input.role.as_str()) {
        return Err("Invalid role. Must be Admin, Operator, or Viewer".to_string());
    }

    // Hash password
    let password_hash = hash_password(&input.password)?;

    // Insert user
    conn.execute(
        "INSERT INTO users (username, password_hash, email, full_name, role) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.username, password_hash, input.email, input.full_name, input.role],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE constraint failed") {
            "Username already exists".to_string()
        } else {
            format!("Failed to create user: {}", e)
        }
    })?;

    let new_id = conn.last_insert_rowid();
    let new_user = conn
        .query_row("SELECT * FROM users WHERE id = ?1", [new_id], User::from_row)
        .map_err(|e| e.to_string())?;

    Ok(UserPublic::from(new_user))
}

/// Update user (Admin only)
#[tauri::command]
pub fn update_user(
    token: String,
    id: i64,
    input: UpdateUserInput,
    db: State<'_, Database>,
) -> Result<UserPublic, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Build update query dynamically
    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(email) = &input.email {
        updates.push("email = ?");
        values.push(Box::new(email.clone()));
    }
    if let Some(full_name) = &input.full_name {
        updates.push("full_name = ?");
        values.push(Box::new(full_name.clone()));
    }
    if let Some(role) = &input.role {
        if !["Admin", "Operator", "Viewer"].contains(&role.as_str()) {
            return Err("Invalid role".to_string());
        }
        updates.push("role = ?");
        values.push(Box::new(role.clone()));
    }
    if let Some(is_active) = input.is_active {
        updates.push("is_active = ?");
        values.push(Box::new(if is_active { 1i64 } else { 0i64 }));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE users SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update user: {}", e))?;

    let updated_user = conn
        .query_row("SELECT * FROM users WHERE id = ?1", [id], User::from_row)
        .map_err(|e| e.to_string())?;

    Ok(UserPublic::from(updated_user))
}

/// Delete user (Admin only)
#[tauri::command]
pub fn delete_user(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Prevent self-deletion
    if user.id == id {
        return Err("Cannot delete your own account".to_string());
    }

    conn.execute("DELETE FROM users WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete user: {}", e))?;

    Ok(())
}

/// Reset user password (Admin only)
#[tauri::command]
pub fn reset_user_password(
    token: String,
    id: i64,
    new_password: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    let password_hash = hash_password(&new_password)?;

    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![password_hash, id],
    )
    .map_err(|e| format!("Failed to reset password: {}", e))?;

    // Invalidate all sessions for that user
    conn.execute("UPDATE sessions SET is_valid = 0 WHERE user_id = ?1", [id])
        .ok();

    Ok(())
}
