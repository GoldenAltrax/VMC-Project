import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';

export interface ChecklistTemplate {
  id: number;
  machine_id: number | null;
  checklist_item: string;
  is_active: boolean;
  created_at: string;
}

export interface ChecklistCompletion {
  id: number;
  machine_id: number;
  machine_name: string;
  template_id: number;
  checklist_item: string;
  checked_by: number;
  operator_name: string;
  check_date: string;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

export function useChecklists() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async (machineId?: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await invoke<ChecklistTemplate[]>('get_checklist_templates', {
        token,
        machineId: machineId ?? null,
      });
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCompletions = useCallback(async (machineId: number, checkDate: string) => {
    if (!token) return;
    const data = await invoke<ChecklistCompletion[]>('get_checklist_completions', {
      token,
      machineId,
      checkDate,
    });
    setCompletions(data);
  }, [token]);

  const createTemplate = useCallback(async (machineId: number | null, checklistItem: string) => {
    if (!token) return;
    const t = await invoke<ChecklistTemplate>('create_checklist_template', {
      token,
      machineId,
      checklistItem,
    });
    setTemplates(prev => [...prev, t]);
  }, [token]);

  const deleteTemplate = useCallback(async (id: number) => {
    if (!token) return;
    await invoke('delete_checklist_template', { token, id });
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [token]);

  const submitChecklist = useCallback(async (
    machineId: number,
    checkDate: string,
    items: { template_id: number; is_completed: boolean; notes?: string }[]
  ) => {
    if (!token) return;
    await invoke('submit_checklist', {
      token,
      input: { machine_id: machineId, check_date: checkDate, completions: items },
    });
  }, [token]);

  return {
    templates,
    completions,
    loading,
    fetchTemplates,
    fetchCompletions,
    createTemplate,
    deleteTemplate,
    submitChecklist,
  };
}
