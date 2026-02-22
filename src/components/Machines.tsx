import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Clock, Cog, Edit, Plus, Trash2, RefreshCw, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { useMachines } from '../hooks/useMachines';
import { useAuth } from '../context/AuthContext';
import { exportMachinesToExcel, exportMachinesToPDF } from '../utils/export';
import { useTableState } from '../hooks/useTableState';
import { TableFilters, FilterConfig } from './common/TableFilters';
import { SortableHeader, TableHeader } from './common/SortableHeader';
import { Pagination } from './common/Pagination';
import { DeleteConfirmModal, CascadeEffect } from './common/DeleteConfirmModal';
import { invoke } from '@tauri-apps/api/core';
import type { Machine, MachineStatus, MachineCapacity, CreateMachineInput, UpdateMachineInput, MachineHistoryResponse } from '../types';

export function Machines() {
  const { machines, loading, error, fetchMachines, createMachine, updateMachine, deleteMachine, getMachineHistory } = useMachines();
  const { canEdit, isAdmin } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineHistory, setMachineHistory] = useState<MachineHistoryResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  const handleViewMachine = async (machine: Machine) => {
    setSelectedMachine(machine);
    setIsEditing(false);
    setIsCreating(false);
    // Fetch machine history
    const history = await getMachineHistory(machine.id);
    setMachineHistory(history);
  };

  const handleEditMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCreateMachine = () => {
    setSelectedMachine(null);
    setMachineHistory(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleSaveMachine = async (data: CreateMachineInput | UpdateMachineInput) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (isCreating) {
        await createMachine(data as CreateMachineInput);
      } else if (selectedMachine) {
        await updateMachine(selectedMachine.id, data as UpdateMachineInput);
      }
      setIsEditing(false);
      setIsCreating(false);
      setSelectedMachine(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const [deleteModal, setDeleteModal] = useState<{ machine: Machine; cascadeEffects: CascadeEffect[] } | null>(null);

  const handleDeleteMachine = async (machine: Machine) => {
    // Fetch cascade effects before showing modal
    try {
      const token = localStorage.getItem('vmc_auth_token') || '';
      const impact = await invoke<{ cascade_effects: CascadeEffect[] }>('check_machine_delete_impact', {
        token,
        machineId: machine.id
      });
      setDeleteModal({ machine, cascadeEffects: impact.cascade_effects });
    } catch (err) {
      // If cascade check fails, show modal without effects
      setDeleteModal({ machine, cascadeEffects: [] });
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteMachine(deleteModal.machine.id);
      setSelectedMachine(null);
      setIsEditing(false);
      setDeleteModal(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedMachine(null);
    setMachineHistory(null);
    setIsEditing(false);
    setIsCreating(false);
    setActionError(null);
  };

  if (loading && machines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-2 text-gray-400">Loading machines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(error || actionError) && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
          {error || actionError}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Machine Management</h2>
        <div className="flex space-x-2">
          {machines.length > 0 && (
            <>
              <button
                onClick={() => exportMachinesToExcel(machines)}
                className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} className="mr-2" />
                Excel
              </button>
              <button
                onClick={() => exportMachinesToPDF(machines)}
                className="bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center text-sm"
                title="Export to PDF"
              >
                <FileText size={16} className="mr-2" />
                PDF
              </button>
            </>
          )}
          <button
            onClick={() => fetchMachines()}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            disabled={loading}
          >
            <RefreshCw size={18} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={handleCreateMachine}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={18} className="mr-2" />
              New Machine
            </button>
          )}
        </div>
      </div>

      {isCreating ? (
        <MachineForm
          onSave={handleSaveMachine}
          onCancel={handleBack}
          loading={actionLoading}
        />
      ) : isEditing && selectedMachine ? (
        <MachineForm
          machine={selectedMachine}
          onSave={handleSaveMachine}
          onCancel={handleBack}
          loading={actionLoading}
        />
      ) : selectedMachine ? (
        <MachineDetails
          machine={selectedMachine}
          history={machineHistory}
          onBack={handleBack}
          onEdit={() => setIsEditing(true)}
          onDelete={() => handleDeleteMachine(selectedMachine)}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ) : (
        <MachineTable
          machines={machines}
          onView={handleViewMachine}
          onEdit={handleEditMachine}
          onDelete={handleDeleteMachine}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDelete}
          itemType="Machine"
          itemName={deleteModal.machine.name}
          cascadeEffects={deleteModal.cascadeEffects}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function getStatusColor(status: MachineStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-500';
    case 'idle':
      return 'bg-yellow-500/20 text-yellow-500';
    case 'maintenance':
      return 'bg-blue-500/20 text-blue-500';
    case 'error':
      return 'bg-red-500/20 text-red-500';
    default:
      return 'bg-gray-500/20 text-gray-500';
  }
}

function MachineTable({
  machines,
  onView,
  onEdit,
  onDelete,
  canEdit,
  isAdmin
}: {
  machines: Machine[];
  onView: (machine: Machine) => void;
  onEdit: (machine: Machine) => void;
  onDelete: (machine: Machine) => void;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const statuses = [...new Set(machines.map(m => m.status))];
    const capacities = [...new Set(machines.map(m => m.capacity).filter(Boolean))];
    const locations = [...new Set(machines.map(m => m.location).filter(Boolean))];

    return {
      statuses: statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
      capacities: capacities.map(c => ({ value: c as string, label: c as string })),
      locations: locations.map(l => ({ value: l as string, label: l as string })),
    };
  }, [machines]);

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: filterOptions.statuses,
      placeholder: 'All Statuses',
    },
    {
      key: 'capacity',
      label: 'Capacity',
      type: 'select',
      options: filterOptions.capacities,
      placeholder: 'All Capacities',
    },
    {
      key: 'location',
      label: 'Location',
      type: 'select',
      options: filterOptions.locations,
      placeholder: 'All Locations',
    },
  ], [filterOptions]);

  // Use table state hook for filtering, sorting, and pagination
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
  } = useTableState(machines, {
    storageKey: 'machines',
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
        searchPlaceholder="Search machines..."
      />

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <SortableHeader
                  label="Machine Name"
                  sortKey="name"
                  currentSort={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Model"
                  sortKey="model"
                  currentSort={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Capacity"
                  sortKey="capacity"
                  currentSort={sort}
                  onSort={setSort}
                />
                <SortableHeader
                  label="Location"
                  sortKey="location"
                  currentSort={sort}
                  onSort={setSort}
                />
                <TableHeader label="Actions" />
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map(machine => (
                <tr key={machine.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4">
                    <button
                      className="text-blue-400 hover:text-blue-300 font-medium"
                      onClick={() => onView(machine)}
                    >
                      {machine.name}
                    </button>
                  </td>
                  <td className="p-4">{machine.model}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(machine.status)}`}>
                      {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">{machine.capacity || '-'}</td>
                  <td className="p-4">{machine.location || '-'}</td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => onEdit(machine)}
                          className="p-1 text-gray-400 hover:text-blue-400"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(machine)}
                          className="p-1 text-gray-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {machines.length === 0 ? 'No machines found' : 'No machines match your filters'}
                  </td>
                </tr>
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

function MachineDetails({
  machine,
  history,
  onBack,
  onEdit,
  onDelete,
  canEdit,
  isAdmin
}: {
  machine: Machine;
  history: MachineHistoryResponse | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isAdmin: boolean;
}) {
  const statusIcons = {
    active: <CheckCircle2 className="text-green-500" size={18} />,
    idle: <Clock className="text-yellow-500" size={18} />,
    maintenance: <Cog className="text-blue-500" size={18} />,
    error: <AlertCircle className="text-red-500" size={18} />
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg">
            ←
          </button>
          <div className="flex items-center">
            <h2 className="text-xl font-semibold">{machine.name}</h2>
            <div className="ml-3 flex items-center">
              {statusIcons[machine.status]}
              <span className={`ml-1 text-sm ${
                machine.status === 'active' ? 'text-green-500' :
                machine.status === 'idle' ? 'text-yellow-500' :
                machine.status === 'maintenance' ? 'text-blue-500' : 'text-red-500'
              }`}>
                {machine.status.charAt(0).toUpperCase() + machine.status.slice(1)}
              </span>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm mb-1">General Information</h3>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-gray-400 text-xs">Model:</span>
                <p>{machine.model}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Serial Number:</span>
                <p>{machine.serial_number || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Purchase Date:</span>
                <p>{machine.purchase_date || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Location:</span>
                <p>{machine.location || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Capacity:</span>
                <p>{machine.capacity || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Technical Specifications</h3>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-gray-400 text-xs">Power Consumption:</span>
                <p>{machine.power_consumption || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Dimensions:</span>
                <p>{machine.dimensions || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Weight:</span>
                <p>{machine.weight || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Max RPM:</span>
                <p>{machine.max_rpm || '-'}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Axis Travel:</span>
                <p>{machine.axis_travel || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Assigned Projects</h3>
            <div className="bg-gray-700/50 rounded-lg p-4">
              {history?.assigned_projects && history.assigned_projects.length > 0 ? (
                <div className="space-y-3">
                  {history.assigned_projects.map(project => (
                    <div key={project.id} className="p-2 border-l-2 border-blue-500">
                      <p className="font-medium">{project.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No active projects</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-gray-400 text-sm mb-1">Maintenance History</h3>
        <div className="bg-gray-700/50 rounded-lg overflow-hidden">
          {history?.maintenance && history.maintenance.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {history.maintenance.map((record) => (
                  <tr key={record.id} className="border-t border-gray-700">
                    <td className="p-3">{record.date}</td>
                    <td className="p-3 capitalize">{record.maintenance_type}</td>
                    <td className="p-3">{record.description || '-'}</td>
                    <td className="p-3 capitalize">{record.status}</td>
                    <td className="p-3">{record.cost ? `$${record.cost.toFixed(2)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-gray-400 text-sm">No maintenance records</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-gray-400 text-sm mb-1">Recent Schedules</h3>
        <div className="bg-gray-700/50 rounded-lg overflow-hidden">
          {history?.schedules && history.schedules.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Load Name</th>
                  <th className="text-left p-3">Planned Hours</th>
                  <th className="text-left p-3">Actual Hours</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.schedules.slice(0, 10).map((schedule) => (
                  <tr key={schedule.id} className="border-t border-gray-700">
                    <td className="p-3">{schedule.date}</td>
                    <td className="p-3">{schedule.load_name || '-'}</td>
                    <td className="p-3">{schedule.planned_hours}h</td>
                    <td className="p-3">{schedule.actual_hours ? `${schedule.actual_hours}h` : '-'}</td>
                    <td className="p-3 capitalize">{schedule.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-gray-400 text-sm">No recent schedules</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MachineForm({
  machine,
  onSave,
  onCancel,
  loading
}: {
  machine?: Machine;
  onSave: (data: CreateMachineInput | UpdateMachineInput) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: machine?.name || '',
    model: machine?.model || '',
    serial_number: machine?.serial_number || '',
    purchase_date: machine?.purchase_date || '',
    status: machine?.status || 'idle' as MachineStatus,
    location: machine?.location || '',
    capacity: machine?.capacity || '' as MachineCapacity | '',
    power_consumption: machine?.power_consumption || '',
    dimensions: machine?.dimensions || '',
    weight: machine?.weight || '',
    max_rpm: machine?.max_rpm || '',
    axis_travel: machine?.axis_travel || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (machine) {
      // Update - only send changed fields
      const updates: UpdateMachineInput = {};
      if (formData.name !== machine.name) updates.name = formData.name;
      if (formData.model !== machine.model) updates.model = formData.model;
      if (formData.serial_number !== machine.serial_number) updates.serial_number = formData.serial_number || undefined;
      if (formData.purchase_date !== machine.purchase_date) updates.purchase_date = formData.purchase_date || undefined;
      if (formData.status !== machine.status) updates.status = formData.status;
      if (formData.location !== machine.location) updates.location = formData.location || undefined;
      if (formData.capacity !== machine.capacity) updates.capacity = formData.capacity as MachineCapacity || undefined;
      if (formData.power_consumption !== machine.power_consumption) updates.power_consumption = formData.power_consumption || undefined;
      if (formData.dimensions !== machine.dimensions) updates.dimensions = formData.dimensions || undefined;
      if (formData.weight !== machine.weight) updates.weight = formData.weight || undefined;
      if (formData.max_rpm !== machine.max_rpm) updates.max_rpm = formData.max_rpm || undefined;
      if (formData.axis_travel !== machine.axis_travel) updates.axis_travel = formData.axis_travel || undefined;
      onSave(updates);
    } else {
      // Create
      const createData: CreateMachineInput = {
        name: formData.name,
        model: formData.model,
        status: formData.status,
        serial_number: formData.serial_number || undefined,
        purchase_date: formData.purchase_date || undefined,
        location: formData.location || undefined,
        capacity: formData.capacity as MachineCapacity || undefined,
        power_consumption: formData.power_consumption || undefined,
        dimensions: formData.dimensions || undefined,
        weight: formData.weight || undefined,
        max_rpm: formData.max_rpm || undefined,
        axis_travel: formData.axis_travel || undefined,
      };
      onSave(createData);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">
        {machine ? 'Edit Machine' : 'Add New Machine'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium">General Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Machine Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Model *
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="maintenance">Maintenance</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Capacity
              </label>
              <select
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Capacity</option>
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
                <option value="Extra Large">Extra Large</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Technical Specifications</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Power Consumption
              </label>
              <input
                type="text"
                name="power_consumption"
                value={formData.power_consumption}
                onChange={handleChange}
                placeholder="e.g., 15 kW"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Dimensions
              </label>
              <input
                type="text"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g., 2.5m x 2.2m x 2.7m"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Weight
              </label>
              <input
                type="text"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g., 4,500 kg"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Max RPM
              </label>
              <input
                type="text"
                name="max_rpm"
                value={formData.max_rpm}
                onChange={handleChange}
                placeholder="e.g., 12,000"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Axis Travel
              </label>
              <input
                type="text"
                name="axis_travel"
                value={formData.axis_travel}
                onChange={handleChange}
                placeholder="e.g., X:800mm Y:500mm Z:600mm"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {machine ? 'Update Machine' : 'Add Machine'}
          </button>
        </div>
      </form>
    </div>
  );
}
