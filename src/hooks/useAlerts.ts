import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { AlertWithDetails, CreateAlertInput, AlertStats } from '../types';

export function useAlerts() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<AlertWithDetails[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (options?: {
    unreadOnly?: boolean;
    alertType?: string;
    limit?: number;
  }) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<AlertWithDetails[]>('get_alerts', {
        token,
        unreadOnly: options?.unreadOnly,
        alertType: options?.alertType,
        limit: options?.limit,
      });
      setAlerts(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAlertStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await invoke<AlertStats>('get_alert_stats', { token });
      setStats(data);
      setUnreadCount(data.unread);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch alert stats');
    }
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const count = await invoke<number>('get_unread_alert_count', { token });
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [token]);

  const createAlert = useCallback(async (input: CreateAlertInput): Promise<AlertWithDetails | null> => {
    if (!token) return null;
    try {
      const alert = await invoke<AlertWithDetails>('create_alert', { token, input });
      setAlerts(prev => [alert, ...prev]);
      setUnreadCount(prev => prev + 1);
      return alert;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to create alert';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('mark_alert_read', { token, id });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to mark alert as read';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const markAllAsRead = useCallback(async (): Promise<number> => {
    if (!token) return 0;
    try {
      const count = await invoke<number>('mark_all_alerts_read', { token });
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
      return count;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to mark all alerts as read';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const dismissAlert = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      const alert = alerts.find(a => a.id === id);
      await invoke('dismiss_alert', { token, id });
      setAlerts(prev => prev.filter(a => a.id !== id));
      if (alert && !alert.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to dismiss alert';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token, alerts]);

  const clearReadAlerts = useCallback(async (): Promise<number> => {
    if (!token) return 0;
    try {
      const count = await invoke<number>('clear_read_alerts', { token });
      setAlerts(prev => prev.filter(a => !a.is_read));
      return count;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to clear read alerts';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  return {
    alerts,
    stats,
    unreadCount,
    loading,
    error,
    fetchAlerts,
    fetchAlertStats,
    fetchUnreadCount,
    createAlert,
    markAsRead,
    markAllAsRead,
    dismissAlert,
    clearReadAlerts,
    clearError: () => setError(null),
  };
}
