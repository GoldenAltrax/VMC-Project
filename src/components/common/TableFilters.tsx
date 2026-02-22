import React from 'react';
import { Search, X, Filter, Calendar } from 'lucide-react';

// ============================================
// Filter Configuration Types
// ============================================

export interface SelectFilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'dateRange';
  options?: SelectFilterOption[];
  placeholder?: string;
}

export type FilterValues = Record<string, string | { from: string; to: string }>;

// ============================================
// Main Filter Bar Component
// ============================================

interface TableFiltersProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (key: string, value: string | { from: string; to: string }) => void;
  onClear: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export function TableFilters({
  filters,
  values,
  onChange,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  className = '',
}: TableFiltersProps) {
  const hasActiveFilters = Object.values(values).some((v) => {
    if (typeof v === 'string') return v !== '';
    return v.from !== '' || v.to !== '';
  }) || (searchValue && searchValue !== '');

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Filter dropdowns */}
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-[150px]">
            {filter.type === 'select' && (
              <select
                value={(values[filter.key] as string) || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{filter.placeholder || `All ${filter.label}`}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {filter.type === 'text' && (
              <input
                type="text"
                value={(values[filter.key] as string) || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                placeholder={filter.placeholder || filter.label}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {filter.type === 'date' && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={(values[filter.key] as string) || ''}
                  onChange={(e) => onChange(filter.key, e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {filter.type === 'dateRange' && (
              <DateRangeFilter
                value={(values[filter.key] as { from: string; to: string }) || { from: '', to: '' }}
                onChange={(val) => onChange(filter.key, val)}
                label={filter.label}
              />
            )}
          </div>
        ))}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={16} />
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          {searchValue && (
            <FilterPill
              label={`Search: "${searchValue}"`}
              onRemove={() => onSearchChange?.('')}
            />
          )}
          {filters.map((filter) => {
            const value = values[filter.key];
            if (!value) return null;

            if (typeof value === 'string' && value !== '') {
              const displayValue =
                filter.type === 'select'
                  ? filter.options?.find((o) => o.value === value)?.label || value
                  : value;
              return (
                <FilterPill
                  key={filter.key}
                  label={`${filter.label}: ${displayValue}`}
                  onRemove={() => onChange(filter.key, '')}
                />
              );
            }

            if (typeof value === 'object' && (value.from || value.to)) {
              return (
                <FilterPill
                  key={filter.key}
                  label={`${filter.label}: ${value.from || '...'} - ${value.to || '...'}`}
                  onRemove={() => onChange(filter.key, { from: '', to: '' })}
                />
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Filter Pill Component
// ============================================

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-blue-600/30 rounded-full p-0.5"
      >
        <X size={12} />
      </button>
    </span>
  );
}

// ============================================
// Date Range Filter Component
// ============================================

interface DateRangeFilterProps {
  value: { from: string; to: string };
  onChange: (value: { from: string; to: string }) => void;
  label: string;
}

function DateRangeFilter({ value, onChange, label }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        placeholder={`${label} from`}
        className="w-36 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-gray-500">to</span>
      <input
        type="date"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        placeholder={`${label} to`}
        className="w-36 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// ============================================
// Quick Filter Buttons
// ============================================

interface QuickFilter {
  label: string;
  filters: FilterValues;
}

interface QuickFiltersProps {
  quickFilters: QuickFilter[];
  currentFilters: FilterValues;
  onApply: (filters: FilterValues) => void;
  className?: string;
}

export function QuickFilters({
  quickFilters,
  currentFilters,
  onApply,
  className = '',
}: QuickFiltersProps) {
  const isActive = (qf: QuickFilter) => {
    return Object.entries(qf.filters).every(([key, value]) => {
      return JSON.stringify(currentFilters[key]) === JSON.stringify(value);
    });
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickFilters.map((qf, index) => (
        <button
          key={index}
          onClick={() => onApply(qf.filters)}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            isActive(qf)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {qf.label}
        </button>
      ))}
    </div>
  );
}
