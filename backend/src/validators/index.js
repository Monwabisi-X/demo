'use strict';

/**
 * Joi validation schemas grouped by domain. These constrain request bodies; sensitive fields
 * (ID numbers etc.) are accepted only where a flow legitimately needs them and are encrypted
 * by the service layer — never persisted or logged in plaintext.
 */

const Joi = require('joi');

const uuid = Joi.string().uuid();

const auth = {
  login: Joi.object({
    tenantId: uuid.required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(200).required(),
  }),
  // Client-facing login: email + password only. The tenant is resolved on the server.
  clientLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(200).required(),
  }),
  register: Joi.object({
    tenantId: uuid.required(),
    email: Joi.string().email().required(),
    displayName: Joi.string().min(1).max(200).required(),
    password: Joi.string().min(8).max(200).required(),
    roleCodes: Joi.array().items(Joi.string()).default(['CLIENT']),
    // Optional client intake, captured during self-service onboarding. When present, a
    // Client record is created and linked to the new user in the same transaction.
    clientProfile: Joi.object({
      clientType: Joi.string().valid('individual', 'legal_entity').default('individual'),
      title: Joi.string().max(30).optional().allow(''),
      firstName: Joi.string().max(100).optional(),
      surname: Joi.string().max(100).optional(),
      idNumber: Joi.string().max(64).optional().allow(''),
      passportNumber: Joi.string().max(64).optional().allow(''),
      taxNumber: Joi.string().max(64).optional().allow(''),
      email: Joi.string().email().optional(),
      mobile: Joi.string().max(40).optional().allow(''),
    }).optional(),
  }),
  refresh: Joi.object({ refreshToken: Joi.string().required() }),
  logout: Joi.object({ refreshToken: Joi.string().optional() }),
  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(200).required(),
  }),
  forgotPassword: Joi.object({
    tenantId: uuid.required(),
    email: Joi.string().email().required(),
  }),
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(200).required(),
  }),
  updateProfile: Joi.object({
    displayName: Joi.string().min(1).max(200).optional(),
    email: Joi.string().email().optional(),
  }).min(1),
  createUser: Joi.object({
    email: Joi.string().email().required(),
    displayName: Joi.string().min(1).max(200).required(),
    password: Joi.string().min(8).max(200).required(),
    roleCodes: Joi.array().items(Joi.string()).default([]),
  }),
  updateUser: Joi.object({
    displayName: Joi.string().min(1).max(200).optional(),
    email: Joi.string().email().optional(),
    status: Joi.string().valid('active', 'inactive', 'archived').optional(),
    roleCodes: Joi.array().items(Joi.string()).optional(),
  }).min(1),
};

const client = {
  create: Joi.object({
    clientType: Joi.string().valid('individual', 'legal_entity').default('individual'),
    title: Joi.string().max(30).optional(),
    firstName: Joi.string().max(100).optional(),
    surname: Joi.string().max(100).optional(),
    legalEntityName: Joi.string().max(250).optional(),
    idNumber: Joi.string().max(64).optional(),
    passportNumber: Joi.string().max(64).optional(),
    taxNumber: Joi.string().max(64).optional(),
    email: Joi.string().email().optional(),
    mobile: Joi.string().max(40).optional(),
  }),
  update: Joi.object({
    title: Joi.string().max(30).optional(),
    firstName: Joi.string().max(100).optional(),
    surname: Joi.string().max(100).optional(),
    legalEntityName: Joi.string().max(250).optional(),
    idNumber: Joi.string().max(64).optional(),
    passportNumber: Joi.string().max(64).optional(),
    taxNumber: Joi.string().max(64).optional(),
    email: Joi.string().email().optional(),
    mobile: Joi.string().max(40).optional(),
  }).min(1),
};

const financial = {
  asset: Joi.object({
    clientId: uuid.required(),
    category: Joi.string().max(80).required(),
    description: Joi.string().max(250).required(),
    current_value: Joi.number().min(0).required(),
    ownership_percentage: Joi.number().min(0).max(100).default(100),
    currency_code: Joi.string().length(3).default('ZAR'),
  }),
  liability: Joi.object({
    clientId: uuid.required(),
    category: Joi.string().max(80).required(),
    creditor_name: Joi.string().max(250).optional(),
    current_balance: Joi.number().min(0).required(),
    monthly_payment: Joi.number().min(0).optional(),
    interest_rate: Joi.number().min(0).optional(),
    currency_code: Joi.string().length(3).default('ZAR'),
  }),
};

const policy = {
  create: Joi.object({
    clientId: uuid.required(),
    provider_id: uuid.required(),
    product_id: uuid.required(),
    policyNumber: Joi.string().max(100).optional(),
    premium: Joi.number().min(0).optional(),
    cover_amount: Joi.number().min(0).optional(),
    currency_code: Joi.string().length(3).default('ZAR'),
    status: Joi.string().max(50).default('active'),
  }),
  update: Joi.object({
    policyNumber: Joi.string().max(100).optional(),
    premium: Joi.number().min(0).optional(),
    cover_amount: Joi.number().min(0).optional(),
    current_value: Joi.number().min(0).optional(),
    status: Joi.string().max(50).optional(),
  }).min(1),
};

const claim = {
  submit: Joi.object({
    clientId: uuid.required(),
    policyId: uuid.optional(),
    providerId: uuid.optional(),
    claimType: Joi.string().max(80).default('motor'),
    lossDate: Joi.date().optional(),
    narrative: Joi.string().max(5000).optional(),
    incident: Joi.object().unknown(true).default({}),
  }),
  update: Joi.object({
    status: Joi.string().max(80).optional(),
    narrative: Joi.string().max(5000).optional(),
    closed_at: Joi.date().optional(),
  }).min(1),
  advanceStep: Joi.object({
    stepKey: Joi.string().max(80).required(),
    status: Joi.string().valid('pending', 'in_progress', 'done', 'skipped').default('done'),
    detail: Joi.string().max(2000).optional(),
  }),
};

const goal = {
  create: Joi.object({
    clientId: uuid.required(),
    householdId: uuid.optional(),
    scope: Joi.string().valid('individual', 'shared').default('individual'),
    category: Joi.string().max(80).optional(),
    name: Joi.string().max(250).required(),
    description: Joi.string().max(2000).optional(),
    targetAmount: Joi.number().min(0).default(0),
    currentAmount: Joi.number().min(0).default(0),
    currencyCode: Joi.string().length(3).default('ZAR'),
    targetDate: Joi.date().optional(),
  }),
  update: Joi.object({
    name: Joi.string().max(250).optional(),
    description: Joi.string().max(2000).optional(),
    category: Joi.string().max(80).optional(),
    targetAmount: Joi.number().min(0).optional(),
    currentAmount: Joi.number().min(0).optional(),
    targetDate: Joi.date().optional(),
    status: Joi.string().valid('active', 'achieved', 'paused', 'cancelled').optional(),
  }).min(1),
};

const reminder = {
  create: Joi.object({
    clientId: uuid.optional(),
    reminderType: Joi.string().max(100).required(),
    title: Joi.string().max(250).required(),
    audience: Joi.string().valid('us', 'client', 'both').optional(),
    channel: Joi.string().valid('email', 'sms', 'whatsapp').default('email'),
    cadenceInterval: Joi.string().valid('1 month', '3 months', '6 months', '1 year', '2 years').default('1 year'),
    leadDays: Joi.number().integer().min(0).max(365).default(14),
    nextRunAt: Joi.date().optional(),
    entityType: Joi.string().max(100).optional(),
    entityId: uuid.optional(),
  }),
  update: Joi.object({
    title: Joi.string().max(250).optional(),
    audience: Joi.string().valid('us', 'client', 'both').optional(),
    channel: Joi.string().valid('email', 'sms', 'whatsapp').optional(),
    cadenceInterval: Joi.string().valid('1 month', '3 months', '6 months', '1 year', '2 years').optional(),
    leadDays: Joi.number().integer().min(0).max(365).optional(),
    nextRunAt: Joi.date().optional(),
    active: Joi.boolean().optional(),
  }).min(1),
};

const serviceRequest = {
  create: Joi.object({
    clientId: uuid.optional(), // defaults to the caller's own client for CLIENT users
    requestType: Joi.string()
      .valid(
        'CHANGE_OF_ADDRESS',
        'CHANGE_OF_BANK',
        'REQUEST_POLICY_DOCUMENT',
        'REQUEST_BORDER_LETTER',
        'REQUEST_IRP5',
        'REQUEST_CONSULTATION'
      )
      .required(),
    details: Joi.object().unknown(true).default({}),
    policyId: uuid.optional(),
    providerId: uuid.optional(),
  }),
  update: Joi.object({
    status: Joi.string().valid('submitted', 'in_progress', 'completed', 'cancelled').optional(),
    assignedUserId: uuid.optional(),
  }).min(1),
};

const document = {
  create: Joi.object({
    clientId: uuid.optional(),
    typeCode: Joi.string().max(100).required(),
    title: Joi.string().max(250).required(),
    description: Joi.string().max(1000).optional(),
    // Base64 file content for direct upload (small files); large files use presigned upload.
    contentBase64: Joi.string().optional(),
    mimeType: Joi.string().max(150).optional(),
  }),
  selfConsent: Joi.object({
    clientId: uuid.required(),
    accepted: Joi.boolean().valid(true).required(),
  }),
  consent: Joi.object({
    clientId: uuid.required(),
    typeCode: Joi.string()
      .valid('CONSENT_FORM', 'TERMS_AND_CONDITIONS', 'POPIA_DISCLOSURE', 'MEDICAL_CONSENT')
      .required(),
    title: Joi.string().max(250).required(),
    contentBase64: Joi.string().optional(),
    mimeType: Joi.string().max(150).default('application/pdf'),
    consent: Joi.object({
      purposeCode: Joi.string().max(100).required(),
      purposeDescription: Joi.string().max(1000).required(),
      version: Joi.string().max(50).required(),
      granted: Joi.boolean().default(true),
      captureMethod: Joi.string().max(50).optional(),
      sourceIp: Joi.string().max(64).optional(),
    }).optional(),
  }),
};

const compliance = {
  kyc: Joi.object({
    clientId: uuid.required(),
    method: Joi.string().max(100).required(),
    provider: Joi.string().max(150).optional(),
  }),
  consent: Joi.object({
    clientId: uuid.required(),
    purposeCode: Joi.string().max(100).required(),
    purposeDescription: Joi.string().max(1000).required(),
    version: Joi.string().max(50).required(),
    granted: Joi.boolean().default(true),
    captureMethod: Joi.string().max(50).optional(),
    evidenceDocumentId: uuid.optional(),
  }),
  verifyIdentity: Joi.object({
    clientId: uuid.required(),
    // ID number is sensitive; accepted for the verification call, never persisted in plaintext.
    idNumber: Joi.string().max(64).optional(),
    firstName: Joi.string().max(100).optional(),
    surname: Joi.string().max(100).optional(),
  }),
};

const workflow = {
  start: Joi.object({
    entityType: Joi.string().max(100).required(),
    entityId: uuid.required(),
    clientId: uuid.optional(),
    assignedUserId: uuid.optional(),
    title: Joi.string().max(250).optional(),
  }),
  submitApproval: Joi.object({
    clientId: uuid.optional(),
    submissionType: Joi.string().max(100).required(),
    snapshot: Joi.object().unknown(true).default({}),
  }),
  decision: Joi.object({
    reason: Joi.string().max(1000).optional(),
    adviserEdits: Joi.object().unknown(true).optional(),
  }),
};

const medical = {
  submit: Joi.object({
    clientId: uuid.required(),
    questionnaireVersion: Joi.string().max(50).required(),
    // The 18-point intake is an arbitrary object; it is encrypted whole and never stored plaintext.
    answers: Joi.object().unknown(true).required(),
    status: Joi.string().valid('draft', 'submitted').default('submitted'),
  }),
  update: Joi.object({
    answers: Joi.object().unknown(true).optional(),
    status: Joi.string().valid('draft', 'submitted', 'reviewed').optional(),
  }).min(1),
};

const koisa = {
  chat: Joi.object({
    message: Joi.string().min(1).max(4000).required(),
  }),
};

module.exports = {
  auth, client, financial, policy, claim, document, compliance, workflow, medical, koisa,
  goal, reminder, serviceRequest,
};
