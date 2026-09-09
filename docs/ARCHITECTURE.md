# Architecture

```text
Partner product
    │
    ▼
WorkflowEngine ─── WorkflowStore
    │                   │
    │ opaque call       └── checkpoints / audit decisions
    ▼
Operation adapters
    │
    ├── partner-owned implementations, or
    └── owner-controlled protected execution service
```

The engine knows operation names, ordering, conditions and success/failure
receipts. It does not know how a protected operation is implemented.

## Trust boundary

The partner controls the workflow engine and can inspect every file in this
repository. Therefore no confidential Skill content is placed here. Protected
instructions remain behind a service boundary controlled by their owner.

An operation should return only the minimum receipt required for orchestration:

```json
{
  "ok": true,
  "status": "completed",
  "outputRef": "opaque://result/123",
  "summary": { "assetCount": 2 }
}
```

Large outputs and protected intermediate reasoning should remain in the
authorized operation service or the partner's own storage.
