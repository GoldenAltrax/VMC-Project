import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  defaultPageSize?: number;
  defaultPage?: number;
}

interface UsePaginationReturn<T> {
  // Paginated data
  paginatedItems: T[];

  // Current state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;

  // Derived state
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  reset: () => void;
}

/**
 * Hook for client-side pagination of arrays
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { defaultPageSize = 25, defaultPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure currentPage is within bounds
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  if (validPage !== currentPage) {
    setCurrentPage(validPage);
  }

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const hasNextPage = validPage < totalPages;
  const hasPrevPage = validPage > 1;

  const setPage = useCallback((page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((p) => p + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage((p) => p - 1);
    }
  }, [hasPrevPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const reset = useCallback(() => {
    setCurrentPage(defaultPage);
    setPageSizeState(defaultPageSize);
  }, [defaultPage, defaultPageSize]);

  return {
    paginatedItems,
    currentPage: validPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset,
  };
}

// ============================================
// Server-side pagination state hook
// ============================================

interface UseServerPaginationOptions {
  defaultPageSize?: number;
  defaultPage?: number;
}

interface UseServerPaginationReturn {
  currentPage: number;
  pageSize: number;
  offset: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/**
 * Hook for server-side pagination state management
 * Use this when the backend handles pagination
 */
export function useServerPagination(
  options: UseServerPaginationOptions = {}
): UseServerPaginationReturn {
  const { defaultPageSize = 25, defaultPage = 1 } = options;

  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const offset = (currentPage - 1) * pageSize;

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(defaultPage);
    setPageSizeState(defaultPageSize);
  }, [defaultPage, defaultPageSize]);

  return {
    currentPage,
    pageSize,
    offset,
    setPage,
    setPageSize,
    reset,
  };
}
