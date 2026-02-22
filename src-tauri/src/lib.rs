use std::thread;
use std::time::Duration;
use tauri::Manager;

mod commands;
mod db;
mod models;
mod utils;

use db::initialize_database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database with tables and seed data
            let database = initialize_database(&app.handle())
                .expect("Failed to initialize database");

            // Manage database state
            app.manage(database);

            // Fetch both windows safely
            let splashscreen_window = app.get_webview_window("splashscreen").unwrap();
            let main_window = app.get_webview_window("main").unwrap();

            // Hide main window completely until splash closes
            main_window.hide().unwrap();

            // Wait 2.8s (enough for the splash animation)
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(2800));

                // Close splash and open main
                splashscreen_window.close().unwrap();
                main_window.show().unwrap();
                main_window.set_focus().unwrap();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::login,
            commands::logout,
            commands::get_current_user,
            commands::cmd_change_password,
            commands::validate_token,
            // User commands
            commands::get_users,
            commands::get_user,
            commands::create_user,
            commands::update_user,
            commands::delete_user,
            commands::reset_user_password,
            // Client commands
            commands::get_clients,
            commands::get_client,
            commands::create_client,
            commands::update_client,
            commands::delete_client,
            // Machine commands
            commands::get_machines,
            commands::get_machine,
            commands::create_machine,
            commands::update_machine,
            commands::update_machine_status,
            commands::delete_machine,
            commands::get_machine_history,
            // Project commands
            commands::get_projects,
            commands::get_project,
            commands::create_project,
            commands::update_project,
            commands::delete_project,
            commands::assign_machines_to_project,
            commands::assign_team_to_project,
            commands::log_project_hours,
            // Schedule commands
            commands::get_weekly_schedule,
            commands::get_schedule,
            commands::create_schedule,
            commands::update_schedule,
            commands::log_actual_hours,
            commands::delete_schedule,
            commands::get_schedules_by_date_range,
            commands::copy_week_schedule,
            // Maintenance commands
            commands::get_all_maintenance,
            commands::get_machine_maintenance,
            commands::get_maintenance,
            commands::create_maintenance,
            commands::update_maintenance,
            commands::delete_maintenance,
            commands::get_upcoming_maintenance,
            commands::get_overdue_maintenance,
            // Alert commands
            commands::get_alerts,
            commands::get_alert,
            commands::create_alert,
            commands::mark_alert_read,
            commands::mark_all_alerts_read,
            commands::dismiss_alert,
            commands::clear_read_alerts,
            commands::get_alert_stats,
            commands::get_unread_alert_count,
            // Dashboard commands
            commands::get_dashboard_stats,
            commands::get_machine_utilization,
            commands::get_project_progress,
            // Integrity commands (delete impact checking)
            commands::check_machine_delete_impact,
            commands::check_project_delete_impact,
            commands::check_client_delete_impact,
            commands::check_user_delete_impact,
            // Audit commands
            commands::get_audit_logs,
            commands::get_audit_stats,
            commands::get_audit_filter_options,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
