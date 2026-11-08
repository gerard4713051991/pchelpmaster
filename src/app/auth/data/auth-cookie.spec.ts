import { ApplicationInitStatus, PLATFORM_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BaseAuthStore, type RecordModel } from 'pocketbase';
import { PB_URL } from '../../shared/pocketbase/pb-url';
import { POCKETBASE, providePocketBase } from '../../shared/pocketbase/pocketbase-client';
import { provideAuth } from '../provide-auth';
import { PocketBaseAuthService } from './pocketbase-auth-service';

const record: RecordModel = {
    id: 'u1',
    collectionId: '_pb_users_auth_',
    collectionName: 'users',
    email: 'user@test.local',
    name: 'Иван',
};

/** JWT без настоящей подписи, но с exp через час: по exp SDK считает токен живым и ставит срок cookie. */
function fakeJwt(): string {
    const encode = (part: object) =>
        btoa(JSON.stringify(part)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ id: record.id, type: 'auth', exp })}.signature`;
}

function hasAuthCookie(): boolean {
    return document.cookie.split('; ').some((cookie) => cookie.startsWith('pb_auth='));
}

/** Кладёт cookie сессии так, как её оставил бы прошлый визит. */
function putAuthCookie(token: string): void {
    const store = new BaseAuthStore();
    store.save(token, record);
    document.cookie = store.exportToCookie({ httpOnly: false, secure: false });
}

/** Поднимает приложение с provideAuth() и дожидается инициализаторов; сети нет. */
async function startApp(providers: Provider[] = []) {
    TestBed.configureTestingModule({
        providers: [
            providePocketBase(),
            { provide: PB_URL, useValue: 'http://pb.test:1234' },
            provideAuth(),
            ...providers,
        ],
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    return TestBed.inject(POCKETBASE);
}

afterEach(() => {
    document.cookie = 'pb_auth=; Path=/; Max-Age=0';
    vi.restoreAllMocks();
});

describe('cookie pb_auth в браузере', () => {
    it('после входа cookie содержит сессию из auth store', async () => {
        const pb = await startApp();
        const token = fakeJwt();

        pb.authStore.save(token, record);

        expect(hasAuthCookie()).toBe(true);
        const restored = new BaseAuthStore();
        restored.loadFromCookie(document.cookie);
        expect(restored.token).toBe(token);
        expect(restored.record?.id).toBe(record.id);
    });

    it('после выхода cookie нет', async () => {
        const pb = await startApp();
        pb.authStore.save(fakeJwt(), record);

        pb.authStore.clear();

        expect(hasAuthCookie()).toBe(false);
    });

    it('пишется с Path=/ и SameSite=Lax, без HttpOnly и без Secure на http', async () => {
        const pb = await startApp();
        const writes = vi.spyOn(document, 'cookie', 'set');

        pb.authStore.save(fakeJwt(), record);

        const written = writes.mock.calls.map(([value]) => String(value));
        const authCookie = written.find((value) => value.startsWith('pb_auth='));
        expect(authCookie).toBeDefined();
        expect(authCookie).toMatch(/;\s*Path=\/(;|$)/i);
        expect(authCookie).toMatch(/;\s*SameSite=Lax(;|$)/i);
        expect(authCookie).not.toMatch(/;\s*HttpOnly/i);
        expect(authCookie).not.toMatch(/;\s*Secure/i);
    });

    it('при старте токен из cookie попадает в auth store до вызова restore()', async () => {
        const token = fakeJwt();
        putAuthCookie(token);
        let tokenAtRestore: string | undefined;
        const restore = vi
            .spyOn(PocketBaseAuthService.prototype, 'restore')
            .mockImplementation(async () => {
                tokenAtRestore = TestBed.inject(POCKETBASE).authStore.token;
            });

        const pb = await startApp();

        expect(pb.authStore.token).toBe(token);
        expect(pb.authStore.record?.id).toBe(record.id);
        expect(restore).toHaveBeenCalledTimes(1);
        expect(tokenAtRestore).toBe(token);
    });
});

describe('cookie pb_auth на сервере', () => {
    it('не читается при старте и restore() не вызывается', async () => {
        putAuthCookie(fakeJwt());
        const restore = vi
            .spyOn(PocketBaseAuthService.prototype, 'restore')
            .mockResolvedValue(undefined);

        const pb = await startApp([{ provide: PLATFORM_ID, useValue: 'server' }]);

        expect(pb.authStore.token).toBe('');
        expect(restore).not.toHaveBeenCalled();
    });

    it('не пишется при изменении auth store', async () => {
        const pb = await startApp([{ provide: PLATFORM_ID, useValue: 'server' }]);

        pb.authStore.save(fakeJwt(), record);

        expect(hasAuthCookie()).toBe(false);
    });
});
