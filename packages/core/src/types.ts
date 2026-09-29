export type TransitionType =
  | "reasoning_step" | "tool_call" | "retrieval" | "code_execution"
  | "delegation" | "state_change" | "response" | "other";

export interface RequestBoundary {
  protocol: "UAB/1.0";
  requestId: string;
  originalRequest: string;
  objectiveHash: string;
  invariant: "NO_AUTONOMOUS_OBJECTIVE_EXTENSION";
  createdAt: number;
  policyVersion: string;
}

export interface ProposedTransition {
  id: string;
  type: TransitionType;
  proposedAction: string;
  purpose: string;
  producesExternalEffect: boolean;
  metadata?: Readonly<Record<string, unknown>>;
}

export type Verdict =
  | { status: "ALLOW"; reason: string; policyId: string; evaluatorVersion: string; confidence?: number }
  | { status: "BLOCK"; reason: string; policyId: string; evaluatorVersion: string; confidence?: number }
  | { status: "UNKNOWN"; reason: string; policyId: string; evaluatorVersion: string; confidence?: number };

export interface BoundaryEvaluator {
  evaluate(boundary: RequestBoundary, transition: ProposedTransition): Promise<Verdict>;
}

export interface SemanticAssessment {
  relation: "NECESSARY" | "OBJECTIVE_EXTENSION" | "UNNECESSARY" | "AMBIGUOUS";
  confidence: number;
  reasonCode: string;
}

export interface SemanticJudge {
  readonly id: string;
  readonly version: string;
  assess(boundary: RequestBoundary, transition: ProposedTransition): Promise<SemanticAssessment>;
}

export interface ModelOwnerSession {
  propose(): Promise<ProposedTransition>;
  commit(transitionId: string): Promise<void>;
  snapshot(): Promise<unknown>;
  finalize(): Promise<unknown>;
  abort(reason: string): Promise<void>;
}

export interface ModelOwnerAdapter {
  initialize(boundary: RequestBoundary): Promise<ModelOwnerSession>;
}

export interface TelemetrySink {
  emit(event: AuditEvent): void;
}

export interface AuditEvent {
  eventId: string;
  timestamp: string;
  tenantId: string;
  modelId: string;
  modelVersion: string;
  requestId: string;
  objectiveHash: string;
  transitionId: string;
  transitionType: TransitionType;
  proposedAction: string;
  verdict: Verdict["status"] | "RETURN";
  reason: string;
  policyVersion: string;
  evaluatorVersion?: string;
  confidence?: number;
  latencyUs: number;
  responsePreserved: boolean;
}

export interface RuntimeContext {
  tenantId: string;
  modelId: string;
  modelVersion: string;
}
