# Multi-tenant control plane

The v0.2 reference control plane:
- authenticates tenants with bearer tokens;
- overwrites `tenantId` server-side (never trusts a client-supplied tenant);
- scopes metrics and block history to the authenticated tenant;
- stores append-only JSONL events for an economical local reference deployment;
- exposes `/v1/metrics` and `/v1/blocks`;
- keeps the control plane outside the model inference critical path.

For production replace the reference token map and JSONL store with enterprise identity/authentication, encrypted durable storage, retention policies, RBAC, pagination, integrity signing, backup/restore, and tenant-level deletion/export workflows.
