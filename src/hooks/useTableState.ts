import { useState, useCallback, useEffect, useMemo } from 'react';
import { SortState, SortDirection, getNextSortDirection, sortByKey } from '../components/common/SortableHeader';
import { FilterValues } from '../components/common/TableFilters';

// ============================================
// Types
// ============================================

interface UseTableStateOptions {
  /** Unique key for localStorage persistence */
  storageKey?: string;
  /** Default sort state */
  defaultSort?: SortState;
  /** Default filters */
  defaultFilters?: FilterValues;
  /** Default page size */
  defaultPageSize?: number;
  /** Whether to persist state to localStorage */
  persist?: boolean;
}

interface TableState {
  sort: SortState;
  filters: FilterValues;
  search: string;
  pageSize: number;
  currentPage: number;
}

interface UseTableStateReturn<T> {
  // Processed data
  processedItems: T[];
  paginatedItems: T[];

  // Sort state
  sort: SortState;
  setSort: (key: string) => void;
  clearSort: () => void;

  // Filter state
  filters: FilterValues;
  setFilter: (key: string, value: string | { from: string; to: string }) => void;
  clearFilters: () => void;

  // Search state
  search: string;
  setSearch: (value: string) => void;

  // Pagination state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Reset
  resetAll: () => void;
}

// ============================================
// Main Hook
// ============================================

export function useTableState<T extends Record<string, unknown>>(
  items: T[],
  options: UseTableStateOptions = {}
): UseTableStateReturn<T> {
  const {
    storageKey,
    defaultSort = { key: null, direction: null },
    defaultFilters = {},
    defaultPageSize = 25,
    persist = true,
  } = options;

  // Load initial state from localStorage if available
  const loadInitialState = (): TableState => {
    if (persist && storageKey) {
      try {
        const stored = localStorage.getItem(`vmc_table_${storageKey}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return {
      sort: defaultSort,
      filters: defaultFilters,
      search: '',
      pageSize: defaultPageSize,
      currentPage: 1,
    };
  };

  const [state, setState] = useState<TableState>(loadInitialState);

  // Persist state to localStorage
  useEffect(() => {
    if (persist && storageKey) {
      localStorage.setItem(`vmc_table_${storageKey}`, JSON.stringify(state));
    }
  }, [state, storageKey, persist]);

  // ============================================
  // Sort Functions
  // ============================================

  const setSort = useCallback((key: string) => {
    setState((prev) => {
      const newDirection: SortDirection =
        prev.sort.key === key
          ? getNextSortDirection(prev.sort.direction)
          : 'asc';

      return {
        ...prev,
        sort: {
          key: newDirection ? key : null,
          direction: newDirection,
        },
        currentPage: 1, // Reset to first page on sort change
      };
    });
  }, []);

  const clearSort = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sort: { key: null, direction: null },
    }));
  }, []);

  // ============================================
  // Filter Functions
  // ============================================

  const setFilter = useCallback(
    (key: string, value: string | { from: string; to: string }) => {
      setState((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          [key]: value,
        },
        currentPage: 1, // Reset to first page on filter change
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {},
      search: '',
      currentPage: 1,
    }));
  }, []);

  // ============================================
  // Search Functions
  // ============================================

  const setSearch = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      search: value,
      currentPage: 1, // Reset to first page on search
    }));
  }, []);

  // ============================================
  // Pagination Functions
  // ============================================

  const setPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      currentPage: Math.max(1, page),
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setState((prev) => ({
      ...prev,
      pageSize: size,
      currentPage: 1, // Reset to first page when changing page size
    }));
  }, []);

  // ============================================
  // Reset Function
  // ============================================

  const resetAll = useCallback(() => {
    setState({
      sort: defaultSort,
      filters: defaultFilters,
      search: '',
      pageSize: defaultPageSize,
      currentPage: 1,
    });
  }, [defaultSort, defaultFilters, defaultPageSize]);

  // ============================================
  // Process Items (filter, sort, paginate)
  // ============================================

  const processedItems = useMemo(() => {
    let result = [...items];

    // Apply search (searches all string fields)
    if (state.search) {
      const searchLower = state.search.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }

    // Apply filters
    Object.entries(state.filters).forEach(([key, value]) => {
      if (!value) return;

      if (typeof value === 'string' && value !== '') {
        result = result.filter((item) => {
          const itemValue = item[key];
          if (itemValue == null) return false;
          return String(itemValue).toLowerCase() === value.toLowerCase();
        });
      } else if (typeof value === 'object') {
        // Date range filter
        const { from, to } = value;
        if (from || to) {
          result = result.filter((item) => {
            const itemValue = item[key];
            if (!itemValue) return false;
            const itemDate = new Date(String(itemValue)).getTime();
            if (from && itemDate < new Date(from).getTime()) return false;
            if (to && itemDate > new Date(to).getTime()) return false;
            return true;
          });
        }
      }
    });

    // Apply sorting
    if (state.sort.key && state.sort.direction) {
      result = sortByKey(result, state.sort.key, state.sort.direction);
    }

    return result;
  }, [items, state.search, state.filters, state.sort]);

  // Calculate pagination
  const totalItems = processedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
  const validPage = Math.min(Math.max(1, state.currentPage), totalPages);

  // Ensure current page is valid
  useEffect(() => {
    if (state.currentPage !== validPage) {
      setState((prev) => ({ ...prev, currentPage: validPage }));
    }
  }, [validPage, state.currentPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (validPage - 1) * state.pageSize;
    return processedItems.slice(startIndex, startIndex + state.pageSize);
  }, [processedItems, validPage, state.pageSize]);

  return {
    processedItems,
    paginatedItems,

    sort: state.sort,
    setSort,
    clearSort,

    filters: state.filters,
    setFilter,
    clearFilters,

    search: state.search,
    setSearch,

    currentPage: validPage,
    pageSize: state.pageSize,
    totalItems,
    totalPages,
    setPage,
    setPageSize,

    resetAll,
  };
}

// ============================================
// Simple Filter Hook (no pagination)
// ============================================

export function useSimpleFilter<T extends Record<string, unknown>>(
  items: T[],
  searchFields: (keyof T)[]
): {
  filteredItems: T[];
  search: string;
  setSearch: (value: string) => void;
} {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;

    const searchLower = search.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) =>
        String(item[field]).toLowerCase().includes(searchLower)
      )
    );
  }, [items, search, searchFields]);

  return { filteredItems, search, setSearch };
}
