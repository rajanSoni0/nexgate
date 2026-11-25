import { describe, expect, it } from 'vitest';
import { normalizePage } from './page';

describe('normalizePage', () => {
  it('reads Spring Data PageImpl JSON', () => {
    expect(normalizePage({ content: [1, 2], totalElements: 42, totalPages: 3, number: 1, size: 20 })).toEqual({ items: [1, 2], totalElements: 42, totalPages: 3, page: 1, size: 20 });
  });
  it('reads PagedModel (VIA_DTO) JSON', () => {
    expect(normalizePage({ content: [1], page: { size: 10, number: 0, totalElements: 1, totalPages: 1 } })).toEqual({ items: [1], totalElements: 1, totalPages: 1, page: 0, size: 10 });
  });
  it('rejects non-page responses', () => {
    expect(() => normalizePage([1, 2])).toThrow();
  });
});
