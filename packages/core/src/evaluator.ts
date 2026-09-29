import type {
  BoundaryEvaluator, ProposedTransition, RequestBoundary, SemanticJudge, Verdict
} from "./types.js";

export class DeterministicBoundaryEvaluator implements BoundaryEvaluator {
  readonly version = "deterministic-2";
  readonly policyId = "no-objective-drift";

  async evaluate(_boundary: RequestBoundary, t: ProposedTransition): Promise<Verdict> {
    const m = t.metadata ?? {};
    const creates = m["createsNewObjective"];
    const required = m["requiredForOriginalObjective"];

    if (creates === true) return this.block("AUTONOMOUS_OBJECTIVE_EXTENSION");
    if (required === false) return this.block("OUTSIDE_ORIGINAL_OBJECTIVE");
    if (creates === false && required === true) return this.allow("NECESSARY_FOR_ORIGINAL_OBJECTIVE");
    return this.unknown("INSUFFICIENT_BOUNDARY_EVIDENCE");
  }

  private allow(reason: string): Verdict {
    return { status:"ALLOW", reason, policyId:this.policyId, evaluatorVersion:this.version, confidence:1 };
  }
  private block(reason: string): Verdict {
    return { status:"BLOCK", reason, policyId:this.policyId, evaluatorVersion:this.version, confidence:1 };
  }
  private unknown(reason: string): Verdict {
    return { status:"UNKNOWN", reason, policyId:this.policyId, evaluatorVersion:this.version };
  }
}

/**
 * Independent semantic evaluator.
 * The semantic judge is injected by the model owner and MUST be operationally
 * independent from the guarded model/session. It can be a classifier, rules engine,
 * compact specialist model, or remote service.
 */
export class IndependentSemanticEvaluator implements BoundaryEvaluator {
  readonly policyId = "semantic-no-objective-drift";

  constructor(
    private readonly judge: SemanticJudge,
    private readonly minConfidence = 0.90
  ) {}

  async evaluate(boundary: RequestBoundary, transition: ProposedTransition): Promise<Verdict> {
    let a;
    try {
      a = await this.judge.assess(boundary, transition);
    } catch {
      return {
        status:"UNKNOWN", reason:"SEMANTIC_JUDGE_FAILURE",
        policyId:this.policyId, evaluatorVersion:`${this.judge.id}@${this.judge.version}`
      };
    }
    const version = `${this.judge.id}@${this.judge.version}`;
    if (!Number.isFinite(a.confidence) || a.confidence < this.minConfidence) {
      return {
        status:"UNKNOWN", reason:"SEMANTIC_CONFIDENCE_BELOW_THRESHOLD",
        policyId:this.policyId, evaluatorVersion:version, confidence:a.confidence
      };
    }
    if (a.relation === "NECESSARY") {
      return {status:"ALLOW", reason:a.reasonCode, policyId:this.policyId, evaluatorVersion:version, confidence:a.confidence};
    }
    if (a.relation === "OBJECTIVE_EXTENSION" || a.relation === "UNNECESSARY") {
      return {status:"BLOCK", reason:a.reasonCode, policyId:this.policyId, evaluatorVersion:version, confidence:a.confidence};
    }
    return {status:"UNKNOWN", reason:a.reasonCode, policyId:this.policyId, evaluatorVersion:version, confidence:a.confidence};
  }
}

/**
 * Cheap-first hybrid: deterministic evidence decides obvious cases; semantic
 * evaluation is invoked only when deterministic evidence is insufficient.
 */
export class HybridBoundaryEvaluator implements BoundaryEvaluator {
  constructor(
    private readonly deterministic: BoundaryEvaluator,
    private readonly semantic: BoundaryEvaluator
  ) {}

  async evaluate(boundary: RequestBoundary, transition: ProposedTransition): Promise<Verdict> {
    const first = await this.deterministic.evaluate(boundary, transition);
    if (first.status !== "UNKNOWN") return first;
    return this.semantic.evaluate(boundary, transition);
  }
}
