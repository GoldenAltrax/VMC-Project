import React, { useEffect, useState, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Users, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getWeekStart } from '../hooks/useSchedules';

interface OperatorStats {
  operator_id: number;
  operator_name: string;
  total_planned: number;
  total_actual: number;
  job_count: number;
  completed_count: number;
  efficiency: number;
}

export function OperatorReport() {
  const { token } = useAuth();
  const [stats, setStats] = useState<OperatorStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(getWeekStart());

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    invoke<any>('get_weekly_schedule', { token, weekStart })
      .then((data: any) => {
        const operatorMap: Record<number, OperatorStats> = {};
        for (const machine of data.machines) {
          for (const day of machine.days) {
            for (const entry of day.entries) {
              if (!entry.operator_id) continue;
              if (!operatorMap[entry.operator_id]) {
                operatorMap[entry.operator_id] = {
                  operator_id: entry.operator_id,
                  operator_name:
                    entry.operator_name || `Operator ${entry.operator_id}`,
                  total_planned: 0,
                  total_actual: 0,
                  job_count: 0,
                  completed_count: 0,
                  efficiency: 0,
                };
              }
              const op = operatorMap[entry.operator_id];
              op.total_planned += entry.planned_hours;
              op.total_actual += entry.actual_hours || 0;
              op.job_count += 1;
              if (entry.status === 'completed') op.completed_count += 1;
            }
          }
        }
        const result = Object.values(operatorMap)
          .map(op => ({
            ...op,
            efficiency:
              op.total_planned > 0
                ? Math.round((op.total_actual / op.total_planned) * 100)
                : 0,
          }))
          .sort((a, b) => b.total_planned - a.total_planned);
        setStats(result);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, weekStart]);

  const topPerformer = useMemo(
    () =>
      stats.reduce(
        (best, op) => (op.efficiency > (best?.efficiency || 0) ? op : best),
        stats[0]
      ),
    [stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={22} className="text-blue-400" />
          Operator Productivity
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400">Week of:</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : stats.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-3 text-gray-600" />
          <p>No operator data for this week. Assign operators to schedule entries.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Active Operators</p>
              <p className="text-3xl font-bold text-blue-400">{stats.length}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Total Hours Logged</p>
              <p className="text-3xl font-bold text-green-400">
                {stats.reduce((s, o) => s + o.total_actual, 0).toFixed(1)}h
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400">Top Performer</p>
              <p className="text-lg font-bold text-yellow-400 truncate">
                {topPerformer?.operator_name || '—'}
              </p>
              <p className="text-sm text-gray-400">
                {topPerformer?.efficiency || 0}% efficiency
              </p>
            </div>
          </div>

          {/* Operator table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-4 text-sm font-semibold text-gray-300">Operator</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Jobs</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Completed</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Planned Hrs</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Actual Hrs</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Variance</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-300">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(op => {
                  const variance = op.total_actual - op.total_planned;
                  const isOver = variance > 0;
                  const completionRate =
                    op.job_count > 0
                      ? Math.round((op.completed_count / op.job_count) * 100)
                      : 0;
                  return (
                    <tr
                      key={op.operator_id}
                      className="border-t border-gray-700 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 font-medium text-white">{op.operator_name}</td>
                      <td className="p-4 text-right text-gray-300">{op.job_count}</td>
                      <td className="p-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            completionRate >= 80
                              ? 'text-green-400'
                              : completionRate >= 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {op.completed_count}/{op.job_count} ({completionRate}%)
                        </span>
                      </td>
                      <td className="p-4 text-right text-blue-400">
                        {op.total_planned.toFixed(1)}h
                      </td>
                      <td className="p-4 text-right text-green-400">
                        {op.total_actual.toFixed(1)}h
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`flex items-center justify-end gap-1 text-sm font-medium ${
                            isOver ? 'text-red-400' : 'text-green-400'
                          }`}
                        >
                          {isOver ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isOver ? '+' : ''}
                          {variance.toFixed(1)}h
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                op.efficiency >= 90
                                  ? 'bg-green-500'
                                  : op.efficiency >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(op.efficiency, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              op.efficiency >= 90
                                ? 'text-green-400'
                                : op.efficiency >= 70
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {op.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
