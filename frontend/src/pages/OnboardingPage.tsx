import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth.api';
import { medicalApi } from '@/api/medical.api';
import { documentsApi } from '@/api/documents.api';
import { toApiError } from '@/api/client';
import { DEMO_TENANT_ID } from '@/schemas/authSchema';
import type { ClientFormData } from '@/schemas/clientSchema';
import type { MedicalFormData } from '@/schemas/medicalSchema';
import { Stepper } from '@/components/onboarding/Stepper';
import { PersonalDetailsForm } from '@/components/onboarding/PersonalDetailsForm';
import { MedicalForm } from '@/components/onboarding/MedicalForm';
import { Button, Card, Logo } from '@/components/ui';

const STEPS = ['Your details', 'Medical intake', 'Consent', 'Done'];

export default function OnboardingPage() {
  const { user, clientLogin, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [personal, setPersonal] = useState<ClientFormData | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = user?.client_id || undefined;

  /**
   * Step 1: create the login account AND the linked client record in one call
   * (POST /auth/register with clientProfile — created + linked atomically on the backend),
   * then sign in immediately so the subsequent medical/consent steps are authenticated.
   * Previously onboarding never created an account at all — there was no password field and
   * no registration call.
   */
  async function handlePersonal(data: ClientFormData) {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({
        tenantId: DEMO_TENANT_ID,
        email: data.email,
        displayName: `${data.firstName} ${data.surname}`.trim(),
        password: data.password,
        clientProfile: {
          clientType: 'individual',
          title: data.title || undefined,
          firstName: data.firstName,
          surname: data.surname,
          idNumber: data.idNumber || undefined,
          email: data.email,
          mobile: data.mobile || undefined,
        },
      });
      await clientLogin({ email: data.email, password: data.password });
      await refreshUser();
      setPersonal(data);
      setStep(1);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMedical(answers: MedicalFormData) {
    setError(null);
    setSubmitting(true);
    try {
      if (clientId) {
        await medicalApi.submit({ clientId, questionnaireVersion: 'v1', answers });
      }
      setStep(2);
    } catch (err) {
      // Medical module may be disabled in the demo backend — proceed but note it.
      const apiErr = toApiError(err);
      if (apiErr.status === 403) {
        setStep(2);
      } else {
        setError(apiErr.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConsent() {
    setError(null);
    setSubmitting(true);
    try {
      if (clientId) {
        await documentsApi.storeConsent({
          clientId,
          typeCode: 'TERMS_AND_CONDITIONS',
          title: 'RSF Terms & Conditions acceptance',
          consent: {
            purposeCode: 'TERMS_AND_CONDITIONS',
            purposeDescription: 'Client accepted the platform terms and conditions during onboarding.',
            version: 'v1',
            granted: true,
          },
        });
      }
      setStep(3);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-300 bg-cream/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/"><Logo /></Link>
          <Link to="/client-login" className="text-sm text-ink-faint hover:text-maroon">Already a client? Sign in</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="eyebrow">Onboarding</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Set up your profile</h1>
        <p className="mt-1 text-sm text-ink-faint">
          A few steps to get started. Everything is encrypted and POPIA-aligned.
        </p>

        <div className="my-8">
          <Stepper steps={STEPS} current={step} />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-maroon/20 bg-maroon-tint px-4 py-3 text-sm text-maroon">
            {error}
          </div>
        )}

        {step === 0 && (
          <PersonalDetailsForm defaultValues={personal ?? undefined} onSubmit={handlePersonal} />
        )}

        {step === 1 && (
          <div className="space-y-4">
            <MedicalForm onSubmit={handleMedical} submitting={submitting} submitLabel="Save & continue" />
            <button onClick={() => setStep(0)} className="text-sm text-ink-faint hover:text-maroon">
              ← Back to details
            </button>
          </div>
        )}

        {step === 2 && (
          <Card>
            <p className="eyebrow mb-3">Consent & terms</p>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-cream-300 bg-cream-100 p-4 text-sm text-ink-soft">
              <p className="mb-2 font-medium text-ink">POPIA processing & terms of engagement</p>
              <p>
                By continuing you consent to Royal Square Financial processing your personal
                information for the purpose of providing financial advice and administering
                products, in line with POPIA. Your information is stored securely in-region
                (af-south-1), encrypted at rest, and access is logged. You may withdraw
                consent or request access/deletion at any time.
              </p>
            </div>
            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-maroon"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
              />
              <span className="text-sm text-ink">
                I have read and accept the terms, and consent to the processing of my
                information as described.
              </span>
            </label>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-ink-faint hover:text-maroon">
                ← Back
              </button>
              <Button size="lg" disabled={!consentGiven} loading={submitting} onClick={handleConsent}>
                Accept & finish
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-maroon text-2xl text-cream-50">
              ✓
            </div>
            <h2 className="font-serif text-2xl text-ink">You're all set</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-faint">
              Thanks{personal?.firstName ? `, ${personal.firstName}` : ''}. Your profile has
              been submitted. An adviser will review your information and be in touch.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/dashboard"><Button size="lg">Go to dashboard</Button></Link>
              <Link to="/"><Button size="lg" variant="outline">Back to home</Button></Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
