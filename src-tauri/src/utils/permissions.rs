use crate::models::User;

/// Check if user has required role
pub fn check_role(user: &User, required_roles: &[&str]) -> Result<(), String> {
    if required_roles.contains(&user.role.as_str()) {
        Ok(())
    } else {
        Err(format!(
            "Permission denied. Required role: {:?}, your role: {}",
            required_roles, user.role
        ))
    }
}

/// Check if user is admin
pub fn require_admin(user: &User) -> Result<(), String> {
    check_role(user, &["Admin"])
}

/// Check if user can edit (admin or operator)
pub fn require_edit_permission(user: &User) -> Result<(), String> {
    check_role(user, &["Admin", "Operator"])
}

/// Check if user can view (all roles)
pub fn require_view_permission(user: &User) -> Result<(), String> {
    check_role(user, &["Admin", "Operator", "Viewer"])
}

/// Role enum for type safety
#[derive(Debug, Clone, PartialEq)]
pub enum Role {
    Admin,
    Operator,
    Viewer,
}

impl From<&str> for Role {
    fn from(s: &str) -> Self {
        match s {
            "Admin" => Role::Admin,
            "Operator" => Role::Operator,
            _ => Role::Viewer,
        }
    }
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::Admin => write!(f, "Admin"),
            Role::Operator => write!(f, "Operator"),
            Role::Viewer => write!(f, "Viewer"),
        }
    }
}
