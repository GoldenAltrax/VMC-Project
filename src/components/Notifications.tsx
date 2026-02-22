import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  XCircle,
  Wrench,
  Calendar,
} from 'lucide-react';
import { useAlerts } from '../hooks/useAlerts';
import { useTableState } from '../hooks/useTableState';
import { TableFilters, FilterConfig } from './common/TableFilters';
import { Pagination } from './common/Pagination';
import type { AlertWithDetails, AlertType, AlertPriority } from '../types';

// ============================================
// Main Notifications Component
// ============================================

export function Notifications() {
  const {
    alerts,
    stats,
    loading,
    error,
    fetchAlerts,
    fetchAlertStats,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    clearReadAlerts,
    clearError,
  } = useAlerts();

  const [selectedAlerts, setSelectedAlerts] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchAlertStats();
  }, [fetchAlerts, fetchAlertStats]);

  const handleRefresh = async () => {
    await fetchAlerts();
    await fetchAlertStats();
    setSelectedAlerts(new Set());
  };

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id);
  };

  const handleDismiss = async (id: number) => {
    await dismissAlert(id);
    setSelectedAlerts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleMarkAllAsRead = async () => {
    setBulkLoading(true);
    try {
      await markAllAsRead();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearReadAlerts = async () => {
    if (!confirm('Are you sure you want to delete all read notifications?')) return;
    setBulkLoading(true);
    try {
      await clearReadAlerts();
      setSelectedAlerts(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map((a) => a.id)));
    }
  };

  const handleBulkMarkAsRead = async () => {
    setBulkLoading(true);
    try {
      for (const id of selectedAlerts) {
        const alert = alerts.find((a) => a.id === id);
        if (alert && !alert.is_read) {
          await markAsRead(id);
        }
      }
      setSelectedAlerts(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDismiss = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedAlerts.size} notifications?`)) return;
    setBulkLoading(true);
    try {
      for (const id of selectedAlerts) {
        await dismissAlert(id);
      }
      setSelectedAlerts(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-2 text-gray-400">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats.total} color="bg-gray-700" />
          <StatCard title="Unread" value={stats.unread} color="bg-blue-900/50" highlight />
          <StatCard title="Critical" value={stats.critical} color="bg-red-900/50" />
          <StatCard title="High Priority" value={stats.high} color="bg-orange-900/50" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Bell className="mr-2" size={24} />
          Notifications
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {selectedAlerts.size > 0 && (
            <>
              <span className="text-sm text-gray-400">{selectedAlerts.size} selected</span>
              <button
                onClick={handleBulkMarkAsRead}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                disabled={bulkLoading}
              >
                <Check size={16} className="mr-1" />
                Mark Read
              </button>
              <button
                onClick={handleBulkDismiss}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                disabled={bulkLoading}
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </button>
            </>
          )}
          <button
            onClick={handleMarkAllAsRead}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center text-sm"
            disabled={bulkLoading || stats?.unread === 0}
          >
            <CheckCheck size={16} className="mr-1" />
            Mark All Read
          </button>
          <button
            onClick={handleClearReadAlerts}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center text-sm"
            disabled={bulkLoading}
          >
            <Trash2 size={16} className="mr-1" />
            Clear Read
          </button>
          <button
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            disabled={loading}
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications Table */}
      <NotificationsTable
        alerts={alerts}
        selectedAlerts={selectedAlerts}
        onSelectAlert={(id, selected) => {
          setSelectedAlerts((prev) => {
            const newSet = new Set(prev);
            if (selected) {
              newSet.add(id);
            } else {
              newSet.delete(id);
            }
            return newSet;
          });
        }}
        onSelectAll={handleSelectAll}
        onMarkAsRead={handleMarkAsRead}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: number;
  color: string;
  highlight?: boolean;
}

function StatCard({ title, value, color, highlight }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl p-4 ${highlight ? 'ring-2 ring-blue-500' : ''}`}>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

// ============================================
// Notifications Table Component
// ============================================

interface NotificationsTableProps {
  alerts: AlertWithDetails[];
  selectedAlerts: Set<number>;
  onSelectAlert: (id: number, selected: boolean) => void;
  onSelectAll: () => void;
  onMarkAsRead: (id: number) => void;
  onDismiss: (id: number) => void;
}

function NotificationsTable({
  alerts,
  selectedAlerts,
  onSelectAlert,
  onSelectAll,
  onMarkAsRead,
  onDismiss,
}: NotificationsTableProps) {
  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(
    () => [
      {
        key: 'alert_type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warning', label: 'Warning' },
          { value: 'error', label: 'Error' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'schedule', label: 'Schedule' },
        ],
        placeholder: 'All Types',
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        placeholder: 'All Priorities',
      },
      {
        key: 'is_read',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'false', label: 'Unread' },
          { value: 'true', label: 'Read' },
        ],
        placeholder: 'All',
      },
    ],
    []
  );

  // Transform alerts for filtering (is_read needs to be string for filter matching)
  const transformedAlerts = useMemo(() => {
    return alerts.map((a) => ({
      ...a,
      is_read_str: a.is_read.toString(),
    }));
  }, [alerts]);

  const {
    paginatedItems,
    filters,
    setFilter,
    clearFilters,
    search,
    setSearch,
    currentPage,
    pageSize,
    totalItems,
    setPage,
    setPageSize,
  } = useTableState(transformedAlerts, {
    storageKey: 'notifications',
    defaultPageSize: 25,
  });

  const allSelected = paginatedItems.length > 0 && paginatedItems.every((a) => selectedAlerts.has(a.id));

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <TableFilters
        filters={filterConfig}
        values={filters}
        onChange={setFilter}
        onClear={clearFilters}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search notifications..."
      />

      {/* Notification List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {/* Select All Header */}
        <div className="flex items-center p-4 border-b border-gray-700 bg-gray-700/50">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="mr-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400">
            {allSelected ? 'Deselect All' : 'Select All'}
          </span>
        </div>

        {/* Notifications */}
        <div className="divide-y divide-gray-700">
          {paginatedItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {alerts.length === 0 ? 'No notifications' : 'No notifications match your filters'}
            </div>
          ) : (
            paginatedItems.map((alert) => (
              <NotificationItem
                key={alert.id}
                alert={alert}
                selected={selectedAlerts.has(alert.id)}
                onSelect={(selected) => onSelectAlert(alert.id, selected)}
                onMarkAsRead={() => onMarkAsRead(alert.id)}
                onDismiss={() => onDismiss(alert.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

// ============================================
// Notification Item Component
// ============================================

interface NotificationItemProps {
  alert: AlertWithDetails;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onMarkAsRead: () => void;
  onDismiss: () => void;
}

function NotificationItem({ alert, selected, onSelect, onMarkAsRead, onDismiss }: NotificationItemProps) {
  return (
    <div
      className={`p-4 flex items-start gap-4 hover:bg-gray-700/50 transition-colors ${
        !alert.is_read ? 'bg-blue-900/10' : ''
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(e.target.checked)}
        className="mt-1 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
      />

      {/* Icon */}
      <div className={`p-2 rounded-lg ${getTypeBackground(alert.alert_type)}`}>
        {getTypeIcon(alert.alert_type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${!alert.is_read ? 'text-white' : 'text-gray-300'}`}>
                {alert.title}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(alert.priority)}`}>
                {alert.priority}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{formatTimestamp(alert.created_at)}</span>
              {alert.machine_name && <span>Machine: {alert.machine_name}</span>}
              {alert.project_name && <span>Project: {alert.project_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!alert.is_read && (
          <button
            onClick={onMarkAsRead}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg"
            title="Mark as read"
          >
            <Check size={16} />
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getTypeIcon(type: AlertType) {
  switch (type) {
    case 'info':
      return <Info size={18} className="text-blue-400" />;
    case 'warning':
      return <AlertTriangle size={18} className="text-yellow-400" />;
    case 'error':
      return <XCircle size={18} className="text-red-400" />;
    case 'maintenance':
      return <Wrench size={18} className="text-purple-400" />;
    case 'schedule':
      return <Calendar size={18} className="text-green-400" />;
    default:
      return <Bell size={18} className="text-gray-400" />;
  }
}

function getTypeBackground(type: AlertType): string {
  switch (type) {
    case 'info':
      return 'bg-blue-900/30';
    case 'warning':
      return 'bg-yellow-900/30';
    case 'error':
      return 'bg-red-900/30';
    case 'maintenance':
      return 'bg-purple-900/30';
    case 'schedule':
      return 'bg-green-900/30';
    default:
      return 'bg-gray-700';
  }
}

function getPriorityColor(priority: AlertPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/20 text-red-400';
    case 'high':
      return 'bg-orange-500/20 text-orange-400';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'low':
      return 'bg-gray-500/20 text-gray-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
