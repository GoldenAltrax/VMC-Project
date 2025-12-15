import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../context/AuthContext';
import type { Client, CreateClientInput, UpdateClientInput } from '../types';

export function useClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<Client[]>('get_clients', { token });
      setClients(data);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getClient = useCallback(async (id: number): Promise<Client | null> => {
    if (!token) return null;
    try {
      return await invoke<Client>('get_client', { token, id });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to fetch client');
      return null;
    }
  }, [token]);

  const createClient = useCallback(async (input: CreateClientInput): Promise<Client | null> => {
    if (!token) return null;
    try {
      const client = await invoke<Client>('create_client', { token, input });
      setClients(prev => [...prev, client]);
      return client;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to create client';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const updateClient = useCallback(async (id: number, input: UpdateClientInput): Promise<Client | null> => {
    if (!token) return null;
    try {
      const client = await invoke<Client>('update_client', { token, id, input });
      setClients(prev => prev.map(c => c.id === id ? client : c));
      return client;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to update client';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  const deleteClient = useCallback(async (id: number): Promise<boolean> => {
    if (!token) return false;
    try {
      await invoke('delete_client', { token, id });
      setClients(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to delete client';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [token]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    clearError: () => setError(null),
  };
}
