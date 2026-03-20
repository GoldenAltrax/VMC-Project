import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';

export interface DowntimeLog {
  id: number;
  machine_id: number;
  machine_name: string;
  start_time: string;
  end_time: string | null;
  reason_category: 'maintenance' | 'breakdown' | 'setup' | 'idle' | 'other';
  description: string | null;
  duration_hours: number | null;
  created_by: number | null;
  created_at: string;
}

export function useDowntimeLog() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<DowntimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (machineId?: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await invoke<DowntimeLog[]>('get_downtime_log', {
        token,
        machineId: machineId ?? null,
      });
      setLogs(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load downtime logs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createDowntime = useCallback(async (input: {
    machine_id: number;
    start_time: string;
    end_time?: string;
    reason_category: string;
    description?: string;
  }) => {
    if (!token) return null;
    try {
      const log = await invoke<DowntimeLog>('create_downtime', { token, input });
      setLogs(prev => [log, ...prev]);
      return log;
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to log downtime');
      return null;
    }
  }, [token]);

  const closeDowntime = useCallback(async (id: number) => {
    if (!token) return;
    const now = new Date();
    const endTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await invoke('close_downtime', { token, id, endTime });
    setLogs(prev => prev.map(l => l.id === id ? { ...l, end_time: endTime } : l));
  }, [token]);

  const deleteDowntime = useCallback(async (id: number) => {
    if (!token) return;
    await invoke('delete_downtime', { token, id });
    setLogs(prev => prev.filter(l => l.id !== id));
  }, [token]);

  return { logs, loading, error, fetchLogs, createDowntime, closeDowntime, deleteDowntime };
}
