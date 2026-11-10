# Стенд e2e

Сценарии в браузере (Playwright) и проверка доступности (axe) на `ng serve` с тестовым PocketBase. Общие правила и устройство тестового PocketBase — в [testing.md](../../testing.md).

`pnpm e2e` = `pnpm test:lint && playwright test`. Перед первым запуском: `pnpm exec playwright install chromium`.

- `playwright.config.ts`: тесты `tests/e2e/**/*.e2e.ts`, один проект `chromium`, при падении — скриншот и трейс в `test-results/` (в `.gitignore`).
- Два `webServer`: тестовый PocketBase (`node tests/support/serve-test-pocketbase.ts 8190` — тот же `startPocketBase()`, только с фиксированным портом) и `ng serve --port 4300` с `PB_URL` тестового PocketBase: на него смотрят и SSR, и dev-прокси `/pb`. Адреса и порты — `tests/e2e/urls.ts`; они не пересекаются с `pnpm pb:serve` (8090) и `pnpm start` (4200), а `pb_data` разработчика не используется.
- Серверы останавливаются по `SIGTERM` (`gracefulShutdown`): по умолчанию Playwright шлёт `SIGKILL`, и стенд не успел бы удалить временную папку PocketBase.
- Без `CI` уже запущенные серверы переиспользуются, повторов нет; при `CI=true` серверы всегда свои, повтор упавшего теста один. Это проверяет `tests/lint/playwright-config.spec.ts` (см. [config-tests.md](config-tests.md)).
- Фикстуры (`tests/e2e/fixtures.ts`) не зависят от UI входа и суперпользователя (при переиспользовании PocketBase его пароль неизвестен): `user` регистрируется через открытую регистрацию `users`, `api` — SDK, вошедший как `user`, `signedInPage` — страница в **отдельном** контексте браузера с cookie `pb_auth` в формате `exportToCookie`, поэтому обычная `page` остаётся гостевой.
- `expectNoA11yViolations(page)` (`tests/e2e/a11y.ts`): axe со всеми правилами (WCAG и best-practice, как требует CLAUDE.md), падает со списком `правило: описание (элементов: N)`.
