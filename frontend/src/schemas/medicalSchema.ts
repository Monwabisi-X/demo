import { z } from 'zod';

/**
 * 18-point medical intake. Boolean toggles gate optional free-text detail fields. The whole
 * object is submitted as `answers` and encrypted server-side (KMS envelope). Nothing here is
 * ever exposed to Koisa.
 */
export const medicalSchema = z.object({
  // Lifestyle
  smoker_status: z.boolean().default(false),
  alcohol_units_weekly: z.coerce.number().min(0).max(200).default(0),
  recreational_drugs: z.boolean().default(false),

  // Vitals
  height_cm: z.coerce.number().min(50).max(260).optional(),
  weight_kg: z.coerce.number().min(20).max(400).optional(),

  // Condition toggles + details
  has_cardiovascular: z.boolean().default(false),
  cardiovascular_details: z.string().max(1000).optional(),
  has_diabetes: z.boolean().default(false),
  diabetes_details: z.string().max(1000).optional(),
  has_cancer: z.boolean().default(false),
  cancer_details: z.string().max(1000).optional(),
  has_respiratory: z.boolean().default(false),
  respiratory_details: z.string().max(1000).optional(),
  has_mental_health: z.boolean().default(false),
  mental_health_details: z.string().max(1000).optional(),
  has_chronic_medication: z.boolean().default(false),
  chronic_medication_details: z.string().max(1000).optional(),

  // History
  family_history_hereditary: z.boolean().default(false),
  family_history_details: z.string().max(1000).optional(),
  previous_surgeries: z.boolean().default(false),
  surgeries_details: z.string().max(1000).optional(),
  disability_status: z.boolean().default(false),
  disability_details: z.string().max(1000).optional(),

  // Declaration
  information_accurate: z
    .boolean()
    .refine((v) => v === true, 'You must confirm the information is accurate'),
});

export type MedicalFormData = z.infer<typeof medicalSchema>;

/** Declarative definition used to render the toggle+detail rows in the form. */
export interface MedicalQuestion {
  toggle: keyof MedicalFormData;
  detail?: keyof MedicalFormData;
  label: string;
  section: 'Lifestyle' | 'Medical history' | 'Family & other';
}

export const MEDICAL_QUESTIONS: MedicalQuestion[] = [
  { toggle: 'smoker_status', label: 'Do you smoke or use tobacco products?', section: 'Lifestyle' },
  { toggle: 'recreational_drugs', label: 'Do you use recreational drugs?', section: 'Lifestyle' },
  { toggle: 'has_cardiovascular', detail: 'cardiovascular_details', label: 'Any history of cardiovascular conditions?', section: 'Medical history' },
  { toggle: 'has_diabetes', detail: 'diabetes_details', label: 'Have you been diagnosed with diabetes?', section: 'Medical history' },
  { toggle: 'has_cancer', detail: 'cancer_details', label: 'Any history of cancer?', section: 'Medical history' },
  { toggle: 'has_respiratory', detail: 'respiratory_details', label: 'Any respiratory conditions (e.g. asthma, COPD)?', section: 'Medical history' },
  { toggle: 'has_mental_health', detail: 'mental_health_details', label: 'Any mental-health conditions under treatment?', section: 'Medical history' },
  { toggle: 'has_chronic_medication', detail: 'chronic_medication_details', label: 'Are you on any chronic medication?', section: 'Medical history' },
  { toggle: 'family_history_hereditary', detail: 'family_history_details', label: 'Family history of hereditary conditions?', section: 'Family & other' },
  { toggle: 'previous_surgeries', detail: 'surgeries_details', label: 'Any previous surgeries or hospitalisations?', section: 'Family & other' },
  { toggle: 'disability_status', detail: 'disability_details', label: 'Do you have any disability?', section: 'Family & other' },
];
