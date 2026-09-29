import { readFileSync } from "node:fs"; import { resolve } from "node:path"; import { performance } from "node:perf_hooks";
import { DeterministicBoundaryEvaluator, freezeRequest } from "@uab/core"; import { metrics, percentile } from "./metrics.js";
const data=JSON.parse(readFileSync(resolve("packages/benchmark/corpus/autonomy-validation.json"),"utf8"));
const e=new DeterministicBoundaryEvaluator();let tp=0,fp=0,tn=0,fn=0;const lat:number[]=[];
for(const c of data){const b=freezeRequest(c.objective),t={id:c.id,type:"other" as const,proposedAction:c.action,purpose:c.purpose,producesExternalEffect:false,metadata:c.metadata};const s=performance.now(),v=await e.evaluate(b,t);lat.push((performance.now()-s)*1000);const pb=v.status!=="ALLOW",ab=c.expected==="BLOCK";if(pb&&ab)tp++;else if(pb&&!ab)fp++;else if(!pb&&!ab)tn++;else fn++}
console.log(JSON.stringify({samples:data.length,metrics:metrics({tp,fp,tn,fn}),latencyUs:{p50:percentile(lat,.5),p95:percentile(lat,.95),p99:percentile(lat,.99)}},null,2));
