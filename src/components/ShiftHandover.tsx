import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, Clock, Factory, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useShiftLogs } from '../hooks/useShiftLogs';
import { useMachines } from '../hooks/useMachines';
import { useToast } from '../context/ToastContext';
import { formatLocalDate } from '../hooks/useSchedules';

export function ShiftHandover() {
  const { logs, loading, fetchLogs, createLog } = useShiftLogs();
  const { machines, fetchMachines } = useMachines();
  const { showToast } = useToast();

  const [selectedMachine, setSelectedMachine] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterMachine, setFilterMachine] = useState<number | undefined>(undefined);

  const today = formatLocalDate(new Date());

  useEffect(() => {
    fetchMachines();
    fetchLogs();
  }, [fetchMachines, fetchLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSubmitting(true);
    try {
      await createLog({
        machine_id: selectedMachine,
        shift_date: today,
        notes: notes.trim(),
      });
      setNotes('');
      showToast('Shift handover note saved', 'success');
    } catch {
      showToast('Failed to save handover note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLogs = filterMachine
    ? logs.filter(l => l.machine_id === filterMachine)
    : logs;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <MessageSquare size={22} className="text-blue-400" />
        Shift Handover
      </h2>

      {/* Compose new note */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="font-semibold mb-4 text-gray-200">New Handover Note</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Machine (optional)
            </label>
            <select
              value={selectedMachine ?? ''}
              onChange={e =>
                setSelectedMachine(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">General / All Machines</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Handover Notes *
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe the current job status, any issues, what the next operator needs to know..."
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !notes.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Submit Handover
          </button>
        </form>
      </div>

      {/* Log history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-200">Handover History</h3>
          <select
            value={filterMachine ?? ''}
            onChange={e =>
              setFilterMachine(
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">All Machines</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-gray-800 rounded-xl">
            <MessageSquare size={40} className="mx-auto mb-2 text-gray-600" />
            <p>No handover notes yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {log.machine_name && (
                      <span className="flex items-center gap-1 text-blue-400 font-medium">
                        <Factory size={14} />
                        {log.machine_name}
                      </span>
                    )}
                    {log.operator_name && (
                      <span className="text-gray-400">· {log.operator_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                    <Clock size={12} />
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <p className="mt-2 text-gray-200 text-sm leading-relaxed">{log.notes}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
