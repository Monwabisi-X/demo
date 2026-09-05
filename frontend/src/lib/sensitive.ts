/**
 * Client-side sensitive-input detection — a mirror of the backend guardrail so the UI can
 * warn the user BEFORE their message leaves the browser. The backend enforces the real
 * policy; this is purely a courtesy nudge. Matched values are never stored or logged.
 */

const SA_ID = /\b\d{6}[\s-]?\d{4}[\s-]?\d{3}\b/;
const CARD = /\b(?:\d[ -]?){13,19}\b/;
const LONG_DIGITS = /\b(?:\d[\s-]?){11,}\b/;
const KEYWORDS =
  /\b(id\s*number|identity\s*number|passport\s*(number|no)|tax\s*(number|no)|bank\s*account|account\s*number|branch\s*code|card\s*number|cvv|pin|password|otp|medical|diagnosis|illness|medication)\b/i;

export const SENSITIVE_WARNING =
  "For your security, please don't share sensitive details here — like your ID or passport " +
  "number, bank or card details, passwords, or medical information. Koisa doesn't need it and can't process it.";

export function detectsSensitive(text: string): boolean {
  if (!text) return false;
  return SA_ID.test(text) || CARD.test(text) || LONG_DIGITS.test(text) || KEYWORDS.test(text);
}
