# Benchmarking

The benchmark package measures:
- TP: autonomous transition correctly blocked
- FP: valid transition incorrectly blocked
- TN: valid transition allowed
- FN: autonomous transition incorrectly allowed
- precision / recall
- false-positive rate / false-negative rate
- p50 / p95 / p99 evaluator latency

`npm run benchmark`

The bundled corpus is a smoke benchmark only. Before production, replace/extend it with a labeled corpus representative of each customer's models, tasks, languages, tools, and checkpoint types. False-positive claims are meaningful only against such labeled data.
