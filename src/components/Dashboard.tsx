import React, { useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Cog, Factory, PauseCircle, Percent, Timer, TrendingUp, Wrench, Loader2, X, Users, FolderKanban, BarChart3 } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useMachines } from '../hooks/useMachines';
import { useAlerts } from '../hooks/useAlerts';
import type { DashboardStats, Machine, AlertWithDetails, MachineUtilization, ProjectProgress } from '../types';

export function Dashboard() {
  const { stats, machineUtilization, projectProgress, loading, error, fetchAll, clearError } = useDashboard();
  const { machines, fetchMachines } = useMachines();
  const { alerts, fetchAlerts, markAsRead } = useAlerts();

  useEffect(() => {
    fetchAll();
    fetchMachines();
    fetchAlerts();
  }, [fetchAll, fetchMachines, fetchAlerts]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-200">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Machine Utilization"
          value={`${stats?.utilization_rate.toFixed(0) || 0}%`}
          icon={Percent}
          trend={`${stats?.efficiency_rate.toFixed(0) || 0}% efficiency`}
          trendUp={stats ? stats.efficiency_rate >= 80 : false}
          color="blue"
        />
        <StatCard
          title="Active Machines"
          value={`${stats?.active_machines || 0}/${stats?.total_machines || 0}`}
          icon={Factory}
          trend={`${stats?.maintenance_machines || 0} in maintenance, ${stats?.idle_machines || 0} idle`}
          trendUp={stats ? stats.active_machines > stats.idle_machines : false}
          color="green"
        />
        <StatCard
          title="Active Projects"
          value={`${stats?.active_projects || 0}`}
          icon={Activity}
          trend={`${stats?.completed_projects || 0} completed, ${stats?.total_projects || 0} total`}
          trendUp={true}
          color="purple"
        />
        <StatCard
          title="Weekly Hours"
          value={`${stats?.actual_hours_week.toFixed(0) || 0}h`}
          icon={Clock}
          trend={`${stats?.planned_hours_week.toFixed(0) || 0}h planned`}
          trendUp={stats ? stats.actual_hours_week >= stats.planned_hours_week * 0.8 : false}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSmall
          title="Total Clients"
          value={stats?.total_clients || 0}
          icon={Users}
          color="cyan"
        />
        <StatCardSmall
          title="Upcoming Maintenance"
          value={stats?.upcoming_maintenance || 0}
          icon={Wrench}
          color="yellow"
        />
        <StatCardSmall
          title="Unread Alerts"
          value={stats?.unread_alerts || 0}
          icon={AlertCircle}
          color={stats && stats.unread_alerts > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Status */}
        <div className="col-span-2 bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Machine Status</h2>
            <span className="text-sm text-gray-400">
              {machines.filter(m => m.status === 'active').length} active
            </span>
          </div>
          <div className="space-y-4">
            {machines.slice(0, 5).map(machine => (
              <MachineStatusRow key={machine.id} machine={machine} />
            ))}
            {machines.length === 0 && (
              <p className="text-gray-400 text-center py-4">No machines found</p>
            )}
          </div>
        </div>

        {/* Project Progress */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Project Progress</h2>
            <FolderKanban size={18} className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {projectProgress.slice(0, 4).map(project => (
              <ProjectProgressItem key={project.project_id} project={project} />
            ))}
            {projectProgress.length === 0 && (
              <p className="text-gray-400 text-center py-4">No active projects</p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trend & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Weekly Hours Trend</h2>
            <BarChart3 size={18} className="text-gray-400" />
          </div>
          <div className="space-y-3">
            {stats?.weekly_trend.slice(-7).map(([day, planned, actual], idx) => (
              <WeeklyTrendBar key={idx} day={day} planned={planned} actual={actual} />
            ))}
            {(!stats || stats.weekly_trend.length === 0) && (
              <p className="text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            {stats && stats.unread_alerts > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.unread_alerts} unread
              </span>
            )}
          </div>
          <div className="space-y-4">
            {alerts.slice(0, 5).map(alert => (
              <AlertItem key={alert.id} alert={alert} onMarkRead={() => markAsRead(alert.id)} />
            ))}
            {alerts.length === 0 && (
              <p className="text-gray-400 text-center py-4">No recent alerts</p>
            )}
          </div>
        </div>
      </div>

      {/* Machine Utilization Chart */}
      {machineUtilization.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Machine Utilization (This Week)</h2>
            <TrendingUp size={18} className="text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machineUtilization.map(machine => (
              <MachineUtilizationCard key={machine.machine_id} utilization={machine} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: string;
  trendUp: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          <div className={`text-xs mt-2 ${trendUp ? 'text-green-400' : 'text-yellow-400'}`}>
            {trend}
          </div>
        </div>
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

interface StatCardSmallProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'cyan' | 'yellow' | 'red' | 'gray';
}

function StatCardSmall({ title, value, icon: Icon, color }: StatCardSmallProps) {
  const colorMap = {
    cyan: 'text-cyan-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    gray: 'text-gray-500',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className={`text-xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      </div>
      <Icon size={24} className={colorMap[color]} />
    </div>
  );
}

function MachineStatusRow({ machine }: { machine: Machine }) {
  const statusIcons = {
    active: <CheckCircle2 className="text-green-500" size={18} />,
    idle: <PauseCircle className="text-yellow-500" size={18} />,
    maintenance: <Cog className="text-blue-500" size={18} />,
    error: <AlertCircle className="text-red-500" size={18} />,
  };

  const statusText = {
    active: 'Active',
    idle: 'Idle',
    maintenance: 'Maintenance',
    error: 'Error',
  };

  const statusColors = {
    active: 'text-green-500',
    idle: 'text-yellow-500',
    maintenance: 'text-blue-500',
    error: 'text-red-500',
  };

  return (
    <div className="flex items-center p-3 rounded-lg hover:bg-gray-700/50">
      <div className="flex-shrink-0 mr-4">{statusIcons[machine.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <p className="font-medium">{machine.name}</p>
          <p className={`text-sm ${statusColors[machine.status]}`}>
            {statusText[machine.status]}
          </p>
        </div>
        <p className="text-sm text-gray-400 truncate">{machine.model}</p>
        {machine.location && (
          <p className="text-xs text-gray-500">{machine.location}</p>
        )}
      </div>
    </div>
  );
}

function ProjectProgressItem({ project }: { project: ProjectProgress }) {
  const statusColors: Record<string, string> = {
    planning: 'text-yellow-500',
    active: 'text-green-500',
    completed: 'text-blue-500',
    'on-hold': 'text-orange-500',
  };

  return (
    <div className="p-3 bg-gray-700/30 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{project.project_name}</p>
          {project.client_name && (
            <p className="text-xs text-gray-400">{project.client_name}</p>
          )}
        </div>
        <span className={`text-xs ${statusColors[project.status] || 'text-gray-400'}`}>
          {project.status}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Progress</span>
          <span>{project.progress_percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-500">
          <span>{project.actual_hours}h logged</span>
          <span>{project.planned_hours}h planned</span>
        </div>
      </div>
    </div>
  );
}

function WeeklyTrendBar({ day, planned, actual }: { day: string; planned: number; actual: number }) {
  const maxHours = Math.max(planned, actual, 1);
  const plannedWidth = (planned / maxHours) * 100;
  const actualWidth = (actual / maxHours) * 100;

  return (
    <div className="flex items-center space-x-3">
      <div className="w-12 text-xs text-gray-400">{day}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center space-x-2">
          <div className="h-2 bg-blue-900/50 rounded-full flex-1 relative">
            <div
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${plannedWidth}%` }}
            />
          </div>
          <span className="text-xs text-blue-400 w-10 text-right">{planned.toFixed(0)}h</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-2 bg-green-900/50 rounded-full flex-1 relative">
            <div
              className="h-2 bg-green-500 rounded-full"
              style={{ width: `${actualWidth}%` }}
            />
          </div>
          <span className="text-xs text-green-400 w-10 text-right">{actual.toFixed(0)}h</span>
        </div>
      </div>
    </div>
  );
}

function AlertItem({ alert, onMarkRead }: { alert: AlertWithDetails; onMarkRead: () => void }) {
  const severityIcons: Record<string, React.ReactNode> = {
    critical: <AlertCircle className="text-red-500" size={18} />,
    high: <AlertCircle className="text-orange-500" size={18} />,
    medium: <AlertCircle className="text-yellow-500" size={18} />,
    low: <AlertCircle className="text-blue-500" size={18} />,
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div
      className={`flex items-center p-3 rounded-lg hover:bg-gray-700/50 ${!alert.is_read ? 'bg-gray-700/30' : ''}`}
      onClick={!alert.is_read ? onMarkRead : undefined}
      style={{ cursor: !alert.is_read ? 'pointer' : 'default' }}
    >
      <div className="flex-shrink-0 mr-4">
        {severityIcons[alert.priority] || severityIcons.low}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <p className={`font-medium ${!alert.is_read ? 'text-white' : 'text-gray-300'}`}>
            {alert.title}
          </p>
          <p className="text-xs text-gray-400">{formatTime(alert.created_at)}</p>
        </div>
        <p className="text-sm text-gray-400 truncate">{alert.message}</p>
        {alert.machine_name && (
          <p className="text-xs text-gray-500">Machine: {alert.machine_name}</p>
        )}
      </div>
      {!alert.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
      )}
    </div>
  );
}

function MachineUtilizationCard({ utilization }: { utilization: MachineUtilization }) {
  const efficiencyColor =
    utilization.efficiency_percentage >= 80
      ? 'text-green-400'
      : utilization.efficiency_percentage >= 60
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-medium truncate">{utilization.machine_name}</h3>
        <span className={`text-lg font-bold ${efficiencyColor}`}>
          {utilization.efficiency_percentage.toFixed(0)}%
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Planned</span>
          <span className="text-blue-400">{utilization.planned_hours.toFixed(1)}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Actual</span>
          <span className="text-green-400">{utilization.actual_hours.toFixed(1)}h</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Schedules</span>
          <span>{utilization.schedule_count}</span>
        </div>
      </div>
      <div className="mt-3 w-full bg-gray-600 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            utilization.efficiency_percentage >= 80
              ? 'bg-green-500'
              : utilization.efficiency_percentage >= 60
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(100, utilization.efficiency_percentage)}%` }}
        />
      </div>
    </div>
  );
}
