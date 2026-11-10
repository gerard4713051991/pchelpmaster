# Стенд API-тестов

Тесты бэкенда (схема, миграции, правила доступа, изоляция пользователей) на чистом Vitest в Node, с запросами к временному PocketBase. Общие правила и устройство тестового PocketBase — в [testing.md](../../testing.md).

`pnpm test:api` = `tsc -p tsconfig.tests.json && vitest run --config vitest.api.config.mts`: чистый Vitest в Node, без Angular.

- Сначала проверяются типы тестового кода (`tsconfig.tests.json`: `tests/**`, `vitest.*.config.mts` и `proxy.conf.mjs`; `allowJs` нужен, чтобы `tests/lint/` импортировали `.mjs`-конфиг): сам Vitest типы не проверяет.
- `vitest.api.config.mts`: `include: tests/api/**/*.api.spec.ts`, `globalSetup: tests/support/global-setup.ts`, таймауты 20 с (запас на старт PocketBase внутри теста).
- `global-setup.ts` поднимает один PocketBase на прогон и передаёт тестам `pbUrl`, `pbDataDir`, `pbSuperuser` через `project.provide`; в тестах — `inject('pbUrl')` и т. д. из `vitest`. Типы этих значений — `tests/support/provided-context.d.ts`.
- Тесты самого стенда — `tests/api/harness.api.spec.ts`. Проверка уборки по `SIGINT`/`SIGTERM` запускает фикстуру `tests/support/fixtures/hold-pocketbase.ts` отдельным процессом `node`: она поднимает PocketBase, печатает `{ url, dataDir }` и ждёт сигнала.
- Поэтому `pocketbase-server.ts` выполняется чистым Node без сборки: в нём только импорты `node:*` и стираемый TypeScript (без `enum`, `namespace`, параметров-свойств).
