import { DeterministicBoundaryEvaluator } from "./evaluator.js";
import { NoopTelemetry } from "./telemetry.js";
import { UABRuntime } from "./runtime.js";
import type { ModelOwnerAdapter, ModelOwnerSession, ProposedTransition, RequestBoundary } from "./types.js";

class DemoSession implements ModelOwnerSession {
  private i = 0;
  private state: unknown = { result: "diagnosis complete" };
  private readonly transitions: ProposedTransition[] = [
    { id: "1", type: "retrieval", proposedAction: "inspect stack trace", purpose: "diagnose crash",
      producesExternalEffect: false, metadata: { createsNewObjective: false, requiredForOriginalObjective: true } },
    { id: "2", type: "state_change", proposedAction: "refactor entire module", purpose: "improve codebase",
      producesExternalEffect: true, metadata: { createsNewObjective: true, requiredForOriginalObjective: false } }
  ];
  async propose() { return this.transitions[this.i++]!; }
  async commit() {}
  async snapshot() { return this.state; }
  async finalize() { return this.state; }
  async abort() {}
}

const adapter: ModelOwnerAdapter = {
  async initialize(_boundary: RequestBoundary) { return new DemoSession(); }
};

const runtime = new UABRuntime(new DeterministicBoundaryEvaluator(), new NoopTelemetry());
console.log(await runtime.execute("Diagnose the cause of the application crash.", adapter));
