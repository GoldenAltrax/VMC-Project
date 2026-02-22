use rusqlite::{Connection, Result, params};
use bcrypt::{hash, DEFAULT_COST};
use chrono::{Datelike, Local, NaiveDate, Duration};

/// Seed initial data into the database
pub fn seed_initial_data(conn: &Connection) -> Result<()> {
    seed_users(conn)?;
    seed_clients(conn)?;
    seed_machines(conn)?;
    seed_projects(conn)?;
    seed_project_machines(conn)?;
    seed_project_team(conn)?;
    seed_schedules(conn)?;
    seed_maintenance(conn)?;
    seed_alerts(conn)?;
    Ok(())
}

fn seed_users(conn: &Connection) -> Result<()> {
    let users = vec![
        ("admin", "admin123", "admin@vmcplanner.local", "System Administrator", "Admin"),
        ("operator1", "operator123", "operator1@vmcplanner.local", "John Smith", "Operator"),
        ("operator2", "operator123", "operator2@vmcplanner.local", "Maria Rodriguez", "Operator"),
        ("operator3", "operator123", "operator3@vmcplanner.local", "Robert Johnson", "Operator"),
        ("viewer1", "viewer123", "viewer1@vmcplanner.local", "David Wilson", "Viewer"),
    ];

    for (username, password, email, full_name, role) in users {
        let password_hash = hash(password, DEFAULT_COST).expect("Failed to hash password");
        conn.execute(
            "INSERT INTO users (username, password_hash, email, full_name, role) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![username, password_hash, email, full_name, role],
        )?;
    }
    Ok(())
}

fn seed_clients(conn: &Connection) -> Result<()> {
    let clients = vec![
        ("AeroTech Industries", "procurement@aerotech.com", "+1-555-0101", "1200 Aviation Blvd, Seattle, WA 98101", "Premium aerospace client"),
        ("Global Motors", "supply.chain@globalmotors.com", "+1-555-0202", "8500 Automotive Way, Detroit, MI 48201", "Major automotive manufacturer"),
        ("HealthTech Solutions", "vendor.relations@healthtech.com", "+1-555-0303", "450 Medical Center Dr, Boston, MA 02115", "Medical device components"),
        ("Heavy Industries Co.", "purchasing@heavyindustries.com", "+1-555-0404", "2200 Industrial Park Rd, Pittsburgh, PA 15201", "Industrial equipment parts"),
    ];

    for (name, email, phone, address, notes) in clients {
        conn.execute(
            "INSERT INTO clients (name, contact_email, contact_phone, address, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![name, email, phone, address, notes],
        )?;
    }
    Ok(())
}

fn seed_machines(conn: &Connection) -> Result<()> {
    // The 7 real VMC machines from the user's data
    let machines = vec![
        (
            "TAKUMI H12E",
            "Horizontal Machining Center",
            "TH12E-2023-001",
            "2023-03-15",
            "active",
            "Main Shop Floor - Bay 1",
            "Large",
            "30 kW",
            "4.0m x 3.5m x 3.2m",
            "12,000 kg",
            "12,000",
            "X:1200mm Y:800mm Z:700mm",
        ),
        (
            "MAKINO PS65",
            "Vertical Machining Center",
            "MPS65-2022-015",
            "2022-08-20",
            "active",
            "Main Shop Floor - Bay 2",
            "Medium",
            "22 kW",
            "2.8m x 2.5m x 3.0m",
            "8,500 kg",
            "14,000",
            "X:900mm Y:500mm Z:450mm",
        ),
        (
            "TAKUMI V12",
            "Vertical Machining Center",
            "TV12-2023-008",
            "2023-01-10",
            "active",
            "Main Shop Floor - Bay 3",
            "Large",
            "25 kW",
            "3.2m x 2.8m x 3.1m",
            "9,200 kg",
            "10,000",
            "X:1200mm Y:600mm Z:500mm",
        ),
        (
            "CHEVALIER NH",
            "CNC Vertical Machining Center",
            "CNH-2021-042",
            "2021-11-05",
            "idle",
            "Secondary Shop - Bay 1",
            "Medium",
            "18 kW",
            "2.5m x 2.2m x 2.8m",
            "6,800 kg",
            "8,000",
            "X:800mm Y:450mm Z:500mm",
        ),
        (
            "USW 2518",
            "Wire EDM Machine",
            "USW2518-2022-003",
            "2022-05-12",
            "maintenance",
            "EDM Room",
            "Medium",
            "15 kW",
            "2.2m x 1.8m x 2.0m",
            "3,500 kg",
            "N/A",
            "X:250mm Y:180mm Z:200mm",
        ),
        (
            "F16",
            "High-Speed Milling Center",
            "F16-2023-012",
            "2023-06-01",
            "active",
            "High-Speed Machining Area",
            "Small",
            "20 kW",
            "2.0m x 1.8m x 2.5m",
            "5,200 kg",
            "24,000",
            "X:500mm Y:400mm Z:350mm",
        ),
        (
            "DMC 103V",
            "5-Axis Universal Milling Machine",
            "DMC103V-2020-007",
            "2020-09-15",
            "active",
            "5-Axis Machining Cell",
            "Extra Large",
            "35 kW",
            "4.5m x 4.0m x 3.5m",
            "15,000 kg",
            "18,000",
            "X:1000mm Y:800mm Z:700mm",
        ),
    ];

    for (name, model, serial, purchase_date, status, location, capacity, power, dims, weight, rpm, axis) in machines {
        conn.execute(
            "INSERT INTO machines (name, model, serial_number, purchase_date, status, location, capacity, power_consumption, dimensions, weight, max_rpm, axis_travel)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![name, model, serial, purchase_date, status, location, capacity, power, dims, weight, rpm, axis],
        )?;
    }
    Ok(())
}

fn seed_projects(conn: &Connection) -> Result<()> {
    let today = Local::now().naive_local().date();
    let projects = vec![
        (
            "Aerospace Components Batch A",
            1, // AeroTech Industries
            "Manufacturing of precision turbine blade components for commercial aircraft engines. Includes 48 turbine blades with tight tolerances.",
            (today - Duration::days(14)).to_string(),
            (today + Duration::days(45)).to_string(),
            "active",
            240.0,
            156.0, // 65% complete
            1, // admin
        ),
        (
            "EV Transmission Parts",
            2, // Global Motors
            "Production of high-precision transmission gears for next-gen electric vehicles. Order includes 200 gear sets.",
            (today - Duration::days(7)).to_string(),
            (today + Duration::days(60)).to_string(),
            "active",
            320.0,
            89.0, // ~28% complete
            1,
        ),
        (
            "Surgical Instruments Set",
            3, // HealthTech Solutions
            "Precision machining of surgical tool components meeting FDA medical grade standards. Batch of 500 units.",
            (today + Duration::days(7)).to_string(),
            (today + Duration::days(90)).to_string(),
            "planning",
            400.0,
            0.0,
            1,
        ),
        (
            "Industrial Pump Components",
            4, // Heavy Industries Co.
            "Manufacturing of heavy-duty pump housings and impellers for industrial applications.",
            (today - Duration::days(30)).to_string(),
            (today - Duration::days(5)).to_string(),
            "completed",
            180.0,
            178.0, // Completed efficiently
            1,
        ),
        (
            "Defense Contract D-2024",
            1, // AeroTech Industries (also does defense)
            "Classified precision components for defense applications. High-security clearance required.",
            (today - Duration::days(3)).to_string(),
            (today + Duration::days(120)).to_string(),
            "active",
            500.0,
            24.0, // Just started
            1,
        ),
    ];

    for (name, client_id, desc, start, end, status, planned, actual, created_by) in projects {
        conn.execute(
            "INSERT INTO projects (name, client_id, description, start_date, end_date, status, planned_hours, actual_hours, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![name, client_id, desc, start, end, status, planned, actual, created_by],
        )?;
    }
    Ok(())
}

fn seed_project_machines(conn: &Connection) -> Result<()> {
    let assignments = vec![
        (1, 1), // Aerospace -> TAKUMI H12E
        (1, 3), // Aerospace -> TAKUMI V12
        (2, 2), // EV Transmission -> MAKINO PS65
        (2, 7), // EV Transmission -> DMC 103V
        (3, 6), // Surgical -> F16 (high precision)
        (4, 4), // Industrial Pump -> CHEVALIER NH
        (4, 5), // Industrial Pump -> USW 2518
        (5, 7), // Defense -> DMC 103V (5-axis for complex parts)
        (5, 1), // Defense -> TAKUMI H12E
    ];

    for (project_id, machine_id) in assignments {
        conn.execute(
            "INSERT INTO project_machines (project_id, machine_id) VALUES (?1, ?2)",
            params![project_id, machine_id],
        )?;
    }
    Ok(())
}

fn seed_project_team(conn: &Connection) -> Result<()> {
    let team = vec![
        (1, 2, "lead"),       // Aerospace -> operator1 as lead
        (1, 3, "member"),     // Aerospace -> operator2
        (2, 2, "lead"),       // EV -> operator1 as lead
        (2, 4, "member"),     // EV -> operator3
        (3, 3, "lead"),       // Surgical -> operator2 as lead
        (4, 4, "lead"),       // Industrial -> operator3 as lead
        (5, 2, "lead"),       // Defense -> operator1 as lead (senior)
        (5, 3, "member"),     // Defense -> operator2
        (5, 4, "member"),     // Defense -> operator3
    ];

    for (project_id, user_id, role) in team {
        conn.execute(
            "INSERT INTO project_team (project_id, user_id, role) VALUES (?1, ?2, ?3)",
            params![project_id, user_id, role],
        )?;
    }
    Ok(())
}

fn seed_schedules(conn: &Connection) -> Result<()> {
    // Get the current week's Monday
    let today = Local::now().naive_local().date();
    let days_from_monday = today.weekday().num_days_from_monday() as i64;
    let monday = today - Duration::days(days_from_monday);

    // Historical data for past 4 weeks (for impressive trend charts)
    let historical_weeks: Vec<(i64, Vec<(f64, f64)>)> = vec![
        // Week -4: (machine_id relative offset, planned, actual) - lower utilization
        (-28, vec![(48.0, 42.0), (36.0, 35.0), (24.0, 22.0), (12.0, 11.0)]),
        // Week -3: improving
        (-21, vec![(60.0, 55.0), (48.0, 46.0), (36.0, 34.0), (24.0, 22.0)]),
        // Week -2: good week
        (-14, vec![(72.0, 68.0), (60.0, 58.0), (48.0, 45.0), (36.0, 35.0)]),
        // Week -1: excellent week
        (-7, vec![(84.0, 82.0), (72.0, 70.0), (60.0, 58.0), (48.0, 47.0)]),
    ];

    // Insert historical weekly summaries (simplified - one entry per machine per week)
    for (week_offset, machines_data) in &historical_weeks {
        let week_monday = monday + Duration::days(*week_offset);
        for (idx, (planned, actual)) in machines_data.iter().enumerate() {
            let machine_id = (idx + 1) as i64; // machines 1-4
            for day in 0..5 { // Mon-Fri
                let day_date = week_monday + Duration::days(day);
                let daily_planned = planned / 5.0;
                let daily_actual = actual / 5.0;
                conn.execute(
                    "INSERT INTO schedules (machine_id, project_id, date, start_time, end_time, operator_id, load_name, planned_hours, actual_hours, notes, status)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'completed')",
                    params![machine_id, Some(1), day_date.to_string(), "08:00", "20:00", Some(2), "Historical Job", daily_planned, Some(daily_actual), "Historical data"],
                )?;
            }
        }
    }

    // Current week schedule entries using load names from user's data
    let schedules = vec![
        // TAKUMI H12E (machine_id: 1)
        (1, Some(1), monday.to_string(), "08:00", "20:00", Some(2), "HW BOT INS", 12.0, Some(11.5), "Aerospace batch", "completed"),
        (1, Some(1), (monday + Duration::days(1)).to_string(), "08:00", "20:00", Some(2), "HW BOT INS", 12.0, Some(12.0), "Aerospace batch", "completed"),
        (1, Some(1), (monday + Duration::days(2)).to_string(), "08:00", "20:00", Some(3), "KWPA BUNK", 12.0, Some(11.0), "Aerospace batch", "in-progress"),
        (1, Some(1), (monday + Duration::days(3)).to_string(), "08:00", "20:00", Some(2), "KWPA BUNK", 12.0, None, "Aerospace batch", "scheduled"),
        (1, Some(1), (monday + Duration::days(4)).to_string(), "08:00", "20:00", Some(2), "HW TOP INS", 12.0, None, "Aerospace batch", "scheduled"),

        // MAKINO PS65 (machine_id: 2)
        (2, Some(2), monday.to_string(), "08:00", "20:00", Some(2), "FMD 33G ELE", 12.0, Some(12.0), "EV transmission", "completed"),
        (2, Some(2), (monday + Duration::days(1)).to_string(), "08:00", "20:00", Some(2), "FMD KWPA ELE", 12.0, Some(12.0), "EV transmission", "completed"),
        (2, Some(2), (monday + Duration::days(2)).to_string(), "08:00", "20:00", Some(4), "KOPA 3C SP. BUSH", 12.0, Some(11.5), "EV transmission", "in-progress"),
        (2, Some(2), (monday + Duration::days(3)).to_string(), "08:00", "20:00", Some(4), "KOPA 3C SP. BUSH", 12.0, None, "EV transmission", "scheduled"),
        (2, Some(2), (monday + Duration::days(4)).to_string(), "08:00", "20:00", Some(2), "33G FD SET", 12.0, None, "EV transmission", "scheduled"),

        // TAKUMI V12 (machine_id: 3)
        (3, Some(1), monday.to_string(), "08:00", "20:00", Some(3), "XF331 FD", 12.0, Some(11.0), "Precision parts", "completed"),
        (3, Some(1), (monday + Duration::days(1)).to_string(), "08:00", "20:00", Some(3), "XF331 FD", 12.0, Some(12.0), "Precision parts", "completed"),
        (3, None, (monday + Duration::days(2)).to_string(), "08:00", "20:00", Some(3), "33G FD BK SET", 12.0, None, "Custom order", "scheduled"),
        (3, Some(1), (monday + Duration::days(3)).to_string(), "08:00", "20:00", Some(3), "XF331 BUNK", 12.0, None, "Aerospace precision", "scheduled"),

        // CHEVALIER NH (machine_id: 4)
        (4, None, monday.to_string(), "08:00", "20:00", Some(4), "NH BRACKETS", 12.0, Some(10.5), "Bracket set", "completed"),
        (4, None, (monday + Duration::days(1)).to_string(), "08:00", "20:00", Some(4), "NH PLATES", 12.0, Some(11.0), "Plate work", "completed"),
        (4, Some(4), (monday + Duration::days(2)).to_string(), "08:00", "16:00", Some(4), "PUMP HOUSING", 8.0, None, "Industrial pump", "scheduled"),

        // F16 (machine_id: 6)
        (6, Some(3), (monday + Duration::days(2)).to_string(), "08:00", "20:00", Some(3), "FMD 33G MD", 12.0, None, "Setup for surgical", "scheduled"),
        (6, Some(3), (monday + Duration::days(3)).to_string(), "08:00", "20:00", Some(3), "CC J1 MD", 12.0, None, "Surgical instruments", "scheduled"),
        (6, Some(3), (monday + Duration::days(4)).to_string(), "08:00", "20:00", Some(3), "CC J1 MD", 12.0, None, "Surgical instruments", "scheduled"),

        // DMC 103V (machine_id: 7)
        (7, Some(2), monday.to_string(), "08:00", "20:00", Some(4), "XF331 BUNK", 12.0, Some(11.5), "Complex 5-axis work", "completed"),
        (7, Some(2), (monday + Duration::days(1)).to_string(), "08:00", "20:00", Some(4), "XF331 BUNK", 12.0, Some(12.0), "Complex 5-axis work", "completed"),
        (7, Some(2), (monday + Duration::days(2)).to_string(), "08:00", "20:00", Some(2), "5-AXIS CUSTOM", 12.0, None, "5-axis precision", "in-progress"),
        (7, Some(2), (monday + Duration::days(3)).to_string(), "08:00", "20:00", Some(4), "5-AXIS CUSTOM", 12.0, None, "5-axis precision", "scheduled"),
        (7, Some(2), (monday + Duration::days(4)).to_string(), "08:00", "20:00", Some(4), "EV GEAR FINAL", 12.0, None, "Final EV assembly", "scheduled"),
    ];

    for (machine_id, project_id, date, start, end, operator_id, load, planned, actual, notes, status) in schedules {
        conn.execute(
            "INSERT INTO schedules (machine_id, project_id, date, start_time, end_time, operator_id, load_name, planned_hours, actual_hours, notes, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![machine_id, project_id, date, start, end, operator_id, load, planned, actual, notes, status],
        )?;
    }
    Ok(())
}

fn seed_maintenance(conn: &Connection) -> Result<()> {
    let today = Local::now().naive_local().date();

    let maintenance = vec![
        (1, (today - Duration::days(30)).to_string(), "preventive", "Routine oil change and lubrication", Some(2), Some(250.0), "completed", Some("Regular maintenance cycle")),
        (2, (today - Duration::days(15)).to_string(), "preventive", "Spindle bearing inspection", Some(3), Some(150.0), "completed", Some("Bearings in good condition")),
        (3, (today - Duration::days(7)).to_string(), "corrective", "Coolant system flush and refill", Some(4), Some(320.0), "completed", Some("Coolant replaced with new type")),
        (5, today.to_string(), "preventive", "Wire guide replacement and calibration", Some(2), Some(450.0), "in-progress", Some("In progress - expected completion today")),
        (7, (today + Duration::days(7)).to_string(), "inspection", "Annual 5-axis calibration check", Some(3), Some(800.0), "scheduled", Some("Annual certification required")),
    ];

    for (machine_id, date, mtype, desc, performed_by, cost, status, notes) in maintenance {
        conn.execute(
            "INSERT INTO maintenance (machine_id, date, maintenance_type, description, performed_by, cost, status, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![machine_id, date, mtype, desc, performed_by, cost, status, notes],
        )?;
    }
    Ok(())
}

fn seed_alerts(conn: &Connection) -> Result<()> {
    let alerts = vec![
        // Critical & High priority - attention grabbing
        ("maintenance", "high", "Maintenance In Progress", "USW 2518 is under maintenance - wire guide replacement in progress. Expected completion: today.", Some(5), None::<i64>),
        ("schedule", "high", "High-Priority Job Due", "Aerospace Components Batch A - critical deadline approaching in 3 days", Some(1), Some(1)),

        // Medium priority - operational
        ("maintenance", "medium", "Maintenance Due Soon", "TAKUMI H12E scheduled maintenance due in 30 days - preventive oil change", Some(1), None),
        ("schedule", "medium", "Schedule Reminder", "EV Transmission Parts project requires 5-axis machine allocation this week", None, Some(2)),
        ("info", "medium", "Utilization Alert", "Weekly machine utilization at 87% - exceeding target of 80%", None, None),

        // Low priority - informational
        ("info", "low", "Machine Status Update", "CHEVALIER NH returned to idle status after completing bracket set", Some(4), None),
        ("info", "low", "Project Milestone", "Industrial Pump Components project completed ahead of schedule", None, Some(4)),
        ("info", "low", "System Notification", "Weekly database backup completed successfully", None, None),
        ("schedule", "low", "New Schedule Added", "F16 scheduled for surgical instruments production starting Thursday", Some(6), Some(3)),
        ("info", "low", "Performance Update", "DMC 103V achieved 95% efficiency this week - top performer", Some(7), None),
    ];

    for (alert_type, priority, title, message, machine_id, project_id) in alerts {
        conn.execute(
            "INSERT INTO alerts (alert_type, priority, title, message, machine_id, project_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![alert_type, priority, title, message, machine_id, project_id],
        )?;
    }
    Ok(())
}
