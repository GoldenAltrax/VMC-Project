import React, { useState } from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import type { ScheduleEntry } from '../types';
import { useSchedules } from '../hooks/useSchedules';
import { useAlerts } from '../hooks/useAlerts';
import { formatLocalDate } from '../hooks/useSchedules';

interface DelayReasonModalProps {
  pendingJobs: ScheduleEntry[];
  onClose: () => void;
}

export function DelayReasonModal({ pendingJobs, onClose }: DelayReasonModalProps) {
  const [reasons, setReasons] = useState<Record<number, string>>(
    Object.fromEntries(pendingJobs.map(j => [j.id, '']))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateSchedule } = useSchedules();
  const { createAlert } = useAlerts();

  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unfilled = pendingJobs.filter(j => !reasons[j.id]?.trim());
    if (unfilled.length > 0) {
      setError('Please provide a delay reason for all pending jobs.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      for (const job of pendingJobs) {
        const reason = reasons[job.id].trim();
        const updatedNotes = job.notes
          ? `${job.notes}\n[Delayed: ${reason}]`
          : `[Delayed: ${reason}]`;

        await updateSchedule(job.id, {
          date: tomorrow,
          notes: updatedNotes,
          status: 'scheduled',
        });

        await createAlert({
          alert_type: 'schedule',
          priority: 'medium',
          title: `Job Delayed: ${job.load_name || job.project_name || 'Untitled'}`,
          message: `Reason: ${reason}. Moved to ${tomorrow}.`,
        });
      }
      onClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to process delay. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9998]">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold">Shift End — Pending Jobs</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          The following jobs were not completed by shift end. Please provide a delay reason for each — they will be moved to tomorrow ({tomorrow}).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {pendingJobs.map(job => (
            <div key={job.id} className="p-3 bg-gray-700/50 rounded-lg space-y-2">
              <p className="font-medium text-sm">
                {job.load_name || job.project_name || 'Untitled Job'}
                <span className="ml-2 text-xs text-gray-400">(Status: {job.status})</span>
              </p>
              <textarea
                value={reasons[job.id] || ''}
                onChange={(e) => setReasons(prev => ({ ...prev, [job.id]: e.target.value }))}
                placeholder="Enter delay reason..."
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                disabled={submitting}
                required
              />
            </div>
          ))}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              disabled={submitting}
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center text-sm"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Move to Tomorrow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
