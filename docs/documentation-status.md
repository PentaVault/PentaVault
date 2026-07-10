# PentaVault Documentation Status

Updated: 2026-07-10

This is the current documentation index. Historical logo prompts, pre-implementation CLI plans, and superseded subsystem/UI master plans were removed after their useful rules were folded into current guides.

## Active Sources Of Truth

| Document | Purpose |
| --- | --- |
| `README.md` | Repository entry point and verification commands. |
| `AGENTS.md` | Frontend, backend, CLI, security, and branching rules. |
| `cloud.md` | Runtime topology, environment names, deployment, and rollout checks. |
| `todo.md` | Current open frontend/cross-repo work only. |
| `tasks.md` | Current CLI delivery status and blocked cache work. |
| `packages/cli/README.md` | Installed CLI commands, auth, local config, and API-key usage. |
| `docs/testing.md` | Frontend, browser, backend, and CLI verification. |
| `docs/cli-packaging.md` | Windows artifact and shell-completion packaging. |
| `docs/product-plan.md` | Living product direction. |
| `docs/implementation/internal-kms-blueprint.md` | Future production KMS design. |
| `docs/planning/billing-entitlement-policy.md` | Billing feature and quota policy. |
| `docs/planning/billing-lifecycle-and-entitlement-policy.md` | Billing lifecycle rules and edge cases. |

## Completed Or Historical References

| Document | Purpose |
| --- | --- |
| `docs/completed/better-auth-plugin-roadmap.md` | Completed Better Auth consolidation record. |
| `docs/completed/core-secrets-engine.md` | Completed core secrets engine roadmap. |
| `docs/review/2026-04-29.md` | Formal product review snapshot. |
| `docs/error-inventory.md` | Completed error-handling audit and implementation record. |

## Backend Documentation

The private backend index is rooted at `PentaVault-Backend/README.md` and `PentaVault-Backend/AGENTS.md`.

- `docs/adr/`: accepted architecture decisions.
- `docs/api/contracts.md`: live API contract reference.
- `docs/governance/`: access, release, branch, AI, MCP, and secret-handling policy.
- `docs/security/`: threat model, encryption, token, logging, migration, and gateway design.
- `docs/runbooks/`: device auth, key rotation, secret import, token revoke, and server operation.
- `docs/testing/`: backend testing and failure-path policy.
- `docs/performance/backend-baselines.md`: measured backend baselines.
- `TODO.md`: current operational follow-ups only.

Documentation must describe implemented behavior as implemented, planned behavior as planned, and external rollout work as unverified until the target environment is checked.
