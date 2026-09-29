import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { freezeRequest } from "./hash.js";
import {
  createUABPolicyConfig,
  DEFAULT_UAB_POLICY,
  type UABPolicyConfig
} from "./config.js";
import type {
  AuditEvent,
  BoundaryEvaluator,
  ModelOwnerAdapter,
  ProposedTransition,
  RequestBoundary,
  RuntimeContext,
  TelemetrySink,
  Verdict
} from "./types.js";

export interface RunOptions {
  context?: Partial<RuntimeContext>;
}

export type RunResult =
  | {
      status: "RETURN";
      requestId: string;
      response: unknown;
    }
  | {
      status: "BLOCK_RETURN";
      requestId: string;
      response: unknown;
      reason: string;
      blockedTransition: string;
    };

export class UABRuntime {
  private readonly policy: Readonly<UABPolicyConfig>;

  constructor(
    private readonly evaluator: BoundaryEvaluator,
    private readonly telemetry: TelemetrySink,
    policy: UABPolicyConfig = DEFAULT_UAB_POLICY
  ) {
    this.policy = createUABPolicyConfig(policy);
  }

  async execute(
    request: string,
    adapter: ModelOwnerAdapter,
    options: RunOptions = {}
  ): Promise<RunResult> {
    if (
      Buffer.byteLength(request, "utf8") >
      this.policy.execution.maxRequestBytes
    ) {
      throw new Error("UAB_REQUEST_TOO_LARGE");
    }

    const boundary = freezeRequest(
      request,
      this.policy.policyVersion
    );

    const session = await adapter.initialize(boundary);

    const maxTransitions = this.policy.execution.maxTransitions;
    const deadline =
      performance.now() +
      this.policy.execution.executionTimeoutMs;

    const context: RuntimeContext = {
      tenantId: options.context?.tenantId ?? "default",
      modelId: options.context?.modelId ?? "unknown",
      modelVersion: options.context?.modelVersion ?? "unknown"
    };

    let safeSnapshot = await this.safeSnapshot(session);

    for (let i = 0; i < maxTransitions; i++) {
      if (performance.now() >= deadline) {
        await this.safeAbort(session, "EXECUTION_TIMEOUT");

        return {
          status: "BLOCK_RETURN",
          requestId: boundary.requestId,
          response: safeSnapshot,
          reason: "EXECUTION_TIMEOUT",
          blockedTransition: "runtime"
        };
      }

      let transition: ProposedTransition;

      try {
        transition = await this.withDeadline(
          session.propose(),
          deadline,
          "EXECUTION_TIMEOUT"
        );
      } catch {
        await this.safeAbort(session, "EXECUTION_TIMEOUT");

        return {
          status: "BLOCK_RETURN",
          requestId: boundary.requestId,
          response: safeSnapshot,
          reason: "EXECUTION_TIMEOUT",
          blockedTransition: "runtime"
        };
      }

      const metadataBytes = this.metadataSize(
        transition.metadata
      );

      if (
        metadataBytes >
        this.policy.evaluation.maxTransitionMetadataBytes
      ) {
        await this.safeAbort(
          session,
          "TRANSITION_METADATA_TOO_LARGE"
        );

        this.emit(
          boundary,
          transition,
          context,
          "BLOCK",
          "TRANSITION_METADATA_TOO_LARGE",
          "runtime-2",
          undefined,
          0,
          true
        );

        return {
          status: "BLOCK_RETURN",
          requestId: boundary.requestId,
          response: safeSnapshot,
          reason: "TRANSITION_METADATA_TOO_LARGE",
          blockedTransition: transition.id
        };
      }

      if (transition.type === "response") {
        try {
          await this.withDeadline(
            session.commit(transition.id),
            deadline,
            "EXECUTION_TIMEOUT"
          );

          const response = await this.withDeadline(
            session.finalize(),
            deadline,
            "EXECUTION_TIMEOUT"
          );

          const responseBytes = this.serializedSize(response);

          if (
            responseBytes >
            this.policy.execution.maxSnapshotBytes
          ) {
            await this.safeAbort(
              session,
              "SNAPSHOT_TOO_LARGE"
            );

            this.emit(
              boundary,
              transition,
              context,
              "BLOCK",
              "SNAPSHOT_TOO_LARGE",
              "runtime-2",
              undefined,
              0,
              true
            );

            return {
              status: "BLOCK_RETURN",
              requestId: boundary.requestId,
              response: safeSnapshot,
              reason: "SNAPSHOT_TOO_LARGE",
              blockedTransition: transition.id
            };
          }

          this.emit(
            boundary,
            transition,
            context,
            "RETURN",
            "FINAL_RESPONSE",
            "runtime-2",
            undefined,
            0,
            true
          );

          return {
            status: "RETURN",
            requestId: boundary.requestId,
            response
          };
        } catch {
          await this.safeAbort(
            session,
            "EXECUTION_TIMEOUT"
          );

          return {
            status: "BLOCK_RETURN",
            requestId: boundary.requestId,
            response: safeSnapshot,
            reason: "EXECUTION_TIMEOUT",
            blockedTransition: transition.id
          };
        }
      }

      const started = performance.now();

      let verdict: Verdict;

      try {
        verdict = await this.withTimeout(
          this.evaluator.evaluate(
            boundary,
            transition
          ),
          this.policy.evaluation.evaluatorTimeoutMs
        );
      } catch {
        verdict = {
          status: "UNKNOWN",
          reason: "EVALUATOR_FAILURE",
          policyId: "runtime-fail-closed",
          evaluatorVersion: "runtime-2"
        };
      }

      const latencyUs = Math.max(
        0,
        Math.round(
          (performance.now() - started) * 1000
        )
      );

      if (verdict.status !== "ALLOW") {
        await this.safeAbort(
          session,
          verdict.reason
        );

        this.emit(
          boundary,
          transition,
          context,
          verdict.status,
          verdict.reason,
          verdict.evaluatorVersion,
          verdict.confidence,
          latencyUs,
          true
        );

        return {
          status: "BLOCK_RETURN",
          requestId: boundary.requestId,
          response: safeSnapshot,
          reason: verdict.reason,
          blockedTransition: transition.id
        };
      }

      try {
        await this.withDeadline(
          session.commit(transition.id),
          deadline,
          "EXECUTION_TIMEOUT"
        );

        const nextSnapshot =
          await this.withDeadline(
            session.snapshot(),
            deadline,
            "EXECUTION_TIMEOUT"
          );

        if (
          this.serializedSize(nextSnapshot) >
          this.policy.execution.maxSnapshotBytes
        ) {
          await this.safeAbort(
            session,
            "SNAPSHOT_TOO_LARGE"
          );

          this.emit(
            boundary,
            transition,
            context,
            "BLOCK",
            "SNAPSHOT_TOO_LARGE",
            "runtime-2",
            undefined,
            latencyUs,
            true
          );

          return {
            status: "BLOCK_RETURN",
            requestId: boundary.requestId,
            response: safeSnapshot,
            reason: "SNAPSHOT_TOO_LARGE",
            blockedTransition: transition.id
          };
        }

        safeSnapshot = nextSnapshot;

        this.emit(
          boundary,
          transition,
          context,
          "ALLOW",
          verdict.reason,
          verdict.evaluatorVersion,
          verdict.confidence,
          latencyUs,
          true
        );
      } catch {
        await this.safeAbort(
          session,
          "EXECUTION_TIMEOUT"
        );

        return {
          status: "BLOCK_RETURN",
          requestId: boundary.requestId,
          response: safeSnapshot,
          reason: "EXECUTION_TIMEOUT",
          blockedTransition: transition.id
        };
      }
    }

    await this.safeAbort(
      session,
      "MAX_TRANSITIONS_EXCEEDED"
    );

    return {
      status: "BLOCK_RETURN",
      requestId: boundary.requestId,
      response: safeSnapshot,
      reason: "MAX_TRANSITIONS_EXCEEDED",
      blockedTransition: "runtime"
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;

        settled = true;
        reject(
          new Error("UAB_EVALUATOR_TIMEOUT")
        );
      }, timeoutMs);

      promise.then(
        value => {
          if (settled) return;

          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          if (settled) return;

          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  private async withDeadline<T>(
    promise: Promise<T>,
    deadline: number,
    reason: string
  ): Promise<T> {
    const remaining = Math.max(
      1,
      Math.floor(
        deadline - performance.now()
      )
    );

    return this.withTimeout(
      promise,
      remaining
    ).catch(() => {
      throw new Error(reason);
    });
  }

  private async safeSnapshot(
    session: Awaited<
      ReturnType<ModelOwnerAdapter["initialize"]>
    >
  ): Promise<unknown> {
    try {
      const snapshot =
        await session.snapshot();

      if (
        this.serializedSize(snapshot) >
        this.policy.execution.maxSnapshotBytes
      ) {
        throw new Error(
          "UAB_INITIAL_SNAPSHOT_TOO_LARGE"
        );
      }

      return snapshot;
    } catch {
      return null;
    }
  }

  private async safeAbort(
    session: Awaited<
      ReturnType<ModelOwnerAdapter["initialize"]>
    >,
    reason: string
  ): Promise<void> {
    try {
      await session.abort(reason);
    } catch {
      // Fail closed even if abort itself fails.
    }
  }

  private metadataSize(
    metadata:
      | Readonly<Record<string, unknown>>
      | undefined
  ): number {
    if (metadata === undefined) return 0;

    return this.serializedSize(metadata);
  }

  private serializedSize(
    value: unknown
  ): number {
    try {
      const serialized = JSON.stringify(value);

      if (serialized === undefined) {
        return 0;
      }

      return Buffer.byteLength(
        serialized,
        "utf8"
      );
    } catch {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  private emit(
    b: RequestBoundary,
    t: ProposedTransition,
    c: RuntimeContext,
    verdict: AuditEvent["verdict"],
    reason: string,
    evaluatorVersion: string,
    confidence: number | undefined,
    latencyUs: number,
    responsePreserved: boolean
  ): void {
    this.telemetry.emit({
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      tenantId: c.tenantId,
      modelId: c.modelId,
      modelVersion: c.modelVersion,
      requestId: b.requestId,
      objectiveHash: b.objectiveHash,
      transitionId: t.id,
      transitionType: t.type,
      proposedAction: t.proposedAction,
      verdict,
      reason,
      policyVersion: b.policyVersion,
      evaluatorVersion,
      confidence,
      latencyUs,
      responsePreserved
    });
  }
}
