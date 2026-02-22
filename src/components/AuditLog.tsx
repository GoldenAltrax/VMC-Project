import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  RefreshCw,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Database,
  Activity,
} from 'lucide-react';
import { useAuditLog, AuditLog as AuditLogType } from '../hooks/useAuditLog';
import { useTableState } from '../hooks/useTableState';
import { TableFilters, FilterConfig } from './common/TableFilters';
import { SortableHeader, TableHeader } from './common/SortableHeader';
import { Pagination } from './common/Pagination';

// ============================================
// Main AuditLog Component
// ============================================

export function AuditLog() {
  const {
    logs,
    stats,
    filterOptions,
    loading,
    error,
    fetchLogs,
    fetchStats,
    fetchFilterOptions,
    clearError,
  } = useAuditLog();

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchFilterOptions();
  }, [fetchLogs, fetchStats, fetchFilterOptions]);

  const handleRefresh = async () => {
    await fetchLogs();
    await fetchStats();
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-2 text-gray-400">Loading audit logs...</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Records"
            value={stats.total.toLocaleString()}
            icon={<Database className="text-blue-400" size={20} />}
          />
          <StatCard
            title="Today's Activity"
            value={stats.today_count.toLocaleString()}
            icon={<Activity className="text-green-400" size={20} />}
          />
          <StatCard
            title="This Week"
            value={stats.week_count.toLocaleString()}
            icon={<History className="text-purple-400" size={20} />}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <History className="mr-2" size={24} />
          Audit Log
        </h2>
        <button
          onClick={handleRefresh}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
          disabled={loading}
        >
          <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Audit Table */}
      <AuditTable
        logs={logs}
        filterOptions={filterOptions}
        expandedRows={expandedRows}
        onToggleRow={toggleRowExpansion}
      />
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex items-center">
      <div className="p-3 bg-gray-700 rounded-lg mr-4">{icon}</div>
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ============================================
// Audit Table Component
// ============================================

interface AuditTableProps {
  logs: AuditLogType[];
  filterOptions: { tables: string[]; actions: string[]; users: [number, string][] } | null;
  expandedRows: Set<number>;
  onToggleRow: (id: number) => void;
}

function AuditTable({ logs, filterOptions, expandedRows, onToggleRow }: AuditTableProps) {
  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => {
    const config: FilterConfig[] = [
      {
        key: 'action',
        label: 'Action',
        type: 'select',
        options: filterOptions?.actions.map((a) => ({
          value: a,
          label: formatAction(a),
        })) || [],
        placeholder: 'All Actions',
      },
      {
        key: 'table_name',
        label: 'Table',
        type: 'select',
        options: filterOptions?.tables.map((t) => ({
          value: t,
          label: formatTableName(t),
        })) || [],
        placeholder: 'All Tables',
      },
      {
        key: 'username',
        label: 'User',
        type: 'select',
        options: filterOptions?.users.map(([, name]) => ({
          value: name,
          label: name,
        })) || [],
        placeholder: 'All Users',
      },
    ];
    return config;
  }, [filterOptions]);

  const {
    paginatedItems,
    sort,
    setSort,
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
  } = useTableState(logs, {
    storageKey: 'audit_log',
    defaultPageSize: 25,
  });

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
        searchPlaceholder="Search audit logs..."
      />

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <TableHeader label="" className="w-10" />
                <SortableHeader label="Timestamp" sortKey="timestamp" currentSort={sort} onSort={setSort} />
                <SortableHeader label="User" sortKey="username" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Action" sortKey="action" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Table" sortKey="table_name" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Record ID" sortKey="record_id" currentSort={sort} onSort={setSort} />
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {logs.length === 0 ? 'No audit logs found' : 'No logs match your filters'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer ${
                        expandedRows.has(log.id) ? 'bg-gray-700/30' : ''
                      }`}
                      onClick={() => onToggleRow(log.id)}
                    >
                      <td className="p-4">
                        {(log.old_values || log.new_values) && (
                          expandedRows.has(log.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )
                        )}
                      </td>
                      <td className="p-4 text-sm">{formatTimestamp(log.timestamp)}</td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <User size={14} className="text-gray-400 mr-2" />
                          {log.username || 'System'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="p-4">{formatTableName(log.table_name)}</td>
                      <td className="p-4">{log.record_id || '-'}</td>
                    </tr>
                    {expandedRows.has(log.id) && (log.old_values || log.new_values) && (
                      <tr className="bg-gray-900/50">
                        <td colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.old_values && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">Old Values</h4>
                                <JsonViewer json={log.old_values} />
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">New Values</h4>
                                <JsonViewer json={log.new_values} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
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
// JSON Viewer Component
// ============================================

interface JsonViewerProps {
  json: string;
}

function JsonViewer({ json }: JsonViewerProps) {
  try {
    const parsed = JSON.parse(json);
    return (
      <pre className="bg-gray-800 p-3 rounded-lg text-xs overflow-auto max-h-48 text-gray-300">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return (
      <pre className="bg-gray-800 p-3 rounded-lg text-xs overflow-auto max-h-48 text-gray-300">
        {json}
      </pre>
    );
  }
}

// ============================================
// Helper Functions
// ============================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatTableName(table: string): string {
  return table
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('create') || lowerAction.includes('insert')) {
    return 'bg-green-500/20 text-green-400';
  }
  if (lowerAction.includes('update') || lowerAction.includes('modify')) {
    return 'bg-blue-500/20 text-blue-400';
  }
  if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
    return 'bg-red-500/20 text-red-400';
  }
  if (lowerAction.includes('login') || lowerAction.includes('logout')) {
    return 'bg-purple-500/20 text-purple-400';
  }
  return 'bg-gray-500/20 text-gray-400';
}
