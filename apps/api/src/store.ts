export type EventRow=Record<string,any>;
export interface EventStore {
  append(rows:EventRow[]):Promise<void>;
  list(tenantId:string, onlyBlocks:boolean, limit:number):Promise<EventRow[]>;
  all(tenantId:string):Promise<EventRow[]>;
  retain(days:number):Promise<number>;
}
export class MemoryStore implements EventStore{
  private rows:EventRow[]=[];
  async append(rows:EventRow[]){this.rows.push(...rows);if(this.rows.length>250000)this.rows.splice(0,this.rows.length-250000)}
  async list(t:string,b:boolean,l:number){return this.rows.filter(x=>x.tenantId===t&&(!b||x.verdict==="BLOCK"||x.verdict==="UNKNOWN")).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp))).slice(0,l)}
  async all(t:string){return this.rows.filter(x=>x.tenantId===t)}
  async retain(days:number){const cut=Date.now()-days*86400000,n=this.rows.length;this.rows=this.rows.filter(x=>Date.parse(x.timestamp)>=cut);return n-this.rows.length}
}

/* Production SQL schemas. The reference server defaults to MemoryStore so the
   project remains dependency-light. Use these schemas with the adapters described
   in docs/STORAGE.md. */
export const POSTGRES_SCHEMA=`
CREATE TABLE IF NOT EXISTS uab_events(
 event_id text PRIMARY KEY, tenant_id text NOT NULL, timestamp timestamptz NOT NULL,
 model_id text NOT NULL, model_version text NOT NULL, request_id text NOT NULL,
 transition_id text NOT NULL, transition_type text NOT NULL, proposed_action text,
 verdict text NOT NULL, reason text NOT NULL, confidence double precision,
 latency_us bigint NOT NULL, signature text NOT NULL, payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS idx_uab_tenant_time ON uab_events(tenant_id,timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_uab_tenant_verdict ON uab_events(tenant_id,verdict,timestamp DESC);`;

export const CLICKHOUSE_SCHEMA=`
CREATE TABLE IF NOT EXISTS uab_events(
 event_id String, tenant_id LowCardinality(String), timestamp DateTime64(3),
 model_id LowCardinality(String), model_version String, request_id String,
 transition_id String, transition_type LowCardinality(String), proposed_action String,
 verdict LowCardinality(String), reason LowCardinality(String), confidence Nullable(Float64),
 latency_us UInt64, signature String, payload String)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id,timestamp,event_id);`;
