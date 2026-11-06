import { describe, expect, it } from 'vitest';

import { recoveryNotice } from './recovery';

describe('recoveryNotice', () => {
  it('says nothing for a clean boot', () => {
    expect(recoveryNotice('clean', 0, 0)).toBeNull();
  });

  it('says nothing for a fresh meadow', () => {
    expect(recoveryNotice('fresh', 0, 0)).toBeNull();
  });

  it('reports a restored backup calmly, without counts', () => {
    expect(recoveryNotice('restored', 0, 0)).toBe(
      'Your meadow was restored from the last good save.',
    );
  });

  it('reports a single skipped toy in the singular', () => {
    expect(recoveryNotice('salvaged', 1, 0)).toBe('We saved your meadow and skipped 1 broken toy.');
  });

  it('reports several skipped toys in the plural', () => {
    expect(recoveryNotice('salvaged', 2, 0)).toBe(
      'We saved your meadow and skipped 2 broken toys.',
    );
  });

  it('counts dropped pieces and scenery together', () => {
    expect(recoveryNotice('salvaged', 1, 2)).toBe(
      'We saved your meadow and skipped 3 broken toys.',
    );
  });

  it('reports a duplicate-only salvage in the singular', () => {
    expect(recoveryNotice('salvaged', 0, 0, 1)).toBe(
      'We saved your meadow and skipped 1 broken toy.',
    );
  });

  it('counts duplicates alongside pieces and scenery', () => {
    expect(recoveryNotice('salvaged', 0, 1, 1)).toBe(
      'We saved your meadow and skipped 2 broken toys.',
    );
  });

  it('says nothing when a salvage dropped nothing', () => {
    expect(recoveryNotice('salvaged', 0, 0)).toBeNull();
  });
});
