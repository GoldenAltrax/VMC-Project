use rusqlite::{Connection, Result, params};
use bcrypt::{hash, DEFAULT_COST};

/// Seed initial data into the database
pub fn seed_initial_data(conn: &Connection) -> Result<()> {
    seed_users(conn)?;
    seed_machines(conn)?;
    Ok(())
}

fn seed_users(conn: &Connection) -> Result<()> {
    let password_hash = hash("admin123", DEFAULT_COST).expect("Failed to hash password");
    conn.execute(
        "INSERT INTO users (username, password_hash, email, full_name, role) VALUES (?1, ?2, ?3, ?4, ?5)",
        params!["admin", password_hash, "admin@vmcplanner.local", "System Administrator", "Admin"],
    )?;
    Ok(())
}

fn seed_machines(conn: &Connection) -> Result<()> {
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
            "active",
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
