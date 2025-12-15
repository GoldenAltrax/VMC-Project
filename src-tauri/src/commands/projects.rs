use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{CreateProjectInput, Project, ProjectWithDetails, UpdateProjectInput};
use crate::utils::{require_admin, require_edit_permission, require_view_permission, validate_session};

/// Get all projects
#[tauri::command]
pub fn get_projects(token: String, db: State<'_, Database>) -> Result<Vec<ProjectWithDetails>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare(
            "SELECT p.*, c.name as client_name FROM projects p
             LEFT JOIN clients c ON p.client_id = c.id
             ORDER BY p.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let projects: Vec<ProjectWithDetails> = stmt
        .query_map([], |row| {
            let project = Project::from_row(row)?;
            let client_name: Option<String> = row.get("client_name")?;
            Ok((project, client_name))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .map(|(project, client_name)| {
            // Get assigned machines
            let machines: Vec<i64> = conn
                .prepare("SELECT machine_id FROM project_machines WHERE project_id = ?1")
                .ok()
                .and_then(|mut stmt| {
                    stmt.query_map([project.id], |row| row.get(0))
                        .ok()
                        .map(|iter| iter.filter_map(|r| r.ok()).collect())
                })
                .unwrap_or_default();

            // Get team members
            let team: Vec<i64> = conn
                .prepare("SELECT user_id FROM project_team WHERE project_id = ?1")
                .ok()
                .and_then(|mut stmt| {
                    stmt.query_map([project.id], |row| row.get(0))
                        .ok()
                        .map(|iter| iter.filter_map(|r| r.ok()).collect())
                })
                .unwrap_or_default();

            let progress = if project.planned_hours > 0.0 {
                (project.actual_hours / project.planned_hours * 100.0).min(100.0)
            } else {
                0.0
            };

            ProjectWithDetails {
                project,
                client_name,
                assigned_machines: machines,
                team_members: team,
                progress_percentage: progress,
            }
        })
        .collect();

    Ok(projects)
}

/// Get single project by ID
#[tauri::command]
pub fn get_project(token: String, id: i64, db: State<'_, Database>) -> Result<ProjectWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let (project, client_name): (Project, Option<String>) = conn
        .query_row(
            "SELECT p.*, c.name as client_name FROM projects p
             LEFT JOIN clients c ON p.client_id = c.id
             WHERE p.id = ?1",
            [id],
            |row| {
                let project = Project::from_row(row)?;
                let client_name: Option<String> = row.get("client_name")?;
                Ok((project, client_name))
            },
        )
        .map_err(|_| "Project not found".to_string())?;

    // Get assigned machines
    let mut stmt = conn
        .prepare("SELECT machine_id FROM project_machines WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let machines: Vec<i64> = stmt
        .query_map([id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Get team members
    let mut stmt = conn
        .prepare("SELECT user_id FROM project_team WHERE project_id = ?1")
        .map_err(|e| e.to_string())?;
    let team: Vec<i64> = stmt
        .query_map([id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let progress = if project.planned_hours > 0.0 {
        (project.actual_hours / project.planned_hours * 100.0).min(100.0)
    } else {
        0.0
    };

    Ok(ProjectWithDetails {
        project,
        client_name,
        assigned_machines: machines,
        team_members: team,
        progress_percentage: progress,
    })
}

/// Create new project (Admin only)
#[tauri::command]
pub fn create_project(
    token: String,
    input: CreateProjectInput,
    db: State<'_, Database>,
) -> Result<ProjectWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Validate status
    if !["planning", "active", "completed", "on-hold"].contains(&input.status.as_str()) {
        return Err("Invalid status".to_string());
    }

    conn.execute(
        "INSERT INTO projects (name, client_id, description, start_date, end_date, status, planned_hours, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            input.name,
            input.client_id,
            input.description,
            input.start_date,
            input.end_date,
            input.status,
            input.planned_hours,
            user.id
        ],
    )
    .map_err(|e| format!("Failed to create project: {}", e))?;

    let new_id = conn.last_insert_rowid();

    // Assign machines if provided
    if let Some(machines) = &input.assigned_machines {
        for machine_id in machines {
            conn.execute(
                "INSERT INTO project_machines (project_id, machine_id) VALUES (?1, ?2)",
                params![new_id, machine_id],
            )
            .ok();
        }
    }

    // Assign team if provided
    if let Some(team) = &input.team_members {
        for user_id in team {
            conn.execute(
                "INSERT INTO project_team (project_id, user_id) VALUES (?1, ?2)",
                params![new_id, user_id],
            )
            .ok();
        }
    }

    // Return the created project
    drop(conn);
    get_project(token, new_id, db)
}

/// Update project (Admin or Operator)
#[tauri::command]
pub fn update_project(
    token: String,
    id: i64,
    input: UpdateProjectInput,
    db: State<'_, Database>,
) -> Result<ProjectWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = &input.name {
        updates.push("name = ?");
        values.push(Box::new(name.clone()));
    }
    if let Some(client_id) = input.client_id {
        updates.push("client_id = ?");
        values.push(Box::new(client_id));
    }
    if let Some(desc) = &input.description {
        updates.push("description = ?");
        values.push(Box::new(desc.clone()));
    }
    if let Some(start) = &input.start_date {
        updates.push("start_date = ?");
        values.push(Box::new(start.clone()));
    }
    if let Some(end) = &input.end_date {
        updates.push("end_date = ?");
        values.push(Box::new(end.clone()));
    }
    if let Some(status) = &input.status {
        if !["planning", "active", "completed", "on-hold"].contains(&status.as_str()) {
            return Err("Invalid status".to_string());
        }
        updates.push("status = ?");
        values.push(Box::new(status.clone()));
    }
    if let Some(planned) = input.planned_hours {
        updates.push("planned_hours = ?");
        values.push(Box::new(planned));
    }
    if let Some(actual) = input.actual_hours {
        updates.push("actual_hours = ?");
        values.push(Box::new(actual));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update project: {}", e))?;

    drop(conn);
    get_project(token, id, db)
}

/// Delete project (Admin only)
#[tauri::command]
pub fn delete_project(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    conn.execute("DELETE FROM projects WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete project: {}", e))?;

    Ok(())
}

/// Assign machines to project (Admin only)
#[tauri::command]
pub fn assign_machines_to_project(
    token: String,
    project_id: i64,
    machine_ids: Vec<i64>,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Remove existing assignments
    conn.execute(
        "DELETE FROM project_machines WHERE project_id = ?1",
        [project_id],
    )
    .map_err(|e| e.to_string())?;

    // Add new assignments
    for machine_id in machine_ids {
        conn.execute(
            "INSERT INTO project_machines (project_id, machine_id) VALUES (?1, ?2)",
            params![project_id, machine_id],
        )
        .map_err(|e| format!("Failed to assign machine: {}", e))?;
    }

    Ok(())
}

/// Assign team members to project (Admin only)
#[tauri::command]
pub fn assign_team_to_project(
    token: String,
    project_id: i64,
    user_ids: Vec<i64>,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_admin(&user)?;

    // Remove existing assignments
    conn.execute(
        "DELETE FROM project_team WHERE project_id = ?1",
        [project_id],
    )
    .map_err(|e| e.to_string())?;

    // Add new assignments
    for user_id in user_ids {
        conn.execute(
            "INSERT INTO project_team (project_id, user_id) VALUES (?1, ?2)",
            params![project_id, user_id],
        )
        .map_err(|e| format!("Failed to assign team member: {}", e))?;
    }

    Ok(())
}

/// Log hours to a project
#[tauri::command]
pub fn log_project_hours(
    token: String,
    project_id: i64,
    hours: f64,
    db: State<'_, Database>,
) -> Result<Project, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute(
        "UPDATE projects SET actual_hours = actual_hours + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![hours, project_id],
    )
    .map_err(|e| format!("Failed to log hours: {}", e))?;

    conn.query_row(
        "SELECT * FROM projects WHERE id = ?1",
        [project_id],
        Project::from_row,
    )
    .map_err(|e| e.to_string())
}
