import test from "node:test";
import assert from "node:assert/strict";
import { IndependentSemanticEvaluator, HybridBoundaryEvaluator, DeterministicBoundaryEvaluator } from "../src/evaluator.js";
import { freezeRequest } from "../src/hash.js";
import type { SemanticJudge } from "../src/types.js";

const boundary = freezeRequest("Diagnose the crash");
const transition = {id:"1",type:"reasoning_step" as const,proposedAction:"inspect dependency",purpose:"diagnose",producesExternalEffect:false};

test("semantic evaluator allows confident necessary transition", async () => {
  const judge: SemanticJudge = {id:"test",version:"1",async assess(){return {relation:"NECESSARY",confidence:.99,reasonCode:"SEMANTIC_NECESSARY"}}};
  const v = await new IndependentSemanticEvaluator(judge).evaluate(boundary, transition);
  assert.equal(v.status, "ALLOW");
});

test("semantic evaluator fails closed on low confidence", async () => {
  const judge: SemanticJudge = {id:"test",version:"1",async assess(){return {relation:"NECESSARY",confidence:.5,reasonCode:"LOW"}}};
  const v = await new IndependentSemanticEvaluator(judge,.9).evaluate(boundary, transition);
  assert.equal(v.status, "UNKNOWN");
});

test("hybrid calls semantic only when deterministic is unknown", async () => {
  let calls=0;
  const judge: SemanticJudge = {id:"test",version:"1",async assess(){calls++;return {relation:"NECESSARY",confidence:.99,reasonCode:"OK"}}};
  const h = new HybridBoundaryEvaluator(new DeterministicBoundaryEvaluator(), new IndependentSemanticEvaluator(judge));
  const v = await h.evaluate(boundary, transition);
  assert.equal(v.status,"ALLOW");
  assert.equal(calls,1);
});
