import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { Machine, CreateMachineInput, UpdateMachineInput, MachineHistoryResponse } from '../types';

export function useMachines() {
  const { token } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMachines = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<Machine[]>('get_machines', { token });
      setMachines(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch machines');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getMachine = useCallback(async (id: number): Promise<Machine | null> => {
    if (!token) return null;
    try {
      return await invoke<Machine>('get_machine', { token, id });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch machine');
      return null;
    }
  }, [token]);

  const createMachine = useCallback(async (input: CreateMachineInput): Promise<Machine | null> => {
    if (!token) return null;
    try {
      const machine = await invoke<Machine>('create_machine', { token, input });
      setMachines(prev => [...prev, machine]);
      return machine;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to create machine';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const updateMachine = useCallback(async (id: number, input: UpdateMachineInput): Promise<Machine | null> => {
    if (!token) return null;
    try {
      const machine = await invoke<Machine>('update_machine', { token, id, input });
      setMachines(prev => prev.map(m => m.id === id ? machine : m));
      return machine;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to update machine';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const updateMachineStatus = useCallback(async (id: number, status: string): Promise<Machine | null> => {
    if (!token) return null;
    try {
      const machine = await invoke<Machine>('update_machine_status', { token, id, status });
      setMachines(prev => prev.map(m => m.id === id ? machine : m));
      return machine;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to update machine status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const deleteMachine = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('delete_machine', { token, id });
      setMachines(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to delete machine';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const getMachineHistory = useCallback(async (machineId: number): Promise<MachineHistoryResponse | null> => {
    if (!token) return null;
    try {
      return await invoke<MachineHistoryResponse>('get_machine_history', { token, machineId });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch machine history');
      return null;
    }
  }, [token]);

  return {
    machines,
    loading,
    error,
    fetchMachines,
    getMachine,
    createMachine,
    updateMachine,
    updateMachineStatus,
    deleteMachine,
    getMachineHistory,
    clearError: () => setError(null),
  };
}
