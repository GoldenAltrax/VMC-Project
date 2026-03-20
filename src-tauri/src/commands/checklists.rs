use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::Database;
use crate::utils::{require_edit_permission, require_view_permission, validate_session};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistTemplate {
    pub id: i64,
    pub machine_id: Option<i64>,
    pub checklist_item: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistCompletion {
    pub id: i64,
    pub machine_id: i64,
    pub machine_name: String,
    pub template_id: i64,
    pub checklist_item: String,
    pub checked_by: i64,
    pub operator_name: String,
    pub check_date: String,
    pub is_completed: bool,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitChecklistInput {
    pub machine_id: i64,
    pub check_date: String,
    pub completions: Vec<ChecklistCompletionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistCompletionItem {
    pub template_id: i64,
    pub is_completed: bool,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn get_checklist_templates(token: String, machine_id: Option<i64>, db: State<'_, Database>) -> Result<Vec<ChecklistTemplate>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;

    let sql = if machine_id.is_some() {
        "SELECT * FROM checklist_templates WHERE (machine_id = ?1 OR machine_id IS NULL) AND is_active = 1 ORDER BY id ASC"
    } else {
        "SELECT * FROM checklist_templates WHERE is_active = 1 ORDER BY machine_id ASC, id ASC"
    };
    let mid = machine_id.unwrap_or(0);
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let templates: Vec<ChecklistTemplate> = if machine_id.is_some() {
        stmt.query_map(params![mid], |row| Ok(ChecklistTemplate {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            checklist_item: row.get("checklist_item")?,
            is_active: row.get::<_, i64>("is_active")? != 0,
            created_at: row.get("created_at")?,
        })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    } else {
        stmt.query_map([], |row| Ok(ChecklistTemplate {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            checklist_item: row.get("checklist_item")?,
            is_active: row.get::<_, i64>("is_active")? != 0,
            created_at: row.get("created_at")?,
        })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect()
    };
    Ok(templates)
}

#[tauri::command]
pub fn create_checklist_template(token: String, machine_id: Option<i64>, checklist_item: String, db: State<'_, Database>) -> Result<ChecklistTemplate, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    conn.execute("INSERT INTO checklist_templates (machine_id, checklist_item) VALUES (?1, ?2)", params![machine_id, checklist_item]).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let t: ChecklistTemplate = conn.query_row("SELECT * FROM checklist_templates WHERE id = ?1", params![id], |row| Ok(ChecklistTemplate {
        id: row.get("id")?,
        machine_id: row.get("machine_id")?,
        checklist_item: row.get("checklist_item")?,
        is_active: row.get::<_, i64>("is_active")? != 0,
        created_at: row.get("created_at")?,
    })).map_err(|e| e.to_string())?;
    Ok(t)
}

#[tauri::command]
pub fn delete_checklist_template(token: String, id: i64, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    conn.execute("DELETE FROM checklist_templates WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn submit_checklist(token: String, input: SubmitChecklistInput, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_edit_permission(&user)?;
    for item in &input.completions {
        conn.execute(
            "INSERT INTO checklist_completions (machine_id, template_id, checked_by, check_date, is_completed, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT DO NOTHING",
            params![input.machine_id, item.template_id, user.id, input.check_date, item.is_completed as i64, item.notes],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_checklist_completions(token: String, machine_id: i64, check_date: String, db: State<'_, Database>) -> Result<Vec<ChecklistCompletion>, String> {
    let conn = db.conn.lock();
    let user = validate_session(&conn, &token)?;
    require_view_permission(&user)?;
    let mut stmt = conn.prepare(
        "SELECT cc.*, ct.checklist_item, m.name as machine_name, u.full_name as operator_name
         FROM checklist_completions cc
         LEFT JOIN checklist_templates ct ON cc.template_id = ct.id
         LEFT JOIN machines m ON cc.machine_id = m.id
         LEFT JOIN users u ON cc.checked_by = u.id
         WHERE cc.machine_id = ?1 AND cc.check_date = ?2"
    ).map_err(|e| e.to_string())?;
    let completions: Vec<ChecklistCompletion> = stmt.query_map(params![machine_id, check_date], |row| {
        Ok(ChecklistCompletion {
            id: row.get("id")?,
            machine_id: row.get("machine_id")?,
            machine_name: row.get("machine_name").unwrap_or_default(),
            template_id: row.get("template_id")?,
            checklist_item: row.get("checklist_item").unwrap_or_default(),
            checked_by: row.get("checked_by")?,
            operator_name: row.get("operator_name").unwrap_or_default(),
            check_date: row.get("check_date")?,
            is_completed: row.get::<_, i64>("is_completed")? != 0,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(completions)
}
