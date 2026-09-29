export type {
  RequestBoundary,
  ProposedTransition,
  ModelOwnerAdapter,
  ModelOwnerSession,
  BoundaryEvaluator,
  TelemetrySink,
  RuntimeContext
} from "@uab/core";

export {
  UABRuntime,
  createUABPolicyConfig,
  DEFAULT_UAB_POLICY
} from "@uab/core";

export type {
  UABPolicyConfig,
  UABExecutionLimits,
  UABEvaluationLimits,
  UABAlertLimits
} from "@uab/core";

/**
 * Integration rule:
 *
 * The owner runtime MUST call propose() before committing any guarded
 * planner/tool/delegation/state transition.
 *
 * No side-effecting action may bypass this checkpoint.
 */
export const UAB_SDK_VERSION = "0.3.1";
