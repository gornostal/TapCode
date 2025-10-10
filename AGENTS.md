# Repository Guidelines

## Project Structure & Module Organization

PocketIDE is split between a Vite React client and a typed Express server.

- `client/src/` holds UI entry points (`main.tsx`, `App.tsx`) and global styles in `index.css`; imports use the `@` alias.
- `server/` bootstraps Express (`index.ts`), defines routes in `routes.ts`, and wires Vite middleware via `vite.ts`; utilities live in `server/utils/`.
- `shared/` stores cross-layer contracts such as `messages.ts`, re-exported through the `@shared` alias.
- Build artifacts land in `dist/public` and `dist/server`; keep generated output out of Git.

## Build, Test, and Development Commands

Install dependencies with `npm install` on Node.js ≥ 18.17.

- `npm run dev` starts the Express entry point with tsx and proxies the Vite client on http://localhost:5000.
- `npm run build` runs `build:client` and `build:server`, producing deployable bundles under `dist/`.
- `npm run start` serves the compiled server for production verification; run after a build.
- `npm run check` performs a project-wide TypeScript compilation with `--noEmit`.
- `npm run lint` applies ESLint rules to `.ts/.tsx` files.
- `npm run test` executes `check`, formats the tree with Prettier (`--write`), then lints—review and stage formatting changes.

## Coding Style & Naming Conventions

The codebase uses strict TypeScript and functional React components. Favor PascalCase for components (`App.tsx`), camelCase for variables, and kebab-case for CSS classes. Keep indentation at two spaces; Prettier (default config) governs whitespace and quote style, while ESLint enforces TypeScript and React Hooks best practices. Prefer configured aliases (`@/...`, `@shared/...`) over long relative paths, and avoid disabling linters unless a rule is demonstrably incorrect.

## Testing Guidelines

Run 'npm run test' to verify the code.

## Commit & Pull Request Guidelines

Match the existing history by writing short, imperative commit subjects (e.g., `Add hello route handler`) and use bodies to reference issues or context. Every PR should explain user-facing or DX-impacting changes, document the scripts you ran (`npm run dev`, `npm run test`, etc.), and attach screenshots or logs when UI or API behavior shifts. Ensure `npm run test` passes locally before requesting review, and call out any follow-up tasks in a checklist.
