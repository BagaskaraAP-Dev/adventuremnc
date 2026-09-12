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

export const PlayerPositionSchema = z.object({
  x: z.number().finite().min(-4000).max(4000),
  y: z.number().finite().min(-1000).max(2000),
  z: z.number().finite().min(-4000).max(4000),
}).strict();
export const MissionStateSchema = z.object({
  id: z.enum(['cold-courier', 'ridge-surveyor', 'illegal-salvage']),
  status: z.enum(['active', 'completed', 'failed']),
  objective: z.number().int().min(0).max(2),
  elapsed: z.number().finite().nonnegative(),
}).strict();
export const CloudStateSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(), position: PlayerPositionSchema,
  missions: z.array(MissionStateSchema).max(3),
}).strict();
export const CloudCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('save'), position: PlayerPositionSchema, oxygen: z.number().finite().min(0).max(100), dead: z.boolean() }).strict(),
  z.object({ type: z.literal('accept'), id: MissionStateSchema.shape.id }).strict(),
  z.object({ type: z.literal('interact') }).strict(),
  z.object({ type: z.literal('respawn') }).strict(),
]);
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;
export type MissionState = z.infer<typeof MissionStateSchema>;
export type CloudState = z.infer<typeof CloudStateSchema>;
export type CloudCommand = z.infer<typeof CloudCommandSchema>;
