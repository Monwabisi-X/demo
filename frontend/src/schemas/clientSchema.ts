import { z } from 'zod';

/**
 * Client onboarding validation. The SA ID number is validated for shape only and is sent to
 * the backend to be encrypted (never stored client-side beyond the in-progress form).
 *
 * SA ID = 13 digits: YYMMDD SSSS C A Z. We validate length + the Luhn check digit.
 */
function isValidSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  // Luhn checksum over the 13 digits.
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const clientSchema = z
  .object({
    title: z.string().max(30).optional().or(z.literal('')),
    firstName: z.string().min(1, 'First name is required').max(100),
    surname: z.string().min(1, 'Surname is required').max(100),
    idNumber: z
      .string()
      .refine((v) => !v || isValidSaId(v), 'Enter a valid 13-digit SA ID number'),
    email: z.string().email('Enter a valid email address'),
    mobile: z
      .string()
      .regex(/^(\+?\d{9,15})$/, 'Enter a valid mobile number')
      .optional()
      .or(z.literal('')),
    // Sets the login password for the new client account created during onboarding.
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ClientFormData = z.infer<typeof clientSchema>;
