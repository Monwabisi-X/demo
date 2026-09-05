import { z } from 'zod';

export const loginSchema = z.object({
  tenantId: z.string().uuid('Enter a valid tenant ID'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/** Default demo tenant seeded by the backend (006_seed.sql). */
export const DEMO_TENANT_ID = '00000000-0000-0000-0000-0000000000aa';
