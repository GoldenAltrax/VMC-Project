import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from './FormField';

export interface CascadeEffect {
  table: string;
  label: string;
  count: number;
}

export interface DeleteImpact {
  itemType: string;
  itemName: string;
  cascadeEffects: CascadeEffect[];
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  impact: DeleteImpact | null;
  isLoading?: boolean;
  isDeleting?: boolean;
}

/**
 * Modal that shows cascade impact before delete operations
 */
export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  impact,
  isLoading = false,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const hasImpact = impact && impact.cascadeEffects.length > 0;
  const totalAffected = impact?.cascadeEffects.reduce((sum, e) => sum + e.count, 0) || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              disabled={isDeleting}
            >
              <X size={20} />
            </button>

            {/* Loading state */}
            {isLoading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-400">Checking dependencies...</p>
              </div>
            ) : (
              <>
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${hasImpact ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                    <AlertTriangle
                      size={32}
                      className={hasImpact ? 'text-red-400' : 'text-yellow-400'}
                    />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-center mb-2">
                  Delete {impact?.itemType}?
                </h2>

                {/* Item name */}
                <p className="text-center text-gray-300 mb-4">
                  You are about to delete{' '}
                  <span className="font-semibold text-white">"{impact?.itemName}"</span>
                </p>

                {/* Cascade effects warning */}
                {hasImpact && (
                  <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
                    <p className="text-red-300 text-sm font-medium mb-3">
                      This will also permanently delete:
                    </p>
                    <ul className="space-y-2">
                      {impact.cascadeEffects.map((effect) => (
                        <li
                          key={effect.table}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-300">{effect.label}</span>
                          <span className="bg-red-500/30 text-red-300 px-2 py-0.5 rounded">
                            {effect.count} {effect.count === 1 ? 'record' : 'records'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-red-700/50 flex justify-between">
                      <span className="text-sm text-gray-400">Total affected:</span>
                      <span className="text-sm font-semibold text-red-300">
                        {totalAffected} records
                      </span>
                    </div>
                  </div>
                )}

                {/* Warning text */}
                <p className="text-gray-400 text-sm text-center mb-6">
                  This action cannot be undone.
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={onConfirm}
                    isLoading={isDeleting}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Simple Confirm Modal (for non-cascade deletes)
// ============================================

interface SimpleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: SimpleConfirmModalProps) {
  const variantStyles = {
    danger: {
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      buttonVariant: 'danger' as const,
    },
    warning: {
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      buttonVariant: 'primary' as const,
    },
    info: {
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      buttonVariant: 'primary' as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${styles.iconBg}`}>
                <AlertTriangle size={32} className={styles.iconColor} />
              </div>
            </div>

            <h2 className="text-lg font-semibold text-center mb-2">{title}</h2>
            <p className="text-gray-400 text-sm text-center mb-6">{message}</p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                variant={styles.buttonVariant}
                className="flex-1"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
