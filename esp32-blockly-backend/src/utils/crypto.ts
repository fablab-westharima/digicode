/**
 * Cryptographic helpers — shared across auth, 2fa, passkey, recovery-codes.
 *
 * Session 121 NEW-9: extracted `constantTimeEqual` from two prior copies
 * (utils/jwt.ts F-F2 in Session 118; routes/2fa.ts D-10 in Session 120) to
 * eliminate duplicate-implementation risk before a third copy was added.
 * Session 119 polish #66 anchor.
 */

/**
 * Compare two strings in constant time relative to their content.
 *
 * Short-circuits only on length mismatch (signature/hash lengths are public
 * constants — not secret) and then runs a length-bound XOR accumulator over
 * char codes. Result is OR-aggregated and checked against zero at the end,
 * preventing byte-by-byte early-exit timing leakage.
 *
 * Reference pattern: jwt.ts:43-50 (F-F2 Session 118) — this function is the
 * canonical home; jwt.ts + routes/2fa.ts now both import from here.
 *
 * Safe for: HMAC signatures (固定長), SHA-256 hash hex strings (64 chars),
 * OTP code hashes, recovery code hashes, refresh-token hashes (when applied
 * outside the DB-lookup model).
 *
 * Not for: variable-length user input where length itself is secret (which
 * is not the case for any caller in this codebase).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
