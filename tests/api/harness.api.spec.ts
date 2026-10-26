import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, inject, it, vi } from 'vitest';
import { asGuest, asSuperuser, asUser, createUser } from '../support/clients';
import { type PocketBaseServer, startPocketBase } from '../support/pocketbase-server';

const health = (url: string) => fetch(`${url}/api/health`);
const holdFixture = path.resolve('tests/support/fixtures/hold-pocketbase.ts');

describe('стенд API-тестов', () => {
    it('отвечает 200 на GET /api/health', async () => {
        const response = await health(inject('pbUrl'));

        expect(response.status).toBe(200);
    });

    it('asSuperuser() авторизован как суперпользователь', async () => {
        const pb = await asSuperuser();

        expect(pb.authStore.isValid).toBe(true);
        expect(pb.authStore.isSuperuser).toBe(true);
    });

    it('asGuest() не авторизован', () => {
        const pb = asGuest();

        expect(pb.authStore.isValid).toBe(false);
        expect(pb.authStore.record).toBeNull();
    });

    it('createUser() каждый раз создаёт нового пользователя с уникальным email', async () => {
        const a = await createUser();
        const b = await createUser();

        expect(a.id).not.toBe(b.id);
        expect(a.email).not.toBe(b.email);
        expect(a.email).toMatch(/^user-.+@test\.local$/);
        expect(b.email).toMatch(/^user-.+@test\.local$/);
    });

    it('createUser(overrides) применяет переданные поля', async () => {
        const user = await createUser({ name: 'Иван' });

        const record = await (await asSuperuser()).collection('users').getOne(user.id);

        expect(record['name']).toBe('Иван');
    });

    it('asUser(user) авторизован именно этим пользователем', async () => {
        const user = await createUser();

        const pb = await asUser(user);

        expect(pb.authStore.isValid).toBe(true);
        expect(pb.authStore.isSuperuser).toBe(false);
        expect(pb.authStore.record?.id).toBe(user.id);
        expect(pb.authStore.record?.['email']).toBe(user.email);
    });

    it('у каждого хелпера свой экземпляр SDK', async () => {
        const superuser = await asSuperuser();
        const guest = asGuest();

        expect(guest).not.toBe(superuser);
        expect(guest).not.toBe(asGuest());
        expect(guest.authStore.isValid).toBe(false);
    });

    it('работает на отдельном временном PocketBase, а не на pocketbase/pb_data', async () => {
        const url = inject('pbUrl');
        const dataDir = inject('pbDataDir');

        expect(url).not.toBe(process.env['PB_URL'] ?? 'http://127.0.0.1:8090');
        expect(new URL(url).hostname).toBe('127.0.0.1');
        expect(path.resolve(dataDir)).not.toBe(path.resolve('pocketbase/pb_data'));
        expect(path.resolve(dataDir).startsWith(path.resolve(os.tmpdir()) + path.sep)).toBe(true);
        expect(existsSync(dataDir)).toBe(true);

        const user = await createUser();
        const record = await (await asSuperuser()).collection('users').getOne(user.id);
        expect(record.id).toBe(user.id);
    });
});

describe('startPocketBase', { timeout: 30_000 }, () => {
    it('stop() останавливает процесс и удаляет временную папку', async () => {
        const server = await startPocketBase();

        try {
            expect((await health(server.url)).status).toBe(200);
            expect(existsSync(server.dataDir)).toBe(true);
        } finally {
            await server.stop();
        }

        await expect(health(server.url)).rejects.toThrow();
        expect(existsSync(server.dataDir)).toBe(false);
    });

    it.each(['SIGINT', 'SIGTERM'] as const)(
        'по %s процесс-владелец убирает за собой PocketBase и папку',
        async (signal) => {
            // Фикстура поднимает PocketBase, печатает в stdout JSON с url и dataDir и ждёт сигнала.
            // Флаг подавляет предупреждение MODULE_TYPELESS_PACKAGE_JSON для .ts-файла.
            const child = spawn(
                process.execPath,
                ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', holdFixture],
                {
                    stdio: ['ignore', 'pipe', 'inherit'],
                },
            );

            try {
                // Если фикстура упала до вывода, тест падает сразу, а не ждёт таймаута.
                const [chunk] = await Promise.race([
                    once(child.stdout, 'data'),
                    once(child, 'exit').then(() => {
                        throw new Error('фикстура завершилась, не запустив PocketBase');
                    }),
                ]);
                const { url, dataDir } = JSON.parse(String(chunk)) as {
                    url: string;
                    dataDir: string;
                };
                expect((await health(url)).status).toBe(200);

                const exited = once(child, 'exit');
                child.kill(signal);
                await exited;

                await expect(health(url)).rejects.toThrow();
                expect(existsSync(dataDir)).toBe(false);
            } finally {
                child.kill('SIGKILL');
            }
        },
    );

    it('повторный stop() не бросает ошибку', async () => {
        const server = await startPocketBase();
        await server.stop();

        await expect(server.stop()).resolves.toBeUndefined();
    });

    it('параллельные запуски получают разные порты и папки', async () => {
        // allSettled, а не all: если один запуск упал, второй всё равно нужно остановить в finally.
        const results = await Promise.allSettled([startPocketBase(), startPocketBase()]);
        const servers = results
            .filter((r): r is PromiseFulfilledResult<PocketBaseServer> => r.status === 'fulfilled')
            .map((r) => r.value);

        try {
            expect(servers).toHaveLength(2);
            const [a, b] = servers;
            expect(a.url).not.toBe(b.url);
            expect(a.dataDir).not.toBe(b.dataDir);
            expect(a.superuser.email).not.toBe(b.superuser.email);
            expect((await health(a.url)).status).toBe(200);
            expect((await health(b.url)).status).toBe(200);
        } finally {
            await Promise.all(servers.map((s) => s.stop()));
        }
    });

    it('без бинарника pocketbase в PATH падает с понятной ошибкой, а не по таймауту', async () => {
        vi.stubEnv('PATH', '');

        try {
            await expect(startPocketBase()).rejects.toThrow(/pocketbase/i);
        } finally {
            vi.unstubAllEnvs();
        }
    });
});
