<p align="center">
  <a href="https://comitium.co">
    <img src="apps/site/public/favicon.svg" alt="Comitium" width="80" height="80">
  </a>
</p>

<h1 align="center">Comitium</h1>

<p align="center">
  <strong>Hiring built for privacy and accountability.</strong>
</p>

<p align="center">
  A modern ATS for teams and candidates.
</p>

<p align="center">
  <a href="https://comitium.co">Website</a>
  ·
  <a href="packages/crypto/README.md">Encryption</a>
  ·
  <a href="https://github.com/comitiumhq/contracts">Contracts</a>
</p>

## Built for both sides

Comitium gives teams one place to manage jobs, candidates, pipelines, collaboration, and interviews.

Candidates can discover roles, apply, and follow their applications.

## Repository

This repository contains Comitium's open-source web client.

| Path | Purpose |
| --- | --- |
| `apps/site` | Public website and job discovery |
| `apps/my` | Candidate workspace, application flow, and self-scheduling |
| `apps/app` | ATS and organization workspace |
| `packages` | Shared UI, auth, jobs, chain, schemas, and cryptography |

## Development

[Bun 1.2.19](https://bun.sh/) is required.

```bash
bun install --frozen-lockfile
bunx playwright install chromium
bun run check
bun run typecheck
bun run test --run
bun run build
```

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Licensed under the [GNU General Public License v3.0 or later](LICENSE).
