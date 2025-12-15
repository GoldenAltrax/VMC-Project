use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl User {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            username: row.get("username")?,
            password_hash: row.get("password_hash")?,
            email: row.get("email")?,
            full_name: row.get("full_name")?,
            role: row.get("role")?,
            is_active: row.get::<_, i64>("is_active")? == 1,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }

    pub fn is_admin(&self) -> bool {
        self.role == "Admin"
    }

    pub fn is_operator(&self) -> bool {
        self.role == "Operator"
    }

    pub fn is_viewer(&self) -> bool {
        self.role == "Viewer"
    }

    pub fn can_edit(&self) -> bool {
        self.is_admin() || self.is_operator()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPublic {
    pub id: i64,
    pub username: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUserInput {
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub user_id: i64,
    pub token: String,
    pub created_at: String,
    pub expires_at: String,
    pub is_valid: bool,
}

impl Session {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            token: row.get("token")?,
            created_at: row.get("created_at")?,
            expires_at: row.get("expires_at")?,
            is_valid: row.get::<_, i64>("is_valid")? == 1,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub user: UserPublic,
    pub token: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}
