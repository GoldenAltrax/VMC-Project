import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type {
  WeeklyScheduleResponse,
  ScheduleWithDetails,
  CreateScheduleInput,
  UpdateScheduleInput
} from '../types';

// Helper to get Monday of current week
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper to add/subtract weeks
export function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + (weeks * 7));
  return date.toISOString().split('T')[0];
}

export function useSchedules() {
  const { token } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleResponse | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getWeekStart());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeeklySchedule = useCallback(async (weekStart?: string) => {
    if (!token) return;
    const week = weekStart || currentWeekStart;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<WeeklyScheduleResponse>('get_weekly_schedule', {
        token,
        weekStart: week
      });
      setWeeklySchedule(data);
      setCurrentWeekStart(week);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch weekly schedule');
    } finally {
      setLoading(false);
    }
  }, [token, currentWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    const today = getWeekStart();
    setCurrentWeekStart(today);
    fetchWeeklySchedule(today);
  }, [fetchWeeklySchedule]);

  const goToPreviousWeek = useCallback(() => {
    const prevWeek = addWeeks(currentWeekStart, -1);
    setCurrentWeekStart(prevWeek);
    fetchWeeklySchedule(prevWeek);
  }, [currentWeekStart, fetchWeeklySchedule]);

  const goToNextWeek = useCallback(() => {
    const nextWeek = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(nextWeek);
    fetchWeeklySchedule(nextWeek);
  }, [currentWeekStart, fetchWeeklySchedule]);

  const getSchedule = useCallback(async (id: number): Promise<ScheduleWithDetails | null> => {
    if (!token) return null;
    try {
      return await invoke<ScheduleWithDetails>('get_schedule', { token, id });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch schedule');
      return null;
    }
  }, [token]);

  const createSchedule = useCallback(async (input: CreateScheduleInput): Promise<ScheduleWithDetails | null> => {
    if (!token) return null;
    try {
      const schedule = await invoke<ScheduleWithDetails>('create_schedule', { token, input });
      // Refresh the weekly schedule to show the new entry
      await fetchWeeklySchedule(currentWeekStart);
      return schedule;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to create schedule';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchWeeklySchedule, currentWeekStart]);

  const updateSchedule = useCallback(async (id: number, input: UpdateScheduleInput): Promise<ScheduleWithDetails | null> => {
    if (!token) return null;
    try {
      const schedule = await invoke<ScheduleWithDetails>('update_schedule', { token, id, input });
      // Refresh the weekly schedule to show the update
      await fetchWeeklySchedule(currentWeekStart);
      return schedule;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to update schedule';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchWeeklySchedule, currentWeekStart]);

  const logActualHours = useCallback(async (scheduleId: number, hours: number): Promise<ScheduleWithDetails | null> => {
    if (!token) return null;
    try {
      const schedule = await invoke<ScheduleWithDetails>('log_actual_hours', { token, scheduleId, hours });
      // Refresh to update totals
      await fetchWeeklySchedule(currentWeekStart);
      return schedule;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to log hours';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchWeeklySchedule, currentWeekStart]);

  const deleteSchedule = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('delete_schedule', { token, id });
      // Refresh the weekly schedule
      await fetchWeeklySchedule(currentWeekStart);
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to delete schedule';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, fetchWeeklySchedule, currentWeekStart]);

  const copyWeekSchedule = useCallback(async (sourceWeekStart: string, targetWeekStart: string): Promise<number> => {
    if (!token) return 0;
    try {
      const count = await invoke<number>('copy_week_schedule', {
        token,
        sourceWeekStart,
        targetWeekStart
      });
      // Refresh if we're viewing the target week
      if (currentWeekStart === targetWeekStart) {
        await fetchWeeklySchedule(targetWeekStart);
      }
      return count;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to copy schedule';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, currentWeekStart, fetchWeeklySchedule]);

  return {
    weeklySchedule,
    currentWeekStart,
    loading,
    error,
    fetchWeeklySchedule,
    goToCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
    getSchedule,
    createSchedule,
    updateSchedule,
    logActualHours,
    deleteSchedule,
    copyWeekSchedule,
    clearError: () => setError(null),
  };
}
