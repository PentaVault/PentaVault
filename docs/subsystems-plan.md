# PentaVault Subsystems — Master Build Plan

Status: **Plan for sign-off.** Grounded in a 12-agent design + adversarial
security-review workflow against the real codebase. Nothing here is built yet.
Small commits, verify-gate before each, ask-first gates marked **[ASK]**.

## The single most important finding

The security review flagged that **two of the requested "security" features are
best-effort hygiene, NOT enforcement boundaries** — and must be documented as
such or operators will trust controls that don't stop a real attacker:

1. **CLI redaction (`.pentavault` / `pv run` output scrubbing) is a log-scrubber,
   not a boundary.** `pv run` injects the real secret into the child process's
   env *before* any scrubbing. A hostile/buggy child already holds the plaintext
   and can exfiltrate it however it likes; scrubbing its stdout only catches
   *accidental* prints. `hard-block` aborts *after* the secret is already in
   memory. → Ship it as "accidental-leak hygiene," never counted in the security
   model.
2. **Server-side redaction protects logs/error-bodies/render, not egress.** It
   must explicitly NOT touch the gateway proxy-forward path (that legitimately
   carries the real injected key to the upstream) — the boundary between "redact
   this" and "leave this alone" is the core design problem.

The **real** security boundary remains the `pv_tok_` proxy (key server-side) +
grants + the new pause/kill switches. Redaction is defense-in-depth on top.

## Pricing model reconciliation (Phase-0 gate) **[ASK]**

Your Polar product is **one graduated per-seat product** (INR: seats 1–3 = ₹0,
4–15 = ₹350/seat, 16+ = ₹600/seat), not three discrete plans. So:
- **Plan is derived, not chosen:** `free` = no active sub OR seats ≤ 3; `paid` =
  status ∈ {active, trialing} AND seats ≥ 4. Everything else (past_due, unpaid,
  incomplete, canceled, revoked) → `free` (deny-by-default).
- **Price** = graduated *sum* across bands; **entitlement** = highest band reached.
- The product exposes no pro-vs-team distinction, so effectively **two tiers**.
  Recommendation: map the paid band to `team` (never under-grant a payer), keep
  `pro` in the enum as vestigial for `normalizePlan` tolerance.
- **Decision needed:** formally collapse `PlanId` to `free|paid`, or keep the
  3-tier enum? This touches FE `plans.ts` + BE `types.ts`/`service.ts` +
  marketing `pricing.tsx` together (must switch USD→INR, feature-tiers→seat-bands).
- **Silent-bypass caveat:** entitlement gates key on the flat `members` cap
  (team=50), not `seats_included` — so a 4-seat payer mapped to `team` could add
  50 members. Either enforce `members` against `seats_included`, or document that
  seat-billing and the members cap are intentionally independent.

## Security-review must-fixes (baked into the build order)

**Token pause (on/off switch)**
- New nullable `pausedAt`/`pausedBy` columns — do NOT reuse `revokedAt` (revoke is
  terminal and wins over pause). Paused token still counts as the single active
  grant (don't make the variable look unassigned).
- **Rust proxy parity is mandatory in the same change** — `services/proxy-rs`
  reimplements the policy; omitting the paused-deny branch there = a live bypass.

**Kill switch + IP blocklist (incident response)**
- **CLI fail-open (critical):** the token evaluator does NOT cover the CLI resolve
  path (`cli.ts:356` goes straight through `secretService`). An evaluator-only
  freeze silently leaves CLI reads live. Must ALSO gate `canIssueCliSecret` /
  `resolveSecretValue`.
- **Gateway IP-blocklist fail-open (critical):** `gateway.ts` calls the evaluator
  with NO `ipAddress` — a blocklist keyed on it matches nothing and lets blocked
  IPs through the proxy. Must plumb `request.ip` into all 3 gateway calls (a
  call-site signature change).
- **projectGuard must be fail-closed:** a project/blocklist load error must
  `deny()`, and "token present but guard unresolved" ⇒ DENY.
- Blocklist must use **inet/CIDR containment** (canonicalized IP), not
  exact-string `includes()` (misses CIDR, IPv6 forms). Requires `trustProxy` fixed
  first or a spoofed `X-Forwarded-For` bypasses it.
- Kill-switch/blocklist management routes are **session-authed only, never
  token-gated** (un-panic must stay recoverable); management plane exempt from the
  blocklist.

**Billing / Polar webhook** (this write-path is a *security-posture* path — plan
toggles `trusted_ips`, `security_analytics`, `webhook_alerts`, audit retention):
- **Status allowlist, not denylist:** `active|trialing` → paid; everything else →
  free. A denylist lets `past_due` keep the paid tier with no payment.
- **Monotonic/replay guard:** persist the event's own timestamp; `WHERE event_ts >
  stored` + event-id dedup — else a replayed/late `updated` resurrects a canceled
  plan.
- **`order.paid` must NOT set plan alone** (carries no sub status → resurrection bug).
- **Audit every plan/seat change** (`actor='polar-webhook'`, sub id, old→new) —
  currently zero audit on entitlement flips.
- **Downgrade fails closed:** feature loss ⇒ deny/restrict, never "unconfigured ⇒
  allow" (esp. `trusted_ips` silently ceasing to filter).
- Webhook on its **own encapsulated instance** (raw-body buffer parser must not
  break checkout/portal JSON). Verify signature BEFORE any DB work. Register the
  route ONLY when accessToken + webhookSecret + productId all present (else a
  missing secret exposes an unauthenticated plan-write endpoint). Reject events
  whose product id / server ≠ configured. Redact email + token from logs.

**Leak redaction**
- **Fail-closed on detector/DB error** for log sinks (drop free-text) and response
  bodies (generic error), with a circuit-breaker degrading to shape-only rather
  than 500-ing every proxied call.
- **Streaming bodies bypass a string `onSend`** — the SSE/chunked gateway path is
  the hot path; decide buffer-and-scan vs a streaming transform BEFORE claiming
  response-body coverage.
- **Log scrub calls always pass an EMPTY allowlist** — the response-body allowlist
  (which keeps the in-use secret readable in the passthrough) must never make that
  secret un-redactable in logs.
- Two layers: shape/entropy regex (linear-time Rust `regex`, no backtracking, caps)
  + HMAC fingerprint of stored values (needs a **blinding key**, versioned,
  dual-sign + backfill on rotation). Audit stores `secretId` only, never the value.
- `block` mode opt-in (default `warn`); owner/admin can flip back server-side.

**`.pentavault` config file**
- **Built-in patterns + a floor mode are NON-overridable-downward** by the
  committed file (file may tighten, never loosen) — else anyone who lands a commit
  disables your redaction by editing text.
- **Bounded parent-dir walk, hard-stopped at git root** (no walking to `/`, no
  attacker-planted ancestor file). **Explicit `pv init` only** — no silent
  auto-create into whatever repo `pv` runs in.
- Scanner reports `file:line`/key/pattern-id, **never echoes the value** (else it
  leaks into CI logs). `pv init --push` routes through `access-policy.ts`
  (owner/admin, deny-by-default, audited) — a dev laptop must not loosen org policy.

## Build order (small-commit-friendly)

- **P0** (no gate): recolor to vivid-emerald+jewel; home hero two-buttons + kill
  demo hover; secrets spotlight-border hover. *(palette + behaviors already
  decided)*
- **P0 gate [ASK]:** PlanId/pricing reconciliation → then INR seat-band marketing.
- **P1 — `#errors` foundation:** frozen `ERROR_CODES` map, `AppError`, central
  serialize, request-id on 100% of responses, request-scoped logger, the **429
  bug fix** (rate_limited → 429 + Retry-After, currently 403), kill the 12
  `INVALID_REQUEST` generics per-plugin, cross-repo contract artifact + drift CI.
- **P2 [ASK]:** fix `trustProxy` (real client IP) → shared `getClientContext`
  (ip/ua/device/geo) → thread through audit + token-use + analytics (+PII policy).
- **P3 [ASK]:** token pause (cols + evaluator + **Rust parity** + routes + UI).
- **P4 [ASK]:** kill switch + IP blocklist + rate-limit tiers (with the CLI +
  gateway fail-open fixes above).
- **P5 [ASK: blinding key]:** leak redaction (signatures on create/update, two-layer
  detector fail-closed, scoped onSend, log scrubbing).
- **P6 [ASK: settings migration]:** `.pentavault.yml` (floor-mode, bounded walk,
  linear regex) + `pv init`/`pv scan` + server-mirrored settings.
- **P7 [ASK: new service]:** Polar B1 (env-gated registration, allowlist status,
  monotonic upsert, audited, own-instance webhook, checkout/portal).
- **P8:** E2E (Playwright + integration for the security flows) + CI/CD pipeline +
  docs (AGENTS.md/CLAUDE.md test how/when, nginx headers, `.pentavault` schema,
  incident runbook, PII policy, Polar setup).

## Open decisions (numbered for your reply)

1. **PlanId:** collapse to `free|paid`, or keep `free/pro/team` (pro vestigial)?
2. **Seats vs members cap:** enforce `members` against `seats_included`, or
   document them as independent?
3. **Token pause scope:** token-only (recommended v1), or also freeze CLI session
   secret reads (bigger)?
4. **Kill switch on downgrade/freeze:** keep seat history or reset? Sign-off that
   pause/kill change the token-policy evaluator (parity approval).
5. **Rate limiting:** key gateway/resolve by token-hash (better isolation,
   behavior change) or keep IP keying?
6. **Blinding key:** env vs KMS, may it derive from `MASTER_KEY`, rotation/backfill?
7. **Redaction streaming:** buffer-and-scan SSE (latency) vs streaming transform;
   global-default-on vs opt-in enumerated routes?
8. **CLI config posture:** may the committed file disable redaction below a floor,
   or machine-local opt-in required? `pv init` only vs lazy auto-create?
9. **Billing columns:** reuse `stripe_*` short-term (no migration) vs rename to
   `external_*`/`billing_provider` now (live-table migration)?
10. **Blanket confirm:** all additive/nullable migrations may run on the shared DB?
11. **PII policy:** truncation/hashing + retention cutoff for full IP+geo+device?
12. **Status-code changes:** confirm the Rust CLI + FE tolerate 429+Retry-After and
    422 before the `#errors` migration lands.

---

# KMS — Key Management (decided: build an abstraction, delegate custody)

## What KMS is and whether PentaVault is one

**KMS = Key Management Service.** Its only job is to hold one small, extremely
protected **master key** and perform encrypt/decrypt with it — while never
letting that master key leave. You do **not** store user secrets *in* a KMS; you
use the KMS to protect the key that protects the secrets. That is **envelope
encryption**, which PentaVault already does:

```
user secret ("sk-openai-…")
  └─ encrypted with a per-secret Data Key (DEK)      → ciphertext in the DB
       └─ DEK encrypted with the Master Key           → wrapped DEK in the DB
            └─ Master Key lives in …                  → THIS is the KMS question
```

**Is PentaVault a KMS today?** Partially. `packages/encryption` does envelope
encryption with AES-256-GCM and a `MASTER_KEY` env var. What is missing is a
*hardened custody* for that master key — today it is a plain env var on the VM,
so a full server compromise + DB dump can decrypt everything. A real KMS keeps
the master key somewhere it **cannot be read out** (cloud HSM, or an isolated
process), so both the DB *and* the KMS must be breached to expose plaintext.

## Decision: build the abstraction now, delegate real custody later

- **Add a `KeyProvider` interface** (wrap/unwrap a DEK, sign for HKDF) with two
  implementations: `EnvMasterKeyProvider` (today's env var — the zero-infra
  default that runs on the Oracle free tier) and a pluggable `ExternalKmsProvider`
  seam you switch to by config with **no code rewrite**. To PentaVault's users it
  always *looks* like one managed KMS; the backend custody is swappable.
- **Do NOT roll your own HSM-grade key custody.** Key ceremonies, side-channel
  resistance, and audited storage are the wrong things for a solo founder to hand
  build. Use the abstraction to delegate to a vetted backend when the threat model
  justifies it.
- **The blinding key** (leak-detection fingerprints) is **derived from the master
  key via HKDF** with a `keyVersion` label — no separate secret to manage; it
  inherits the master key's custody automatically.

## Build vs. buy (for the `ExternalKmsProvider` backend, later)

| Option | Pros | Cons | Fit |
|---|---|---|---|
| **Env `MASTER_KEY`** (today, default) | Zero infra/cost; simple; works on free tier | Master key readable if the VM is compromised | MVP / pre-beta — keep as default |
| **AWS KMS / GCP KMS** (cloud HSM) | Key never leaves the HSM; audited; per-op logging; cheap | Cloud dependency + tiny per-op cost; egress from Oracle | Best when a paying/enterprise customer needs it |
| **HashiCorp Vault (Transit)** | Self-hostable; strong; open-source | Real ops burden (the "10-engineer Vault" problem) | Only if self-host is a product requirement |
| **`age` / Google `tink` (libraries)** | Well-audited crypto, in-process, no infra | Master key still local (a better-structured env key, not true custody) | A cleaner interim between env-var and cloud KMS |
| **Roll your own KMS** | — | Audit cost, key-ceremony, side-channels; a liability | **Rejected** |

## Rotation (simple now, versioned for later)

- Store a `keyVersion` on each wrapped DEK and each leak fingerprint. Rotating the
  master key = a background job that unwraps with the old key and re-wraps with
  the new (the same shape as the already-specified `MASTER_KEY` rotation).
- **Keep the last 3 key versions** live so in-flight/unrotated rows still decrypt
  during a rollout; a version is retired only after backfill completes. Versioning
  makes rotation non-breaking and gives the leak-detection dual-signing window a
  natural home.

## Open decisions folded in

- Q6 (blinding key) is now answered: **derive from `MASTER_KEY` via HKDF**, no new
  standalone secret; rotation via the last-3-versions scheme above.
- Remaining KMS decision for later (not blocking any current phase): which
  `ExternalKmsProvider` backend to target first when custody hardening is due —
  recommendation **AWS KMS** (lowest ops burden) unless self-host is required.
