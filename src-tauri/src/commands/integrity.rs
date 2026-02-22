use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Database;
use crate::utils::validate_session;

/// Represents a cascade effect when deleting a record
#[derive(Debug, Serialize, Deserialize)]
pub struct CascadeEffect {
    pub table: String,
    pub label: String,
    pub count: i64,
}

/// Represents the full impact of deleting a record
#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteImpact {
    pub item_type: String,
    pub item_name: String,
    pub cascade_effects: Vec<CascadeEffect>,
}

/// Check the impact of deleting a machine
#[tauri::command]
pub fn check_machine_delete_impact(
    token: String,
    machine_id: i64,
    db: State<'_, Database>,
) -> Result<DeleteImpact, String> {
    let conn = db.conn.lock();
    let _user = validate_session(&conn, &token)?;

    // Get machine name
    let machine_name: String = conn
        .query_row(
            "SELECT name FROM machines WHERE id = ?1",
            [machine_id],
            |row| row.get(0),
        )
        .map_err(|_| "Machine not found".to_string())?;

    let mut cascade_effects = Vec::new();

    // Count schedules
    let schedule_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM schedules WHERE machine_id = ?1",
            [machine_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if schedule_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "schedules".to_string(),
            label: "Schedule entries".to_string(),
            count: schedule_count,
        });
    }

    // Count maintenance records
    let maintenance_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM maintenance WHERE machine_id = ?1",
            [machine_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if maintenance_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "maintenance".to_string(),
            label: "Maintenance records".to_string(),
            count: maintenance_count,
        });
    }

    // Count project assignments
    let project_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM project_machines WHERE machine_id = ?1",
            [machine_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if project_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "project_machines".to_string(),
            label: "Project assignments".to_string(),
            count: project_count,
        });
    }

    // Count alerts
    let alert_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM alerts WHERE machine_id = ?1",
            [machine_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if alert_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "alerts".to_string(),
            label: "Alerts".to_string(),
            count: alert_count,
        });
    }

    Ok(DeleteImpact {
        item_type: "Machine".to_string(),
        item_name: machine_name,
        cascade_effects,
    })
}

/// Check the impact of deleting a project
#[tauri::command]
pub fn check_project_delete_impact(
    token: String,
    project_id: i64,
    db: State<'_, Database>,
) -> Result<DeleteImpact, String> {
    let conn = db.conn.lock();
    let _user = validate_session(&conn, &token)?;

    // Get project name
    let project_name: String = conn
        .query_row(
            "SELECT name FROM projects WHERE id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .map_err(|_| "Project not found".to_string())?;

    let mut cascade_effects = Vec::new();

    // Count schedules
    let schedule_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM schedules WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if schedule_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "schedules".to_string(),
            label: "Schedule entries".to_string(),
            count: schedule_count,
        });
    }

    // Count machine assignments
    let machine_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM project_machines WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if machine_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "project_machines".to_string(),
            label: "Machine assignments".to_string(),
            count: machine_count,
        });
    }

    // Count team members
    let team_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM project_team WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if team_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "project_team".to_string(),
            label: "Team members".to_string(),
            count: team_count,
        });
    }

    // Count alerts
    let alert_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM alerts WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if alert_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "alerts".to_string(),
            label: "Alerts".to_string(),
            count: alert_count,
        });
    }

    Ok(DeleteImpact {
        item_type: "Project".to_string(),
        item_name: project_name,
        cascade_effects,
    })
}

/// Check the impact of deleting a client
#[tauri::command]
pub fn check_client_delete_impact(
    token: String,
    client_id: i64,
    db: State<'_, Database>,
) -> Result<DeleteImpact, String> {
    let conn = db.conn.lock();
    let _user = validate_session(&conn, &token)?;

    // Get client name
    let client_name: String = conn
        .query_row(
            "SELECT name FROM clients WHERE id = ?1",
            [client_id],
            |row| row.get(0),
        )
        .map_err(|_| "Client not found".to_string())?;

    let mut cascade_effects = Vec::new();

    // Count projects (will be set to NULL, not deleted, but worth showing)
    let project_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE client_id = ?1",
            [client_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if project_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "projects".to_string(),
            label: "Projects (will be unlinked)".to_string(),
            count: project_count,
        });
    }

    Ok(DeleteImpact {
        item_type: "Client".to_string(),
        item_name: client_name,
        cascade_effects,
    })
}

/// Check the impact of deleting a user
#[tauri::command]
pub fn check_user_delete_impact(
    token: String,
    user_id: i64,
    db: State<'_, Database>,
) -> Result<DeleteImpact, String> {
    let conn = db.conn.lock();
    let _user = validate_session(&conn, &token)?;

    // Get username
    let username: String = conn
        .query_row(
            "SELECT username FROM users WHERE id = ?1",
            [user_id],
            |row| row.get(0),
        )
        .map_err(|_| "User not found".to_string())?;

    let mut cascade_effects = Vec::new();

    // Count schedules as operator
    let schedule_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM schedules WHERE operator_id = ?1",
            [user_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if schedule_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "schedules".to_string(),
            label: "Schedule assignments".to_string(),
            count: schedule_count,
        });
    }

    // Count project team memberships
    let team_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM project_team WHERE user_id = ?1",
            [user_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if team_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "project_team".to_string(),
            label: "Project team memberships".to_string(),
            count: team_count,
        });
    }

    // Count maintenance performed
    let maintenance_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM maintenance WHERE performed_by = ?1",
            [user_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if maintenance_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "maintenance".to_string(),
            label: "Maintenance records".to_string(),
            count: maintenance_count,
        });
    }

    // Count sessions
    let session_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sessions WHERE user_id = ?1",
            [user_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if session_count > 0 {
        cascade_effects.push(CascadeEffect {
            table: "sessions".to_string(),
            label: "Active sessions".to_string(),
            count: session_count,
        });
    }

    Ok(DeleteImpact {
        item_type: "User".to_string(),
        item_name: username,
        cascade_effects,
    })
}
