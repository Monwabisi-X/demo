import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientFormData } from '@/schemas/clientSchema';
import { Button, Input, Select, Card } from '@/components/ui';

export function PersonalDetailsForm({
  defaultValues,
  onSubmit,
  submitting = false,
}: {
  defaultValues?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => void | Promise<void>;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      title: '',
      firstName: '',
      surname: '',
      idNumber: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      ...defaultValues,
    },
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
            hint="This becomes your client portal login email."
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          Your ID number is transmitted over TLS and encrypted at rest with AWS KMS. Please
          don't share it anywhere else, including with Koisa.
        </p>
      </Card>

      <Card>
        <p className="eyebrow mb-4">Create your client portal password</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <p className="mt-4 text-xs text-ink-faint">
          You'll use this email and password to sign in at the client portal (/client-login)
          once your profile is submitted.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>Continue</Button>
      </div>
    </form>
  );
}
