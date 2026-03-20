import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';

export interface ShiftLog {
  id: number;
  machine_id: number | null;
  machine_name: string | null;
  shift_date: string;
  outgoing_operator_id: number | null;
  operator_name: string | null;
  notes: string;
  created_at: string;
}

export function useShiftLogs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<ShiftLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (machineId?: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await invoke<ShiftLog[]>('get_shift_logs', {
        token,
        machineId: machineId ?? null,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createLog = useCallback(async (input: {
    machine_id?: number;
    shift_date: string;
    notes: string;
  }) => {
    if (!token) return null;
    const log = await invoke<ShiftLog>('create_shift_log', { token, input });
    setLogs(prev => [log, ...prev]);
    return log;
  }, [token]);

  return { logs, loading, fetchLogs, createLog };
}
