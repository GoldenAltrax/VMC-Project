import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { DashboardStats, MachineUtilization, ProjectProgress } from '../types';

export function useDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [machineUtilization, setMachineUtilization] = useState<MachineUtilization[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<DashboardStats>('get_dashboard_stats', { token });
      setStats(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchMachineUtilization = useCallback(async (startDate: string, endDate: string) => {
    if (!token) return;
    try {
      const data = await invoke<MachineUtilization[]>('get_machine_utilization', {
        token,
        startDate,
        endDate
      });
      setMachineUtilization(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch machine utilization');
    }
  }, [token]);

  const fetchProjectProgress = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invoke<ProjectProgress[]>('get_project_progress', { token });
      setProjectProgress(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch project progress');
    }
  }, [token]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Get current week dates
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const startDate = monday.toISOString().split('T')[0];
      const endDate = sunday.toISOString().split('T')[0];

      await Promise.all([
        fetchDashboardStats(),
        fetchMachineUtilization(startDate, endDate),
        fetchProjectProgress()
      ]);
    } finally {
      setLoading(false);
    }
  }, [token, fetchDashboardStats, fetchMachineUtilization, fetchProjectProgress]);

  return {
    stats,
    machineUtilization,
    projectProgress,
    loading,
    error,
    fetchDashboardStats,
    fetchMachineUtilization,
    fetchProjectProgress,
    fetchAll,
    clearError: () => setError(null),
  };
}
