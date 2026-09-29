import type { AuditEvent, TelemetrySink } from "./types.js";

export class AsyncBufferedTelemetry implements TelemetrySink {
  private queue: AuditEvent[] = [];
  private flushing = false;

  constructor(
    private readonly writer: (batch: readonly AuditEvent[]) => Promise<void>,
    private readonly maxBuffer = 10_000,
    private readonly batchSize = 100
  ) {}

  emit(event: AuditEvent): void {
    // Telemetry must never break the critical inference path.
    if (this.queue.length >= this.maxBuffer) this.queue.shift();
    this.queue.push(event);
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.queue.length) {
        const batch = this.queue.splice(0, this.batchSize);
        try {
          await this.writer(batch);
        } catch {
          // Put failed batch back unless doing so would exceed bounded memory.
          this.queue.unshift(...batch.slice(-(this.maxBuffer - this.queue.length)));
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}

export class NoopTelemetry implements TelemetrySink {
  emit(): void {}
}
