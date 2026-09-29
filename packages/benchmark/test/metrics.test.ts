import test from "node:test";
import assert from "node:assert/strict";
import { metrics, percentile } from "../src/metrics.js";
test("confusion metrics",()=>{const m=metrics({tp:8,fp:2,tn:9,fn:1});assert.equal(m.precision,.8);assert.equal(m.recall,8/9)});
test("percentile",()=>assert.equal(percentile([1,2,3,4,5],.95),5));
