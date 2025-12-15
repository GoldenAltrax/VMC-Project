use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use rusqlite::Connection;
use uuid::Uuid;

use crate::models::{AuthResponse, Session, User, UserPublic};

/// Hash a password using bcrypt
pub fn hash_password(password: &str) -> Result<String, String> {
    hash(password, DEFAULT_COST).map_err(|e| format!("Failed to hash password: {}", e))
}

/// Verify a password against a hash
pub fn verify_password(password: &str, hash: &str) -> bool {
    verify(password, hash).unwrap_or(false)
}

/// Generate a new session token
pub fn generate_token() -> String {
    Uuid::new_v4().to_string()
}

/// Create a new session for a user
pub fn create_session(conn: &Connection, user_id: i64) -> Result<(String, String), String> {
    let token = generate_token();
    let expires_at = (Utc::now() + Duration::hours(24)).format("%Y-%m-%d %H:%M:%S").to_string();

    conn.execute(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![user_id, token, expires_at],
    )
    .map_err(|e| format!("Failed to create session: {}", e))?;

    Ok((token, expires_at))
}

/// Validate a session token and return the user if valid
pub fn validate_session(conn: &Connection, token: &str) -> Result<User, String> {
    // First check if session exists and is valid
    let session: Session = conn
        .query_row(
            "SELECT * FROM sessions WHERE token = ?1 AND is_valid = 1",
            [token],
            Session::from_row,
        )
        .map_err(|_| "Invalid or expired session".to_string())?;

    // Check if session has expired
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    if session.expires_at < now {
        // Invalidate expired session
        conn.execute(
            "UPDATE sessions SET is_valid = 0 WHERE id = ?1",
            [session.id],
        )
        .ok();
        return Err("Session expired".to_string());
    }

    // Get the user
    let user = conn
        .query_row(
            "SELECT * FROM users WHERE id = ?1 AND is_active = 1",
            [session.user_id],
            User::from_row,
        )
        .map_err(|_| "User not found or inactive".to_string())?;

    Ok(user)
}

/// Invalidate a session
pub fn invalidate_session(conn: &Connection, token: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE sessions SET is_valid = 0 WHERE token = ?1",
        [token],
    )
    .map_err(|e| format!("Failed to invalidate session: {}", e))?;

    Ok(())
}

/// Invalidate all sessions for a user
pub fn invalidate_all_user_sessions(conn: &Connection, user_id: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE sessions SET is_valid = 0 WHERE user_id = ?1",
        [user_id],
    )
    .map_err(|e| format!("Failed to invalidate sessions: {}", e))?;

    Ok(())
}

/// Login a user with username and password
pub fn login_user(conn: &Connection, username: &str, password: &str) -> Result<AuthResponse, String> {
    // Find user by username
    let user: User = conn
        .query_row(
            "SELECT * FROM users WHERE username = ?1 AND is_active = 1",
            [username],
            User::from_row,
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    // Verify password
    if !verify_password(password, &user.password_hash) {
        return Err("Invalid username or password".to_string());
    }

    // Create session
    let (token, expires_at) = create_session(conn, user.id)?;

    Ok(AuthResponse {
        user: UserPublic::from(user),
        token,
        expires_at,
    })
}

/// Change user password
pub fn change_password(
    conn: &Connection,
    user_id: i64,
    old_password: &str,
    new_password: &str,
) -> Result<(), String> {
    // Get user
    let user: User = conn
        .query_row(
            "SELECT * FROM users WHERE id = ?1",
            [user_id],
            User::from_row,
        )
        .map_err(|_| "User not found".to_string())?;

    // Verify old password
    if !verify_password(old_password, &user.password_hash) {
        return Err("Current password is incorrect".to_string());
    }

    // Hash new password
    let new_hash = hash_password(new_password)?;

    // Update password
    conn.execute(
        "UPDATE users SET password_hash = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![new_hash, user_id],
    )
    .map_err(|e| format!("Failed to update password: {}", e))?;

    // Invalidate all other sessions
    invalidate_all_user_sessions(conn, user_id)?;

    Ok(())
}
