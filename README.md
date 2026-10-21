# Pchelpcrm

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## PocketBase

The backend is [PocketBase](https://pocketbase.io/) (v0.40.x). The `pocketbase` binary must be in `PATH`.

- `pocketbase/pb_migrations/` — collection schema as JS migrations (committed).
- `pocketbase/pb_data/` — local dev database (not committed).

Local development:

```bash
cp .env.example .env    # then set PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD
pnpm pb:superuser       # create the superuser or reset its password (safe to re-run)
pnpm pb:serve           # http://127.0.0.1:8090, admin UI at /_/
```

Migrations are applied on `pb:serve` start (or explicitly with `pnpm pb:migrate`). Schema changes made in the dev admin UI are written to `pocketbase/pb_migrations/` automatically — commit them.

Production uses the same binary version and the same `pb_migrations/`, with its own data dir:

```bash
pocketbase serve --dir /path/to/pb_data --migrationsDir pocketbase/pb_migrations --automigrate=false --http 127.0.0.1:8090
PB_DIR=/path/to/pb_data node --env-file=.env scripts/pb-superuser.mjs
```

Back up by copying the `pb_data` directory.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
