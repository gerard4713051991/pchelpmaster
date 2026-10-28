# Pchelpcrm

CRM для частных мастеров: учёт клиентов и заявок для компьютерной помощи, мелкого ремонта, сборки мебели, сантехники, электрики и любых других работ «клиент обратился — работа выполнена».

Система многопользовательская: каждый мастер регистрируется сам и работает только со своими данными.

## Возможности

- Регистрация и вход по email и паролю.
- Клиенты: телефоны, контакты, адрес, ссылки на профили на площадках, заметка; поиск по имени и телефону; история заявок клиента.
- Заявки: статус, дата визита, адрес, сумма, что сделано, примечания мастера, отзыв клиента, ссылка на заказ на площадке, фото и аудио.
- Метки вместо категорий и источников: мастер сам заводит «Установка Windows», «YouDo», «Сарафан» и вешает на заявку сколько угодно.
- Поиск и фильтры заявок по тексту, статусу, меткам и периоду.
- Публичная ссылка на заявку для клиента: суть работы без данных клиента и вложений.
- Серверный рендер главной, карточки заявки и публичной страницы.

## Понятия

| Понятие          | Что это                                                              |
| ---------------- | -------------------------------------------------------------------- |
| Пользователь     | мастер, владелец аккаунта                                            |
| Клиент           | заказчик мастера                                                     |
| Заявка (`Order`) | заказ; принадлежит одному клиенту, у клиента может быть много заявок |
| Метка (`Tag`)    | ярлык заявки, который мастер создаёт сам                             |
| Публичная ссылка | страница заявки для клиента по случайному токену                     |

## Стек

- [Angular](https://angular.dev/) 22 с SSR, чистый CSS
- [PocketBase](https://pocketbase.io/) 0.40 — база данных, аутентификация, файлы и API
- [pnpm](https://pnpm.io/)
- [Vitest](https://vitest.dev/) и [Playwright](https://playwright.dev/) — тесты

## Быстрый старт

Нужны Node.js 22+, pnpm и бинарник [`pocketbase`](https://pocketbase.io/docs/) 0.40.x в `PATH`.

```bash
pnpm install
cp .env.example .env    # заполнить PB_SUPERUSER_EMAIL и PB_SUPERUSER_PASSWORD
pnpm pb:superuser       # создать суперпользователя PocketBase
pnpm pb:serve           # PocketBase на http://127.0.0.1:8090, админка — /_/
pnpm start              # приложение на http://localhost:4200/
```

В разработке браузер обращается к PocketBase по пути `/pb/*`, его проксирует dev-сервер Angular.

## Команды

| Команда                 | Что делает                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| `pnpm start`            | dev-сервер приложения                                                   |
| `pnpm build`            | production-сборка в `dist/`                                             |
| `pnpm lint`             | ESLint                                                                  |
| `pnpm test`             | unit-тесты                                                              |
| `pnpm test:api`         | API-тесты PocketBase: схема, правила доступа, изоляция пользователей    |
| `pnpm test:integration` | репозитории приложения против тестового PocketBase                      |
| `pnpm test:lint`        | тесты конфига ESLint; первый шаг `test`, `test:api`, `test:integration` |
| `pnpm e2e`              | сценарии в браузере и проверка доступности (axe)                        |
| `pnpm e2e:prod`         | сценарии на production-сборке                                           |
| `pnpm pb:serve`         | PocketBase для разработки                                               |
| `pnpm pb:migrate`       | применить миграции                                                      |
| `pnpm pb:superuser`     | создать суперпользователя или сбросить его пароль                       |

Тесты, которым нужен PocketBase, сами поднимают временный экземпляр и не трогают `pocketbase/pb_data`. Перед первым запуском e2e установите браузер: `pnpm exec playwright install chromium`.

## Структура репозитория

```
src/
  app/              приложение Angular, по папке на фичу (auth, clients, orders, tags, share, …)
  server.ts         Node SSR-сервер
pocketbase/
  pb_migrations/    схема базы данных (JS-миграции)
  pb_hooks/         кастомные маршруты и хуки PocketBase
  pb_data/          локальная база (не в git)
tests/
  api/              API-тесты PocketBase
  e2e/              браузерные тесты
  support/          тестовый PocketBase и хелперы
scripts/            служебные скрипты
docs/               документация разработчика
```

## Документация

Документация разработчика лежит в [docs/](docs/README.md):

- [architecture.md](docs/architecture.md) — общая схема, слои, DI, SSR и изоляция данных, nginx, принципы UI;
- [data-model.md](docs/data-model.md) — коллекции PocketBase, поля и правила доступа;
- [testing.md](docs/testing.md) — уровни тестов и тестовый PocketBase;
- `docs/guide/` — руководство по каждой части приложения: где лежит код, как им пользоваться и как его расширить. Пополняется вместе с кодом.

## Production

Схема: nginx отдаёт `/pb/*` в PocketBase (префикс `/pb` срезается), всё остальное — в Node SSR-сервер. Пример конфигурации nginx — в [docs/architecture.md](docs/architecture.md#7-url-pocketbase).

```bash
pnpm build
pocketbase serve --dir /path/to/pb_data --migrationsDir pocketbase/pb_migrations --hooksDir pocketbase/pb_hooks --automigrate=false --http 127.0.0.1:8090
PB_DIR=/path/to/pb_data node --env-file=.env scripts/pb-superuser.mjs
PB_URL=http://127.0.0.1:8090 PORT=4000 node dist/pchelpcrm/server/server.mjs
```

| Переменная                                    | Назначение                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `PB_URL`                                      | внутренний адрес PocketBase для SSR-сервера и dev-прокси, по умолчанию `http://127.0.0.1:8090` |
| `PORT`                                        | порт Node SSR-сервера, по умолчанию `4000`                                                     |
| `PB_DIR`                                      | папка данных PocketBase для скрипта `pb:superuser`                                             |
| `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD` | суперпользователь PocketBase (скрипт `pb:superuser`)                                           |

Резервная копия — копирование папки `pb_data`. После первого релиза приложение планируется поставлять одним Docker-контейнером (SSR-сервер и PocketBase вместе).
