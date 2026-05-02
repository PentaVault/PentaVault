# PentaVault Internal KMS Implementation Blueprint

Completion Status: Not complete - future implementation blueprint only
Status: future implementation plan, no implementation started
Created: 2026-05-02

This document describes how PentaVault can evolve from the current env-var KEK model into a first-party internal Key Management Service. It is written for the product direction where PentaVault builds its own KMS instead of depending on AWS KMS, GCP KMS, Azure Key Vault, or another managed provider.

The goal is not to copy a cloud vendor. The goal is to create a clear key-management boundary inside PentaVault so a database compromise does not automatically expose encrypted user secrets.

## Current Context

The backend already uses envelope encryption for encrypted secrets.

Current encrypted flow:

1. generate a random 32-byte data encryption key for each secret payload
2. encrypt the secret value with AES-256-GCM
3. wrap the data key with a local key-encryption key
4. store ciphertext, IV, auth tag, wrapped data key, and wrapping metadata in the database

The current weak point is not the content-encryption pattern. The weak point is that `LOCAL_KEK_BASE64` or `env-master-key` is acting as the long-term key-encryption key directly from application configuration.

That means:

- database-only compromise should not reveal encrypted secrets if the attacker does not get the KEK
- database plus `.env`, deployment secrets, backend host access, CI secrets, or process memory can reveal encrypted secrets
- the backend can decrypt secrets because it has access to the KEK or can derive access to it

The internal KMS should replace direct env-var wrapping with a controlled service boundary.

## Security Goal

The first goal is database-compromise resistance.

If an attacker gets PostgreSQL rows containing encrypted secret values and wrapped data keys, they should not be able to decrypt secret values without also compromising the KMS root material or obtaining authorized unwrap capability.

This is not the same as full end-to-end encryption.

An internal KMS still allows authorized backend services to unwrap data keys. That is required for PentaVault Gateway Mode, compatibility resolution, integrations, sync targets, and service-token workflows.

Full E2EE should be added as a separate secret mode later, where user or device keys decrypt values client-side and the backend cannot decrypt them.

## Non-Goals

The internal KMS does not fully protect against:

- full backend runtime compromise
- malicious code deployed into the API service
- stolen KMS service credentials with unwrap permission
- compromised operator root key
- plaintext exposure after an authorized secret resolution
- Gateway Mode provider requests where backend intentionally needs the real provider secret

Those require additional controls:

- deployment integrity
- service identity isolation
- KMS policy
- mTLS
- audit and alerting
- E2EE mode for secrets that must never be server-decryptable

## Core Architecture

Target shape:

```text
PentaVault API
  Stores encrypted secret envelopes in PostgreSQL.
  Generates DEKs for secret versions.
  Calls KMS to wrap and unwrap DEKs.
  Does not store raw KEKs.

PentaVault Internal KMS
  Owns root and key-encryption material.
  Enforces key policy.
  Performs wrap, unwrap, rotate, rewrap, disable, and destroy operations.
  Emits audit events for every sensitive operation.

PostgreSQL
  Stores encrypted secret values.
  Stores wrapped data keys.
  Stores KMS key ids and key versions.
  May store encrypted KMS key material, but never plaintext KEKs.
```

The KMS can start as an in-process module behind a strict provider interface. It should be designed so it can later move to a separate process or host without changing the secret envelope format.

## Key Hierarchy

Use a layered key hierarchy.

```text
Root Key
  Protects KMS internal key material.
  Should live outside the database.

Key Encryption Key
  Protects data encryption keys.
  Scoped to organization, project, environment, or purpose.

Data Encryption Key
  Encrypts one secret version or one small encrypted payload.
  Generated randomly per payload.
  Stored only as wrapped ciphertext.
```

Recommended MVP hierarchy:

```text
root key -> project KEK -> secret-version DEK
```

Future hierarchy:

```text
root key -> organization KEK -> project/config KEK -> secret-version DEK
```

The MVP should prefer one KEK per project because it fits the current project-scoped secret model and keeps blast radius smaller than one global KEK.

## KMS Key Types

### Root Key

The root key protects internal KMS key material. It should not be stored in plaintext in PostgreSQL.

MVP options:

- operator-provided root key at boot
- mounted secret file with strict host permissions
- deployment secret injected only into the KMS service

Stronger future options:

- TPM-backed unseal
- YubiHSM or SoftHSM
- OS keychain or platform secure storage
- split-key operator unseal
- dedicated isolated KMS node

### KEK

The KEK wraps data keys.

KEK properties:

- generated randomly by the KMS
- versioned
- scoped to a tenant boundary
- never returned plaintext through the API
- can be rotated
- old versions remain available for decrypting older data until destroyed

### DEK

The DEK encrypts secret payloads.

DEK properties:

- 32 random bytes
- one DEK per secret version
- used with AES-256-GCM or future XChaCha20-Poly1305
- zeroed from memory after use where practical
- stored only as wrapped ciphertext

## Cryptographic Algorithms

MVP algorithms:

- DEK size: 32 bytes
- content encryption: AES-256-GCM
- IV size: 12 bytes for AES-GCM
- key wrapping: AES-256-GCM with a KEK
- random source: Node `crypto.randomBytes`
- AAD: required for both content encryption and key wrapping

Future algorithms:

- XChaCha20-Poly1305 through libsodium for nonce-misuse resistance
- Ed25519 for KMS-signed audit checkpoints
- X25519 for E2EE key wrapping to user or device public keys

Do not implement custom cryptographic primitives.

## Associated Data

Every encrypted payload should bind ciphertext to context with AEAD associated data.

Secret content AAD:

```json
{
  "purpose": "pentavault.secret.value",
  "organizationId": "org_123",
  "projectId": "project_123",
  "environmentId": "env_123",
  "secretId": "secret_123",
  "secretVersionId": "secret_123:v3",
  "encryptionMode": "managed"
}
```

Wrapped DEK AAD:

```json
{
  "purpose": "pentavault.secret.dek",
  "kmsKeyId": "kms_key_123",
  "kmsKeyVersion": 4,
  "organizationId": "org_123",
  "projectId": "project_123",
  "secretId": "secret_123",
  "secretVersionId": "secret_123:v3"
}
```

This prevents a ciphertext or wrapped key from being copied into another project or secret context without detection.

## KMS Operations

The KMS should expose only operations, not raw master keys.

Required operations:

```http
POST /v1/kms/keys
GET  /v1/kms/keys/:keyId
POST /v1/kms/keys/:keyId/wrap
POST /v1/kms/keys/:keyId/unwrap
POST /v1/kms/keys/:keyId/rotate
POST /v1/kms/keys/:keyId/rewrap
POST /v1/kms/keys/:keyId/disable
POST /v1/kms/keys/:keyId/enable
POST /v1/kms/keys/:keyId/schedule-destroy
POST /v1/kms/keys/:keyId/cancel-destroy
```

Never expose:

```http
GET /v1/kms/keys/:keyId/raw
POST /v1/kms/export-master-key
POST /v1/kms/export-kek
```

## Operation Details

### Create Key

Creates a logical KMS key and first key version.

Inputs:

- organization id
- project id or null
- purpose
- key scope
- algorithm
- policy

Output:

- key id
- current version
- key reference
- status

### Wrap

Wraps a DEK with the active KEK version.

Inputs:

- key id
- plaintext DEK, base64 encoded over the API boundary
- AAD
- caller context

Output:

- wrapped key ciphertext
- IV
- auth tag
- KMS key id
- KMS key version
- algorithm

### Unwrap

Unwraps a DEK only after policy checks.

Inputs:

- key id
- key version
- wrapped key ciphertext
- IV
- auth tag
- AAD
- caller context

Policy checks:

- caller service is authenticated
- caller purpose is allowed
- project/org scope matches the key
- operation is allowed for the key state
- rate limit has not been exceeded
- optional break-glass restrictions are satisfied

Output:

- plaintext DEK, returned only to the authorized backend service

### Rotate

Creates a new KEK version for future wrap operations. Existing wrapped DEKs remain decryptable with old key versions.

Rotation should not decrypt and rewrite all secret values. It should only change which KEK version wraps new DEKs.

### Rewrap

Rewraps an existing wrapped DEK from an old KEK version to the current KEK version.

Flow:

1. unwrap DEK under old key version inside KMS
2. wrap DEK under current key version inside KMS
3. return new wrapped DEK metadata
4. API updates only wrapped-key fields

The plaintext secret value does not need to be decrypted for KEK rotation.

### Disable

Prevents unwrap for a key while preserving stored material.

Use cases:

- suspected compromise
- account suspension
- emergency lockout

### Destroy

Destroys key material after a waiting period.

Destroying a KEK version makes any DEKs still wrapped only by that version unrecoverable. This should require explicit confirmation and audit.

## Data Model

Recommended KMS tables:

```text
kms_key
  id
  organization_id
  project_id nullable
  name
  purpose
  scope
  algorithm
  current_version
  status
  created_by_user_id nullable
  created_at
  updated_at

kms_key_version
  id
  key_id
  version_number
  algorithm
  encrypted_key_material
  key_material_nonce
  key_material_auth_tag
  root_key_ref
  status
  created_at
  activated_at
  retired_at nullable
  destroy_scheduled_at nullable
  destroyed_at nullable

kms_key_policy
  id
  key_id
  principal_type
  principal_id
  allowed_operations
  conditions_json
  created_at
  updated_at

kms_operation_audit
  id
  key_id
  key_version nullable
  operation
  actor_service
  actor_user_id nullable
  organization_id nullable
  project_id nullable
  secret_id nullable
  secret_version_id nullable
  allowed
  deny_reason nullable
  request_id
  ip_hash nullable
  user_agent_hash nullable
  created_at
```

Secret envelope additions:

```text
secret_version
  kms_key_id
  kms_key_version
  content_aad_hash
  wrapped_key_aad_hash
```

Existing wrapped-key fields can remain, but provider names should evolve:

```text
wrapped_key_provider = "pentavault-kms"
wrapped_key_ref = kms key id
```

## Service Boundaries

### Phase 1: In-Process KMS Module

The fastest implementation is an internal module behind the existing `KeyEncryptionProvider` interface.

Shape:

```text
packages/kms
  key store
  key policy
  root key loader
  wrap/unwrap service
  audit writer

packages/encryption
  KmsKeyEncryptionProvider
```

Benefits:

- smallest change to current backend
- easiest to test
- no network service to deploy at first
- existing envelope service can stay mostly intact

Limits:

- same process compromise can call KMS directly
- weaker isolation than a separate service

### Phase 2: Separate KMS Process

Move KMS to a separate internal service.

Shape:

```text
apps/api
  calls KMS over localhost/private network

apps/kms
  owns root key access
  owns key material operations
  exposes narrow HTTP or gRPC API
```

Required controls:

- mTLS between API and KMS
- service identity allowlist
- per-operation authorization
- separate logs
- separate deployment secrets
- no direct database access from public-facing API to raw KMS root material

### Phase 3: Isolated KMS Host

Run KMS on a separate host or VM with stricter access.

This improves resistance to API host compromise, but only if deployment, networking, and credentials are also separated.

## Deployment Models

### Local Development

Use an explicit dev root key.

Example:

```text
KMS_MODE=local
KMS_ROOT_KEY_BASE64=...
KMS_ALLOW_INSECURE_LOCAL=true
```

Rules:

- local mode must never be allowed in production
- seed data may create a project KEK automatically
- test fixtures can use deterministic root keys only in tests

### Single-VM Self-Hosted MVP

Run API, KMS, and Postgres on one VM, but keep boundaries explicit.

Recommended process layout:

```text
systemd:
  pentavault-api.service
  pentavault-kms.service
  postgresql.service
```

Secrets:

- API gets KMS client credentials
- KMS gets root key or root-key unwrap material
- Postgres does not get root key material

Network:

- API exposed behind reverse proxy
- KMS bound to localhost or private interface only
- Postgres not publicly exposed

This protects against database dump compromise, not full VM compromise.

### Docker Compose Development

Services:

```text
postgres
api
kms
```

Rules:

- KMS root key comes from compose env or mounted secret
- API does not receive `KMS_ROOT_KEY_BASE64`
- API receives only `KMS_URL` and KMS client credentials
- KMS port is not exposed publicly

### Production Single-Tenant

Recommended minimum:

```text
api nodes
kms node
postgres
redis for rate limits
central logs
backup storage
```

KMS hardening:

- no public ingress
- mTLS required
- separate service account
- separate deployment secret store
- root key loaded only by KMS
- key operation logs forwarded to append-oriented storage

### Enterprise Future

Enterprise deployment can support:

- dedicated KMS per tenant
- BYOK root wrapping
- HSM-backed root keys
- split-knowledge unseal
- customer-managed key import
- key export disabled by default
- region-specific key residency

## Authentication Between API And KMS

Use mTLS or signed service tokens.

MVP:

- static KMS service token in API environment
- token hash stored in KMS config
- rotate manually

Production:

- mTLS client certificates
- short-lived service identity tokens
- certificate pinning or private CA
- key operation authorization tied to service identity

Every KMS request should include:

- request id
- actor service
- actor user id if applicable
- organization id
- project id
- secret id if applicable
- purpose
- operation

## Policy Model

KMS policy should be separate from UI role checks.

The API enforces product authorization before requesting a decrypt. The KMS enforces cryptographic operation authorization before unwrapping a DEK.

Example policy:

```json
{
  "keyId": "kms_key_project_123",
  "allowedServices": ["pentavault-api"],
  "allowedOperations": ["wrap", "unwrap", "rewrap"],
  "conditions": {
    "projectId": "project_123",
    "purposes": ["secret.resolve", "secret.gateway", "secret.rotation"]
  }
}
```

The KMS should deny by default when context is missing or mismatched.

## Audit Requirements

Every KMS operation must create an audit event.

Audit fields:

- key id
- key version
- operation
- allowed or denied
- deny reason
- actor service
- actor user id if known
- organization id
- project id
- secret id
- request id
- timestamp

Never audit:

- plaintext secret values
- plaintext DEKs
- plaintext KEKs
- raw service tokens
- raw provider credentials

High-risk audit events:

- unwrap
- disable
- enable
- schedule destroy
- cancel destroy
- rotate
- policy update
- failed unwrap due to AAD mismatch
- failed unwrap due to disabled key

## Rotation Strategy

There are two rotations:

1. DEK rotation
2. KEK rotation

### DEK Rotation

DEK rotation creates a new secret version.

Use when:

- the secret value changes
- a secret version is marked compromised
- policy requires re-encrypting content

### KEK Rotation

KEK rotation creates a new KMS key version.

Use when:

- scheduled key hygiene requires rotation
- a KEK version is suspected risky
- migrating root protection

Existing secret values do not need to change. Existing wrapped DEKs should be rewrapped in the background.

Recommended process:

1. create new KEK version
2. mark new version active for new wraps
3. enqueue rewrap jobs for old wrapped DEKs
4. update wrapped-key metadata after each successful rewrap
5. retire old key version after all active data is rewrapped
6. schedule destroy only after retention and recovery windows pass

## Backup And Restore

Backups must include:

- encrypted secret envelopes
- wrapped DEKs
- KMS key metadata
- encrypted KMS key material
- key policies
- audit logs if required by retention policy

Backups must not include plaintext root keys unless the backup itself is an explicit encrypted operator recovery bundle.

Restore requires:

- database backup
- encrypted KMS key material
- correct root key or root-key recovery process

If the database is restored without the root key, encrypted secrets remain unrecoverable. This is correct behavior but must be documented for operators.

## Failure Behavior

KMS failures must fail closed.

Examples:

- KMS unavailable: secret resolution fails
- key disabled: unwrap fails
- AAD mismatch: unwrap fails
- old key version destroyed: unwrap fails
- unauthorized service: unwrap fails
- missing context: unwrap fails

User-facing API errors should be safe and not reveal key internals.

Example:

```json
{
  "code": "SECRET_DECRYPT_UNAVAILABLE",
  "error": "Secret value is temporarily unavailable."
}
```

Internal logs can include key id, key version, operation, and request id, but not key material.

## E2EE Relationship

Internal KMS and E2EE are complementary, not identical.

Managed encrypted mode:

- KMS can unwrap data keys for authorized backend operations
- supports Gateway Mode
- supports integrations and service accounts
- protects against database-only compromise

End-to-end encrypted mode:

- user/device keys decrypt data client-side
- backend and KMS cannot decrypt secret values
- strongest database and server-side confidentiality
- incompatible with backend-only gateway resolution unless client participates

Future E2EE design should add:

- user/device public keys
- encrypted private keys unlocked by passkey PRF, OS keychain, or recovery phrase
- project vault keys wrapped per authorized user/device
- recovery key and owner/admin recovery policy
- explicit "server cannot recover this value" UX

Do not claim KMS-backed managed encryption is zero-knowledge.

## Required Product Features

Admin features:

- create project KMS keys automatically
- view key id, scope, status, and current version
- rotate project key
- disable project key
- view key operation audit
- schedule key destruction
- cancel destruction
- show decrypt outage state when key unavailable

Security features:

- key operation audit export
- unwrap anomaly alerts
- key disabled alert
- key rotation reminder
- stale key version report
- failed unwrap alert

Developer features:

- local dev mode with explicit warnings
- test root key setup
- migration path from `LOCAL_KEK_BASE64`
- clear docs for backup and restore

Enterprise features:

- dedicated KMS deployment
- BYOK root wrapping
- HSM-backed root keys
- split-knowledge unseal
- tenant-specific key residency
- configurable rotation policy
- audit forwarding

## Migration From Current Envelope Encryption

Current envelopes use provider values like `local-dev` or `env-master-key`.

Migration path:

1. add KMS tables and KMS provider code
2. create one KMS key per existing project
3. add `pentavault-kms` provider support without removing old provider support
4. for each encrypted secret version:
   - unwrap old DEK using current provider
   - wrap DEK with project KMS key
   - update wrapped-key provider/ref/ciphertext/IV/auth tag
   - preserve content ciphertext unchanged
5. mark migrated rows with KMS key id and version
6. remove old provider only after all active encrypted rows are migrated

Plaintext/base64 secrets cannot be migrated cryptographically without reading the plaintext and creating a real encrypted version. That should be a user-visible conversion.

## Implementation Phases

### Phase 0: Design Lock

- decide KMS key scope for MVP: project KEK recommended
- define API/KMS provider interface
- define AAD format
- define KMS tables
- define deployment secrets
- define migration rules from old providers

Exit criteria:

- no ambiguity on key hierarchy, AAD, and rotation behavior

### Phase 1: In-Process KMS

- add `packages/kms`
- add KMS key store
- add key version store
- add audit writer
- implement wrap, unwrap, rotate, rewrap
- add `KmsKeyEncryptionProvider`
- keep existing envelope encryption service intact

Exit criteria:

- unit tests prove round-trip encryption
- wrong AAD fails
- disabled key fails
- rotated key can decrypt old versions
- rewrap changes wrapped key without changing content ciphertext

### Phase 2: Secret Storage Integration

- create KMS key for each project
- use project KMS key for new encrypted secrets
- store KMS provider metadata in secret versions
- add migration job for current encrypted rows
- add admin-visible key status to security pages later

Exit criteria:

- existing encrypted secrets still resolve
- new encrypted secrets use `pentavault-kms`
- old provider fallback remains until migration completes

### Phase 3: KMS Operations UI And Audit

- expose key status in project security settings
- add rotate action
- add disable action with confirmation
- add key operation audit filters
- add alerts for failed unwrap and disabled key attempts

Exit criteria:

- admins can understand key health without seeing key material

### Phase 4: Separate KMS Service

- create `apps/kms`
- move KMS service into separate process
- add mTLS or service token auth
- bind KMS to private network only
- update API provider to call KMS over HTTP or gRPC

Exit criteria:

- API process does not receive root key material
- KMS root key is isolated to KMS process

### Phase 5: Production Hardening

- add root-key rotation or root-key rewrap process
- add KMS backup and restore runbook
- add rate limits on unwrap
- add audit forwarding
- add key destruction workflow
- add deployment health checks
- add incident runbook

Exit criteria:

- database-only restore and KMS restore are documented and tested

### Phase 6: E2EE Mode

- add separate `e2ee` encryption mode
- add user/device key model
- add encrypted project vault key shares
- add browser/CLI unlock flow
- add recovery flow
- block backend-only gateway use for E2EE secrets unless client supplies plaintext just-in-time

Exit criteria:

- product can honestly distinguish managed encryption from end-to-end encryption

## Test Matrix

Unit tests:

- create KMS key
- wrap and unwrap DEK
- unwrap with wrong AAD fails
- unwrap with wrong key version fails
- disabled key denies unwrap
- destroyed key denies unwrap
- rotation creates new active version
- old wrapped DEK remains decryptable after rotation
- rewrap changes wrapped DEK metadata
- KMS never returns KEK material

Integration tests:

- create encrypted secret with KMS provider
- resolve encrypted secret through compatibility mode
- resolve gateway secret through gateway path
- deny resolve when key disabled
- migrate old `env-master-key` wrapped DEK to KMS
- audit event emitted for wrap
- audit event emitted for unwrap
- failed unwrap event emitted without plaintext

Security regression tests:

- logs do not contain plaintext secret values
- logs do not contain plaintext DEKs
- logs do not contain KEK material
- DB rows do not contain plaintext KEKs
- AAD context prevents cross-project wrapped-key reuse

Deployment tests:

- API starts without root key when external KMS URL is configured
- KMS refuses production local mode
- KMS fails closed when root key is missing
- backup restore succeeds only with root key

## Open Decisions

1. Should MVP KEKs be scoped to project, environment, or organization?
   - Recommendation: project for MVP.

2. Should in-process KMS ship before separate KMS service?
   - Recommendation: yes, but keep the interface network-shaped.

3. Should the root key be operator-provided at boot or stored as a mounted secret?
   - Recommendation: mounted secret for single-VM MVP, operator unseal later.

4. Should KMS and API share the same database?
   - Recommendation: acceptable for MVP if KMS key material is encrypted by a root key outside the database. A separate database can come later.

5. Should KMS support raw encrypt/decrypt payload operations?
   - Recommendation: only for small internal metadata later. For secrets, keep envelope encryption and wrap/unwrap DEKs.

6. Should E2EE be part of the first KMS milestone?
   - Recommendation: no. Build managed internal KMS first, then add E2EE as a separate mode.

## Recommended First Commit Sequence

```bash
git commit -m "docs(kms): add internal kms implementation blueprint"
git commit -m "feat(kms): add key store and key version schema"
git commit -m "feat(kms): implement in-process wrap and unwrap service"
git commit -m "feat(encryption): add pentavault kms key provider"
git commit -m "feat(secrets): use project kms keys for encrypted secrets"
git commit -m "feat(kms): add key rotation and rewrap workflow"
git commit -m "feat(kms): add key operation audit events"
git commit -m "feat(kms): add migration from env master key envelopes"
git commit -m "feat(kms): split kms into private service"
git commit -m "docs(kms): add deployment and recovery runbooks"
```

## Final Recommendation

Build PentaVault KMS in two steps.

First, replace `LOCAL_KEK_BASE64` direct wrapping with a project-scoped internal KMS provider while keeping the current envelope encryption shape. This gives the product a real database-compromise boundary without rewriting the secret engine.

Second, split KMS into its own private service so the API no longer receives root key material. That is the point where the system becomes a real internal KMS rather than an env-var wrapper with extra tables.

After that, add E2EE as a separate encryption mode for secrets that must be unreadable even by PentaVault backend services.
