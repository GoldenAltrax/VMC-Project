import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Loader2, AlertCircle, Clock, Copy, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useSchedules, addWeeks } from '../hooks/useSchedules';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../context/AuthContext';
import { exportWeeklyScheduleToExcel, exportWeeklyScheduleToPDF } from '../utils/export';
import type { ScheduleEntry, CreateScheduleInput, UpdateScheduleInput, ProjectWithDetails, MachineWeekSchedule, DaySchedule } from '../types';

export function WeeklyPlanner() {
  const {
    weeklySchedule,
    currentWeekStart,
    loading,
    error,
    fetchWeeklySchedule,
    goToCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
    createSchedule,
    updateSchedule,
    logActualHours,
    deleteSchedule,
    copyWeekSchedule,
    clearError,
  } = useSchedules();

  const { projects, fetchProjects } = useProjects();
  const { canEdit } = useAuth();

  const [editingEntry, setEditingEntry] = useState<{
    machineId: number;
    dayIndex: number;
    entry: ScheduleEntry | null;
    date: string;
  } | null>(null);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTargetWeek, setCopyTargetWeek] = useState('');
  const [copyLoading, setCopyLoading] = useState(false);

  useEffect(() => {
    fetchWeeklySchedule();
    fetchProjects();
  }, [fetchWeeklySchedule, fetchProjects]);

  // Generate dates for the current week view
  const getWeekDates = (): Date[] => {
    const start = new Date(currentWeekStart + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      return date;
    });
  };

  const formatDateHeader = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatWeekRange = (): string => {
    const dates = getWeekDates();
    const start = dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const isCurrentWeek = (): boolean => {
    const today = new Date();
    const weekDates = getWeekDates();
    return today >= weekDates[0] && today <= weekDates[6];
  };

  const handleAddEntry = (machineId: number, dayIndex: number, date: string) => {
    if (!canEdit) return;
    setEditingEntry({
      machineId,
      dayIndex,
      entry: null,
      date,
    });
  };

  const handleEditEntry = (machineId: number, dayIndex: number, entry: ScheduleEntry, date: string) => {
    if (!canEdit) return;
    setEditingEntry({
      machineId,
      dayIndex,
      entry,
      date,
    });
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!canEdit) return;
    if (confirm('Are you sure you want to delete this schedule entry?')) {
      try {
        await deleteSchedule(entryId);
      } catch {
        // Error handled in hook
      }
    }
  };

  const handleCopyWeek = async () => {
    if (!copyTargetWeek) return;
    setCopyLoading(true);
    try {
      const count = await copyWeekSchedule(currentWeekStart, copyTargetWeek);
      setShowCopyModal(false);
      setCopyTargetWeek('');
      alert(`Successfully copied ${count} schedule entries to the target week.`);
    } catch {
      // Error handled in hook
    } finally {
      setCopyLoading(false);
    }
  };

  const weekDates = getWeekDates();

  if (loading && !weeklySchedule) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-200">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header with navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Weekly Planner</h2>
          <p className="text-sm text-gray-400">{formatWeekRange()}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            title="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToCurrentWeek}
            className={`px-3 py-2 rounded-lg text-sm ${
              isCurrentWeek()
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            Current Week
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            title="Next week"
          >
            <ChevronRight size={18} />
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setCopyTargetWeek(addWeeks(currentWeekStart, 1));
                setShowCopyModal(true);
              }}
              className="ml-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center"
              title="Copy this week's schedule"
            >
              <Copy size={16} className="mr-2" />
              Copy Week
            </button>
          )}

          {/* Export Buttons */}
          {weeklySchedule && (
            <div className="ml-2 flex items-center space-x-2">
              <button
                onClick={() => exportWeeklyScheduleToExcel(weeklySchedule)}
                className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm flex items-center"
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} className="mr-2" />
                Excel
              </button>
              <button
                onClick={() => exportWeeklyScheduleToPDF(weeklySchedule)}
                className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm flex items-center"
                title="Export to PDF"
              >
                <FileText size={16} className="mr-2" />
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      {weeklySchedule && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Machines</p>
            <p className="text-2xl font-semibold">{weeklySchedule.machines.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Planned Hours</p>
            <p className="text-2xl font-semibold text-blue-400">
              {weeklySchedule.machines.reduce((sum, m) => sum + m.weekly_planned_hours, 0).toFixed(1)}h
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Actual Hours</p>
            <p className="text-2xl font-semibold text-green-400">
              {weeklySchedule.machines.reduce((sum, m) => sum + m.weekly_actual_hours, 0).toFixed(1)}h
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">Week Efficiency</p>
            <p className="text-2xl font-semibold text-yellow-400">
              {(() => {
                const planned = weeklySchedule.machines.reduce((sum, m) => sum + m.weekly_planned_hours, 0);
                const actual = weeklySchedule.machines.reduce((sum, m) => sum + m.weekly_actual_hours, 0);
                return planned > 0 ? ((actual / planned) * 100).toFixed(0) : 0;
              })()}%
            </p>
          </div>
        </div>
      )}

      {/* Main schedule table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-4 text-left min-w-[150px] sticky left-0 bg-gray-700 z-10">Machine</th>
                {weekDates.map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th
                      key={index}
                      className={`p-4 text-center min-w-[180px] ${isToday ? 'bg-blue-900/30' : ''}`}
                    >
                      <div className={`font-medium ${isToday ? 'text-blue-400' : ''}`}>
                        {formatDateHeader(date)}
                      </div>
                    </th>
                  );
                })}
                <th className="p-4 text-center min-w-[100px]">Week Total</th>
              </tr>
            </thead>
            <tbody>
              {weeklySchedule?.machines.map((machine) => (
                <MachineRow
                  key={machine.machine_id}
                  machine={machine}
                  weekDates={weekDates}
                  canEdit={canEdit}
                  onAddEntry={handleAddEntry}
                  onEditEntry={handleEditEntry}
                  onDeleteEntry={handleDeleteEntry}
                />
              ))}
              {(!weeklySchedule || weeklySchedule.machines.length === 0) && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    No machines scheduled for this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Edit Modal */}
      {editingEntry && (
        <EntryModal
          machineId={editingEntry.machineId}
          date={editingEntry.date}
          entry={editingEntry.entry}
          projects={projects}
          onSave={async (input) => {
            try {
              if (editingEntry.entry) {
                await updateSchedule(editingEntry.entry.id, input as UpdateScheduleInput);
              } else {
                await createSchedule(input as CreateScheduleInput);
              }
              setEditingEntry(null);
            } catch {
              // Error handled in hook
            }
          }}
          onLogHours={async (hours) => {
            if (editingEntry.entry) {
              try {
                await logActualHours(editingEntry.entry.id, hours);
                setEditingEntry(null);
              } catch {
                // Error handled in hook
              }
            }
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Copy Week Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Copy Week Schedule</h3>
            <p className="text-gray-400 text-sm mb-4">
              Copy all schedule entries from the current week to another week.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Target Week Start (Monday)
              </label>
              <input
                type="date"
                value={copyTargetWeek}
                onChange={(e) => setCopyTargetWeek(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyTargetWeek('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                disabled={copyLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCopyWeek}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
                disabled={copyLoading || !copyTargetWeek}
              >
                {copyLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Copy Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MachineRowProps {
  machine: MachineWeekSchedule;
  weekDates: Date[];
  canEdit: boolean;
  onAddEntry: (machineId: number, dayIndex: number, date: string) => void;
  onEditEntry: (machineId: number, dayIndex: number, entry: ScheduleEntry, date: string) => void;
  onDeleteEntry: (entryId: number) => void;
}

function MachineRow({ machine, weekDates, canEdit, onAddEntry, onEditEntry, onDeleteEntry }: MachineRowProps) {
  return (
    <tr className="border-t border-gray-700">
      <td className="p-4 font-medium sticky left-0 bg-gray-800 z-10">
        <div className="flex flex-col">
          <span>{machine.machine_name}</span>
          <span className="text-xs text-gray-400">
            {machine.weekly_planned_hours.toFixed(1)}h planned
          </span>
        </div>
      </td>
      {machine.days.map((day, dayIndex) => {
        const date = weekDates[dayIndex];
        const isToday = date.toDateString() === new Date().toDateString();
        const dateStr = date.toISOString().split('T')[0];

        return (
          <DayCell
            key={dayIndex}
            day={day}
            machineId={machine.machine_id}
            dayIndex={dayIndex}
            dateStr={dateStr}
            isToday={isToday}
            canEdit={canEdit}
            onAddEntry={onAddEntry}
            onEditEntry={onEditEntry}
            onDeleteEntry={onDeleteEntry}
          />
        );
      })}
      <td className="p-4 text-center border-l border-gray-700">
        <div className="flex flex-col items-center">
          <span className="text-blue-400">{machine.weekly_planned_hours.toFixed(1)}h</span>
          <span className="text-green-400">{machine.weekly_actual_hours.toFixed(1)}h</span>
        </div>
      </td>
    </tr>
  );
}

interface DayCellProps {
  day: DaySchedule;
  machineId: number;
  dayIndex: number;
  dateStr: string;
  isToday: boolean;
  canEdit: boolean;
  onAddEntry: (machineId: number, dayIndex: number, date: string) => void;
  onEditEntry: (machineId: number, dayIndex: number, entry: ScheduleEntry, date: string) => void;
  onDeleteEntry: (entryId: number) => void;
}

function DayCell({ day, machineId, dayIndex, dateStr, isToday, canEdit, onAddEntry, onEditEntry, onDeleteEntry }: DayCellProps) {
  return (
    <td className={`p-2 border-l border-gray-700 align-top ${isToday ? 'bg-blue-900/10' : ''}`}>
      <div className="min-h-[80px] space-y-1">
        {day.entries.map((entry) => (
          <div
            key={entry.id}
            className={`p-2 rounded text-xs cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
              entry.status === 'completed'
                ? 'bg-green-900/30 border border-green-700'
                : entry.status === 'in-progress'
                ? 'bg-yellow-900/30 border border-yellow-700'
                : entry.status === 'cancelled'
                ? 'bg-red-900/30 border border-red-700 opacity-50'
                : 'bg-gray-700/50 border border-gray-600'
            }`}
            onClick={() => canEdit && onEditEntry(machineId, dayIndex, entry, dateStr)}
          >
            <div className="font-medium truncate" title={entry.load_name || entry.project_name || 'No title'}>
              {entry.load_name || entry.project_name || 'Untitled'}
            </div>
            <div className="flex justify-between items-center mt-1 text-gray-400">
              <span className="text-blue-400">{entry.planned_hours}h</span>
              <span className="text-green-400">{entry.actual_hours ?? '-'}h</span>
            </div>
            {entry.operator_name && (
              <div className="text-gray-500 truncate mt-0.5" title={entry.operator_name}>
                {entry.operator_name}
              </div>
            )}
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEntry(entry.id);
                }}
                className="absolute top-1 right-1 p-0.5 text-gray-500 hover:text-red-400 hidden group-hover:block"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <button
            onClick={() => onAddEntry(machineId, dayIndex, dateStr)}
            className="w-full p-2 border border-dashed border-gray-600 rounded text-gray-500 hover:border-blue-500 hover:text-blue-400 text-xs flex items-center justify-center"
          >
            <Plus size={14} className="mr-1" />
            Add
          </button>
        )}
        {day.entries.length > 0 && (
          <div className="text-xs text-gray-500 text-center pt-1">
            {day.total_planned_hours.toFixed(1)}h / {day.total_actual_hours.toFixed(1)}h
          </div>
        )}
      </div>
    </td>
  );
}

interface EntryModalProps {
  machineId: number;
  date: string;
  entry: ScheduleEntry | null;
  projects: ProjectWithDetails[];
  onSave: (input: CreateScheduleInput | UpdateScheduleInput) => Promise<void>;
  onLogHours: (hours: number) => Promise<void>;
  onClose: () => void;
}

function EntryModal({ machineId, date, entry, projects, onSave, onLogHours, onClose }: EntryModalProps) {
  const [formData, setFormData] = useState({
    project_id: entry?.project_id || '',
    load_name: entry?.load_name || '',
    planned_hours: entry?.planned_hours || 8,
    actual_hours: entry?.actual_hours || '',
    start_time: entry?.start_time || '',
    end_time: entry?.end_time || '',
    notes: entry?.notes || '',
    status: entry?.status || 'scheduled',
  });
  const [saving, setSaving] = useState(false);
  const [loggingHours, setLoggingHours] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const input: CreateScheduleInput | UpdateScheduleInput = {
        machine_id: machineId,
        date,
        project_id: formData.project_id ? Number(formData.project_id) : undefined,
        load_name: formData.load_name || undefined,
        planned_hours: formData.planned_hours,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        notes: formData.notes || undefined,
        status: formData.status as any,
      };
      await onSave(input);
    } finally {
      setSaving(false);
    }
  };

  const handleLogActualHours = async () => {
    if (!formData.actual_hours) return;
    setLoggingHours(true);
    try {
      await onLogHours(Number(formData.actual_hours));
    } finally {
      setLoggingHours(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {entry ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Date: {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Project (optional)
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            >
              <option value="">-- Select project or enter custom load name --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Load Name / Job Title
            </label>
            <input
              type="text"
              value={formData.load_name}
              onChange={(e) => setFormData(prev => ({ ...prev, load_name: e.target.value }))}
              placeholder="e.g., HW BOT INS, FMD 33G ELE"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Planned Hours *
              </label>
              <input
                type="number"
                value={formData.planned_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, planned_hours: Number(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                min="0"
                step="0.5"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                disabled={saving}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
              disabled={saving}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {entry ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {/* Log actual hours section - only for existing entries */}
        {entry && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
              <Clock size={16} className="mr-2" />
              Log Actual Hours
            </h4>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={formData.actual_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: e.target.value }))}
                placeholder="Enter hours"
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                min="0"
                step="0.5"
                disabled={loggingHours}
              />
              <button
                type="button"
                onClick={handleLogActualHours}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center"
                disabled={loggingHours || !formData.actual_hours}
              >
                {loggingHours && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Hours
              </button>
            </div>
            {entry.actual_hours !== null && (
              <p className="text-sm text-gray-500 mt-2">
                Currently logged: {entry.actual_hours}h
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
