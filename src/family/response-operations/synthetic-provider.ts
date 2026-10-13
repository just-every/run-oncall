import { fail, text } from "./domain.ts";

export type SyntheticBehavior = "accepted" | "delivered" | "fail-before-accept" | "timeout-after-accept";
export type SyntheticPayload = { incident: string; service: string; role: "primary" | "backup"; target: string };
export type SyntheticReceipt = {
  id: string; key: string; jobId: string; incident: string; service: string;
  step: 0 | 1; target: string; payload: SyntheticPayload; acceptedAt: number;
  status: "accepted" | "delivered";
};
export type SyntheticOutcome = "accepted" | "delivered" | "failed" | "uncertain";

export function validateBehavior(value: unknown): SyntheticBehavior {
  if (!["accepted", "delivered", "fail-before-accept", "timeout-after-accept"].includes(value as string))
    fail("Invalid synthetic behavior");
  return value as SyntheticBehavior;
}
export function fields(value: any, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(value, k)))
    fail("Invalid synthetic module object fields");
}
export function clock(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < Date.UTC(2000, 0, 1) || (value as number) >= Date.UTC(2101, 0, 1))
    fail("Invalid evaluation clock");
  return value as number;
}
export function validateReceipt(input: any): SyntheticReceipt {
  fields(input, ["id", "key", "jobId", "incident", "service", "step", "target", "payload", "acceptedAt", "status"]);
  fields(input.payload, ["incident", "service", "role", "target"]);
  for (const key of ["id", "key", "jobId", "incident", "service", "target"])
    if (text(input[key], key, 220) !== input[key]) fail("Noncanonical synthetic receipt identity");
  if (![0, 1].includes(input.step) || !["accepted", "delivered"].includes(input.status)) fail("Invalid synthetic receipt");
  clock(input.acceptedAt);
  if (input.id !== input.key || input.key !== `${input.jobId}:${input.step}` ||
      input.payload.incident !== input.incident || input.payload.service !== input.service ||
      input.payload.target !== input.target || input.payload.role !== (input.step === 0 ? "primary" : "backup"))
    fail("Synthetic receipt identity/payload mismatch");
  return structuredClone(input);
}

/** Local pure adapter. Receipt insertion belongs to the caller's timer CAS transaction. */
