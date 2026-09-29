import { createHash, randomUUID } from "node:crypto";
import type { RequestBoundary } from "./types.js";

export function freezeRequest(originalRequest: string, policyVersion = "baseline-1"): RequestBoundary {
  const normalized = originalRequest.trim();
  if (!normalized) throw new Error("UAB_EMPTY_REQUEST");
  const objectiveHash = "sha256:" + createHash("sha256").update(normalized, "utf8").digest("hex");
  return Object.freeze({
    protocol: "UAB/1.0",
    requestId: randomUUID(),
    originalRequest: normalized,
    objectiveHash,
    invariant: "NO_AUTONOMOUS_OBJECTIVE_EXTENSION",
    createdAt: Date.now(),
    policyVersion
  });
}
