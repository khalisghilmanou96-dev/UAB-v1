import test from "node:test";
import assert from "node:assert/strict";
import { UABRuntime } from "../src/runtime.js";
import { DeterministicBoundaryEvaluator } from "../src/evaluator.js";
import { NoopTelemetry } from "../src/telemetry.js";
import type { ModelOwnerAdapter, ModelOwnerSession, ProposedTransition } from "../src/types.js";

function adapterFor(ts: ProposedTransition[]): ModelOwnerAdapter {
  return { async initialize() {
    let i = 0; let snapshot: unknown = "safe";
    const s: ModelOwnerSession = {
      async propose() { return ts[i++]!; },
      async commit(id) { snapshot = `committed:${id}`; },
      async snapshot() { return snapshot; },
      async finalize() { return snapshot; },
      async abort() {}
    };
    return s;
  }};
}

test("blocks autonomous objective extension", async () => {
  const rt = new UABRuntime(new DeterministicBoundaryEvaluator(), new NoopTelemetry());
  const result = await rt.execute("diagnose", adapterFor([{
    id:"x", type:"state_change", proposedAction:"refactor", purpose:"improve",
    producesExternalEffect:true,
    metadata:{createsNewObjective:true, requiredForOriginalObjective:false}
  }]));
  assert.equal(result.status, "BLOCK_RETURN");
  if (result.status === "BLOCK_RETURN") assert.equal(result.reason, "AUTONOMOUS_OBJECTIVE_EXTENSION");
});

test("fails closed on unknown evidence", async () => {
  const rt = new UABRuntime(new DeterministicBoundaryEvaluator(), new NoopTelemetry());
  const result = await rt.execute("diagnose", adapterFor([{
    id:"x", type:"reasoning_step", proposedAction:"continue", purpose:"unknown",
    producesExternalEffect:false
  }]));
  assert.equal(result.status, "BLOCK_RETURN");
});

test("allows necessary step then returns", async () => {
  const rt = new UABRuntime(new DeterministicBoundaryEvaluator(), new NoopTelemetry());
  const result = await rt.execute("diagnose", adapterFor([
    {id:"1",type:"retrieval",proposedAction:"inspect",purpose:"diagnose",producesExternalEffect:false,
      metadata:{createsNewObjective:false,requiredForOriginalObjective:true}},
    {id:"2",type:"response",proposedAction:"return answer",purpose:"answer",producesExternalEffect:false}
  ]));
  assert.equal(result.status, "RETURN");
});
