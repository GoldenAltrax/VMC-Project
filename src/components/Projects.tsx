import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit, Plus, Trash2, Users, AlertCircle, Loader2, X, FileSpreadsheet, FileText } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useMachines } from '../hooks/useMachines';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../context/AuthContext';
import { exportProjectsToExcel, exportProjectsToPDF } from '../utils/export';
import type { ProjectWithDetails, CreateProjectInput, UpdateProjectInput, Machine, Client, ProjectStatus } from '../types';

export function Projects() {
  const { projects, loading, error, fetchProjects, createProject, updateProject, deleteProject, assignMachines, clearError } = useProjects();
  const { machines, fetchMachines } = useMachines();
  const { clients, fetchClients } = useClients();
  const { canEdit, isAdmin } = useAuth();

  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchMachines();
    fetchClients();
  }, [fetchProjects, fetchMachines, fetchClients]);

  const handleEditProject = (project: ProjectWithDetails) => {
    setSelectedProject(project);
    setIsEditing(true);
    setFormError(null);
  };

  const handleSaveProject = async (input: CreateProjectInput | UpdateProjectInput, assignedMachineIds: number[]) => {
    setSaving(true);
    setFormError(null);

    try {
      if (selectedProject && selectedProject.id > 0) {
        // Update existing project
        await updateProject(selectedProject.id, input as UpdateProjectInput);
        // Update machine assignments
        await assignMachines(selectedProject.id, assignedMachineIds);
      } else {
        // Create new project with machine assignments
        const newProject = await createProject({
          ...input as CreateProjectInput,
          assigned_machines: assignedMachineIds,
        });
        if (!newProject) throw new Error('Failed to create project');
      }
      setIsEditing(false);
      setSelectedProject(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
        setIsEditing(false);
      }
    } catch (err) {
      // Error is handled in the hook
    }
    setDeleteConfirm(null);
  };

  const handleCreateProject = () => {
    setSelectedProject({
      id: 0,
      name: '',
      client_id: null,
      client_name: null,
      description: null,
      start_date: null,
      end_date: null,
      status: 'planning',
      assigned_machines: [],
      team_members: [],
      planned_hours: 0,
      actual_hours: 0,
      progress_percentage: 0,
      created_by: null,
      created_at: '',
      updated_at: '',
    });
    setIsEditing(true);
    setFormError(null);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading projects...</span>
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

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="flex items-center space-x-2">
          {projects.length > 0 && (
            <>
              <button
                onClick={() => exportProjectsToExcel(projects)}
                className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm flex items-center"
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} className="mr-2" />
                Excel
              </button>
              <button
                onClick={() => exportProjectsToPDF(projects)}
                className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm flex items-center"
                title="Export to PDF"
              >
                <FileText size={16} className="mr-2" />
                PDF
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={handleCreateProject}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={18} className="mr-2" />
              New Project
            </button>
          )}
        </div>
      </div>

      {isEditing && selectedProject ? (
        <ProjectForm
          project={selectedProject}
          machines={machines}
          clients={clients}
          onSave={handleSaveProject}
          onCancel={() => {
            setIsEditing(false);
            setSelectedProject(null);
            setFormError(null);
          }}
          saving={saving}
          error={formError}
          canEdit={canEdit}
        />
      ) : selectedProject ? (
        <ProjectDetails
          project={selectedProject}
          machines={machines}
          onBack={() => setSelectedProject(null)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => setDeleteConfirm(selectedProject.id)}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-4">Project Name</th>
                  <th className="text-left p-4">Client</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Timeline</th>
                  <th className="text-left p-4">Hours (Plan/Actual)</th>
                  <th className="text-left p-4">Progress</th>
                  {canEdit && <th className="text-left p-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-gray-400">
                      No projects found. {canEdit && 'Click "New Project" to create one.'}
                    </td>
                  </tr>
                ) : (
                  projects.map(project => (
                    <tr key={project.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4">
                        <button
                          className="text-blue-400 hover:text-blue-300 font-medium"
                          onClick={() => setSelectedProject(project)}
                        >
                          {project.name}
                        </button>
                      </td>
                      <td className="p-4">{project.client_name || '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {formatStatus(project.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        {project.start_date || project.end_date ? (
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1 text-gray-400" />
                            {formatDate(project.start_date)} - {formatDate(project.end_date)}
                          </div>
                        ) : (
                          <span className="text-gray-500">Not set</span>
                        )}
                      </td>
                      <td className="p-4">
                        {project.planned_hours} / {project.actual_hours}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{project.progress_percentage}%</span>
                        </div>
                      </td>
                      {canEdit && (
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditProject(project)}
                              className="p-1 text-gray-400 hover:text-blue-400"
                              title="Edit project"
                            >
                              <Edit size={16} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteConfirm(project.id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="Delete project"
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
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatStatus(status: ProjectStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
}

function formatDate(date: string | null): string {
  if (!date) return 'TBD';
  return new Date(date).toLocaleDateString();
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'planning':
      return 'bg-yellow-500/20 text-yellow-500';
    case 'active':
      return 'bg-green-500/20 text-green-500';
    case 'completed':
      return 'bg-blue-500/20 text-blue-500';
    case 'on-hold':
      return 'bg-orange-500/20 text-orange-500';
    default:
      return 'bg-gray-500/20 text-gray-500';
  }
}

interface ProjectDetailsProps {
  project: ProjectWithDetails;
  machines: Machine[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  isAdmin: boolean;
}

function ProjectDetails({ project, machines, onBack, onEdit, onDelete, canEdit, isAdmin }: ProjectDetailsProps) {
  const assignedMachineNames = project.assigned_machines
    .map(id => machines.find(m => m.id === id)?.name)
    .filter(Boolean);

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg">
            ←
          </button>
          <h2 className="text-xl font-semibold">{project.name}</h2>
        </div>
        {canEdit && (
          <div className="flex space-x-3">
            <button
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </button>
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
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Client</h3>
            <p>{project.client_name || 'Not assigned'}</p>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Status</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {formatStatus(project.status)}
            </span>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Timeline</h3>
            <div className="flex items-center">
              <Calendar size={16} className="mr-2 text-gray-400" />
              {formatDate(project.start_date)} to {formatDate(project.end_date)}
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Hours</h3>
            <div className="flex items-center">
              <Clock size={16} className="mr-2 text-gray-400" />
              {project.planned_hours} planned / {project.actual_hours} actual
            </div>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Progress</h3>
            <div className="flex items-center space-x-3">
              <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, project.progress_percentage)}%` }}
                />
              </div>
              <span className="text-sm font-medium">{project.progress_percentage}%</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Description</h3>
            <p className="text-gray-200">{project.description || 'No description provided.'}</p>
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Assigned Machines</h3>
            {assignedMachineNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedMachineNames.map((name, idx) => (
                  <span key={idx} className="bg-gray-700 px-2 py-1 rounded text-sm">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No machines assigned</p>
            )}
          </div>
          <div>
            <h3 className="text-gray-400 text-sm mb-1">Team Members</h3>
            <div className="flex items-center">
              <Users size={16} className="mr-2 text-gray-400" />
              {project.team_members.length > 0
                ? `${project.team_members.length} members assigned`
                : 'No team members assigned'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProjectFormProps {
  project: ProjectWithDetails;
  machines: Machine[];
  clients: Client[];
  onSave: (input: CreateProjectInput | UpdateProjectInput, assignedMachines: number[]) => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  canEdit: boolean;
}

function ProjectForm({ project, machines, clients, onSave, onCancel, saving, error, canEdit }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project.name,
    client_id: project.client_id,
    description: project.description || '',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    status: project.status,
    planned_hours: project.planned_hours,
    actual_hours: project.actual_hours,
    assigned_machines: project.assigned_machines || [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      client_id: value ? Number(value) : null,
    }));
  };

  const handleMachineToggle = (machineId: number) => {
    setFormData(prev => ({
      ...prev,
      assigned_machines: prev.assigned_machines.includes(machineId)
        ? prev.assigned_machines.filter(id => id !== machineId)
        : [...prev.assigned_machines, machineId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateProjectInput | UpdateProjectInput = {
      name: formData.name,
      client_id: formData.client_id || undefined,
      description: formData.description || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      status: formData.status,
      planned_hours: formData.planned_hours,
    };

    if (project.id > 0) {
      (input as UpdateProjectInput).actual_hours = formData.actual_hours;
    }

    onSave(input, formData.assigned_machines);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-6">
        {project.id ? 'Edit Project' : 'Create New Project'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Client
              </label>
              <select
                name="client_id"
                value={formData.client_id || ''}
                onChange={handleClientChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Planned Hours
                </label>
                <input
                  type="number"
                  name="planned_hours"
                  value={formData.planned_hours}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Actual Hours
                </label>
                <input
                  type="number"
                  name="actual_hours"
                  value={formData.actual_hours}
                  onChange={handleChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  disabled={saving || project.id === 0}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Assigned Machines
              </label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {machines.map(machine => (
                  <div key={machine.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`machine-${machine.id}`}
                      checked={formData.assigned_machines.includes(machine.id)}
                      onChange={() => handleMachineToggle(machine.id)}
                      className="mr-2 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                      disabled={saving}
                    />
                    <label htmlFor={`machine-${machine.id}`} className="text-sm flex-1">
                      {machine.name}
                      <span className="text-gray-500 ml-2">({machine.model})</span>
                    </label>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      machine.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      machine.status === 'maintenance' ? 'bg-orange-500/20 text-orange-400' :
                      machine.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {machine.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg flex items-center"
            disabled={saving || !canEdit}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {project.id ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
