import type { Page } from '@/types/api';

interface DirectPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface DtoPage<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

/**
 * Spring Data serializes Page either directly (PageImpl, the Boot 3.5 default)
 * or via PagedModel DTO ({content, page:{...}}) when VIA_DTO is configured.
 * Accept both so a backend configuration change doesn't break the console.
 */
export function normalizePage<T>(raw: unknown): Page<T> {
  const value = raw as Partial<DirectPage<T> & DtoPage<T>>;
  if (!value || !Array.isArray(value.content)) {
    throw new Error('Unexpected page response from the server');
  }
  if (value.page && typeof value.page === 'object') {
    return {
      items: value.content,
      totalElements: value.page.totalElements,
      totalPages: value.page.totalPages,
      page: value.page.number,
      size: value.page.size,
    };
  }
  return {
    items: value.content,
    totalElements: value.totalElements ?? value.content.length,
    totalPages: value.totalPages ?? 1,
    page: value.number ?? 0,
    size: value.size ?? value.content.length,
  };
}
