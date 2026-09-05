import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { medicalSchema, MEDICAL_QUESTIONS, type MedicalFormData } from '@/schemas/medicalSchema';
import { Button, Input, Textarea, Toggle, Card } from '@/components/ui';

/**
 * 18-point medical intake. Boolean toggles dynamically reveal a detail textarea. The whole
 * `answers` object is posted to the backend which encrypts it (KMS envelope) — nothing here
 * is stored client-side beyond the in-progress form, and it is never sent to Koisa.
 */
export function MedicalForm({
  onSubmit,
  submitting,
  submitLabel = 'Submit medical questionnaire',
}: {
  onSubmit: (answers: MedicalFormData) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MedicalFormData>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      smoker_status: false,
      recreational_drugs: false,
      alcohol_units_weekly: 0,
      has_cardiovascular: false,
      has_diabetes: false,
      has_cancer: false,
      has_respiratory: false,
      has_mental_health: false,
      has_chronic_medication: false,
      family_history_hereditary: false,
      previous_surgeries: false,
      disability_status: false,
      information_accurate: false,
    },
  });

  const sections = ['Lifestyle', 'Medical history', 'Family & other'] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-4 py-3 text-sm text-maroon">
        Your answers are encrypted before storage and are only accessible to authorised
        medical underwriting staff. Koisa never sees this information.
      </div>

      {/* Vitals + alcohol */}
      <Card>
        <p className="eyebrow mb-4">Vitals & lifestyle</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Height (cm)"
            type="number"
            error={errors.height_cm?.message}
            {...register('height_cm')}
          />
          <Input
            label="Weight (kg)"
            type="number"
            error={errors.weight_kg?.message}
            {...register('weight_kg')}
          />
          <Input
            label="Alcohol (units/week)"
            type="number"
            error={errors.alcohol_units_weekly?.message}
            {...register('alcohol_units_weekly')}
          />
        </div>
      </Card>

      {sections.map((section) => {
        const items = MEDICAL_QUESTIONS.filter((q) => q.section === section);
        if (items.length === 0) return null;
        return (
          <Card key={section}>
            <p className="eyebrow mb-4">{section}</p>
            <div className="space-y-4">
              {items.map((q) => {
                const revealed = q.detail ? Boolean(watch(q.toggle)) : false;
                return (
                  <div key={q.toggle} className="border-b border-cream-300 pb-4 last:border-0 last:pb-0">
                    <Toggle label={q.label} {...register(q.toggle)} />
                    {q.detail && revealed && (
                      <div className="mt-3">
                        <Textarea
                          placeholder="Please specify conditions, diagnosis dates, and treating practitioners…"
                          {...register(q.detail)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Declaration */}
      <Card className="border-maroon/20">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-maroon" {...register('information_accurate')} />
          <span className="text-sm text-ink">
            I confirm the information provided is accurate and complete to the best of my
            knowledge.
          </span>
        </label>
        {errors.information_accurate && (
          <p className="mt-2 text-xs font-medium text-maroon">{errors.information_accurate.message}</p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
