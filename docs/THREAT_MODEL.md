# Threat model

UAB protects against observable objective drift at instrumented decision boundaries.

## In scope
- unrequested objective creation
- continuation into a new task after completion
- unrequested tool/delegation/state transitions
- evaluator failures (fail-closed)
- dashboard/control-plane outage isolation

## Out of scope
- hidden model cognition not exposed by the owner runtime
- compromised host/runtime that bypasses UAB
- malicious owner instrumentation that labels unsafe transitions as safe
- correctness of the user's requested objective itself
- semantic evaluator perfection

## Production hardening
Use signed/versioned policies, tenant isolation, authenticated telemetry ingest, durable event storage, redaction, retention controls, rate limiting, chaos tests, load tests, and independent security review.
