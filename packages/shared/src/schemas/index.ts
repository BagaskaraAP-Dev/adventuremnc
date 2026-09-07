import { z } from 'zod';

export const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const SavePayloadSchema = z.object({
  slot: z.number().int().min(1).max(3),
  schema_version: z.number().int().positive(),
  data: z.record(z.unknown()),
});

export const MissionCompleteSchema = z.object({
  mission_id: z.string(),
  elapsed_seconds: z.number().positive(),
  checksum: z.string(),
});

export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type SavePayloadInput = z.infer<typeof SavePayloadSchema>;
export type MissionCompleteInput = z.infer<typeof MissionCompleteSchema>;
