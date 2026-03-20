import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { WeeklyScheduleResponse, ScheduleEntry } from '../types';
import { formatLocalDate } from './useSchedules';

interface ShiftSettings {
  start: string;
  end: string;
}

function getShiftSettings(): ShiftSettings {
  try {
    const stored = localStorage.getItem('vmc_shift_settings');
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return { start: '09:00', end: '21:00' };
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function useShiftTimeSync() {
  const { token } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<ScheduleEntry[]>([]);
  const [shouldPrompt, setShouldPrompt] = useState(false);

  const checkShift = useCallback(async () => {
    if (!token) return;

    const today = formatLocalDate(new Date());
    const checkedKey = `vmc_shift_checked_${today}`;
    if (localStorage.getItem(checkedKey)) return;

    const settings = getShiftSettings();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = timeToMinutes(settings.end);

    if (nowMinutes < endMinutes) return;

    try {
      const data = await invoke<WeeklyScheduleResponse>('get_weekly_schedule', {
        token,
        weekStart: today,
      });

      const pending: ScheduleEntry[] = [];
      for (const machine of data.machines) {
        for (const day of machine.days) {
          if (day.date === today) {
            for (const entry of day.entries) {
              if (entry.status === 'scheduled' || entry.status === 'in-progress') {
                pending.push(entry);
              }
            }
          }
        }
      }

      if (pending.length > 0) {
        setPendingJobs(pending);
        setShouldPrompt(true);
      } else {
        localStorage.setItem(checkedKey, 'true');
      }
    } catch {
      // silently fail — don't disrupt UX
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(checkShift, 3000);
    return () => clearTimeout(timer);
  }, [checkShift]);

  const markChecked = useCallback(() => {
    const today = formatLocalDate(new Date());
    localStorage.setItem(`vmc_shift_checked_${today}`, 'true');
    setShouldPrompt(false);
    setPendingJobs([]);
  }, []);

  return { pendingJobs, shouldPrompt, markChecked };
}
