# PentaVault

Runtime secrets proxy for AI-assisted development.

> Protect your API keys from AI coding agents. Replace real secrets with proxy tokens.
> Full audit log. Per-developer access controls. One command to set up.

## Monorepo structure

| Directory | Description | Visibility |
|---|---|---|
| `/src` | Next.js dashboard (this repo) | Public |
| `/cli` | `vaultproxy` CLI npm package | Public |
| `/PentaVault-Backend` | Fastify API server | Private (gitignored) |

## Getting started (frontend dev)

```bash
git clone https://github.com/PentaVault/PentaVault
cd PentaVault
pnpm install
cp .env.example .env.local
# Edit .env.local with your local API URL
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Requirements

- Node.js 22+
- pnpm 10+
- A running PentaVault backend

## Tech stack

- Next.js 16 (App Router)
- TypeScript (strict)
- Tailwind CSS
- TanStack Query
- Radix UI primitives
- Zod validation
- Vitest + jsdom for frontend tests
- Biome for frontend linting and formatting

## Contributing

Conventional commits are required. Run `pnpm run lint`, `pnpm run type-check`, and `pnpm test` before pushing. See `AGENTS.md` before making security-sensitive auth, role, project-access, token, or secret changes.
