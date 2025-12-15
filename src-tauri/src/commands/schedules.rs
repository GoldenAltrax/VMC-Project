use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::{
    CreateScheduleInput, DaySchedule, MachineWeekSchedule, Schedule, ScheduleEntry,
    ScheduleWithDetails, UpdateScheduleInput, WeeklyScheduleResponse,
};
use crate::utils::{require_edit_permission, require_view_permission, validate_session};

/// Get weekly schedule for all machines
#[tauri::command]
pub fn get_weekly_schedule(
    token: String,
    week_start: String, // YYYY-MM-DD (Monday)
    db: State<'_, Database>,
) -> Result<WeeklyScheduleResponse, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    // Calculate week end (Sunday)
    let start_date =
        chrono::NaiveDate::parse_from_str(&week_start, "%Y-%m-%d").map_err(|e| e.to_string())?;
    let end_date = start_date + chrono::Duration::days(6);
    let week_end = end_date.format("%Y-%m-%d").to_string();

    // Get all machines
    let mut stmt = conn
        .prepare("SELECT id, name FROM machines ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let machines: Vec<(i64, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Build schedule for each machine
    let mut machine_schedules = Vec::new();

    for (machine_id, machine_name) in machines {
        let mut days: Vec<DaySchedule> = Vec::new();

        // For each day of the week (Monday to Sunday)
        for day_offset in 0..7 {
            let current_date = start_date + chrono::Duration::days(day_offset);
            let date_str = current_date.format("%Y-%m-%d").to_string();
            let day_name = current_date.format("%A").to_string();

            // Get schedules for this machine on this day
            let mut stmt = conn
                .prepare(
                    "SELECT s.*, p.name as project_name, u.full_name as operator_name
                     FROM schedules s
                     LEFT JOIN projects p ON s.project_id = p.id
                     LEFT JOIN users u ON s.operator_id = u.id
                     WHERE s.machine_id = ?1 AND s.date = ?2
                     ORDER BY s.start_time ASC",
                )
                .map_err(|e| e.to_string())?;

            let entries: Vec<ScheduleEntry> = stmt
                .query_map(params![machine_id, date_str], |row| {
                    Ok(ScheduleEntry {
                        id: row.get("id")?,
                        project_id: row.get("project_id")?,
                        project_name: row.get("project_name")?,
                        operator_id: row.get("operator_id")?,
                        operator_name: row.get("operator_name")?,
                        load_name: row.get("load_name")?,
                        start_time: row.get("start_time")?,
                        end_time: row.get("end_time")?,
                        planned_hours: row.get("planned_hours")?,
                        actual_hours: row.get("actual_hours")?,
                        notes: row.get("notes")?,
                        status: row.get("status")?,
                    })
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            // Calculate totals for the day
            let total_planned: f64 = entries.iter().map(|e| e.planned_hours).sum();
            let total_actual: f64 = entries.iter().map(|e| e.actual_hours.unwrap_or(0.0)).sum();

            days.push(DaySchedule {
                date: date_str,
                day_name,
                entries,
                total_planned_hours: total_planned,
                total_actual_hours: total_actual,
            });
        }

        // Calculate weekly totals
        let weekly_planned: f64 = days.iter().map(|d| d.total_planned_hours).sum();
        let weekly_actual: f64 = days.iter().map(|d| d.total_actual_hours).sum();

        machine_schedules.push(MachineWeekSchedule {
            machine_id,
            machine_name,
            days,
            weekly_planned_hours: weekly_planned,
            weekly_actual_hours: weekly_actual,
        });
    }

    Ok(WeeklyScheduleResponse {
        week_start: week_start.clone(),
        week_end,
        machines: machine_schedules,
    })
}

/// Get single schedule entry
#[tauri::command]
pub fn get_schedule(
    token: String,
    id: i64,
    db: State<'_, Database>,
) -> Result<ScheduleWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    conn.query_row(
        "SELECT s.*, m.name as machine_name, p.name as project_name, u.full_name as operator_name
         FROM schedules s
         LEFT JOIN machines m ON s.machine_id = m.id
         LEFT JOIN projects p ON s.project_id = p.id
         LEFT JOIN users u ON s.operator_id = u.id
         WHERE s.id = ?1",
        [id],
        |row| {
            let schedule = Schedule::from_row(row)?;
            Ok(ScheduleWithDetails {
                schedule,
                machine_name: row.get("machine_name")?,
                project_name: row.get("project_name")?,
                operator_name: row.get("operator_name")?,
            })
        },
    )
    .map_err(|_| "Schedule not found".to_string())
}

/// Create schedule entry
#[tauri::command]
pub fn create_schedule(
    token: String,
    input: CreateScheduleInput,
    db: State<'_, Database>,
) -> Result<ScheduleWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    // Validate status
    if let Some(status) = &input.status {
        if !["scheduled", "in-progress", "completed", "cancelled"].contains(&status.as_str()) {
            return Err("Invalid status".to_string());
        }
    }

    let status = input.status.unwrap_or_else(|| "scheduled".to_string());

    conn.execute(
        "INSERT INTO schedules (machine_id, project_id, date, start_time, end_time, operator_id, load_name, planned_hours, notes, status, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            input.machine_id,
            input.project_id,
            input.date,
            input.start_time,
            input.end_time,
            input.operator_id,
            input.load_name,
            input.planned_hours,
            input.notes,
            status,
            user.id
        ],
    )
    .map_err(|e| format!("Failed to create schedule: {}", e))?;

    let new_id = conn.last_insert_rowid();
    drop(conn);
    get_schedule(token, new_id, db)
}

/// Update schedule entry
#[tauri::command]
pub fn update_schedule(
    token: String,
    id: i64,
    input: UpdateScheduleInput,
    db: State<'_, Database>,
) -> Result<ScheduleWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(project_id) = input.project_id {
        updates.push("project_id = ?");
        values.push(Box::new(project_id));
    }
    if let Some(date) = &input.date {
        updates.push("date = ?");
        values.push(Box::new(date.clone()));
    }
    if let Some(start) = &input.start_time {
        updates.push("start_time = ?");
        values.push(Box::new(start.clone()));
    }
    if let Some(end) = &input.end_time {
        updates.push("end_time = ?");
        values.push(Box::new(end.clone()));
    }
    if let Some(op_id) = input.operator_id {
        updates.push("operator_id = ?");
        values.push(Box::new(op_id));
    }
    if let Some(load) = &input.load_name {
        updates.push("load_name = ?");
        values.push(Box::new(load.clone()));
    }
    if let Some(planned) = input.planned_hours {
        updates.push("planned_hours = ?");
        values.push(Box::new(planned));
    }
    if let Some(actual) = input.actual_hours {
        updates.push("actual_hours = ?");
        values.push(Box::new(actual));
    }
    if let Some(notes) = &input.notes {
        updates.push("notes = ?");
        values.push(Box::new(notes.clone()));
    }
    if let Some(status) = &input.status {
        if !["scheduled", "in-progress", "completed", "cancelled"].contains(&status.as_str()) {
            return Err("Invalid status".to_string());
        }
        updates.push("status = ?");
        values.push(Box::new(status.clone()));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    let query = format!("UPDATE schedules SET {} WHERE id = ?", updates.join(", "));
    values.push(Box::new(id));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&query, params.as_slice())
        .map_err(|e| format!("Failed to update schedule: {}", e))?;

    drop(conn);
    get_schedule(token, id, db)
}

/// Log actual hours for a schedule entry
#[tauri::command]
pub fn log_actual_hours(
    token: String,
    schedule_id: i64,
    hours: f64,
    db: State<'_, Database>,
) -> Result<ScheduleWithDetails, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute(
        "UPDATE schedules SET actual_hours = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![hours, schedule_id],
    )
    .map_err(|e| format!("Failed to log hours: {}", e))?;

    drop(conn);
    get_schedule(token, schedule_id, db)
}

/// Delete schedule entry
#[tauri::command]
pub fn delete_schedule(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    conn.execute("DELETE FROM schedules WHERE id = ?1", [id])
        .map_err(|e| format!("Failed to delete schedule: {}", e))?;

    Ok(())
}

/// Get schedules for a specific date range
#[tauri::command]
pub fn get_schedules_by_date_range(
    token: String,
    start_date: String,
    end_date: String,
    machine_id: Option<i64>,
    db: State<'_, Database>,
) -> Result<Vec<ScheduleWithDetails>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let query = if machine_id.is_some() {
        "SELECT s.*, m.name as machine_name, p.name as project_name, u.full_name as operator_name
         FROM schedules s
         LEFT JOIN machines m ON s.machine_id = m.id
         LEFT JOIN projects p ON s.project_id = p.id
         LEFT JOIN users u ON s.operator_id = u.id
         WHERE s.date >= ?1 AND s.date <= ?2 AND s.machine_id = ?3
         ORDER BY s.date, m.name, s.start_time"
    } else {
        "SELECT s.*, m.name as machine_name, p.name as project_name, u.full_name as operator_name
         FROM schedules s
         LEFT JOIN machines m ON s.machine_id = m.id
         LEFT JOIN projects p ON s.project_id = p.id
         LEFT JOIN users u ON s.operator_id = u.id
         WHERE s.date >= ?1 AND s.date <= ?2
         ORDER BY s.date, m.name, s.start_time"
    };

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

    let schedules: Vec<ScheduleWithDetails> = if let Some(mid) = machine_id {
        stmt.query_map(params![start_date, end_date, mid], |row| {
            let schedule = Schedule::from_row(row)?;
            Ok(ScheduleWithDetails {
                schedule,
                machine_name: row.get("machine_name")?,
                project_name: row.get("project_name")?,
                operator_name: row.get("operator_name")?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect()
    } else {
        stmt.query_map(params![start_date, end_date], |row| {
            let schedule = Schedule::from_row(row)?;
            Ok(ScheduleWithDetails {
                schedule,
                machine_name: row.get("machine_name")?,
                project_name: row.get("project_name")?,
                operator_name: row.get("operator_name")?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect()
    };

    Ok(schedules)
}

/// Copy schedule from one week to another
#[tauri::command]
pub fn copy_week_schedule(
    token: String,
    source_week_start: String,
    target_week_start: String,
    db: State<'_, Database>,
) -> Result<i32, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;

    let source_start = chrono::NaiveDate::parse_from_str(&source_week_start, "%Y-%m-%d")
        .map_err(|e| e.to_string())?;
    let target_start = chrono::NaiveDate::parse_from_str(&target_week_start, "%Y-%m-%d")
        .map_err(|e| e.to_string())?;

    let source_end = source_start + chrono::Duration::days(6);
    let day_diff = (target_start - source_start).num_days();

    // Get all schedules from source week
    let mut stmt = conn
        .prepare(
            "SELECT * FROM schedules WHERE date >= ?1 AND date <= ?2",
        )
        .map_err(|e| e.to_string())?;

    let source_schedules: Vec<Schedule> = stmt
        .query_map(
            params![
                source_start.format("%Y-%m-%d").to_string(),
                source_end.format("%Y-%m-%d").to_string()
            ],
            Schedule::from_row,
        )
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut copied = 0;

    for schedule in source_schedules {
        let old_date =
            chrono::NaiveDate::parse_from_str(&schedule.date, "%Y-%m-%d").map_err(|e| e.to_string())?;
        let new_date = old_date + chrono::Duration::days(day_diff);
        let new_date_str = new_date.format("%Y-%m-%d").to_string();

        conn.execute(
            "INSERT INTO schedules (machine_id, project_id, date, start_time, end_time, operator_id, load_name, planned_hours, notes, status, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'scheduled', ?10)",
            params![
                schedule.machine_id,
                schedule.project_id,
                new_date_str,
                schedule.start_time,
                schedule.end_time,
                schedule.operator_id,
                schedule.load_name,
                schedule.planned_hours,
                schedule.notes,
                user.id
            ],
        )
        .ok();
        copied += 1;
    }

    Ok(copied)
}
