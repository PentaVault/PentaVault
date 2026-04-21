# TODO

Frontend execution tracker for the PentaVault web repository.

This file is intentionally detailed and should stay current as work starts, ships, slips, or is deferred.

---

## How To Use This File

- keep task IDs stable once created
- keep statuses current; update immediately when state changes
- prefer specific tasks with clear exits over vague epics
- move deferred work to a dedicated deferred section, do not silently drop context
- include validation notes for implementation tasks (`lint`, `type-check`, `build`, and focused tests)

## Status Legend

- `[ ]` pending
- `[-]` intentionally deferred
- `[x]` completed

## Task Template

Use this template for new tasks:

```text
### F-000 Title
Status: [x]
Priority: high | medium | low
Area: dashboard | projects | secrets | tokens | team | audit | security | auth | settings | ui-system | perf | a11y | docs | infra
Depends on: F-000, F-001
Objective: one sentence
Validation: lint/type-check/build/tests/manual checks
Exit criteria:
- concrete outcome
- concrete outcome
```

---

## 1. Active Roadmap

Objective: track remaining frontend work with implementation-grade detail.

### F-101 Production auth UX hardening

Status: [ ]
Priority: high
Area: auth
Depends on: none
Objective: harden login/register/device flows for edge cases, retries, and polished failure UX.
Validation: `pnpm run lint`, `pnpm run type-check`, focused auth flow manual tests.
Exit criteria:

- auth forms show specific errors for known backend codes
- happy path and failure path behavior is consistent across login/register/device pages

### F-102 Route boundary hardening

Status: [ ]
Priority: high
Area: auth
Depends on: F-101
Objective: ensure centralized route guards are reliable for all protected and auth-only routes.
Validation: manual navigation checks plus `pnpm run type-check`.
Exit criteria:

- all protected pages redirect unauthenticated users correctly
- authenticated users are redirected away from auth-only entry pages

### F-103 Accessibility pass

Status: [ ]
Priority: high
Area: a11y
Depends on: none
Objective: close major keyboard, focus, semantic, and contrast issues in dashboard and auth surfaces.
Validation: keyboard-only manual pass, automated lint/type-check/build.
Exit criteria:

- key interactive flows are keyboard-complete
- focus visibility and contrast meet baseline accessibility expectations

### F-104 Error and retry UX hardening

Status: [ ]
Priority: high
Area: ui-system
Depends on: none
Objective: ensure known API failure reasons always map to specific user-facing messages and retry affordances.
Validation: focused manual failure-path tests and automated `lint/type-check/build`.
Exit criteria:

- known backend error codes show specific, non-generic messages
- unknown failures keep safe generic messaging with request correlation where available

### F-105 Performance pass

Status: [ ]
Priority: medium
Area: perf
Depends on: F-102
Objective: optimize query/cache defaults and hydration strategy where measurable UX wins exist.
Validation: build output review, runtime manual checks on slow-path pages.
Exit criteria:

- expensive pages show improved perceived load and interaction responsiveness
- no regression in correctness or auth behavior

### F-106 Deployment verification

Status: [ ]
Priority: high
Area: infra
Depends on: F-101, F-102
Objective: verify production deployment wiring and baseline smoke behavior.
Validation: production or preview smoke checks.
Exit criteria:

- frontend env vars are correctly configured in deployment platform
- backend trusted origins and HTTPS expectations are validated end-to-end

---

## 2. Completed Delivery Record

Objective: preserve shipped context without cluttering active execution.

### F-001 Planning and tracker baseline

Status: [x]
Priority: high
Area: docs
Depends on: none
Objective: establish `plan.md` and roadmap-aligned task tracking.
Validation: docs present and synchronized.
Exit criteria:

- planning doc exists
- tracker exists and is maintained

### F-010 Dashboard shell + projects foundation

Status: [x]
Priority: high
Area: dashboard
Depends on: F-001
Objective: ship dashboard shell, projects list/create, and project overview foundations.
Validation: `pnpm run lint`, `pnpm run type-check`, `pnpm run build`.
Exit criteria:

- shell and project flows are functional
- loading/empty/error states are covered

### F-020 Secrets + tokens workflows

Status: [x]
Priority: high
Area: secrets
Depends on: F-010
Objective: deliver secret create/import and token issue/revoke workflows with mode-aware UX.
Validation: lint/type-check/build and manual flow checks.
Exit criteria:

- secrets and tokens pages are operational
- mutation feedback and retries are present

### F-030 Team + audit + security center

Status: [x]
Priority: high
Area: security
Depends on: F-020
Objective: deliver team membership, audit log, and security center surfaces with permission awareness.
Validation: lint/type-check/build and manual role checks.
Exit criteria:

- all pages are functional
- owner/admin restrictions are enforced in UI behavior

### F-040 Onboarding + settings maturity

Status: [x]
Priority: high
Area: settings
Depends on: F-030
Objective: deliver onboarding flow and settings API key UX while keeping unsupported usage/billing explicit.
Validation: lint/type-check/build and manual checks.
Exit criteria:

- onboarding path exists for first project/secret
- settings API key creation/display-once flow is operational

### F-050 Design system refresh

Status: [x]
Priority: medium
Area: ui-system
Depends on: F-010
Objective: refresh design tokens and component guidance for a cohesive dark-mode system.
Validation: visual spot checks across auth and dashboard surfaces.
Exit criteria:

- updated design guidance exists
- UI components align with design constraints

---

## 3. Deferred Backlog

Objective: preserve intentionally delayed ideas for future planning.

### F-201 Team-management flow redesign

Status: [-]
Priority: medium
Area: team
Depends on: F-030
Objective: redesign team-management entry and interaction model after current project-actions simplification.
Validation: design review and implementation PR.
Exit criteria:

- new IA and interaction model approved
- updated implementation replaces legacy entry points
