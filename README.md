# UAB — Universal Autonomy Boundary v0.3.1

B2B owner-side autonomy boundary for model runtimes. UAB freezes the user objective, gates observable owner-runtime transitions before commit, blocks objective drift, preserves the last committed safe result, and emits auditable telemetry.

**Scope:** UAB controls checkpoints exposed by the model owner. It does not claim access to hidden chain-of-thought.

## v0.3

- Dashboard login with demo credentials controlled through `.env`
- Signed HttpOnly sessions
- RBAC: admin / auditor / viewer
- Server-owned tenant scoping
- HMAC-SHA256 event signing; separate policy-signing key
- PostgreSQL and ClickHouse production schemas/strategy
- Retention controls
- Drift-rate webhook alerting
- 1,000-case reproducible labeled autonomy corpus
- Confusion-matrix / false-positive benchmark
- 100k-evaluation load harness
- fail-closed chaos test
- production-hardening checklist

## Start

```bash
cp .env.example .env
# edit .env
npm install
npm run build
npm test
npm run corpus
npm run load
npm run chaos
set -a; source .env; set +a
npm run api
```

Open `http://localhost:8787`.

Default demo admin credentials are in `.env.example` and are intentionally changeable through environment variables. Change all demo credentials/secrets before any non-local deployment.

## Storage

The dependency-light reference runtime starts with in-memory storage. PostgreSQL is the recommended default production store; ClickHouse is intended for very high telemetry volumes. See `docs/STORAGE.md`.

## Commercialization gate

Do not infer a production false-positive rate from the synthetic corpus alone. Before commercial enforcement, build labeled corpora from representative customer workloads, models, languages, tool types and checkpoint categories, then establish explicit FP/FN and latency acceptance thresholds.

## Validation status

Dashboard HTML/CSS static validation: PASS.

TypeScript build and automated validation completed successfully for v0.3.1: 11 core tests passed, 2 benchmark tests passed, and the fail-closed chaos test passed. These results validate the included test suite only and do not constitute proof of production safety or real-world performance.
