export interface UABExecutionLimits {
  maxTransitions: number;
  executionTimeoutMs: number;
  maxRequestBytes: number;
  maxSnapshotBytes: number;
}

export interface UABEvaluationLimits {
  semanticMinConfidence: number;
  evaluatorTimeoutMs: number;
  maxTransitionMetadataBytes: number;
  failClosed: boolean;
}

export interface UABAlertLimits {
  driftRate: number;
  blocksPerMinute: number;
}

export interface UABPolicyConfig {
  policyId: string;
  policyVersion: string;
  execution: UABExecutionLimits;
  evaluation: UABEvaluationLimits;
  alerts: UABAlertLimits;
}

export const DEFAULT_UAB_POLICY: Readonly<UABPolicyConfig> = Object.freeze({
  policyId: "no-objective-drift",
  policyVersion: "baseline-1",

  execution: Object.freeze({
    maxTransitions: 1000,
    executionTimeoutMs: 300000,
    maxRequestBytes: 1024 * 1024,
    maxSnapshotBytes: 4 * 1024 * 1024
  }),

  evaluation: Object.freeze({
    semanticMinConfidence: 0.90,
    evaluatorTimeoutMs: 5000,
    maxTransitionMetadataBytes: 64 * 1024,
    failClosed: true
  }),

  alerts: Object.freeze({
    driftRate: 0.01,
    blocksPerMinute: 100
  })
});

function assertInteger(
  name: string,
  value: number,
  min: number,
  max: number
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`UAB_INVALID_LIMIT:${name}`);
  }
}

function assertNumber(
  name: string,
  value: number,
  min: number,
  max: number
): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`UAB_INVALID_LIMIT:${name}`);
  }
}

export function createUABPolicyConfig(
  input: Partial<UABPolicyConfig> & {
    execution?: Partial<UABExecutionLimits>;
    evaluation?: Partial<UABEvaluationLimits>;
    alerts?: Partial<UABAlertLimits>;
  } = {}
): Readonly<UABPolicyConfig> {
  const execution = {
    ...DEFAULT_UAB_POLICY.execution,
    ...input.execution
  };

  const evaluation = {
    ...DEFAULT_UAB_POLICY.evaluation,
    ...input.evaluation
  };

  const alerts = {
    ...DEFAULT_UAB_POLICY.alerts,
    ...input.alerts
  };

  assertInteger(
    "maxTransitions",
    execution.maxTransitions,
    1,
    100000
  );

  assertInteger(
    "executionTimeoutMs",
    execution.executionTimeoutMs,
    100,
    3600000
  );

  assertInteger(
    "maxRequestBytes",
    execution.maxRequestBytes,
    1024,
    16 * 1024 * 1024
  );

  assertInteger(
    "maxSnapshotBytes",
    execution.maxSnapshotBytes,
    64 * 1024,
    64 * 1024 * 1024
  );

  assertNumber(
    "semanticMinConfidence",
    evaluation.semanticMinConfidence,
    0,
    1
  );

  assertInteger(
    "evaluatorTimeoutMs",
    evaluation.evaluatorTimeoutMs,
    10,
    120000
  );

  assertInteger(
    "maxTransitionMetadataBytes",
    evaluation.maxTransitionMetadataBytes,
    1024,
    4 * 1024 * 1024
  );

  if (evaluation.failClosed !== true) {
    throw new Error("UAB_FAIL_CLOSED_REQUIRED");
  }

  assertNumber(
    "driftRate",
    alerts.driftRate,
    0,
    1
  );

  assertInteger(
    "blocksPerMinute",
    alerts.blocksPerMinute,
    1,
    100000
  );

  return Object.freeze({
    policyId: input.policyId ?? DEFAULT_UAB_POLICY.policyId,
    policyVersion: input.policyVersion ?? DEFAULT_UAB_POLICY.policyVersion,
    execution: Object.freeze(execution),
    evaluation: Object.freeze(evaluation),
    alerts: Object.freeze(alerts)
  });
}
