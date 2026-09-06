// Smile ID identity-verification Lambda (reference handler).
//
// Invoked by API Gateway. Reads the Smile ID partner API key from Secrets Manager at runtime
// (never from an env var / never committed), calls Smile ID, and returns a normalized result
// the backend records against the client's KYC status. This is a minimal, deploy-ready stub:
// wire the real Smile ID SDK call where indicated. It intentionally has no external deps so it
// zips and deploys as-is.

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const REGION = process.env.AWS_REGION || 'af-south-1';
const SECRET_ARN = process.env.SMILE_ID_SECRET_ARN;
const sm = new SecretsManagerClient({ region: REGION });

async function getApiKey() {
  if (!SECRET_ARN) return null;
  try {
    const res = await sm.send(new GetSecretValueCommand({ SecretId: SECRET_ARN }));
    return res.SecretString || null;
  } catch (err) {
    // A newly created secret container intentionally has no AWSCURRENT version until an
    // operator injects the value out-of-band. Treat that state as simulation mode, but do
    // not hide access-denied, KMS, or networking failures.
    if (err?.name === 'ResourceNotFoundException') return null;
    throw err;
  }
}

export const handler = async (event) => {
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const { clientId, idNumber } = body;
  if (!clientId) return json(400, { error: 'clientId_required' });

  const apiKey = await getApiKey();
  if (!apiKey) {
    // No key configured yet — return a simulated result so the pipeline is testable.
    return json(200, {
      provider: 'smile_id',
      mode: 'simulated',
      client_id: clientId,
      verified: true,
      confidence: 0.99,
    });
  }

  // TODO: call the real Smile ID API here using `apiKey` and `idNumber`.
  // const result = await callSmileId(apiKey, { idNumber, ... });
  return json(200, {
    provider: 'smile_id',
    mode: 'live',
    client_id: clientId,
    verified: false,
    status: 'pending',
  });
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
