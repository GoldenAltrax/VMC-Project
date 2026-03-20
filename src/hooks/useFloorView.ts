import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import { formatLocalDate } from './useSchedules';

export interface FloorSchedule {
  id: number;
  machine_id: number;
  machine_name: string;
  project_id: number | null;
  project_name: string | null;
  load_name: string | null;
  start_time: string | null;
  end_time: string | null;
  planned_hours: number;
  actual_hours: number | null;
  setup_hours: number;
  drawing_number: string | null;
  revision: string | null;
  material: string | null;
  notes: string | null;
  status: string;
  sequence_order: number;
}

export function useFloorView() {
  const { token } = useAuth();
  const [schedules, setSchedules] = useState<FloorSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaySchedule = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const today = formatLocalDate(new Date());
      const data = await invoke<FloorSchedule[]>('get_operator_schedule', { token, date: today });
      setSchedules(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const startJob = useCallback(async (scheduleId: number) => {
    if (!token) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await invoke('update_schedule', {
      token,
      id: scheduleId,
      input: { start_time: timeStr, status: 'in-progress' },
    });
    await fetchTodaySchedule();
  }, [token, fetchTodaySchedule]);

  const completeJob = useCallback(async (scheduleId: number, plannedHours: number) => {
    if (!token) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    await invoke('update_schedule', {
      token,
      id: scheduleId,
      input: { end_time: timeStr, status: 'completed', actual_hours: plannedHours },
    });
    await fetchTodaySchedule();
  }, [token, fetchTodaySchedule]);

  return { schedules, loading, error, fetchTodaySchedule, startJob, completeJob };
}
