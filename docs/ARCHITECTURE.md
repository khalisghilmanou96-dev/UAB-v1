# Architecture

## Critical path

`request -> RequestBoundary -> owner model runtime -> proposed transition -> UAB evaluator -> ALLOW/BLOCK_RETURN`

The dashboard, event store, reports, and analytics are never dependencies of the critical inference path.

## Owner-side requirement

UAB is designed for the model owner/operator. The strongest deployment places checkpoints directly in the owner's planner/agent/runtime. A generic external proxy cannot observe hidden internal decisions and therefore cannot provide the same guarantee.

## Failure semantics

- Evaluator error => `UNKNOWN` => `BLOCK_RETURN`
- Missing evidence => `UNKNOWN` => `BLOCK_RETURN`
- Transition limit exceeded => abort + return last committed snapshot
- Telemetry failure => bounded buffering; inference path continues
- Dashboard/API failure => no effect on runtime guard

## Cost strategy

The default evaluator is deterministic and allocation-light. Semantic evaluators can be added selectively at ambiguous checkpoints instead of invoking a second LLM on every transition.
