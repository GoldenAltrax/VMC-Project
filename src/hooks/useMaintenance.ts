import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type {
  Maintenance,
  CreateMaintenanceInput,
  UpdateMaintenanceInput,
  UpcomingMaintenance,
} from '../types';

interface UseMaintenanceReturn {
  // Data
  maintenance: Maintenance[];
  upcomingMaintenance: UpcomingMaintenance[];
  overdueMaintenance: UpcomingMaintenance[];

  // State
  loading: boolean;
  error: string | null;

  // Actions
  fetchAllMaintenance: () => Promise<void>;
  fetchMachineMaintenance: (machineId: number) => Promise<Maintenance[]>;
  fetchUpcomingMaintenance: (daysAhead?: number) => Promise<void>;
  fetchOverdueMaintenance: () => Promise<void>;
  createMaintenance: (input: CreateMaintenanceInput) => Promise<Maintenance | null>;
  updateMaintenance: (id: number, input: UpdateMaintenanceInput) => Promise<Maintenance | null>;
  deleteMaintenance: (id: number) => Promise<boolean>;
  clearError: () => void;
}

export function useMaintenance(): UseMaintenanceReturn {
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<UpcomingMaintenance[]>([]);
  const [overdueMaintenance, setOverdueMaintenance] = useState<UpcomingMaintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string => {
    return localStorage.getItem('vmc_auth_token') || '';
  };

  const fetchAllMaintenance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const records = await invoke<Maintenance[]>('get_all_maintenance', { token });
      setMaintenance(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMachineMaintenance = useCallback(async (machineId: number): Promise<Maintenance[]> => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const records = await invoke<Maintenance[]>('get_machine_maintenance', {
        token,
        machineId,
      });
      return records;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUpcomingMaintenance = useCallback(async (daysAhead?: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const records = await invoke<UpcomingMaintenance[]>('get_upcoming_maintenance', {
        token,
        daysAhead,
      });
      setUpcomingMaintenance(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOverdueMaintenance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const records = await invoke<UpcomingMaintenance[]>('get_overdue_maintenance', { token });
      setOverdueMaintenance(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const createMaintenance = useCallback(
    async (input: CreateMaintenanceInput): Promise<Maintenance | null> => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const newRecord = await invoke<Maintenance>('create_maintenance', { token, input });
        setMaintenance((prev) => [newRecord, ...prev]);
        return newRecord;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateMaintenance = useCallback(
    async (id: number, input: UpdateMaintenanceInput): Promise<Maintenance | null> => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const updated = await invoke<Maintenance>('update_maintenance', { token, id, input });
        setMaintenance((prev) =>
          prev.map((m) => (m.id === id ? updated : m))
        );
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteMaintenance = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      await invoke('delete_maintenance', { token, id });
      setMaintenance((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    maintenance,
    upcomingMaintenance,
    overdueMaintenance,
    loading,
    error,
    fetchAllMaintenance,
    fetchMachineMaintenance,
    fetchUpcomingMaintenance,
    fetchOverdueMaintenance,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    clearError,
  };
}
