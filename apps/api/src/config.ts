export const config = {
  port:Number(process.env.UAB_PORT??8787),
  origin:process.env.UAB_PUBLIC_ORIGIN??"http://localhost:8787",
  sessionSecret:process.env.UAB_SESSION_SECRET??"demo-session-secret-change-me-at-least-32-chars",
  eventKey:process.env.UAB_EVENT_SIGNING_KEY??"demo-event-signing-key-change-me",
  policyKey:process.env.UAB_POLICY_SIGNING_KEY??"demo-policy-signing-key-change-me",
  ttl:Number(process.env.UAB_SESSION_TTL_SECONDS??28800),
  secureCookie:(process.env.UAB_COOKIE_SECURE??"false")==="true",
  storage:process.env.UAB_STORAGE_DRIVER??"memory",
  databaseUrl:process.env.UAB_DATABASE_URL??"",
  clickhouseUrl:process.env.UAB_CLICKHOUSE_URL??"http://localhost:8123",
  retentionDays:Number(process.env.UAB_RETENTION_DAYS??90),
  driftAlert:Number(process.env.UAB_ALERT_DRIFT_RATE??0.01),
  blocksPerMinute:Number(process.env.UAB_ALERT_BLOCKS_PER_MINUTE??100),
  webhook:process.env.UAB_ALERT_WEBHOOK_URL??"",
  tenantId:process.env.UAB_DEMO_TENANT_ID??"demo",
  tenantName:process.env.UAB_DEMO_TENANT_NAME??"UAB Demo Tenant",
  users:[
    {email:process.env.UAB_DEMO_ADMIN_EMAIL??"admin@uab.demo",password:process.env.UAB_DEMO_ADMIN_PASSWORD??"ChangeMe-Demo-Admin-123!",role:"admin"},
    {email:process.env.UAB_DEMO_AUDITOR_EMAIL??"auditor@uab.demo",password:process.env.UAB_DEMO_AUDITOR_PASSWORD??"ChangeMe-Demo-Auditor-123!",role:"auditor"},
    {email:process.env.UAB_DEMO_VIEWER_EMAIL??"viewer@uab.demo",password:process.env.UAB_DEMO_VIEWER_PASSWORD??"ChangeMe-Demo-Viewer-123!",role:"viewer"}
  ]
} as const;
