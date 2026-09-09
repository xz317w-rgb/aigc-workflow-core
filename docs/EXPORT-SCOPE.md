# Export Scope

## Exported

- Generic workflow stages and conditions
- Deterministic state transitions
- Resume and idempotency behavior
- Operation and persistence contracts
- Opaque result receipts
- Tests and a fake local example

## Excluded

- Skill files and prompt templates
- Production Skill IDs, versions and hashes
- Model/provider clients and routing rules
- API settings and credentials
- Canvas and workbench UI implementation
- Asset library implementation
- User, billing, memory, knowledge and administrative systems
- Production deployment scripts and infrastructure

This is a clean-room portability layer. It is not a source mirror of the
production platform.
