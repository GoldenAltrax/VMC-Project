import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  key: string | null;
  direction: SortDirection;
}

// ============================================
// Sortable Table Header Cell
// ============================================

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  return (
    <th
      className={`px-4 py-3 text-left text-sm font-semibold text-gray-300 cursor-pointer hover:bg-gray-700/50 select-none transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <span className="text-gray-500">
          {direction === 'asc' && <ArrowUp size={14} className="text-blue-400" />}
          {direction === 'desc' && <ArrowDown size={14} className="text-blue-400" />}
          {!direction && <ArrowUpDown size={14} />}
        </span>
      </div>
    </th>
  );
}

// ============================================
// Non-Sortable Header Cell (for consistency)
// ============================================

interface TableHeaderProps {
  label: string;
  className?: string;
}

export function TableHeader({ label, className = '' }: TableHeaderProps) {
  return (
    <th className={`px-4 py-3 text-left text-sm font-semibold text-gray-300 ${className}`}>
      {label}
    </th>
  );
}

// ============================================
// Sorting Utility Functions
// ============================================

/**
 * Get the next sort direction in the cycle: null -> asc -> desc -> null
 */
export function getNextSortDirection(current: SortDirection): SortDirection {
  switch (current) {
    case null:
      return 'asc';
    case 'asc':
      return 'desc';
    case 'desc':
      return null;
    default:
      return 'asc';
  }
}

/**
 * Sort an array of objects by a key
 */
export function sortByKey<T extends Record<string, unknown>>(
  items: T[],
  key: string,
  direction: SortDirection
): T[] {
  if (!direction || !key) {
    return items;
  }

  return [...items].sort((a, b) => {
    const aVal = getNestedValue(a, key);
    const bVal = getNestedValue(b, key);

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === 'asc' ? -1 : 1;
    if (bVal == null) return direction === 'asc' ? 1 : -1;

    // Handle numbers
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    // Handle dates
    if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc'
        ? aVal.getTime() - bVal.getTime()
        : bVal.getTime() - aVal.getTime();
    }

    // Handle date strings
    if (isDateString(String(aVal)) && isDateString(String(bVal))) {
      const aDate = new Date(String(aVal)).getTime();
      const bDate = new Date(String(bVal)).getTime();
      return direction === 'asc' ? aDate - bDate : bDate - aDate;
    }

    // Handle strings
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const comparison = aStr.localeCompare(bStr);
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Check if string is a valid date
 */
function isDateString(str: string): boolean {
  const date = new Date(str);
  return !isNaN(date.getTime()) && str.includes('-');
}

// ============================================
// Sort Indicator for external use
// ============================================

interface SortIndicatorProps {
  direction: SortDirection;
  className?: string;
}

export function SortIndicator({ direction, className = '' }: SortIndicatorProps) {
  return (
    <span className={className}>
      {direction === 'asc' && <ArrowUp size={14} />}
      {direction === 'desc' && <ArrowDown size={14} />}
      {!direction && <ArrowUpDown size={14} className="opacity-30" />}
    </span>
  );
}
