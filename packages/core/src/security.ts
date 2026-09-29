import { createHmac, timingSafeEqual } from "node:crypto";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const obj=value as Record<string,unknown>;
  return "{" + Object.keys(obj).sort().map(k=>JSON.stringify(k)+":"+canonicalJson(obj[k])).join(",") + "}";
}
export function signPayload(value: unknown, key: string): string {
  return "hmac-sha256:" + createHmac("sha256",key).update(canonicalJson(value)).digest("hex");
}
export function verifyPayload(value: unknown, signature: string, key: string): boolean {
  const expected=signPayload(value,key);
  const a=Buffer.from(expected), b=Buffer.from(signature);
  return a.length===b.length && timingSafeEqual(a,b);
}
