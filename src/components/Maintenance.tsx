import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  List,
  Loader2,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useMaintenance } from '../hooks/useMaintenance';
import { useMachines } from '../hooks/useMachines';
import { useAuth } from '../context/AuthContext';
import { useTableState } from '../hooks/useTableState';
import { TableFilters, FilterConfig } from './common/TableFilters';
import { SortableHeader, TableHeader } from './common/SortableHeader';
import { Pagination } from './common/Pagination';
import type {
  Maintenance as MaintenanceType,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  MaintenanceType as MaintenanceTypeEnum,
  MaintenanceStatus,
  Machine,
} from '../types';

// ============================================
// Main Maintenance Component
// ============================================

export function Maintenance() {
  const {
    maintenance,
    overdueMaintenance,
    loading,
    error,
    fetchAllMaintenance,
    fetchOverdueMaintenance,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    clearError,
  } = useMaintenance();

  const { machines, fetchMachines } = useMachines();
  const { canEdit, isAdmin } = useAuth();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMaintenance();
    fetchOverdueMaintenance();
    fetchMachines();
  }, [fetchAllMaintenance, fetchOverdueMaintenance, fetchMachines]);

  const handleCreate = () => {
    setSelectedRecord(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = (record: MaintenanceType) => {
    setSelectedRecord(record);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleView = (record: MaintenanceType) => {
    setSelectedRecord(record);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleSave = async (input: CreateMaintenanceInput | UpdateMaintenanceInput) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (isCreating) {
        await createMaintenance(input as CreateMaintenanceInput);
      } else if (selectedRecord) {
        await updateMaintenance(selectedRecord.id, input as UpdateMaintenanceInput);
      }
      // Refresh data
      await fetchAllMaintenance();
      await fetchOverdueMaintenance();
      setIsEditing(false);
      setIsCreating(false);
      setSelectedRecord(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteMaintenance(id);
      await fetchAllMaintenance();
      await fetchOverdueMaintenance();
      setSelectedRecord(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedRecord(null);
    setIsEditing(false);
    setIsCreating(false);
    setActionError(null);
  };

  const handleRefresh = async () => {
    await fetchAllMaintenance();
    await fetchOverdueMaintenance();
  };

  if (loading && maintenance.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-2 text-gray-400">Loading maintenance records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {(error || actionError) && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-200">{error || actionError}</span>
          </div>
          <button onClick={() => { clearError(); setActionError(null); }} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Overdue Alert Banner */}
      {overdueMaintenance.length > 0 && (
        <div className="bg-orange-900/50 border border-orange-700 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-orange-400 mr-3" />
          <div>
            <span className="font-medium text-orange-200">
              {overdueMaintenance.length} Overdue Maintenance Record{overdueMaintenance.length > 1 ? 's' : ''}
            </span>
            <p className="text-orange-300 text-sm mt-1">
              These scheduled maintenance tasks are past their due date and need immediate attention.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center">
          <Wrench className="mr-2" size={24} />
          Maintenance Management
        </h2>
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="bg-gray-700 rounded-lg p-1 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} className="mr-1" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={16} className="mr-1" />
              Calendar
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            disabled={loading}
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {canEdit && (
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={18} className="mr-2" />
              Schedule Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isCreating ? (
        <MaintenanceForm
          machines={machines}
          onSave={handleSave}
          onCancel={handleBack}
          loading={actionLoading}
        />
      ) : isEditing && selectedRecord ? (
        <MaintenanceForm
          record={selectedRecord}
          machines={machines}
          onSave={handleSave}
          onCancel={handleBack}
          loading={actionLoading}
        />
      ) : selectedRecord ? (
        <MaintenanceDetails
          record={selectedRecord}
          machines={machines}
          onBack={handleBack}
          onEdit={() => setIsEditing(true)}
          onDelete={() => handleDelete(selectedRecord.id)}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ) : viewMode === 'list' ? (
        <MaintenanceTable
          maintenance={maintenance}
          machines={machines}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ) : (
        <MaintenanceCalendar
          maintenance={maintenance}
          machines={machines}
          onView={handleView}
        />
      )}
    </div>
  );
}

// ============================================
// Maintenance Table Component
// ============================================

interface MaintenanceTableProps {
  maintenance: MaintenanceType[];
  machines: Machine[];
  onView: (record: MaintenanceType) => void;
  onEdit: (record: MaintenanceType) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  isAdmin: boolean;
}

function MaintenanceTable({
  maintenance,
  machines,
  onView,
  onEdit,
  onDelete,
  canEdit,
  isAdmin,
}: MaintenanceTableProps) {
  // Enrich maintenance data with machine names
  const enrichedData = useMemo(() => {
    return maintenance.map((m) => ({
      ...m,
      machine_name: machines.find((machine) => machine.id === m.machine_id)?.name || 'Unknown',
    }));
  }, [maintenance, machines]);

  // Filter options
  const filterOptions = useMemo(() => {
    const types = ['preventive', 'corrective', 'inspection', 'calibration'];
    const statuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    const machineNames = [...new Set(enrichedData.map((m) => m.machine_name))];

    return {
      types: types.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })),
      statuses: statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ') })),
      machines: machineNames.map((m) => ({ value: m, label: m })),
    };
  }, [enrichedData]);

  const filterConfig: FilterConfig[] = useMemo(
    () => [
      {
        key: 'maintenance_type',
        label: 'Type',
        type: 'select',
        options: filterOptions.types,
        placeholder: 'All Types',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: filterOptions.statuses,
        placeholder: 'All Statuses',
      },
      {
        key: 'machine_name',
        label: 'Machine',
        type: 'select',
        options: filterOptions.machines,
        placeholder: 'All Machines',
      },
    ],
    [filterOptions]
  );

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
  } = useTableState(enrichedData, {
    storageKey: 'maintenance',
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
        searchPlaceholder="Search maintenance records..."
      />

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <SortableHeader label="Date" sortKey="date" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Machine" sortKey="machine_name" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Type" sortKey="maintenance_type" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sort} onSort={setSort} />
                <SortableHeader label="Cost" sortKey="cost" currentSort={sort} onSort={setSort} />
                <TableHeader label="Description" />
                {canEdit && <TableHeader label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-gray-400">
                    {maintenance.length === 0
                      ? 'No maintenance records found. Click "Schedule Maintenance" to create one.'
                      : 'No records match your filters'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((record) => (
                  <tr key={record.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4">
                      <button
                        className="text-blue-400 hover:text-blue-300 font-medium"
                        onClick={() => onView(record)}
                      >
                        {formatDate(record.date)}
                      </button>
                    </td>
                    <td className="p-4">{record.machine_name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.maintenance_type)}`}>
                        {formatType(record.maintenance_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span className="ml-1">{formatStatus(record.status)}</span>
                      </span>
                    </td>
                    <td className="p-4">{record.cost ? `$${record.cost.toFixed(2)}` : '-'}</td>
                    <td className="p-4 max-w-xs truncate">{record.description || '-'}</td>
                    {canEdit && (
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onEdit(record)}
                            className="p-1 text-gray-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => onDelete(record.id)}
                              className="p-1 text-gray-400 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
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
// Maintenance Calendar Component
// ============================================

interface MaintenanceCalendarProps {
  maintenance: MaintenanceType[];
  machines: Machine[];
  onView: (record: MaintenanceType) => void;
}

function MaintenanceCalendar({ maintenance, machines, onView }: MaintenanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Group maintenance by date
    const maintenanceByDate: Record<string, MaintenanceType[]> = {};
    maintenance.forEach((m) => {
      const dateKey = m.date;
      if (!maintenanceByDate[dateKey]) {
        maintenanceByDate[dateKey] = [];
      }
      maintenanceByDate[dateKey].push(m);
    });

    // Generate calendar grid
    const weeks: { date: Date; records: MaintenanceType[] }[][] = [];
    let currentWeek: { date: Date; records: MaintenanceType[] }[] = [];

    // Add padding for previous month
    for (let i = 0; i < startPadding; i++) {
      currentWeek.push({ date: new Date(year, month, -startPadding + i + 1), records: [] });
    }

    // Add days of current month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      currentWeek.push({ date, records: maintenanceByDate[dateStr] || [] });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add padding for next month
    if (currentWeek.length > 0) {
      const remaining = 7 - currentWeek.length;
      for (let i = 1; i <= remaining; i++) {
        currentWeek.push({ date: new Date(year, month + 1, i), records: [] });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentMonth, maintenance]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          &larr;
        </button>
        <h3 className="text-lg font-semibold">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-gray-700 rounded-lg"
        >
          &rarr;
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-gray-400 text-sm py-2 font-medium">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarData.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isCurrentMonth = day.date.getMonth() === currentMonth.getMonth();
            const isToday = day.date.toISOString().split('T')[0] === today;
            const hasRecords = day.records.length > 0;

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`min-h-[80px] p-1 rounded-lg border ${
                  isCurrentMonth ? 'border-gray-700' : 'border-gray-800 opacity-50'
                } ${isToday ? 'border-blue-500' : ''}`}
              >
                <div className={`text-xs mb-1 ${isToday ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                  {day.date.getDate()}
                </div>
                {hasRecords && (
                  <div className="space-y-1">
                    {day.records.slice(0, 2).map((record) => (
                      <button
                        key={record.id}
                        onClick={() => onView(record)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${getStatusColor(record.status)}`}
                      >
                        {machines.find((m) => m.id === record.machine_id)?.name || 'Unknown'}
                      </button>
                    ))}
                    {day.records.length > 2 && (
                      <div className="text-xs text-gray-400">+{day.records.length - 2} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-yellow-500/20 mr-2"></span>
          <span className="text-gray-400">Scheduled</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-blue-500/20 mr-2"></span>
          <span className="text-gray-400">In Progress</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-green-500/20 mr-2"></span>
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 rounded-full bg-gray-500/20 mr-2"></span>
          <span className="text-gray-400">Cancelled</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Maintenance Details Component
// ============================================

interface MaintenanceDetailsProps {
  record: MaintenanceType;
  machines: Machine[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isAdmin: boolean;
}

function MaintenanceDetails({
  record,
  machines,
  onBack,
  onEdit,
  onDelete,
  canEdit,
  isAdmin,
}: MaintenanceDetailsProps) {
  const machine = machines.find((m) => m.id === record.machine_id);

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg">
            &larr;
          </button>
          <div>
            <h2 className="text-xl font-semibold">Maintenance Details</h2>
            <p className="text-gray-400 text-sm">{formatDate(record.date)}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          {canEdit && (
            <button
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm mb-3">General Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-xs">Machine:</span>
                <p className="font-medium">{machine?.name || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Type:</span>
                <p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(record.maintenance_type)}`}>
                    {formatType(record.maintenance_type)}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Status:</span>
                <p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span className="ml-1">{formatStatus(record.status)}</span>
                  </span>
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Date:</span>
                <p>{formatDate(record.date)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-xs">Cost:</span>
                <p>{record.cost ? `$${record.cost.toFixed(2)}` : 'Not specified'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Description:</span>
                <p>{record.description || 'No description provided'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Notes:</span>
                <p>{record.notes || 'No notes'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Maintenance Form Component
// ============================================

interface MaintenanceFormProps {
  record?: MaintenanceType;
  machines: Machine[];
  onSave: (input: CreateMaintenanceInput | UpdateMaintenanceInput) => void;
  onCancel: () => void;
  loading: boolean;
}

function MaintenanceForm({ record, machines, onSave, onCancel, loading }: MaintenanceFormProps) {
  const [formData, setFormData] = useState({
    machine_id: record?.machine_id || (machines[0]?.id || 0),
    date: record?.date || new Date().toISOString().split('T')[0],
    maintenance_type: record?.maintenance_type || 'preventive',
    description: record?.description || '',
    cost: record?.cost?.toString() || '',
    status: record?.status || 'scheduled',
    notes: record?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (record) {
      // Update
      const updates: UpdateMaintenanceInput = {};
      if (formData.date !== record.date) updates.date = formData.date;
      if (formData.maintenance_type !== record.maintenance_type)
        updates.maintenance_type = formData.maintenance_type as MaintenanceTypeEnum;
      if (formData.description !== record.description) updates.description = formData.description || undefined;
      if (formData.cost !== (record.cost?.toString() || ''))
        updates.cost = formData.cost ? parseFloat(formData.cost) : undefined;
      if (formData.status !== record.status) updates.status = formData.status as MaintenanceStatus;
      if (formData.notes !== record.notes) updates.notes = formData.notes || undefined;
      onSave(updates);
    } else {
      // Create
      const input: CreateMaintenanceInput = {
        machine_id: Number(formData.machine_id),
        date: formData.date,
        maintenance_type: formData.maintenance_type as MaintenanceTypeEnum,
        description: formData.description || undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        status: formData.status as MaintenanceStatus,
        notes: formData.notes || undefined,
      };
      onSave(input);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">
        {record ? 'Edit Maintenance Record' : 'Schedule Maintenance'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {!record && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Machine *</label>
                <select
                  name="machine_id"
                  value={formData.machine_id}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                >
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} ({machine.model})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type *</label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="inspection">Inspection</option>
                <option value="calibration">Calibration</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Cost ($)</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g., 150.00"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe the maintenance work..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional notes..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin mr-2" size={16} />}
            {record ? 'Update Record' : 'Schedule Maintenance'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatStatus(status: string): string {
  return status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'preventive':
      return 'bg-blue-500/20 text-blue-400';
    case 'corrective':
      return 'bg-red-500/20 text-red-400';
    case 'inspection':
      return 'bg-purple-500/20 text-purple-400';
    case 'calibration':
      return 'bg-teal-500/20 text-teal-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-400';
    case 'completed':
      return 'bg-green-500/20 text-green-400';
    case 'cancelled':
      return 'bg-gray-500/20 text-gray-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'scheduled':
      return <Clock size={12} />;
    case 'in-progress':
      return <Loader2 size={12} className="animate-spin" />;
    case 'completed':
      return <CheckCircle2 size={12} />;
    case 'cancelled':
      return <X size={12} />;
    default:
      return null;
  }
}
