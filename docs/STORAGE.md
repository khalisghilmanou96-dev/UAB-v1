# Storage strategy

## PostgreSQL
Recommended for normal B2B deployments: transactional metadata, moderate/high event volume, simple operations. Schema is exported as `POSTGRES_SCHEMA` from `apps/api/src/store.ts`.

## ClickHouse
Recommended when autonomy telemetry becomes very large and analytical scans dominate. Schema is exported as `CLICKHOUSE_SCHEMA`.

The v0.3 reference server defaults to `memory` to remain zero-dependency and cheap. `UAB_STORAGE_DRIVER`, connection URLs and credentials are in `.env.example`. Production adapters should implement the `EventStore` interface and use parameterized queries, TLS, migrations, pooling and backups.
