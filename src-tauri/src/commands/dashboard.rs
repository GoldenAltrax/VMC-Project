use chrono::Datelike;
use rusqlite::params;
use tauri::State;

use crate::db::Database;
use crate::models::DashboardStats;
use crate::utils::{require_view_permission, validate_session};

/// Get dashboard statistics
#[tauri::command]
pub fn get_dashboard_stats(
    token: String,
    db: State<'_, Database>,
) -> Result<DashboardStats, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    // Total machines
    let total_machines: i32 = conn
        .query_row("SELECT COUNT(*) FROM machines", [], |row| row.get(0))
        .unwrap_or(0);

    // Active machines (status = 'active')
    let active_machines: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM machines WHERE status = 'active'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Machines under maintenance
    let maintenance_machines: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM machines WHERE status = 'maintenance'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Idle machines
    let idle_machines: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM machines WHERE status = 'idle'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Error machines
    let error_machines: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM machines WHERE status = 'error'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Total projects
    let total_projects: i32 = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
        .unwrap_or(0);

    // Active projects
    let active_projects: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE status = 'active'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Completed projects
    let completed_projects: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM projects WHERE status = 'completed'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Total clients
    let total_clients: i32 = conn
        .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
        .unwrap_or(0);

    // Hours this week
    let today = chrono::Utc::now().naive_utc().date();
    let week_start = today - chrono::Duration::days(today.weekday().num_days_from_monday() as i64);
    let week_end = week_start + chrono::Duration::days(6);

    let week_start_str = week_start.format("%Y-%m-%d").to_string();
    let week_end_str = week_end.format("%Y-%m-%d").to_string();

    let planned_hours_week: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(planned_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
            params![week_start_str, week_end_str],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let actual_hours_week: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(actual_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
            params![week_start_str, week_end_str],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Hours this month
    let month_start = today.with_day(1).unwrap_or(today);
    let month_end = if today.month() == 12 {
        chrono::NaiveDate::from_ymd_opt(today.year() + 1, 1, 1)
            .unwrap()
            .pred_opt()
            .unwrap()
    } else {
        chrono::NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1)
            .unwrap()
            .pred_opt()
            .unwrap()
    };

    let month_start_str = month_start.format("%Y-%m-%d").to_string();
    let month_end_str = month_end.format("%Y-%m-%d").to_string();

    let planned_hours_month: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(planned_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
            params![month_start_str, month_end_str],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let actual_hours_month: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(actual_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
            params![month_start_str, month_end_str],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Total hours all time (from projects)
    let total_planned_hours: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(planned_hours), 0) FROM projects",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let total_actual_hours: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(actual_hours), 0) FROM projects",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Utilization rate (active machines / total machines * 100)
    let utilization_rate = if total_machines > 0 {
        (active_machines as f64 / total_machines as f64) * 100.0
    } else {
        0.0
    };

    // Efficiency rate (actual hours / planned hours * 100)
    let efficiency_rate = if planned_hours_week > 0.0 {
        (actual_hours_week / planned_hours_week * 100.0).min(100.0)
    } else {
        0.0
    };

    // Upcoming maintenance count
    let upcoming_maintenance: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM maintenance WHERE date >= ?1 AND status = 'scheduled'",
            [&today.format("%Y-%m-%d").to_string()],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Unread alerts count
    let unread_alerts: i32 = conn
        .query_row("SELECT COUNT(*) FROM alerts WHERE is_read = 0", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    // Machine status breakdown for chart
    let machine_status: Vec<(String, i32)> = vec![
        ("active".to_string(), active_machines),
        ("idle".to_string(), idle_machines),
        ("maintenance".to_string(), maintenance_machines),
        ("error".to_string(), error_machines),
    ];

    // Project status breakdown
    let project_status: Vec<(String, i32)> = conn
        .prepare("SELECT status, COUNT(*) FROM projects GROUP BY status")
        .ok()
        .and_then(|mut stmt| {
            stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                .ok()
                .map(|iter| iter.filter_map(|r| r.ok()).collect())
        })
        .unwrap_or_default();

    // Top 5 machines by hours this week
    let top_machines_week: Vec<(String, f64)> = conn
        .prepare(
            "SELECT m.name, COALESCE(SUM(s.actual_hours), 0) as hours
             FROM machines m
             LEFT JOIN schedules s ON m.id = s.machine_id AND s.date >= ?1 AND s.date <= ?2
             GROUP BY m.id
             ORDER BY hours DESC
             LIMIT 5",
        )
        .ok()
        .and_then(|mut stmt| {
            stmt.query_map(params![week_start_str, week_end_str], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .ok()
            .map(|iter| iter.filter_map(|r| r.ok()).collect())
        })
        .unwrap_or_default();

    // Weekly hours trend (last 4 weeks)
    let mut weekly_trend: Vec<(String, f64, f64)> = Vec::new();
    for weeks_ago in (0..4).rev() {
        let ws = week_start - chrono::Duration::weeks(weeks_ago);
        let we = ws + chrono::Duration::days(6);
        let ws_str = ws.format("%Y-%m-%d").to_string();
        let we_str = we.format("%Y-%m-%d").to_string();
        let label = ws.format("Week %W").to_string();

        let planned: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(planned_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
                params![ws_str, we_str],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        let actual: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(actual_hours), 0) FROM schedules WHERE date >= ?1 AND date <= ?2",
                params![ws_str, we_str],
                |row| row.get(0),
            )
            .unwrap_or(0.0);

        weekly_trend.push((label, planned, actual));
    }

    Ok(DashboardStats {
        total_machines,
        active_machines,
        maintenance_machines,
        idle_machines,
        error_machines,
        total_projects,
        active_projects,
        completed_projects,
        total_clients,
        planned_hours_week,
        actual_hours_week,
        planned_hours_month,
        actual_hours_month,
        total_planned_hours,
        total_actual_hours,
        utilization_rate,
        efficiency_rate,
        upcoming_maintenance,
        unread_alerts,
        machine_status,
        project_status,
        top_machines_week,
        weekly_trend,
    })
}

/// Get machine utilization for a date range
#[tauri::command]
pub fn get_machine_utilization(
    token: String,
    start_date: String,
    end_date: String,
    db: State<'_, Database>,
) -> Result<Vec<MachineUtilization>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.name,
                    COALESCE(SUM(s.planned_hours), 0) as planned,
                    COALESCE(SUM(s.actual_hours), 0) as actual,
                    COUNT(s.id) as schedule_count
             FROM machines m
             LEFT JOIN schedules s ON m.id = s.machine_id AND s.date >= ?1 AND s.date <= ?2
             GROUP BY m.id
             ORDER BY actual DESC",
        )
        .map_err(|e| e.to_string())?;

    let utilization: Vec<MachineUtilization> = stmt
        .query_map(params![start_date, end_date], |row| {
            let planned: f64 = row.get(2)?;
            let actual: f64 = row.get(3)?;
            let efficiency = if planned > 0.0 {
                (actual / planned * 100.0).min(100.0)
            } else {
                0.0
            };

            Ok(MachineUtilization {
                machine_id: row.get(0)?,
                machine_name: row.get(1)?,
                planned_hours: planned,
                actual_hours: actual,
                schedule_count: row.get(4)?,
                efficiency_percentage: efficiency,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(utilization)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MachineUtilization {
    pub machine_id: i64,
    pub machine_name: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub schedule_count: i32,
    pub efficiency_percentage: f64,
}

/// Get project progress overview
#[tauri::command]
pub fn get_project_progress(
    token: String,
    db: State<'_, Database>,
) -> Result<Vec<ProjectProgress>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let mut stmt = conn
        .prepare(
            "SELECT p.id, p.name, p.status, p.planned_hours, p.actual_hours,
                    p.start_date, p.end_date, c.name as client_name
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.id
             WHERE p.status IN ('planning', 'active')
             ORDER BY p.end_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let progress: Vec<ProjectProgress> = stmt
        .query_map([], |row| {
            let planned: f64 = row.get(3)?;
            let actual: f64 = row.get(4)?;
            let progress = if planned > 0.0 {
                (actual / planned * 100.0).min(100.0)
            } else {
                0.0
            };

            Ok(ProjectProgress {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                status: row.get(2)?,
                planned_hours: planned,
                actual_hours: actual,
                progress_percentage: progress,
                start_date: row.get(5)?,
                end_date: row.get(6)?,
                client_name: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(progress)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectProgress {
    pub project_id: i64,
    pub project_name: String,
    pub status: String,
    pub planned_hours: f64,
    pub actual_hours: f64,
    pub progress_percentage: f64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub client_name: Option<String>,
}
