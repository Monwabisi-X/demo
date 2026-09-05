import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientFormData } from '@/schemas/clientSchema';
import { Button, Input, Select, Card } from '@/components/ui';

export function PersonalDetailsForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { title: '', firstName: '', surname: '', idNumber: '', email: '', mobile: '', ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <p className="eyebrow mb-4">Personal details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Title"
            options={[
              { value: '', label: '—' },
              { value: 'Mr', label: 'Mr' },
              { value: 'Ms', label: 'Ms' },
              { value: 'Mrs', label: 'Mrs' },
              { value: 'Dr', label: 'Dr' },
            ]}
            {...register('title')}
          />
          <div />
          <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Surname" error={errors.surname?.message} {...register('surname')} />
          <Input
            label="SA ID number"
            hint="13 digits. Encrypted before storage — never shown again."
            error={errors.idNumber?.message}
            {...register('idNumber')}
          />
          <Input label="Mobile" placeholder="+27…" error={errors.mobile?.message} {...register('mobile')} />
          <Input
            label="Email"
            type="email"
            className="sm:col-span-2"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Your ID number is transmitted over TLS and encrypted at rest with AWS KMS. Please
          don't share it anywhere else, including with Koisa.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">Continue</Button>
      </div>
    </form>
  );
}
