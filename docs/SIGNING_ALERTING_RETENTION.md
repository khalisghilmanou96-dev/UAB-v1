# Signing, alerts and retention

Events are HMAC-SHA256 signed server-side after the authenticated tenant is assigned. Policy signing uses a separate key by design. Rotate keys under a managed secret system in production.

Retention is controlled by `UAB_RETENTION_DAYS`; the reference service periodically removes expired in-memory records. Database deployments should implement retention natively (scheduled PostgreSQL deletion/partitioning or ClickHouse TTL).

Drift-rate alerts can be sent to `UAB_ALERT_WEBHOOK_URL`. Production alerting should add deduplication, cooldowns, retries/dead-letter handling and integrations such as PagerDuty/Slack/Teams.
