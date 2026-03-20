import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../context/AuthContext';

const RATES_KEY = 'vmc_hourly_rates';

function getRates(): Record<number, number> {
  try {
    const stored = localStorage.getItem(RATES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

function saveRates(rates: Record<number, number>) {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

export function CostTab() {
  const { isAdmin } = useAuth();
  const { projects, loading, fetchProjects } = useProjects();
  const [rates, setRates] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const stored = getRates();
    const stringified: Record<number, string> = {};
    for (const [k, v] of Object.entries(stored)) {
      stringified[Number(k)] = String(v);
    }
    setRates(stringified);
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h3 className="text-lg font-semibold text-gray-200">Access Denied</h3>
        <p className="text-gray-400 text-sm">Only Admins can view the Cost Management tab.</p>
      </div>
    );
  }

  const handleRateChange = (projectId: number, value: string) => {
    const updated = { ...rates, [projectId]: value };
    setRates(updated);
    const numeric: Record<number, number> = {};
    for (const [k, v] of Object.entries(updated)) {
      const n = parseFloat(v);
      if (!isNaN(n)) numeric[Number(k)] = n;
    }
    saveRates(numeric);
  };

  const getRate = (id: number): number => {
    const v = parseFloat(rates[id] ?? '');
    return isNaN(v) ? 0 : v;
  };

  const totalCost = projects.reduce((sum, p) => sum + p.actual_hours * getRate(p.id), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <DollarSign size={22} className="mr-2 text-green-400" />
          Cost Management
        </h2>
        <div className="bg-gray-800 rounded-lg px-4 py-2">
          <span className="text-sm text-gray-400">Total Cost: </span>
          <span className="text-lg font-semibold text-green-400">
            ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700">
                <th className="text-left p-4">Project</th>
                <th className="text-left p-4">Client</th>
                <th className="text-right p-4">Actual Hours</th>
                <th className="text-right p-4">Hourly Rate (₹)</th>
                <th className="text-right p-4">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const rate = getRate(project.id);
                const cost = project.actual_hours * rate;
                return (
                  <tr key={project.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                    <td className="p-4 font-medium">{project.name}</td>
                    <td className="p-4 text-gray-400">{project.client_name || '—'}</td>
                    <td className="p-4 text-right text-blue-400">{project.actual_hours.toFixed(1)}h</td>
                    <td className="p-4 text-right">
                      <input
                        type="number"
                        value={rates[project.id] ?? ''}
                        onChange={(e) => handleRateChange(project.id, e.target.value)}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm text-right"
                      />
                    </td>
                    <td className="p-4 text-right font-semibold text-green-400">
                      ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">No projects found</td>
                </tr>
              )}
            </tbody>
            {projects.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-600 bg-gray-700/50">
                  <td colSpan={4} className="p-4 text-right font-semibold">Total</td>
                  <td className="p-4 text-right font-bold text-green-400 text-lg">
                    ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Hourly rates are stored locally. Cost = Actual Hours × Hourly Rate.
      </p>
    </div>
  );
}
