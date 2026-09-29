# Independent semantic evaluator

UAB v0.2 adds `SemanticJudge` and `IndependentSemanticEvaluator`.

The guarded model must not be the authority deciding whether its own new objective is legitimate. The injected judge should be operationally independent: a deterministic classifier, specialist model, rules engine, or isolated service.

The recommended production configuration is `HybridBoundaryEvaluator`:
1. deterministic evidence handles obvious cases cheaply;
2. only unresolved transitions invoke semantic evaluation;
3. confidence below threshold becomes `UNKNOWN`;
4. `UNKNOWN` is fail-closed by the runtime.

This reduces cost and latency while keeping ambiguous transitions from silently passing.
