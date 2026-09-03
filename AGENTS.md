# Comitium Web

This repository owns Comitium's React/TanStack recruiter product, public job board, and candidate-facing web flows.

## Context first

Before editing, read `../PRODUCT.md`, the relevant current-state documents in `../comitium-docs/architecture/`, and any active spec in full. Use these entry points:

- app shell and route access: `org-app-shell.md` and `permission-architecture.md`;
- public jobs and apply: `public-job-board.md` and `apply-flow.md`;
- recruiter jobs and candidates: the relevant job, pipeline, candidate, activity, or scheduling document;
- ciphertext, unlock, or local private data: `encryption-and-keys.md`.

`../comitium-docs/architecture/README.md` defines current shared boundaries. Follow them until an explicit refactor changes and documents them.

## Implementation rules

- Reuse existing product components, `src/components/ui/` primitives, feature patterns, query hooks, schemas, and `src/lib/utils/` helpers before adding custom UI or utility code.
- Keep server-state ownership in query hooks and the `qk` query-key factory. Do not hand-author a second cache-key topology.
- API wrappers validate JSON responses with the established Zod schemas. Model genuinely empty responses explicitly.
- Use `OrgGuard` and `OrgRouteShell` for their documented responsibilities; do not stack duplicate authorization/loading shells inside feature pages.
- Preserve the client-side encryption boundary. Do not move plaintext or private search state to the API for implementation convenience.
- Do not manually edit generated files under `src/generated/`; use the repository generator when the source contract changed.
- Prefer straightforward React code. Add memoization only for measured cost or stable-identity requirements, not by reflex.
- Public surfaces must not expose admin terminology, internal mechanisms, fake totals, or misleading state. UI copy and counts must match the data the API actually provides.

## UI changes

Before implementation, state the page's user, goal, and primary action. Cover the states that materially apply: normal, loading, empty, error, large data, filtered, mobile, dark/light, and auth boundaries.

Use the existing design tokens and component variants. A one-off visual primitive is justified only when the design system cannot express the required behavior cleanly.

For visual or interaction changes that cannot be established from code and tests, verify the real page in the native browser at the relevant viewport and theme. Pure refactors do not require browser work.

## Verification

Use Bun and repository scripts:

```bash
bunx biome lint src/path/to/changed-file.tsx
bunx tsc --noEmit
bun run test --run
```

Run `bun run build` when routes, bundling, generated code, environment boundaries, or production rendering are affected. Narrow verification is fine for a narrow change; auth, encryption, cache invalidation, complex interaction, and concrete regressions require behavioral coverage.

`bun run check` is read-only (`biome ci src`) but repository-wide; use it only when that breadth is useful. Formatting commands write files and are not verification.

## Definition of done

Walk the affected user flow through route guards, queries/mutations, loading and error states, cache invalidation, and visible result. Update current-state architecture docs in the same chunk when behavior, ownership, or an API contract changes.
