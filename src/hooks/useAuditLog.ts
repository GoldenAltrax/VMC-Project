import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Types
export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  table_name: string;
  record_id: number | null;
  old_values: string | null;
  new_values: string | null;
  timestamp: string;
}

export interface AuditFilters {
  table_name?: string;
  action?: string;
  user_id?: number;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total: number;
  today_count: number;
  week_count: number;
  actions_breakdown: [string, number][];
  tables_breakdown: [string, number][];
  top_users: [string, number][];
}

export interface AuditFilterOptions {
  tables: string[];
  actions: string[];
  users: [number, string][];
}

interface UseAuditLogReturn {
  // Data
  logs: AuditLog[];
  stats: AuditStats | null;
  filterOptions: AuditFilterOptions | null;

  // State
  loading: boolean;
  error: string | null;

  // Actions
  fetchLogs: (filters?: AuditFilters) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchFilterOptions: () => Promise<void>;
  clearError: () => void;
}

export function useAuditLog(): UseAuditLogReturn {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = (): string => {
    return localStorage.getItem('vmc_auth_token') || '';
  };

  const fetchLogs = useCallback(async (filters?: AuditFilters) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const result = await invoke<AuditLog[]>('get_audit_logs', {
        token,
        filters: filters || null,
      });
      setLogs(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const result = await invoke<AuditStats>('get_audit_stats', { token });
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const result = await invoke<AuditFilterOptions>('get_audit_filter_options', { token });
      setFilterOptions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    logs,
    stats,
    filterOptions,
    loading,
    error,
    fetchLogs,
    fetchStats,
    fetchFilterOptions,
    clearError,
  };
}
