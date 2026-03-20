import React, { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Wrench,
  FileText,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFloorView } from '../hooks/useFloorView';
import { useAlerts } from '../hooks/useAlerts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STATUS_CONFIG = {
  scheduled: {
    label: 'Scheduled',
    color: 'bg-gray-700 border-gray-600',
    badge: 'bg-gray-600 text-gray-200',
    dot: 'bg-gray-400',
  },
  'in-progress': {
    label: 'In Progress',
    color: 'bg-yellow-900/30 border-yellow-600',
    badge: 'bg-yellow-600 text-white',
    dot: 'bg-yellow-400',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-900/30 border-green-600',
    badge: 'bg-green-600 text-white',
    dot: 'bg-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-900/30 border-red-700 opacity-60',
    badge: 'bg-red-700 text-white',
    dot: 'bg-red-400',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function FloorView() {
  const { user } = useAuth();
  const { schedules, loading, error, fetchTodaySchedule, startJob, completeJob } = useFloorView();
  const { createAlert } = useAlerts();
  const { showToast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flaggingId, setFlaggingId] = useState<number | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchTodaySchedule();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchTodaySchedule]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleStart = async (id: number) => {
    setActionLoading(id);
    try {
      await startJob(id);
      showToast('Job started', 'success');
    } catch {
      showToast('Failed to start job', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: number, plannedHours: number) => {
    setActionLoading(id);
    try {
      await completeJob(id, plannedHours);
      showToast('Job completed!', 'success');
    } catch {
      showToast('Failed to complete job', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlagIssue = async (schedule: (typeof schedules)[0]) => {
    if (!flagReason.trim()) return;
    try {
      await createAlert({
        alert_type: 'error',
        priority: 'high',
        title: `Issue Flagged: ${schedule.load_name || schedule.project_name || 'Untitled Job'}`,
        message: `Operator ${user?.full_name || user?.username} flagged an issue on ${schedule.machine_name}: ${flagReason}`,
        machine_id: schedule.machine_id,
      });
      showToast('Issue flagged and sent to management', 'warning');
      setFlaggingId(null);
      setFlagReason('');
    } catch {
      showToast('Failed to flag issue', 'error');
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400">Loading your schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Jobs Today</h2>
          <p className="text-gray-400 mt-1">{todayStr}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-blue-400">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-xs text-gray-500">System Time</div>
          </div>
          <button
            onClick={fetchTodaySchedule}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {(['scheduled', 'in-progress', 'completed', 'cancelled'] as StatusKey[]).map(status => {
          const count = schedules.filter(s => s.status === status).length;
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className={`rounded-lg p-3 border ${cfg.color} flex items-center gap-3`}>
              <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
              <div>
                <p className="text-xs text-gray-400">{cfg.label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Job Cards */}
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-gray-800 rounded-xl space-y-3">
          <CheckCircle size={48} className="text-gray-600" />
          <p className="text-gray-400 text-lg">No jobs assigned to you today.</p>
          <p className="text-gray-500 text-sm">Check with your supervisor for updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {schedules.map((schedule, idx) => {
              const cfg =
                STATUS_CONFIG[schedule.status as StatusKey] || STATUS_CONFIG.scheduled;
              const isActioning = actionLoading === schedule.id;

              return (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-gray-800 rounded-xl border-2 ${cfg.color} p-5 relative overflow-hidden`}
                >
                  {/* Sequence badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-500">#{idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Left: Job info */}
                    <div className="col-span-2 space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {schedule.load_name || schedule.project_name || 'Untitled Job'}
                        </h3>
                        <p className="text-blue-400 font-medium">{schedule.machine_name}</p>
                        {schedule.project_name && schedule.load_name && (
                          <p className="text-gray-400 text-sm">{schedule.project_name}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock size={14} className="text-blue-400" />
                          <span>
                            Planned:{' '}
                            <span className="font-semibold text-white">
                              {schedule.planned_hours}h
                            </span>
                          </span>
                        </div>
                        {schedule.setup_hours > 0 && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Wrench size={14} className="text-yellow-400" />
                            <span>
                              Setup:{' '}
                              <span className="font-semibold text-white">
                                {schedule.setup_hours}h
                              </span>
                            </span>
                          </div>
                        )}
                        {schedule.start_time && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Play size={14} className="text-green-400" />
                            <span>
                              Started:{' '}
                              <span className="font-semibold text-white">
                                {schedule.start_time}
                              </span>
                            </span>
                          </div>
                        )}
                        {schedule.actual_hours != null && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle size={14} className="text-green-400" />
                            <span>
                              Logged:{' '}
                              <span className="font-semibold text-white">
                                {schedule.actual_hours}h
                              </span>
                            </span>
                          </div>
                        )}
                        {schedule.drawing_number && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <FileText size={14} className="text-purple-400" />
                            <span>
                              Dwg:{' '}
                              <span className="font-semibold text-white">
                                {schedule.drawing_number}
                                {schedule.revision ? ` Rev ${schedule.revision}` : ''}
                              </span>
                            </span>
                          </div>
                        )}
                        {schedule.material && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Package size={14} className="text-orange-400" />
                            <span>
                              Material:{' '}
                              <span className="font-semibold text-white">{schedule.material}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {schedule.notes && (
                        <div className="bg-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-300 italic border-l-2 border-blue-500">
                          {schedule.notes}
                        </div>
                      )}
                    </div>

                    {/* Right: Action buttons */}
                    <div className="flex flex-col gap-2 justify-center">
                      {schedule.status === 'scheduled' && (
                        <button
                          onClick={() => handleStart(schedule.id)}
                          disabled={isActioning}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50"
                        >
                          {isActioning ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Play size={20} />
                          )}
                          Start Job
                        </button>
                      )}
                      {schedule.status === 'in-progress' && (
                        <button
                          onClick={() => handleComplete(schedule.id, schedule.planned_hours)}
                          disabled={isActioning}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold text-base transition-all hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50"
                        >
                          {isActioning ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <CheckCircle size={20} />
                          )}
                          Complete
                        </button>
                      )}
                      {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            setFlaggingId(schedule.id);
                            setFlagReason('');
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-300 rounded-xl font-medium text-sm transition-all"
                        >
                          <AlertTriangle size={16} />
                          Flag Issue
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flag issue form */}
                  <AnimatePresence>
                    {flaggingId === schedule.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-red-700/50"
                      >
                        <p className="text-sm text-red-300 font-medium mb-2">
                          Describe the issue:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={flagReason}
                            onChange={e => setFlagReason(e.target.value)}
                            placeholder="e.g., Tool broken, coolant leak, spindle noise..."
                            className="flex-1 bg-gray-700 border border-red-700 rounded-lg px-3 py-2 text-sm text-white"
                            onKeyDown={e => e.key === 'Enter' && handleFlagIssue(schedule)}
                            autoFocus
                          />
                          <button
                            onClick={() => handleFlagIssue(schedule)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium"
                          >
                            Send Alert
                          </button>
                          <button
                            onClick={() => setFlaggingId(null)}
                            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
