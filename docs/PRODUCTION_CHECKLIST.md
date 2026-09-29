# Production checklist

- Replace all demo secrets and credentials
- Enable TLS and `UAB_COOKIE_SECURE=true`
- Replace local demo auth with SSO/IdP
- Implement PostgreSQL or ClickHouse EventStore
- Encrypt data at rest and in transit
- Store signing/session keys in KMS/secret manager and define rotation
- Add CSRF protection for state-changing browser admin actions
- Add CSP/security headers and reverse-proxy limits
- Add immutable policy registry + signed policy versions
- Validate retention/export/deletion requirements
- Run corpus benchmark per model/version/task/language
- Establish acceptable FP/FN thresholds before enforcement
- Run load, soak and chaos tests in staging
- Independent security review / penetration test
- Backup/restore and disaster recovery exercise
- Monitor guard latency and availability separately from dashboard availability
