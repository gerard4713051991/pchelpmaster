// Проверяет playwright.config.ts: режим CI, где искать тесты, браузер, артефакты падений и тестовый PocketBase.
import type { PlaywrightTestConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadConfig(ci: string | undefined): Promise<PlaywrightTestConfig> {
    vi.stubEnv('CI', ci);
    vi.resetModules();
    return (await import('../../playwright.config')).default;
}

function webServers(config: PlaywrightTestConfig) {
    const { webServer } = config;
    return webServer === undefined ? [] : [webServer].flat();
}

function isGitIgnored(path: string): boolean {
    try {
        execFileSync('git', ['check-ignore', '-q', path]);
        return true;
    } catch {
        return false;
    }
}

describe('конфиг Playwright', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('при CI=true: retries 1, ни один webServer не переиспользуется', async () => {
        const config = await loadConfig('true');

        expect(config.retries).toBe(1);
        expect(webServers(config)).not.toHaveLength(0);
        for (const server of webServers(config)) expect(server.reuseExistingServer).toBe(false);
    });

    it('без CI: webServer переиспользуются, retries 0', async () => {
        const config = await loadConfig(undefined);

        expect(config.retries ?? 0).toBe(0);
        expect(webServers(config)).not.toHaveLength(0);
        for (const server of webServers(config)) expect(server.reuseExistingServer).toBe(true);
    });

    it('ищет тесты tests/e2e/**/*.e2e.ts', async () => {
        const config = await loadConfig(undefined);

        expect(resolve(config.testDir ?? '.')).toBe(resolve('tests/e2e'));
        expect(config.testMatch).toBe('**/*.e2e.ts');
    });

    it('только Chromium', async () => {
        const config = await loadConfig(undefined);

        expect(config.projects?.length).toBeGreaterThan(0);
        for (const project of config.projects ?? []) {
            expect(project.use?.browserName ?? project.use?.defaultBrowserType).toBe('chromium');
        }
    });

    it('сохраняет трейс и скриншот при падении в папку, игнорируемую git', async () => {
        const config = await loadConfig(undefined);

        expect(config.use?.screenshot).toBe('only-on-failure');
        expect(['retain-on-failure', 'retain-on-first-failure', 'on-first-retry']).toContain(
            config.use?.trace,
        );
        expect(isGitIgnored(resolve(config.outputDir ?? 'test-results'))).toBe(true);
    });

    it('приложение смотрит на тестовый PocketBase, а не на dev', async () => {
        const config = await loadConfig(undefined);
        const servers = webServers(config);
        const app = servers.find((s) => s.env?.['PB_URL']);
        const pbUrl = app?.env?.['PB_URL'] ?? '';
        const pocketBase = servers.find((s) => s !== app && s.url?.startsWith(pbUrl));

        expect(pbUrl).not.toBe('');
        expect(pocketBase).toBeDefined();
        expect(new URL(pbUrl).port).not.toBe('8090');
        expect(config.use?.baseURL).toBeDefined();
        expect(new URL(config.use?.baseURL ?? '').port).not.toBe('4200');
        expect(new URL(app?.url ?? '').origin).toBe(new URL(config.use?.baseURL ?? '').origin);
    });
});
