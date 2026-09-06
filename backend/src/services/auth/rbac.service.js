'use strict';

/**
 * Role-Based Access Control: the permission catalogue and the role → permissions matrix.
 *
 * A particularly important rule (per the blueprint): CLIENT_READ does NOT imply
 * MEDICAL_READ or BANKING_READ. Medical and banking are separate, more restricted domains.
 */

const PERMISSIONS = Object.freeze({
  CLIENT_READ: 'CLIENT_READ',
  CLIENT_UPDATE: 'CLIENT_UPDATE',
  CLIENT_READ_SELF: 'CLIENT_READ_SELF',
  CLIENT_UPDATE_SELF: 'CLIENT_UPDATE_SELF',
  FINANCIAL_READ: 'FINANCIAL_READ',
  FINANCIAL_WRITE: 'FINANCIAL_WRITE',
  BANKING_READ: 'BANKING_READ',
  BANKING_WRITE: 'BANKING_WRITE',
  MEDICAL_READ: 'MEDICAL_READ',
  MEDICAL_WRITE: 'MEDICAL_WRITE',
  CLAIMS_READ: 'CLAIMS_READ',
  CLAIMS_WRITE: 'CLAIMS_WRITE',
  COMPLIANCE_READ: 'COMPLIANCE_READ',
  COMPLIANCE_WRITE: 'COMPLIANCE_WRITE',
  DOCUMENT_READ: 'DOCUMENT_READ',
  DOCUMENT_WRITE: 'DOCUMENT_WRITE',
  AUDIT_READ: 'AUDIT_READ',
  USER_ADMIN: 'USER_ADMIN',
  ROLE_ADMIN: 'ROLE_ADMIN',
  PROVIDER_ADMIN: 'PROVIDER_ADMIN',
  INTEGRATION_EXECUTE: 'INTEGRATION_EXECUTE',
});

const P = PERMISSIONS;

const ROLE_PERMISSIONS = Object.freeze({
  PLATFORM_ADMIN: Object.values(PERMISSIONS), // everything

  COMPLIANCE_OFFICER: [
    P.CLIENT_READ, P.FINANCIAL_READ, P.CLAIMS_READ,
    P.COMPLIANCE_READ, P.COMPLIANCE_WRITE,
    P.DOCUMENT_READ, P.DOCUMENT_WRITE, P.AUDIT_READ,
  ],

  ADVISER: [
    P.CLIENT_READ, P.CLIENT_UPDATE,
    P.FINANCIAL_READ, P.FINANCIAL_WRITE,
    P.CLAIMS_READ, P.CLAIMS_WRITE,
    P.COMPLIANCE_READ,
    P.DOCUMENT_READ, P.DOCUMENT_WRITE,
    P.INTEGRATION_EXECUTE,
    // Note: MEDICAL_* and BANKING_* are deliberately NOT granted by default;
    // they are conditional and assigned explicitly per compliance policy.
  ],

  ADVISER_ASSISTANT: [
    P.CLIENT_READ, P.FINANCIAL_READ, P.CLAIMS_READ, P.DOCUMENT_READ,
  ],

  CLIENT: [
    P.CLIENT_READ_SELF, P.CLIENT_UPDATE_SELF,
    P.FINANCIAL_READ,
    P.CLAIMS_READ,
    P.DOCUMENT_READ,
  ],

  PROVIDER_SERVICE: [
    P.CLAIMS_READ, P.CLAIMS_WRITE, P.INTEGRATION_EXECUTE,
  ],
});

/** Resolve the flat permission set for a list of role codes. */
function permissionsForRoles(roleCodes = []) {
  const set = new Set();
  for (const code of roleCodes) {
    const perms = ROLE_PERMISSIONS[code] || [];
    perms.forEach((p) => set.add(p));
  }
  return set;
}

/** Does the principal (roles) hold the given permission? */
function can(roleCodes, permission) {
  return permissionsForRoles(roleCodes).has(permission);
}

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, permissionsForRoles, can };
