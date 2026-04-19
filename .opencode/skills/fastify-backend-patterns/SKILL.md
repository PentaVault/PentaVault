---
name: fastify-backend-patterns
description: Apply the planned Node 24 and Fastify 5 backend conventions for the PentaVault platform.
license: Proprietary
compatibility: opencode
metadata:
  audience: backend-maintainers
  runtime: node
---

## Planned conventions

- Node 24 LTS
- Fastify 5.x
- explicit schemas and validation
- minimal abstractions until patterns are proven
- security-sensitive logic kept explicit and testable

## Use me for

- route and plugin structure decisions
- backend layering decisions
- avoiding framework magic in sensitive code paths
