You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Project Overview

Pchelpcrm is a CRM for handling service requests (orders) of a private service professional: computer help, home repairs, furniture assembly, plumbing, electrical work, etc. The domain is deliberately generic: any "client calls, a job gets done" business fits. Currently used personally by the author, so keep it simple.

Domain entities:

- **User** — the owner of the personal account who works in the CRM (a PocketBase auth record). Everything below belongs to a user and must be isolated per user (API rules).
- **Client** — a customer of the user. A separate entity, not a user.
- **Request** — a service request (order). Belongs to exactly one client; one client can have many requests.
- **Category** — a request category. Dynamic: created and edited by the user, never hardcoded in code or enums.

Auth: PocketBase auth collection, login by email + password.

Stack: Angular (see rules below) + PocketBase (`pocketbase/pb_migrations/` holds the schema) + pnpm. Add other libraries (e.g. a UI component library) only when really needed.

Delivery plan: after the first release the app ships as ONE Docker container (Angular app + PocketBase together, no docker-compose) deployable to a production server. Do not design anything that requires multiple containers.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
    - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## UI / Visual Design

- All visual and frontend work (layout, styling, components' look, colors, typography, responsive behavior) MUST be done using the skills `ui-ux-pro-max` and `frontend-design` (`frontend-design:frontend-design`)
- Invoke both skills via the Skill tool before building or reshaping any UI
- Always get feedback from the real browser via the Playwright MCP (`mcp__playwright__*`): use it during UI development and to verify every visual/frontend change (snapshot, screenshot, console messages, responsive sizes via `browser_resize`)
- Skill recommendations must not violate the Accessibility Requirements and the Angular rules of this file; on conflict, this file wins

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Routing

- All routes are lazy loaded (`loadComponent` / `loadChildren`), including feature-internal ones
- All routes render as a plain client-side SPA (`RenderMode.Client` in `app.routes.server.ts`). Do NOT use SSR or prerender by default; enable them only for specific routes the user explicitly asks for

## Project Structure

- Organize code by feature, not by file type: `src/app/<feature>/` (e.g. `src/app/clients/`), not global `components/`, `services/`, `pipes/` folders
- Keep everything a feature needs inside its folder: components, services, models, routes and tests
- One concept per file: one component, directive, pipe or service per file
- Keep the files of one entity together in the same folder with the same base name (`order-list.ts`, `order-list.html`, `order-list.css`, `order-list.spec.ts`)
- Use kebab-case file names. Do NOT add `.component` / `.service` suffixes (matches the existing `app.ts`)
- Put unit tests next to the code they test (`*.spec.ts`)
- Each feature has its own routes file (`<feature>.routes.ts`) and is lazy loaded from `app.routes.ts` via `loadChildren` / `loadComponent`
- Do NOT create `core/` or `shared/` folders upfront; add shared code only when two or more features actually need it
- Features must not import from each other's internals; extract the common part to a shared location instead

## Git Branches

- Follow GitHub Flow: there is NO separate `develop` branch. `main` is the only long-lived branch
- Create every working branch directly from the latest `main`: features, fixes and release preparation alike
- Name branches by purpose in kebab-case: `feat/<short-name>`, `fix/<short-name>`, `release/<version>`
- Do NOT create branches on your own: the user creates a branch (named as above) when a task is large (a feature, many related changes). Otherwise work in the current branch
- Small point corrections (config tweaks, adding a dependency, minor fixes) need no separate branch: they go straight to the current branch, usually `main`, as a normal Conventional Commit
- Do NOT commit on your own: make a commit only when the user explicitly asks for it, because the user reviews changes before every commit. When asked, commit only to the current branch (Conventional Commits)
- Do NOT merge, rebase onto `main`, push, or delete branches: merging and cleaning up branches is done by the user
- There are no pull requests: the user works with a local repository only
