// Проверяет правило `/pb/` в proxy.conf.mjs: оно должно повторять `location /pb/` из nginx и серверный `PB_URL`.
import { afterEach, describe, expect, it, vi } from 'vitest';

type Rules = typeof import('../../proxy.conf.mjs').default;

async function loadRules(pbUrl: string | undefined): Promise<Rules> {
    vi.stubEnv('PB_URL', pbUrl);
    vi.resetModules();
    return (await import('../../proxy.conf.mjs')).default;
}

describe('прокси /pb для ng serve', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('содержит правило /pb/ с target из PB_URL', async () => {
        const rules = await loadRules('http://pb.test:1234');

        expect(rules['/pb/']?.target).toBe('http://pb.test:1234');
        expect(rules['/pb/']?.changeOrigin).toBe(true);
    });

    it.each([undefined, ''])('при PB_URL=%j target — http://127.0.0.1:8090', async (pbUrl) => {
        const rules = await loadRules(pbUrl);

        expect(rules['/pb/']?.target).toBe('http://127.0.0.1:8090');
    });

    it('rewrite срезает префикс /pb', async () => {
        const rewrite = (await loadRules(undefined))['/pb/']?.rewrite;

        expect(rewrite?.('/pb/api/health')).toBe('/api/health');
        expect(rewrite?.('/pb/api/collections/x/records?a=1')).toBe(
            '/api/collections/x/records?a=1',
        );
    });
});
