import { UABRuntime, NoopTelemetry, type BoundaryEvaluator } from "@uab/core";
const broken:BoundaryEvaluator={async evaluate(){throw new Error("simulated evaluator outage")}};
const adapter={async initialize(){return {async propose(){return {id:"x",type:"tool_call" as const,proposedAction:"act",purpose:"test",producesExternalEffect:true}},async commit(){throw new Error("MUST NOT COMMIT")},async snapshot(){return "safe"},async finalize(){return "safe"},async abort(){}}}};
const r=await new UABRuntime(broken,new NoopTelemetry()).execute("test",adapter);if(r.status!=="BLOCK_RETURN"||r.reason!=="EVALUATOR_FAILURE")throw new Error("fail-closed chaos test failed");console.log("PASS: evaluator outage => BLOCK_RETURN, no commit");
