import { describe, it, expect } from 'vitest';
import { getHealthStatus, validateSavePayload } from './index';

describe('API Health & Validation', () => {
  it('returns valid status for M0 foundation', () => {
    const status = getHealthStatus();
    expect(status.status).toBe('online');
    expect(status.milestone).toBe('M0');
  });

  it('rejects invalid save payload', () => {
    const invalid = { slot: 99, schema_version: -1 };
    const res = validateSavePayload(invalid);
    expect(res.success).toBe(false);
  });

  it('accepts compliant save payload', () => {
    const valid = { slot: 1, schema_version: 1, data: { test: true } };
    const res = validateSavePayload(valid);
    expect(res.success).toBe(true);
    expect(res.data?.slot).toBe(1);
  });
});
