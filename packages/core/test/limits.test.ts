import { test } from "node:test";
import assert from "node:assert/strict";
import { UABRuntime } from "../src/runtime.js";
import {
  createUABPolicyConfig,
  DEFAULT_UAB_POLICY
} from "../src/config.js";
import type {
  BoundaryEvaluator,
  ModelOwnerAdapter,
  ModelOwnerSession,
  ProposedTransition,
  RequestBoundary,
  TelemetrySink,
  Verdict,
  AuditEvent
} from "../src/types.js";

class TestTelemetry implements TelemetrySink {
  events: AuditEvent[] = [];

  emit(event: AuditEvent): void {
    this.events.push(event);
  }
}

class AllowEvaluator implements BoundaryEvaluator {
  async evaluate(
    _boundary: RequestBoundary,
    _transition: ProposedTransition
  ): Promise<Verdict> {
    return {
      status: "ALLOW",
      reason: "NECESSARY",
      policyId: "test",
      evaluatorVersion: "test"
    };
  }
}

class SlowEvaluator implements BoundaryEvaluator {
  async evaluate(
    _boundary: RequestBoundary,
    _transition: ProposedTransition
  ): Promise<Verdict> {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      status: "ALLOW",
      reason: "NECESSARY",
      policyId: "test",
      evaluatorVersion: "slow"
    };
  }
}

class TestSession implements ModelOwnerSession {
  commits = 0;
  aborts: string[] = [];
  private proposed = false;

  constructor(
    private readonly transition: ProposedTransition
  ) {}

  async propose(): Promise<ProposedTransition> {
    if (this.proposed) {
      return {
        id: "response",
        type: "response",
        proposedAction: "return",
        purpose: "return",
        producesExternalEffect: false
      };
    }

    this.proposed = true;
    return this.transition;
  }

  async commit(_transitionId: string): Promise<void> {
    this.commits++;
  }

  async snapshot(): Promise<unknown> {
    return { safe: true };
  }

  async finalize(): Promise<unknown> {
    return { ok: true };
  }

  async abort(reason: string): Promise<void> {
    this.aborts.push(reason);
  }
}

class TestAdapter implements ModelOwnerAdapter {
  constructor(
    private readonly session: ModelOwnerSession
  ) {}

  async initialize(
    _boundary: RequestBoundary
  ): Promise<ModelOwnerSession> {
    return this.session;
  }
}

function transition(
  overrides: Partial<ProposedTransition> = {}
): ProposedTransition {
  return {
    id: "t1",
    type: "tool_call",
    proposedAction: "test",
    purpose: "test",
    producesExternalEffect: false,
    ...overrides
  };
}

test("policy rejects invalid maxTransitions", () => {
  assert.throws(
    () =>
      createUABPolicyConfig({
        execution: {
          ...DEFAULT_UAB_POLICY.execution,
          maxTransitions: 0
        }
      }),
    /UAB_INVALID_LIMIT:maxTransitions/
  );
});

test("policy rejects fail-open configuration", () => {
  assert.throws(
    () =>
      createUABPolicyConfig({
        evaluation: {
          ...DEFAULT_UAB_POLICY.evaluation,
          failClosed: false
        }
      }),
    /UAB_FAIL_CLOSED_REQUIRED/
  );
});

test("runtime blocks oversized transition metadata", async () => {
  const telemetry = new TestTelemetry();

  const session = new TestSession(
    transition({
      metadata: {
        payload: "x".repeat(2048)
      }
    })
  );

  const policy = createUABPolicyConfig({
    evaluation: {
      ...DEFAULT_UAB_POLICY.evaluation,
      maxTransitionMetadataBytes: 1024
    }
  });

  const runtime = new UABRuntime(
    new AllowEvaluator(),
    telemetry,
    policy
  );

  const result = await runtime.execute(
    "test",
    new TestAdapter(session)
  );

  assert.equal(result.status, "BLOCK_RETURN");

  if (result.status === "BLOCK_RETURN") {
    assert.equal(
      result.reason,
      "TRANSITION_METADATA_TOO_LARGE"
    );
  }

  assert.equal(session.commits, 0);

  assert.deepEqual(
    session.aborts,
    ["TRANSITION_METADATA_TOO_LARGE"]
  );
});

test("runtime fails closed when evaluator exceeds timeout", async () => {
  const telemetry = new TestTelemetry();

  const session = new TestSession(
    transition()
  );

  const policy = createUABPolicyConfig({
    evaluation: {
      ...DEFAULT_UAB_POLICY.evaluation,
      evaluatorTimeoutMs: 10
    }
  });

  const runtime = new UABRuntime(
    new SlowEvaluator(),
    telemetry,
    policy
  );

  const result = await runtime.execute(
    "test",
    new TestAdapter(session)
  );

  assert.equal(result.status, "BLOCK_RETURN");

  if (result.status === "BLOCK_RETURN") {
    assert.equal(
      result.reason,
      "EVALUATOR_FAILURE"
    );
  }

  assert.equal(session.commits, 0);

  assert.deepEqual(
    session.aborts,
    ["EVALUATOR_FAILURE"]
  );
});

test("runtime enforces maxTransitions", async () => {
  class EndlessSession extends TestSession {
    constructor() {
      super(
        transition({
          id: "loop"
        })
      );
    }

    override async propose(): Promise<ProposedTransition> {
      return transition({
        id: "loop",
        type: "tool_call"
      });
    }
  }

  const telemetry = new TestTelemetry();
  const session = new EndlessSession();

  const policy = createUABPolicyConfig({
    execution: {
      ...DEFAULT_UAB_POLICY.execution,
      maxTransitions: 2
    }
  });

  const runtime = new UABRuntime(
    new AllowEvaluator(),
    telemetry,
    policy
  );

  const result = await runtime.execute(
    "test",
    new TestAdapter(session)
  );

  assert.equal(result.status, "BLOCK_RETURN");

  if (result.status === "BLOCK_RETURN") {
    assert.equal(
      result.reason,
      "MAX_TRANSITIONS_EXCEEDED"
    );
  }

  assert.equal(session.commits, 2);
});
