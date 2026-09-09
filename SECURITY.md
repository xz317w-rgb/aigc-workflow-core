# Security Policy

## Export boundary

This repository must never contain credentials, provider endpoints, production
hostnames, user data, raw prompts, Skill source files or internal prompt hashes.

Run `npm run verify` before every release. The export check rejects common secret
formats and forbidden source locations. It complements, but does not replace,
repository secret scanning and human review.

## Reporting

Report suspected leakage privately to the repository owner. Do not file public
issues containing credentials, user data, prompts or proprietary Skill content.
