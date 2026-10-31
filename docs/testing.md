# Тестирование

Разработка ведётся по TDD: тесты пишутся до реализации.

## Уровни тестов

| Уровень               | Что проверяет                                                              | Где лежит                                     | Команда                 |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ----------------------- |
| **API** (e2e бэкенда) | схема, миграции, правила доступа, изоляция пользователей, хуки PocketBase  | `tests/api/**/*.api.spec.ts`                  | `pnpm test:api`         |
| **Unit**              | доменные функции, компоненты и сервисы с фейками вместо PocketBase         | рядом с кодом, `src/**/*.spec.ts`             | `pnpm test`             |
| **Integration**       | PocketBase-реализации репозиториев и сервисов против настоящего PocketBase | рядом с кодом, `src/**/*.integration.spec.ts` | `pnpm test:integration` |
| **E2E**               | пользовательские сценарии в браузере, SSR, доступность (axe)               | `tests/e2e/**/*.e2e.ts`                       | `pnpm e2e`              |
| **E2E prod**          | сценарии на production-сборке, включая изоляцию данных при SSR             | `tests/e2e/` (проект `ssr-prod`)              | `pnpm e2e:prod`         |

Команды появляются по мере того, как настраиваются соответствующие стенды.

## Стенд API-тестов

`pnpm test:api` = `tsc -p tsconfig.tests.json && vitest run --config vitest.api.config.mts`: чистый Vitest в Node, без Angular.

- Сначала проверяются типы тестового кода (`tsconfig.tests.json`: `tests/**`, `vitest.*.config.mts` и `proxy.conf.mjs`; `allowJs` нужен, чтобы `tests/lint/` импортировали `.mjs`-конфиг): сам Vitest типы не проверяет.
- `vitest.api.config.mts`: `include: tests/api/**/*.api.spec.ts`, `globalSetup: tests/support/global-setup.ts`, таймауты 20 с (запас на старт PocketBase внутри теста).
- `global-setup.ts` поднимает один PocketBase на прогон и передаёт тестам `pbUrl`, `pbDataDir`, `pbSuperuser` через `project.provide`; в тестах — `inject('pbUrl')` и т. д. из `vitest`. Типы этих значений — `tests/support/provided-context.d.ts`.
- Тесты самого стенда — `tests/api/harness.api.spec.ts`. Проверка уборки по `SIGINT`/`SIGTERM` запускает фикстуру `tests/support/fixtures/hold-pocketbase.ts` отдельным процессом `node`: она поднимает PocketBase, печатает `{ url, dataDir }` и ждёт сигнала.
- Поэтому `pocketbase-server.ts` выполняется чистым Node без сборки: в нём только импорты `node:*` и стираемый TypeScript (без `enum`, `namespace`, параметров-свойств).

## Стенд интеграционных тестов

`pnpm test:integration` = `ng run pchelpcrm:test-integration`: отдельная цель builder'а `@angular/build:unit-test` в `angular.json`.

- `include: ["**/*.integration.spec.ts"]` в цели `test-integration`; у цели `test` (`pnpm test`) — `exclude` тех же файлов, поэтому unit-тесты не требуют PocketBase.
- `watch: false` в цели: прогон завершается сам; слежение за файлами — разово `pnpm test:integration --watch`.
- `runnerConfig: "vitest.integration.config.mts"` добавляет `globalSetup: tests/support/global-setup.ts` — тот же файл, что у API-тестов, он вызывает `startPocketBase()`. Список файлов в этом конфиге не задаётся: builder его игнорирует.
- В тестах работают `TestBed` и `inject()` Angular, URL — `inject('pbUrl')` из `vitest`, хелперы импортируются из `tests/support/clients.ts`.

Почему цель builder'а, а не отдельный `vitest.integration.config.ts` с плагином: спеки собираются тем же компилятором Angular и с той же инициализацией TestBed, что и в `pnpm test`, без своего плагина компиляции и его настройки.

`tests/support/clients.ts` компилируется в двух программах — `tsconfig.tests.json` и `tsconfig.spec.json`. Типы Node подключены в обеих (спеки выполняются Vitest в Node, а код в `src/` вроде серверного провайдера `PB_URL` читает `process.env`), а `tests/support/provided-context.d.ts` с типами `inject('pbUrl')` перечислен в `include` обоих tsconfig: `references` в `tsconfig.json` программы не объединяют.

## Стенд e2e

`pnpm e2e` = `pnpm test:lint && playwright test`. Перед первым запуском: `pnpm exec playwright install chromium`.

- `playwright.config.ts`: тесты `tests/e2e/**/*.e2e.ts`, один проект `chromium`, при падении — скриншот и трейс в `test-results/` (в `.gitignore`).
- Два `webServer`: тестовый PocketBase (`node tests/support/serve-test-pocketbase.ts 8190` — тот же `startPocketBase()`, только с фиксированным портом) и `ng serve --port 4300` с `PB_URL` тестового PocketBase: на него смотрят и SSR, и dev-прокси `/pb`. Адреса и порты — `tests/e2e/urls.ts`; они не пересекаются с `pnpm pb:serve` (8090) и `pnpm start` (4200), а `pb_data` разработчика не используется.
- Серверы останавливаются по `SIGTERM` (`gracefulShutdown`): по умолчанию Playwright шлёт `SIGKILL`, и стенд не успел бы удалить временную папку PocketBase.
- Без `CI` уже запущенные серверы переиспользуются, повторов нет; при `CI=true` серверы всегда свои, повтор упавшего теста один. Это проверяет `tests/lint/playwright-config.spec.ts`.
- Фикстуры (`tests/e2e/fixtures.ts`) не зависят от UI входа и суперпользователя (при переиспользовании PocketBase его пароль неизвестен): `user` регистрируется через открытую регистрацию `users`, `api` — SDK, вошедший как `user`, `signedInPage` — страница в **отдельном** контексте браузера с cookie `pb_auth` в формате `exportToCookie`, поэтому обычная `page` остаётся гостевой.
- `expectNoA11yViolations(page)` (`tests/e2e/a11y.ts`): axe со всеми правилами (WCAG и best-practice, как требует CLAUDE.md), падает со списком `правило: описание (элементов: N)`.

## Тесты конфигов (ESLint, dev-прокси, Playwright)

`pnpm test:lint` = `tsc -p tsconfig.tests.json && vitest run --config vitest.lint.config.mts`: чистый Vitest в Node, файлы `tests/lint/**/*.spec.ts`.

- Проверяют, что ESLint держит границы, от которых зависит изоляция данных при SSR: `new PocketBase(` и импорт класса `PocketBase` (в том числе под другим именем и через `pocketbase/*`) только в фабрике `shared/pocketbase/pocketbase-client.ts` (и в тестовых хелперах `tests/`), импорт `pocketbase` и `pocketbase/*` запрещён в `domain/` и `ui/`.
- `tests/lint/pb-dev-proxy.spec.ts` проверяет `proxy.conf.mjs` (dev-прокси `ng serve`): правило `/pb/`, `target` из `PB_URL` с тем же значением по умолчанию, что у серверного провайдера (в том числе при пустой переменной), и срезание префикса `/pb`.
- Способ ESLint-тестов: `ESLint#lintText(code, { filePath })` на коротких фрагментах кода, проверяется `ruleId` сообщений. Конфиг ESLint ломается молча (опечатка в glob, слишком широкое исключение), и `pnpm lint` при этом остаётся зелёным; тест это ловит.
- Запускаются первым шагом в `pnpm test`, `pnpm test:api`, `pnpm test:integration` и `pnpm e2e`, чтобы поломка правила обнаружилась при любом прогоне. ESLint — Node-библиотека, в бандл builder'а Angular её не подключить, поэтому это отдельный набор.

## Контрактные тесты репозиториев

У каждого репозитория две реализации: PocketBase (`data/`) и фейк в памяти (`testing/`). Чтобы фейк не расходился с реальностью, поведение описывается **один раз**:

```ts
// tags/testing/tag-repository.contract.ts
export function describeTagRepositoryContract(
    setup: () => Promise<{ repoA: TagRepository; repoB: TagRepository }>,
) {
    describe('контракт TagRepository', () => {
        it('не показывает пользователю B метки пользователя A', async () => {
            /* ... */
        });
    });
}
```

и вызывается дважды: в `in-memory-tag-repository.spec.ts` (быстро, в `pnpm test`) и в `pocketbase-tag-repository.integration.spec.ts` (на тестовом PocketBase, в `pnpm test:integration`).

## Тестовый PocketBase

API-, integration- и e2e-тесты работают с **отдельным временным экземпляром** PocketBase, а не с `pocketbase/pb_data`:

1. Создаётся временная папка данных (в системной temp-папке).
2. Создаётся суперпользователь (`pocketbase superuser upsert`) со сгенерированными email и паролем: инстанс одноразовый, поэтому `.env` тестам не нужен.
3. Запускается `pocketbase serve` на свободном порту `127.0.0.1` (или на заданном: e2e — 8190) с `--dir <временная папка> --migrationsDir pocketbase/pb_migrations --hooksDir pocketbase/pb_hooks --automigrate=false`; миграции применяются при старте.
4. Ожидание готовности по `GET /api/health`.
5. После прогона процесс останавливается, папка удаляется.

Код запуска один на все уровни: `tests/support/pocketbase-server.ts` (`startPocketBase({ port? }): Promise<{ url, dataDir, superuser, stop }>`).

Стенд убирает за собой процесс и папку после успешного прогона, после падения (в том числе неудачного старта), по `SIGINT`/`SIGTERM` (Ctrl+C) и при выходе процесса. Предел: `SIGKILL` процесса-владельца перехватить нельзя — тогда PocketBase может продолжить работу, а папка `pchelpcrm-pb-*` остаться в temp.

## Правила написания тестов

- **Каждый тест создаёт своих пользователей** с уникальными email (`user-<случайная строка>@test.local`). Тесты не зависят друг от друга и от порядка, поэтому могут идти параллельно и не нуждаются в очистке.
- Хелперы (`tests/support/`): `createUser()`, `asUser(user)`, `asGuest()`, `asSuperuser()` возвращают готовый экземпляр PocketBase SDK.
- **Изоляцию проверяем всегда двумя пользователями**: A создаёт данные, B пытается их прочитать, найти через list/filter, изменить, удалить, сослаться на них. Плюс гость.
- Тест проверяет поведение, а не реализацию: статус ответа, тело, состояние после операции (перечитать суперпользователем).
- Unit-тесты компонентов используют фейки из `<feature>/testing/` и не обращаются к сети.
- Компонентные тесты ищут элементы по ролям и подписям (как пользователь и скринридер), а не по CSS-классам.
- E2E-тесты: каждый сценарий регистрирует своего пользователя через UI или API; на ключевых страницах выполняется проверка axe (`@axe-core/playwright`) без нарушений.
- Названия тестов на русском и описывают поведение: `it('не отдаёт гостю чужую метку')`.
- Пока реализации нет, тесты должны компилироваться: для этого создаются минимальные заглушки контрактов (типы, абстрактные классы, методы с `throw new Error('Not implemented')`). Новые тесты падают из-за невыполненных ожиданий, а не из-за ошибок импорта или стенда.
