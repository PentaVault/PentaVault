# Manual test plan — `Abhash/New-Features`

Everything on this branch that a person should click through before release, in
the order that gets you the most confidence per minute. Automated coverage is
listed per section so you can skip what a test already proves and spend your time
on what only a human can judge: whether the thing is usable, and whether the
refusals are actually refusals.

Each section states what "correct" looks like **and** what a wrong result looks
like. For a secrets manager the negative cases are the important ones — a feature
that works is worth less than a guard that holds.

## 0. Bring the stack up

```bash
# Backend — from PentaVault-Backend/
cp .env.example .env          # then fill DATABASE_URL, JWT_SECRET, LOCAL_KEK_BASE64
docker compose up -d postgres # or point DATABASE_URL at your own Postgres
pnpm run db:migrate           # applies auth + platform schema
pnpm run dev:api              # http://localhost:3001

# Frontend — from the repository root
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:3001/api
pnpm run dev                  # http://localhost:3000
```

Two things to set deliberately before you start:

| Variable | Where | Why you need it |
| --- | --- | --- |
| `AUTH_ADMIN_USER_IDS` | backend `.env` | Comma-separated user IDs that may reach the operator console. Without it, `/settings/platform` returns 404 for everyone — including you. |
| `ENCRYPTION_KEY_PROVIDER` | backend `.env` | Leave as `local-dev` for everything except the AWS KMS section. |

Register a user first, read its id out of the `user` table, put that id in
`AUTH_ADMIN_USER_IDS`, and restart the API. The console is deliberately hidden,
not merely disabled, so there is no in-app way to grant yourself access.

## 1. Homepage (2 minutes)

The marketing homepage was rebuilt: hero, code showcase, how-it-works, security
section, FAQ, closing CTA.

1. Open `http://localhost:3000/home`.
2. Resize from desktop to a phone width. Nothing should scroll sideways.
3. Toggle your OS between light and dark. Both should be legible — the theme is
   CSS-variable driven, so a hard-coded colour shows up as a contrast failure.
4. Click every CTA. They should land on `/register` or `/login`, not 404.

*Covered by tests:* rendering and copy (`src/components/home/__tests__/`).
*Not covered:* whether it looks good. That is the point of this section.

## 2. Announcement strip (5 minutes)

A dismissible strip under the header, for maintenance windows and incidents.

1. Sign in, go to `/settings/platform` → **Announcements**.
2. Create one: severity `maintenance`, audience `all`, a title and body.
3. Load any dashboard page. The strip appears under the header, styled by
   severity.
4. Dismiss it. Reload. **It must stay dismissed** — dismissals live in
   `localStorage` under `pv:dismissed-announcements`.
5. Now edit the announcement's title and save. The strip should **come back**:
   the dismissal key includes the content, so changing the message means the user
   has not seen this one yet. This is the behaviour worth checking by hand.
6. Set audience `anonymous` and check it appears on `/home` while signed out, and
   `authenticated` and check it does not.
7. Set the window to end in the past. The strip disappears.

*Covered by tests:* `src/components/layout/__tests__/announcement-strip.test.tsx`.

## 3. Feature flags without redeploying (5 minutes)

1. `/settings/platform` → **Feature flags** → create `demo.banner`, status
   `disabled`.
2. Flip it to `enabled`. Reload the dashboard — the flag provider picks up the
   new value with no rebuild and no restart.
3. Set status `rollout` with 25%. Reload several times **as the same user**: the
   answer must not change. Bucketing is a hash of `flagKey:subject`, so a user
   who is in stays in. A flag that flickers per request would be the bug.
4. Add your own user id to `deniedUserIds`. You should now be out even at 100%.
   Deny beats allow — check this one, it is the rule people get wrong.

## 4. Enterprise SSO — OIDC (15 minutes, needs a provider)

Use any OIDC provider you can create an app in (Auth0, Okta dev, Keycloak,
Entra). Set the redirect URI to
`http://localhost:3001/api/auth/sso/callback`.

1. `/settings/organization/access` → **Single sign-on** → add a connection:
   issuer, JWKS URI, client id, authorization endpoint, token endpoint, and at
   least one allowed email domain. **The domain allowlist is mandatory** — try
   saving without one and confirm it is refused.
2. Sign out. On `/login`, type an email at the allowed domain. The SSO button
   should appear (discovery is by email domain).
3. Complete sign-in at the provider. You should land in the dashboard with a real
   session — cookie, expiry and all, because the session is minted inside a
   better-auth plugin rather than hand-rolled.
4. **Now the refusals.** Each of these must fail, and fail without telling the
   browser anything useful:
   - Sign in with an account whose email is outside the allowed domain.
   - Turn off just-in-time provisioning, then try an email with no PentaVault
     account. It must be refused, not silently created.
   - Replay the callback URL a second time. The state token is single-use.
   - Hit `/api/auth/sso/authorize` six times in a minute — the sixth should be
     rate-limited (window 60s, max 5).

*Covered by tests:* `tests/unit/sso.test.ts`, `tests/integration/api-sso.test.ts`,
`tests/integration/auth-sso-plugin.test.ts` — the flow, the nonce binding, PKCE,
and every refusal above.
*Not covered:* a real provider's actual response. That is what this section is
for; no test can substitute for one live IdP.

## 5. Enterprise SSO — SAML (15 minutes, needs an IdP)

ACS URL is `http://localhost:3001/api/auth/sso/saml/callback`, entity id is
whatever you put in `spEntityId`.

1. Add a SAML connection: entry point, IdP certificate (PEM or bare base64),
   SP entity id, allowed domains.
2. Sign in through the IdP.
3. Refusals to confirm:
   - An IdP that signs the response but **not the assertion** must be rejected.
     The assertion carries the identity; only its signature counts.
   - Swap in a different IdP's certificate. Rejected.
   - An assertion whose audience names a different service provider. Rejected.

Note: outer-response signing is *not* required (`wantAuthnResponseSigned: false`),
because ADFS signs only the assertion by default. If your IdP signs both, that
still works.

*Covered by tests:* `tests/unit/sso-saml.test.ts` — real XML-DSig signatures
against a certificate generated in process, including all three refusals.

## 6. LDAP / Active Directory (10 minutes)

1. `/settings/organization/access` → **Directory sync** → add a connection: URL,
   bind DN and password, base DN, and a user filter containing `{{username}}`.
2. Save a filter *without* `{{username}}` — refused at configuration time.
3. Save an `ldap://` URL without StartTLS — refused. Credentials must not cross a
   plaintext link.
4. Sign in with a directory user.
5. **The one that matters:** attempt sign-in with a correct username and an
   **empty password**. It must be refused. An LDAP bind with an empty password is
   an anonymous bind and succeeds against most servers, which would turn "any
   valid username" into a login. There is an explicit guard for this.

*Covered by tests:* `tests/unit/directory-ldap.test.ts`, including the empty
password case and RFC 4515 filter escaping.

## 7. SCIM provisioning (10 minutes)

1. `/settings/organization/access` → **Directory sync** → generate a SCIM token
   (`pv_scim_…`). It is shown once.
2. Point your IdP's SCIM client at `http://localhost:3001/scim/v2` with that
   token as a bearer. Note there is no `/api/v1` prefix — SCIM clients expect a
   clean base URL. Or drive it by hand:

   ```bash
   curl -H "Authorization: Bearer pv_scim_..." \
        -H "Content-Type: application/scim+json" \
        -d '{"schemas":["urn:ietf:params:scim:schemas:core:2.0:User"],
             "userName":"ada@acme.com","name":{"givenName":"Ada"},"active":true}' \
        http://localhost:3001/scim/v2/Users
   ```

3. Confirm the user appears in `/settings/organization/members`.
4. `PATCH` `active: false`. The user loses access but the record remains — that
   is deprovisioning, not deletion.
5. Page through `GET /Users?startIndex=1&count=2`. Pagination is keyset-based, so
   it stays correct while users are being created underneath it.
6. Use a revoked or wrong token — 401, no detail.

**Known gap:** directory *groups* do not yet map to PentaVault roles. Group
membership arriving over SCIM is accepted and ignored. Provision roles by hand
for now.

## 8. Bring-your-own-key and re-wrapping (15 minutes)

Needs AWS KMS or LocalStack. With LocalStack:
`AWS_KMS_ENDPOINT=http://localhost:4566`.

1. Create a secret under the default `local-dev` key so you have existing data.
2. `/settings/organization/access` → **Encryption keys** → add an AWS KMS key and
   adopt it for the organisation.
3. Create a *new* secret. It is wrapped with the new key.
4. Read the *old* secret. **It must still decrypt.** Every envelope records the
   key that wrapped it, so old and new keys coexist and nothing needs rewriting
   to keep working. If an old secret fails to read here, stop — that is data loss.
5. Run the re-wrap migration. Then verify:
   - every secret still reads correctly;
   - `updatedAt` on secret *values* has not moved. Re-wrapping replaces the
     wrapped data key only. The ciphertext, IV and auth tag are untouched, so a
     re-wrap is not an edit and must not look like one in the audit trail.
6. Kill KMS (stop LocalStack) and try to read. It must **fail**, not fall back to
   a local key. A silent downgrade would be the worst possible outcome here.

*Covered by tests:* `tests/unit/rewrap.test.ts`, `rewrap-migration.test.ts` and
`rewrap-combined-sources.test.ts` — key routing, byte-identical ciphertext,
resumable keyset pagination, and per-record failure isolation.

**Known gap:** adopting a key does not re-wrap automatically; you ask for the
migration. GCP, Azure and KMIP are not implemented.

## 9. Machine identities and the CLI (10 minutes)

1. Create a machine identity with an OIDC auth method — issuer, audience, and a
   subject claim to match. GitHub Actions is the realistic case
   (`https://token.actions.githubusercontent.com`).
2. From a workload holding an OIDC token:

   ```bash
   pv identity login --organization acme --name ci-deploy --assertion-env ACTIONS_ID_TOKEN
   pv identity whoami --token pv_mid_...
   ```

3. The token is printed, never saved. Confirm nothing landed in the OS keychain
   or `.pentavault.toml` — that file holds routing metadata only.
4. Read secrets with it:

   ```bash
   export PENTAVAULT_TOKEN=$(pv identity login ... --token-only)
   pv secrets pull --project my-project
   ```

5. Refusals:
   - Use the `pv_mid_` token against a normal `/api/v1/projects/...` route. It
     must be rejected: identity tokens work only on `/api/v1/identity/*`, and the
     CLI routes by prefix.
   - Wait for expiry (minutes) and retry. Rejected.
   - Present an assertion whose subject does not match the configured claim.
     Rejected.

*Covered by tests:* `tests/unit/machine-identities.test.ts`,
`tests/integration/api-identities.test.ts`, and the Rust CLI tests.

## 10. Approval policies (10 minutes)

1. Project → **Settings** → **Approval policies**. Require 2 approvers for
   secret changes in an environment.
2. As a member, change a secret there. It becomes a change request rather than
   an edit.
3. Approve once. Still pending — one approval does not meet a quorum of two.
4. Approve as a second user. Now it applies.
5. Have an approver rescind. **A rescinded approval must lower the count, not
   veto the request** — there is no `rejected` status, so a rescind is "I take my
   approval back", not "this is denied". Confirm the request returns to pending
   and can be approved again.
6. Try to approve your own request. Refused.

## 11. Folder history and checkpoints (5 minutes)

1. Project → **Settings** → **Folder history**.
2. Make several secret changes in a folder. Each produces a commit.
3. Open a commit and read the diff. **Secret values must not appear** — the
   history shows that a value changed, never what it changed to.
4. Restore a checkpoint. The folder returns to that state and the restore is
   itself a new commit; history is append-only.

## 12. Per-organisation rate limits (5 minutes)

1. `/settings/platform` → tunable limits, or the organisation's own settings.
2. Set a low limit, then exceed it with a loop of API calls. You should get 429s
   with a `Retry-After`.
3. Wait for the window to roll and confirm it recovers. The window rolls forward
   rather than resetting on a fixed schedule, so a burst at a boundary cannot
   double the allowance.

## 13. Operator console (5 minutes)

1. `/settings/platform` as an admin id from `AUTH_ADMIN_USER_IDS`.
2. Instance stats, flags, announcements all render.
3. Remove yourself from `AUTH_ADMIN_USER_IDS`, restart the API, reload. You get
   **404, not 403** — a normal tenant should not be able to confirm that an
   operator surface exists.

## Running the automated gates

```bash
# Frontend, from the repository root
pnpm run lint && pnpm run type-check && pnpm test   # 396 tests
pnpm run check:commitlint                            # commit-type parity
pnpm run cli:lint && pnpm run cli:test               # Rust CLI

# Backend, from PentaVault-Backend/
pnpm run ci:repo                                     # 1103 tests + repo guards
```

## What is deliberately not done

Listed here so nobody spends time hunting for it:

- SCIM directory groups do not map to PentaVault roles.
- Adopting an encryption key does not trigger a re-wrap; you request it.
- Only AWS KMS is implemented. GCP, Azure and KMIP are not.
- PKI and certificate management was dropped on purpose, not forgotten.
