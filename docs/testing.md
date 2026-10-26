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

- Сначала проверяются типы тестового кода (`tsconfig.tests.json`: `tests/**` и `vitest.*.config.mts`): сам Vitest типы не проверяет.
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

`tests/support/clients.ts` компилируется в двух программах — `tsconfig.tests.json` и `tsconfig.spec.json`. Поэтому в нём нет `node:*` (во второй программе нет типов Node), а `tests/support/provided-context.d.ts` с типами `inject('pbUrl')` перечислен в `include` обоих tsconfig: `references` в `tsconfig.json` программы не объединяют.

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
3. Запускается `pocketbase serve` на свободном порту `127.0.0.1` с `--dir <временная папка> --migrationsDir pocketbase/pb_migrations --hooksDir pocketbase/pb_hooks --automigrate=false`; миграции применяются при старте.
4. Ожидание готовности по `GET /api/health`.
5. После прогона процесс останавливается, папка удаляется.

Код запуска один на все уровни: `tests/support/pocketbase-server.ts` (`startPocketBase(): Promise<{ url, dataDir, superuser, stop }>`).

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
