# Стенд интеграционных тестов

PocketBase-реализации репозиториев и сервисов на настоящем PocketBase, внутри Angular-окружения (`TestBed`). Общие правила и устройство тестового PocketBase — в [testing.md](../../testing.md).

`pnpm test:integration` = `ng run pchelpcrm:test-integration`: отдельная цель builder'а `@angular/build:unit-test` в `angular.json`.

- `include: ["**/*.integration.spec.ts"]` в цели `test-integration`; у цели `test` (`pnpm test`) — `exclude` тех же файлов, поэтому unit-тесты не требуют PocketBase.
- `watch: false` в цели: прогон завершается сам; слежение за файлами — разово `pnpm test:integration --watch`.
- `runnerConfig: "vitest.integration.config.mts"` добавляет `globalSetup: tests/support/global-setup.ts` — тот же файл, что у API-тестов, он вызывает `startPocketBase()`. Список файлов в этом конфиге не задаётся: builder его игнорирует.
- В тестах работают `TestBed` и `inject()` Angular, URL — `inject('pbUrl')` из `vitest`, хелперы импортируются из `tests/support/clients.ts`.

Почему цель builder'а, а не отдельный `vitest.integration.config.ts` с плагином: спеки собираются тем же компилятором Angular и с той же инициализацией TestBed, что и в `pnpm test`, без своего плагина компиляции и его настройки.

`tests/support/clients.ts` компилируется в двух программах — `tsconfig.tests.json` и `tsconfig.spec.json`. Типы Node подключены в обеих (спеки выполняются Vitest в Node, а код в `src/` вроде серверного провайдера `PB_URL` читает `process.env`), а `tests/support/provided-context.d.ts` с типами `inject('pbUrl')` перечислен в `include` обоих tsconfig: `references` в `tsconfig.json` программы не объединяют.
