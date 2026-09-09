# Skill and Intellectual-Property Protection

## What is technically achievable

| Delivery model | Recipient can run it | Skill confidentiality |
| --- | --- | --- |
| Raw Skill in repository | Yes | None |
| Minified/encrypted client bundle | Yes | Weak; recoverable at runtime |
| Container on recipient infrastructure | Yes | Moderate at best; administrators can inspect layers and memory |
| Owner-controlled remote execution | Yes, through authorized calls | Strongest practical boundary |

The last model is recommended. It prevents source delivery, supports access
revocation, rate limits, audit records and version upgrades. It cannot prevent a
recipient from observing their own inputs and outputs or approximating behavior
over time, so contracts and legal terms remain necessary.

## Repository controls

- Keep the repository private.
- Grant least-privilege collaborator access.
- Protect the default branch and require review.
- Enable secret scanning and dependency alerts.
- Publish versioned releases without protected source files.
- Never include production credentials or Skill prompt hashes in issues, logs or
  CI artifacts.
