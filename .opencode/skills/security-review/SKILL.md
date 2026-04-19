---
name: security-review
description: Review auth, crypto, token, gateway, audit, and CI changes with a security-first checklist.
license: Proprietary
compatibility: opencode
metadata:
  audience: backend-maintainers
  sensitivity: high
---

## What I do

- review sensitive backend changes through a security lens
- look for data exposure, auth flaws, and rollback gaps
- call out missing tests or missing threat-model notes

## When to use me

Use this skill when changes touch:

- auth or sessions
- encryption or KMS
- tokens or resolve logic
- gateway forwarding
- audit or alerts
- CI/CD or release config

## Required checks

- verify docs stay truthful
- verify no secrets or tokens are exposed
- verify rollback notes exist for risky changes
