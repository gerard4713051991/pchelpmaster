You are an expert in TypeScript, Angular, and PocketBase. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Project

Pchelpcrm is a multi-user CRM for private service professionals: clients, orders, tags, and a public link to an order. Angular 22 with SSR + PocketBase 0.40 + pnpm. The description, commands, and repository structure are in `README.md`. Keep solutions simple.

## Before you start

Read:

1. `docs/architecture.md` — layers, DI, SSR, security, UI principles;
2. `docs/data-model.md` — collections, fields, access rules;
3. `docs/testing.md` — how tests are written;
4. the page `docs/guide/<app part>.md` for the part you are changing, if it already exists (table of contents — `docs/README.md`).

## How to work

- Develop with TDD: tests first, then the implementation.
- If a task contains a "Forbidden" section ("Запрещено"), obey it.
- If a solution diverges from `docs/architecture.md` or `docs/data-model.md`, stop and discuss the document change with the user.
- Before finishing, run `pnpm lint` and all existing test suites (`pnpm test`, `pnpm test:api`, `pnpm test:integration`, `pnpm e2e` — those already set up).
- Update the documentation in the same change (see the "Documentation" section below).

## Domain

- An order in code is `Order`; the collection, folder, and routes are `orders`.
- Tags (`Tag`) are created by the user. They replace categories and sources: no separate categories/sources and no hardcoded lists or enums of tags in code.
- Everything except the user belongs to the user (the `owner` field). Isolation is enforced by PocketBase access rules, not by the frontend.
- Delivery is ONE Docker container (SSR server + PocketBase). Do not design anything that requires multiple containers.

## Architecture

- Layers inside a feature: `domain/`, `data/`, `ui/`, `testing/`. `domain/` does not import `@angular/*` or `pocketbase`; `ui/` does not import `pocketbase` or `data/`. PocketBase records never leave `data/`.
- Repositories and services that may get another implementation are described by an abstract class (which doubles as the DI token) and are registered in the feature's `provideXxx()`.
- A feature imports another feature only through its `index.ts`, with no cycles; feedback goes through extension points (`InjectionToken`).
- There is no separate store layer; a signal-based store only if several components share the same state.
- PocketBase errors are translated into domain errors from `shared/`.

## SSR and data isolation

- **Forbidden** to create PocketBase at module level or to keep user data in module variables, static fields, and caches outside DI. `new PocketBase(` only in the factory in `shared/pocketbase/`.
- Do not touch `window`/`document` without a platform check; use `DOCUMENT`, `isPlatformBrowser`, `afterNextRender`.
- The browser reaches PocketBase via `/pb/*`; the SSR server goes directly via `PB_URL` and does not proxy the API.
- Protected files (attachments) are not rendered on the server.

## Project structure

- Code is organized by feature, not by file type: `src/app/<feature>/` (e.g. `src/app/clients/`), not global `components/`, `services/`, `pipes/` folders
- Everything a feature needs lives inside its folder, including routes and tests
- One concept per file: one component, directive, pipe, or service per file
- Files of the same entity sit together with the same base name (`order-list.ts`, `order-list.html`, `order-list.css`, `order-list.spec.ts`)
- File names in kebab-case. Do NOT add `.component` / `.service` suffixes (like the existing `app.ts`)
- Each feature has its own routes file (`<feature>.routes.ts`), and the feature is lazy-loaded from `app.routes.ts`
- Shared infrastructure goes in `src/app/shared/`, only when the code is really needed by two or more features. Do not create a `core/` folder

## TypeScript

- Strict type checking
- Prefer type inference when the type is obvious
- Avoid `any`; if the type is unknown, use `unknown`

## Angular

- Always use standalone components over NgModules
- Do NOT set `standalone: true` in Angular decorators — it is the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly — `OnPush` is the default in Angular v22+.
- The selector prefix for components and directives is `ksk` (`ksk-order-list`, `kskAutofocus`)
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings in the `host` object of the `@Component` or `@Directive` decorator
- Use `NgOptimizedImage` for all static images.
    - `NgOptimizedImage` does not work for inline base64 images.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way binding with the `[(prop)]` syntax instead of pairing `input()` with `output()`
- Prefer inline templates for small components; move large templates and styles to separate files
- In external templates/styles, use paths relative to the component's TS file.
- Do NOT import `CommonModule`; import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`

### State

- Signals for local component state
- `computed()` for derived state
- `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals; use `update` or `set`
- Load data asynchronously in components with `resource()` (SSR waits for it to complete)

### Templates

- Keep templates simple, without complex logic
- Native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Do NOT use `ngClass`, use `class` bindings; do NOT use `ngStyle`, use `style` bindings
- Use the async pipe for observables
- Do not assume globals (e.g. `new Date()`) are available in templates.
- User-provided text is never inserted via `innerHTML`

### Forms

- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- If not Signal Forms, use Reactive forms, not Template-driven ones

### Services

- A service is responsible for a single task
- `providedIn: 'root'` for singletons
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

### Routing

- All routes are lazy-loaded (`loadComponent` / `loadChildren`), including the internal routes of features
- `RenderMode.Server` in `app.routes.server.ts` only for `''` (home), `orders/:id` (order page), `p/:token` (public page). All other routes are `RenderMode.Client`. New SSR routes only at the user's explicit request
- Private routes are protected by `authGuard`

## UI and accessibility

- The app MUST pass all AXE checks and meet WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
- All visual and frontend work (layout, styles, look of components, colors, typography, responsiveness) MUST be done using the skills `ui-ux-pro-max` and `frontend-design` (`frontend-design:frontend-design`). Invoke both skills via the Skill tool before building or reshaping any UI.
- Always get feedback from a real browser via the Playwright MCP (`mcp__playwright__*`): during UI development and to verify every visual change (snapshot, screenshot, console messages, responsive sizes via `browser_resize`).
- Skill recommendations must not violate the rules of this file; on conflict, this file wins.
- Plain CSS without preprocessors or CSS frameworks; colors, spacing, and sizes only via design tokens in `src/styles.css`. Dark theme via `prefers-color-scheme`.
- Minimal GPU load: animate only `transform` and `opacity`, respect `prefers-reduced-motion`; no `backdrop-filter`, `filter: blur()`, heavy or layered shadows, animated gradients, or permanent `will-change` (details — `docs/architecture.md`, section "Формы и UI").
- The UI is in Russian only (no i18n framework); dates and amounts use the `ru-RU` locale, the currency is rubles. Mobile-first.

## Tests

- Unit and integration tests live next to the code (`*.spec.ts`, `*.integration.spec.ts`); API and e2e tests live in `tests/`.
- Tests that need PocketBase use a temporary instance, not `pocketbase/pb_data`.
- Always verify data isolation with two users.
- Other rules — `docs/testing.md`.

## Documentation

- When you change or add a part of the app, in the same change update or create its page in `docs/guide/` using the template from `docs/README.md` and add it to the table of contents.
- If a decision changes the architecture, the data model, or the way of testing, update `docs/architecture.md`, `docs/data-model.md`, or `docs/testing.md`.
- A new command, environment variable, or startup step — update `README.md`.

## Git

- GitHub Flow: there is NO separate `develop` branch. `main` is the only long-lived branch
- Every working branch is created directly from a fresh `main`: features, fixes, and release preparation
- Branches are named by purpose in kebab-case: `feat/<short-name>`, `fix/<short-name>`, `release/<version>`
- Do NOT create branches yourself: the user creates a branch (by the rules above) when the task is large (a feature, many related changes). Otherwise work in the current branch
- Small targeted changes (settings, adding a dependency, minor fixes) do not need a separate branch: they go directly to the current branch, usually `main`, as a regular Conventional Commit
- Do NOT commit yourself: commit only at the user's explicit request, because the user reviews changes before every commit. When asked, commit only to the current branch (Conventional Commits)
- Do NOT merge, rebase onto `main`, push, or delete branches: merging and branch cleanup are done by the user
- There are no pull requests: the user works only with the local repository
