// User and Authentication Types
export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role: 'Admin' | 'Operator' | 'Viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  role: 'Admin' | 'Operator' | 'Viewer';
}

export interface UpdateUserInput {
  email?: string;
  full_name?: string;
  role?: 'Admin' | 'Operator' | 'Viewer';
  is_active?: boolean;
}

// Client Types
export interface Client {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
}

// Machine Types
export type MachineStatus = 'active' | 'idle' | 'maintenance' | 'error';
export type MachineCapacity = 'Small' | 'Medium' | 'Large' | 'Extra Large';

export interface Machine {
  id: number;
  name: string;
  model: string;
  serial_number: string | null;
  purchase_date: string | null;
  status: MachineStatus;
  location: string | null;
  capacity: MachineCapacity | null;
  power_consumption: string | null;
  dimensions: string | null;
  weight: string | null;
  max_rpm: string | null;
  axis_travel: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMachineInput {
  name: string;
  model: string;
  serial_number?: string;
  purchase_date?: string;
  status: MachineStatus;
  location?: string;
  capacity?: MachineCapacity;
  power_consumption?: string;
  dimensions?: string;
  weight?: string;
  max_rpm?: string;
  axis_travel?: string;
}

export interface UpdateMachineInput {
  name?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  status?: MachineStatus;
  location?: string;
  capacity?: MachineCapacity;
  power_consumption?: string;
  dimensions?: string;
  weight?: string;
  max_rpm?: string;
  axis_travel?: string;
}

export interface MachineHistoryResponse {
  machine: Machine;
  schedules: Schedule[];
  maintenance: Maintenance[];
  assigned_projects: { id: number; name: string }[];
}

// Project Types
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold';

export interface Project {
  id: number;
  name: string;
  client_id: number | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  planned_hours: number;
  actual_hours: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  client_name: string | null;
  assigned_machines: number[];
  team_members: number[];
  progress_percentage: number;
}

export interface CreateProjectInput {
  name: string;
  client_id?: number;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  planned_hours: number;
  assigned_machines?: number[];
  team_members?: number[];
}

export interface UpdateProjectInput {
  name?: string;
  client_id?: number;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
  planned_hours?: number;
  actual_hours?: number;
}

// Schedule Types
export type ScheduleStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Schedule {
  id: number;
  machine_id: number;
  project_id: number | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  operator_id: number | null;
  load_name: string | null;
  planned_hours: number;
  actual_hours: number | null;
  notes: string | null;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface ScheduleWithDetails extends Schedule {
  machine_name: string;
  project_name: string | null;
  operator_name: string | null;
}

export interface CreateScheduleInput {
  machine_id: number;
  project_id?: number;
  date: string;
  start_time?: string;
  end_time?: string;
  operator_id?: number;
  load_name?: string;
  planned_hours: number;
  notes?: string;
  status?: ScheduleStatus;
}

export interface UpdateScheduleInput {
  project_id?: number;
  date?: string;
  start_time?: string;
  end_time?: string;
  operator_id?: number;
  load_name?: string;
  planned_hours?: number;
  actual_hours?: number;
  notes?: string;
  status?: ScheduleStatus;
}

// Weekly Planner Types
export interface ScheduleEntry {
  id: number;
  project_id: number | null;
  project_name: string | null;
  operator_id: number | null;
  operator_name: string | null;
  load_name: string | null;
  start_time: string | null;
  end_time: string | null;
  planned_hours: number;
  actual_hours: number | null;
  notes: string | null;
  status: ScheduleStatus;
}

export interface DaySchedule {
  date: string;
  day_name: string;
  entries: ScheduleEntry[];
  total_planned_hours: number;
  total_actual_hours: number;
}

export interface MachineWeekSchedule {
  machine_id: number;
  machine_name: string;
  days: DaySchedule[];
  weekly_planned_hours: number;
  weekly_actual_hours: number;
}

export interface WeeklyScheduleResponse {
  week_start: string;
  week_end: string;
  machines: MachineWeekSchedule[];
}

// Maintenance Types
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection' | 'calibration';
export type MaintenanceStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Maintenance {
  id: number;
  machine_id: number;
  date: string;
  maintenance_type: MaintenanceType;
  description: string | null;
  performed_by: number | null;
  cost: number | null;
  status: MaintenanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceInput {
  machine_id: number;
  date: string;
  maintenance_type: MaintenanceType;
  description?: string;
  performed_by?: number;
  cost?: number;
  status?: MaintenanceStatus;
  notes?: string;
}

export interface UpdateMaintenanceInput {
  date?: string;
  maintenance_type?: MaintenanceType;
  description?: string;
  performed_by?: number;
  cost?: number;
  status?: MaintenanceStatus;
  notes?: string;
}

export interface UpcomingMaintenance extends Maintenance {
  machine_name: string;
  performer_name: string | null;
}

// Alert Types
export type AlertType = 'info' | 'warning' | 'error' | 'maintenance' | 'schedule';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: number;
  alert_type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  machine_id: number | null;
  project_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AlertWithDetails extends Alert {
  machine_name: string | null;
  project_name: string | null;
}

export interface CreateAlertInput {
  alert_type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  machine_id?: number;
  project_id?: number;
}

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  by_type: [string, number][];
}

// Dashboard Types
export interface DashboardStats {
  total_machines: number;
  active_machines: number;
  maintenance_machines: number;
  idle_machines: number;
  error_machines: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_clients: number;
  planned_hours_week: number;
  actual_hours_week: number;
  planned_hours_month: number;
  actual_hours_month: number;
  total_planned_hours: number;
  total_actual_hours: number;
  utilization_rate: number;
  efficiency_rate: number;
  upcoming_maintenance: number;
  unread_alerts: number;
  machine_status: [string, number][];
  project_status: [string, number][];
  top_machines_week: [string, number][];
  weekly_trend: [string, number, number][];
}

export interface MachineUtilization {
  machine_id: number;
  machine_name: string;
  planned_hours: number;
  actual_hours: number;
  schedule_count: number;
  efficiency_percentage: number;
}

export interface ProjectProgress {
  project_id: number;
  project_name: string;
  status: ProjectStatus;
  planned_hours: number;
  actual_hours: number;
  progress_percentage: number;
  start_date: string | null;
  end_date: string | null;
  client_name: string | null;
}
