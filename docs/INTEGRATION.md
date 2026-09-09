# Integration Guide

## 1. Implement operations

Provide one asynchronous function for every operation required by the selected
workflow definition. Functions receive a frozen context containing the task ID,
current input and prior receipts.

## 2. Provide durable storage

Implement `findByFingerprint`, `get` and `save`. `save` must be atomic. Use
account and tenant identifiers outside this library to enforce isolation.

## 3. Map protected capabilities

When using the owner's protected Skill service, operation adapters should send
only user-authorized inputs and an idempotency key. Keep authentication in the
host secret manager. Do not place endpoints or credentials in this repository.

## 4. Enforce authorization outside the engine

The engine is not an identity or permission system. The host must verify the
caller before loading input, invoking operations or returning output references.

## 5. Verify before release

Run:

```sh
npm run verify
```

Also enable private-repository secret scanning and review the final Git tree.
