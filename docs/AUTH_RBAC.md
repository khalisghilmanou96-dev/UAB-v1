# Authentication / RBAC

Reference roles:
- `viewer`: metrics and BLOCK_RETURN history
- `auditor`: viewer permissions + telemetry ingestion
- `admin`: auditor permissions + retention/admin operations

The dashboard uses an HttpOnly, SameSite=Strict signed session cookie. Demo users are configured exclusively through environment variables.

For production, replace demo local credentials with enterprise SSO/OIDC/SAML through the customer's IdP. Keep authorization tenant-scoped server-side. Never trust tenant IDs supplied by the browser/client.
