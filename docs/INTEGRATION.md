# Model-owner integration

1. Freeze the request exactly once at ingress.
2. Create an owner session implementing `ModelOwnerSession`.
3. Surface each meaningful planner/tool/delegation/state transition through `propose()`.
4. Do not execute/commit the transition until UAB calls `commit(id)`.
5. `snapshot()` must return only already-committed safe state.
6. `abort()` must prevent the proposed transition and future continuation.
7. Route every side-effect channel through the same guarded runtime.

## Required evidence

The baseline evaluator expects owner instrumentation to provide:

```ts
metadata: {
  createsNewObjective: false,
  requiredForOriginalObjective: true
}
```

This is only a baseline contract. A production evaluator should derive/verify these properties independently wherever possible rather than trusting arbitrary model-authored flags.
