use tauri::State;

use crate::db::Database;
use crate::models::{AuthResponse, UserPublic};
use crate::utils::{change_password, invalidate_session, login_user, validate_session};

/// Login command
#[tauri::command]
pub fn login(
    username: String,
    password: String,
    db: State<'_, Database>,
) -> Result<AuthResponse, String> {
    let conn = db.conn.lock();
    login_user(&conn, &username, &password)
}

/// Logout command
#[tauri::command]
pub fn logout(token: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    invalidate_session(&conn, &token)
}

/// Get current user from token
#[tauri::command]
pub fn get_current_user(token: String, db: State<'_, Database>) -> Result<UserPublic, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    Ok(UserPublic::from(user))
}

/// Change password command
#[tauri::command]
pub fn cmd_change_password(
    token: String,
    old_password: String,
    new_password: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    change_password(&conn, user.id, &old_password, &new_password)
}

/// Validate token (check if still valid)
#[tauri::command]
pub fn validate_token(token: String, db: State<'_, Database>) -> Result<bool, String> {
    let conn = db.conn.lock();
    match validate_session(&conn, &token) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
