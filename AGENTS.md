# AGENTS.md

This file is for coding agents working in `/home/ubuntu/repos/oci-webui`.
Follow repository reality over generic best practices.

## Project Snapshot
- Stack: Next.js 16 App Router, React 19, TypeScript 5, pnpm 10, ESLint 9.
- Package manager: `pnpm` (`packageManager` is pinned in `package.json`).
- Path alias: `@/*` resolves to `./src/*`.
- TypeScript runs in `strict` mode.
- ESLint extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- There is no root `test` script today.
- Existing tests use Node's built-in runner (`node:test`) and `node:assert/strict`.

## Install / Run / Validate Commands

### Install
```bash
pnpm install
```

### Start dev server
```bash
pnpm dev
```

### Production build
```bash
pnpm build
```

### Start production server
```bash
pnpm start
```

### Lint
```bash
pnpm lint
```

### Type-check
There is no dedicated script; use TypeScript directly:
```bash
pnpm exec tsc --noEmit
```

### Run tests
There is no repository-wide `pnpm test` script.
Run Node test files directly:
```bash
node --test src/lib/registry/catalog-filter.test.ts
```

### Run a single test file
```bash
node --test src/lib/registry/catalog-filter.test.ts
```

### Run a single named test inside a file
```bash
node --test --test-name-pattern="filterRepositoriesWithTags keeps repositories with at least one valid tag" src/lib/registry/catalog-filter.test.ts
```

### Typical targeted verification
For a small helper change:
```bash
node --test src/lib/registry/catalog-filter.test.ts && pnpm lint
```

For broader TypeScript-sensitive changes:
```bash
pnpm exec tsc --noEmit && pnpm lint
```

## Test Conventions
- Write tests with `import test from "node:test"`.
- Use `import assert from "node:assert/strict"` for assertions.
- Prefer focused unit tests for pure helpers and data transformations.
- Test behavior, not implementation details.
- Cover happy path, edge cases, and expected failures.
- Keep tests deterministic and independent.
- Use descriptive test names that state the expected behavior.

## Import Conventions
- Use ES module syntax throughout.
- Use `import type` for type-only imports.
- Prefer `@/` aliases for imports from `src/`.
- Prefer relative imports for nearby siblings in the same feature folder.
- Group imports in this order when practical:
  1. framework/runtime imports (`react`, `next/*`, `node:*`)
  2. internal aliased imports (`@/...`)
  3. local relative imports (`./...`)
- Keep imports explicit; do not rely on hidden globals.

## Formatting Conventions
- Match the surrounding file style before forcing a new style.
- Most repository files use double quotes and semicolons.
- Some generated/shadcn-style UI files omit semicolons; preserve surrounding style there.
- Prefer multi-line wrapping once a call, object, or JSX prop list gets long.
- Keep functions and components small and readable.
- Use guard clauses and early returns instead of deep nesting.
- Add comments sparingly; explain why, not what.

## TypeScript Conventions
- Preserve `strict`-mode compatibility.
- Annotate public function parameters when inference is not obvious.
- Prefer precise return types for exported helpers and APIs.
- Use `string | null` / `T | undefined` intentionally and handle both branches.
- Prefer domain interfaces/types over loose `any`.
- Avoid `any` unless absolutely unavoidable; use `unknown` first when validation is needed.
- Use immutable patterns for passed data structures when practical.
- Keep data transformations pure when possible.

## Naming Conventions
- File names are generally kebab-case (`repo-list.tsx`, `catalog-filter.ts`).
- React component names are PascalCase.
- Functions and variables are camelCase.
- Predicates should read clearly (`isLoading`, `isSingleRegistry`).
- Keep names descriptive and domain-specific.
- Prefer full words over unclear abbreviations.

## React / Next.js Conventions
- Add `"use client"` only for components that need hooks, browser APIs, or client state.
- Keep route handlers under `src/app/api/**/route.ts`.
- Return `NextResponse.json(...)` from API handlers.
- Parse query params with `new URL(request.url)`.
- Keep page/layout files thin; move reusable logic into `src/lib`, `src/hooks`, or components.
- Prefer existing UI primitives from `src/components/ui` before inventing new patterns.

## Error Handling Conventions
- Handle boundary errors explicitly in route handlers and async UI actions.
- In API routes, convert expected failures into structured JSON responses with proper status codes.
- Follow the current route pattern:
  - return `401` for unauthorized access
  - return `400` for missing or invalid request parameters
  - return `500` with a safe message for unexpected failures
- Do not swallow errors silently.
- Use meaningful error messages when throwing.
- Prefer `try/catch` at I/O boundaries, not inside every pure helper.

## State / Data / Architecture Guidelines
- Prefer pure helpers for business logic and data filtering.
- Inject dependencies into helpers when that improves testability.
- Avoid mutation when a derived value or copied structure is clearer.
- Keep modules focused on one job.
- Reuse existing helpers/constants before adding new ones.
- For repeated className composition, use `cn(...)` from `src/lib/utils`.

## Rule Files: Cursor and Copilot
As of this analysis, these rule files do **not** exist in the repository:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

If any of them are added later, update this file and treat them as repository-specific constraints.

## Practical Agent Expectations
- Prefer the smallest safe change.
- Verify targeted changes with the narrowest relevant command first.
- For testable helper changes, run the specific `node --test ...` file before broader validation.
- For UI or route changes, at minimum run `pnpm lint`; add `pnpm exec tsc --noEmit` when types may be affected.
- Preserve nearby patterns unless there is a strong reason to refactor.
- Do not assume Jest or Vitest; this repo currently uses Node's test runner directly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
