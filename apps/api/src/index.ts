import { SavePayloadSchema, type SavePayloadInput } from '@adventuremnc/shared';

export interface ApiStatus {
  status: 'online' | 'degraded';
  version: string;
  milestone: string;
}

export function getHealthStatus(): ApiStatus {
  return {
    status: 'online',
    version: '0.1.0',
    milestone: 'M0',
  };
}

export function validateSavePayload(input: unknown): { success: boolean; data?: SavePayloadInput; error?: string } {
  const result = SavePayloadSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
