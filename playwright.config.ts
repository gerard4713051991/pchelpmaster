import { defineConfig, devices } from '@playwright/test';
import { E2E_APP_URL, E2E_PB_PORT, E2E_PB_URL } from './tests/e2e/urls';

const ci = !!process.env['CI'];

// Стенд e2e: временный PocketBase и `ng serve` (SSR + dev-прокси /pb) на отдельных портах.
export default defineConfig({
    testDir: 'tests/e2e',
    testMatch: '**/*.e2e.ts',
    outputDir: 'test-results',
    retries: ci ? 1 : 0,
    use: {
        baseURL: E2E_APP_URL,
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: [
        {
            command: `node tests/support/serve-test-pocketbase.ts ${E2E_PB_PORT}`,
            url: `${E2E_PB_URL}/api/health`,
            reuseExistingServer: !ci,
            // По умолчанию Playwright шлёт SIGKILL: стенд не успел бы удалить временную папку.
            // Таймаут больше STOP_TIMEOUT_MS стенда (5 с), чтобы он успел добить PocketBase и убрать папку.
            gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
        },
        {
            command: `pnpm ng serve --port ${new URL(E2E_APP_URL).port}`,
            url: E2E_APP_URL,
            env: { PB_URL: E2E_PB_URL },
            reuseExistingServer: !ci,
            timeout: 180_000,
        },
    ],
});
