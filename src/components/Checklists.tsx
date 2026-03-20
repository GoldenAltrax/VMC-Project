import React, { useEffect, useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChecklists } from '../hooks/useChecklists';
import { useMachines } from '../hooks/useMachines';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatLocalDate } from '../hooks/useSchedules';

export function Checklists() {
  const {
    templates,
    completions,
    loading,
    fetchTemplates,
    fetchCompletions,
    createTemplate,
    deleteTemplate,
    submitChecklist,
  } = useChecklists();
  const { machines, fetchMachines } = useMachines();
  const { isAdmin, canEdit } = useAuth();
  const { showToast } = useToast();

  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [checkState, setCheckState] = useState<Record<number, boolean>>({});
  const [checkNotes, setCheckNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  const today = formatLocalDate(new Date());
  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  useEffect(() => {
    if (selectedMachine) {
      fetchTemplates(selectedMachine);
      fetchCompletions(selectedMachine, today);
      setCheckState({});
      setCheckNotes({});
      setSubmitted(false);
    }
  }, [selectedMachine, fetchTemplates, fetchCompletions, today]);

  // Pre-fill check state from completions
  useEffect(() => {
    if (completions.length > 0) {
      const state: Record<number, boolean> = {};
      completions.forEach(c => {
        state[c.template_id] = c.is_completed;
      });
      setCheckState(state);
      setSubmitted(true);
    }
  }, [completions]);

  const handleSubmit = async () => {
    if (!selectedMachine) return;
    setSubmitting(true);
    try {
      const items = templates.map(t => ({
        template_id: t.id,
        is_completed: checkState[t.id] || false,
        notes: checkNotes[t.id],
      }));
      await submitChecklist(selectedMachine, today, items);
      setSubmitted(true);
      showToast('Pre-shift checklist submitted!', 'success');
    } catch {
      showToast('Failed to submit checklist', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newItem.trim()) return;
    setAddingItem(true);
    try {
      await createTemplate(selectedMachine, newItem.trim());
      setNewItem('');
      showToast('Checklist item added', 'success');
    } finally {
      setAddingItem(false);
    }
  };

  const allChecked =
    templates.length > 0 && templates.every(t => checkState[t.id]);
  const checkedCount = templates.filter(t => checkState[t.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckSquare size={22} className="text-green-400" />
            Pre-Shift Checklist
          </h2>
          <p className="text-sm text-gray-400 mt-1">{todayDisplay}</p>
        </div>
      </div>

      {/* Machine selector */}
      <div className="bg-gray-800 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Select Machine
        </label>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {machines.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMachine(m.id)}
              className={`p-3 rounded-lg text-sm font-medium text-left transition-all border ${
                selectedMachine === m.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-semibold truncate">{m.name}</div>
              <div
                className={`text-xs mt-0.5 ${
                  m.status === 'active'
                    ? 'text-green-400'
                    : m.status === 'idle'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {m.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedMachine && (
        <div className="space-y-4">
          {/* Progress bar */}
          {templates.length > 0 && (
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {checkedCount}/{templates.length} items checked
                </span>
                {submitted && (
                  <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                    <Check size={12} /> Submitted
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    allChecked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${
                      templates.length > 0
                        ? (checkedCount / templates.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Checklist items */}
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-800 rounded-xl">
              <CheckSquare size={40} className="mx-auto mb-2 text-gray-600" />
              <p>No checklist items for this machine.</p>
              {isAdmin && (
                <p className="text-sm mt-1">Add items below to create a checklist.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template, idx) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    checkState[template.id]
                      ? 'bg-green-900/20 border-green-700'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() =>
                    !submitted &&
                    setCheckState(prev => ({
                      ...prev,
                      [template.id]: !prev[template.id],
                    }))
                  }
                >
                  <div
                    className={`mt-0.5 flex-shrink-0 ${
                      checkState[template.id] ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {checkState[template.id] ? (
                      <CheckSquare size={22} />
                    ) : (
                      <Square size={22} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        checkState[template.id]
                          ? 'text-green-300 line-through opacity-75'
                          : 'text-white'
                      }`}
                    >
                      {template.checklist_item}
                    </p>
                  </div>
                  {isAdmin && !submitted && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="text-gray-600 hover:text-red-400 p-1 flex-shrink-0 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* Add template item (Admin only) */}
          {isAdmin && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                placeholder="Add checklist item..."
                onKeyDown={e => e.key === 'Enter' && handleAddTemplate()}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddTemplate}
                disabled={addingItem || !newItem.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {addingItem ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Add
              </button>
            </div>
          )}

          {/* Submit button */}
          {templates.length > 0 && !submitted && canEdit && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                allChecked
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {submitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Check size={20} />
              )}
              {allChecked
                ? 'Submit Complete Checklist'
                : `Submit (${checkedCount}/${templates.length} checked)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
