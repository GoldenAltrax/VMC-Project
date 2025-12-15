import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { ProjectWithDetails, CreateProjectInput, UpdateProjectInput } from '../types';

export function useProjects() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<ProjectWithDetails[]>('get_projects', { token });
      setProjects(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getProject = useCallback(async (id: number): Promise<ProjectWithDetails | null> => {
    if (!token) return null;
    try {
      return await invoke<ProjectWithDetails>('get_project', { token, id });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch project');
      return null;
    }
  }, [token]);

  const createProject = useCallback(async (input: CreateProjectInput): Promise<ProjectWithDetails | null> => {
    if (!token) return null;
    try {
      const project = await invoke<ProjectWithDetails>('create_project', { token, input });
      setProjects(prev => [project, ...prev]);
      return project;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to create project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const updateProject = useCallback(async (id: number, input: UpdateProjectInput): Promise<ProjectWithDetails | null> => {
    if (!token) return null;
    try {
      const project = await invoke<ProjectWithDetails>('update_project', { token, id, input });
      setProjects(prev => prev.map(p => p.id === id ? project : p));
      return project;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to update project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('delete_project', { token, id });
      setProjects(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to delete project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const assignMachines = useCallback(async (projectId: number, machineIds: number[]): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('assign_machines_to_project', { token, projectId, machineIds });
      await fetchProjects(); // Refresh to get updated data
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to assign machines';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchProjects]);

  const assignTeam = useCallback(async (projectId: number, userIds: number[]): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('assign_team_to_project', { token, projectId, userIds });
      await fetchProjects(); // Refresh to get updated data
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to assign team';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchProjects]);

  const logHours = useCallback(async (projectId: number, hours: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('log_project_hours', { token, projectId, hours });
      await fetchProjects(); // Refresh to get updated hours
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to log hours';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchProjects]);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    assignMachines,
    assignTeam,
    logHours,
    clearError: () => setError(null),
  };
}
