import { createHash } from "node:crypto";

/**
 * Deterministic 8-digit password derived from firstName.
 * - sha256(firstName)
 * - take first 8 bytes as unsigned 64-bit integer
 * - mod 10^8
 * - zero-pad to 8 digits
 */
export function deterministicPassword8(firstName: string): string {
  const normalized = firstName.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized, "utf8").digest();

  // Compute (first8bytesAsUint64 mod 1e8) using number math.
  // This stays within safe integer bounds by taking mod each step.
  const MOD = 100_000_000;
  let mod = 0;
  for (let i = 0; i < 8; i++) {
    mod = (mod * 256 + digest[i]!) % MOD;
  }

  return String(mod).padStart(8, "0");
}
