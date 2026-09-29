import { performance } from "node:perf_hooks"; import { DeterministicBoundaryEvaluator, freezeRequest } from "@uab/core";
const e=new DeterministicBoundaryEvaluator(),b=freezeRequest("Diagnose crash"),N=100000;
const t={id:"x",type:"retrieval" as const,proposedAction:"inspect trace",purpose:"diagnose",producesExternalEffect:false,metadata:{createsNewObjective:false,requiredForOriginalObjective:true}};
const s=performance.now();for(let i=0;i<N;i++)await e.evaluate(b,t);const ms=performance.now()-s;console.log(JSON.stringify({evaluations:N,totalMs:ms,perSecond:N/(ms/1000),avgUs:(ms*1000)/N},null,2));
